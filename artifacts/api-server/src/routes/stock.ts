import { Router, type IRouter, type Request, type Response } from "express";
import { getCached, setCached } from "../lib/cache.js";
import { finnhubQueue } from "../lib/queue.js";

const router: IRouter = Router();

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function apiKey(): string {
  const key = process.env["FINNHUB_API_KEY"];
  if (!key) throw new Error("FINNHUB_API_KEY is not set");
  return key;
}

async function finnhubGet(path: string): Promise<unknown> {
  const url = `${FINNHUB_BASE}${path}&token=${apiKey()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Finnhub error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

const MAX_BATCH = 200;

function parseTickers(raw: unknown): string[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const tickers = raw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  if (tickers.length === 0 || tickers.length > MAX_BATCH) return null;
  return tickers;
}

function isCanadian(ticker: string): boolean {
  return ticker.endsWith(".TO") || ticker.endsWith(".TSX");
}

function toYahooSymbol(ticker: string): string {
  if (ticker.endsWith(".TSX")) return ticker.slice(0, -4) + ".TO";
  return ticker;
}

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json",
};

async function yahooFetch(url: string): Promise<unknown> {
  const mirrors = [
    url,
    url.replace("query1.finance.yahoo.com", "query2.finance.yahoo.com"),
  ];
  let lastErr: Error = new Error("Yahoo Finance unavailable");
  for (const mirror of mirrors) {
    try {
      const res = await fetch(mirror, { headers: YAHOO_HEADERS });
      if (res.ok) return await res.json();
      lastErr = new Error(`Yahoo Finance ${res.status}: ${res.statusText}`);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr;
}

type YahooMeta = {
  regularMarketPrice?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketTime?: number;
};

type YahooChart = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      meta?: YahooMeta;
    }>;
    error?: { description?: string };
  };
};

async function fetchYahooChart(
  yahooSymbol: string,
  range: string,
  interval: string,
): Promise<YahooChart> {
  const path = `/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${range}&interval=${interval}&includeTimestamps=true`;
  return (await yahooFetch(
    `https://query1.finance.yahoo.com${path}`,
  )) as YahooChart;
}

async function yahooQuote(ticker: string): Promise<{
  c: number;
  d: number | null;
  dp: number | null;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}> {
  const yahooSymbol = toYahooSymbol(ticker);
  const raw = await fetchYahooChart(yahooSymbol, "1d", "1d");
  const meta = raw.chart?.result?.[0]?.meta ?? {};
  const price = meta.regularMarketPrice ?? 0;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
  const change = price && prevClose ? price - prevClose : null;
  const changePct =
    change !== null && prevClose ? (change / prevClose) * 100 : null;
  return {
    c: price,
    d: change,
    dp: changePct,
    h: meta.regularMarketDayHigh ?? 0,
    l: meta.regularMarketDayLow ?? 0,
    o: meta.regularMarketOpen ?? 0,
    pc: prevClose,
    t: meta.regularMarketTime ?? Math.floor(Date.now() / 1000),
  };
}

type YahooChartMeta = YahooMeta & {
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  trailingPE?: number;
  dividendsPerShare?: number;
};

async function yahooMetrics(ticker: string): Promise<unknown> {
  const yahooSymbol = toYahooSymbol(ticker);
  // The v8 chart meta reliably exposes 52-week high/low and sometimes PE
  const raw = await fetchYahooChart(yahooSymbol, "1d", "1d");
  const meta = (raw.chart?.result?.[0]?.meta ?? {}) as YahooChartMeta;

  return {
    metric: {
      peNormalizedAnnual: meta.trailingPE ?? null,
      "52WeekHigh": meta.fiftyTwoWeekHigh ?? null,
      "52WeekLow": meta.fiftyTwoWeekLow ?? null,
      dividendYieldIndicatedAnnual: null,
      beta: null,
    },
    metricType: "all",
    symbol: ticker,
  };
}

async function yahooProfile(ticker: string): Promise<string | null> {
  const yahooSymbol = toYahooSymbol(ticker);
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=price`;
  type YahooPriceModule = {
    quoteSummary?: {
      result?: Array<{ price?: { shortName?: string; longName?: string } }>;
    };
  };
  const data = (await yahooFetch(url)) as YahooPriceModule;
  const price = data.quoteSummary?.result?.[0]?.price;
  return price?.longName ?? price?.shortName ?? null;
}

router.get("/profile/batch", async (req: Request, res: Response) => {
  const tickers = parseTickers(req.query["tickers"]);
  if (!tickers) {
    res
      .status(400)
      .json({ error: `Provide ?tickers=AAPL,MSFT,... (max ${MAX_BATCH})` });
    return;
  }

  const results = await Promise.all(
    tickers.map(async (ticker) => {
      const cacheKey = `profile:${ticker}`;
      const cached = getCached<{ name: string | null }>(cacheKey);
      if (cached) return { ticker, name: cached.name };

      try {
        let name: string | null = null;
        if (isCanadian(ticker)) {
          name = await yahooProfile(ticker);
        } else {
          const data = (await finnhubQueue.run(() =>
            finnhubGet(`/stock/profile2?symbol=${ticker}`),
          )) as { name?: string };
          name = data.name ?? null;
        }
        setCached(cacheKey, { name });
        return { ticker, name };
      } catch {
        return { ticker, name: null };
      }
    }),
  );

  const out: Record<string, string | null> = {};
  for (const r of results) out[r.ticker] = r.name;
  res.json(out);
});

router.get("/quote/batch", async (req: Request, res: Response) => {
  const tickers = parseTickers(req.query["tickers"]);
  if (!tickers) {
    res
      .status(400)
      .json({ error: `Provide ?tickers=AAPL,MSFT,... (max ${MAX_BATCH})` });
    return;
  }

  const results = await Promise.all(
    tickers.map(async (ticker) => {
      const cacheKey = `quote:${ticker}`;
      const cached = getCached(cacheKey);
      if (cached) return { ticker, data: cached };

      try {
        const data = isCanadian(ticker)
          ? await yahooQuote(ticker)
          : await finnhubQueue.run(() => finnhubGet(`/quote?symbol=${ticker}`));
        setCached(cacheKey, data);
        return { ticker, data };
      } catch {
        return { ticker, data: null };
      }
    }),
  );

  const out: Record<string, unknown> = {};
  for (const r of results) out[r.ticker] = r.data;
  res.json(out);
});

router.get("/metrics/batch", async (req: Request, res: Response) => {
  const tickers = parseTickers(req.query["tickers"]);
  if (!tickers) {
    res
      .status(400)
      .json({ error: `Provide ?tickers=AAPL,MSFT,... (max ${MAX_BATCH})` });
    return;
  }

  const results = await Promise.all(
    tickers.map(async (ticker) => {
      const cacheKey = `metrics:${ticker}`;
      const cached = getCached(cacheKey);
      if (cached) return { ticker, data: cached };

      try {
        const data = isCanadian(ticker)
          ? await yahooMetrics(ticker)
          : await finnhubQueue.run(() =>
              finnhubGet(`/stock/metric?symbol=${ticker}&metric=all`),
            );
        setCached(cacheKey, data);
        return { ticker, data };
      } catch {
        return { ticker, data: null };
      }
    }),
  );

  const out: Record<string, unknown> = {};
  for (const r of results) out[r.ticker] = r.data;
  res.json(out);
});

router.get("/quote/:ticker", async (req: Request, res: Response) => {
  const ticker = String(req.params["ticker"]).toUpperCase();
  const cacheKey = `quote:${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  const data = isCanadian(ticker)
    ? await yahooQuote(ticker)
    : await finnhubQueue.run(() => finnhubGet(`/quote?symbol=${ticker}`));
  setCached(cacheKey, data);
  res.json(data);
});

router.get("/metrics/:ticker", async (req: Request, res: Response) => {
  const ticker = String(req.params["ticker"]).toUpperCase();
  const cacheKey = `metrics:${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) { res.json(cached); return; }

  const data = isCanadian(ticker)
    ? await yahooMetrics(ticker)
    : await finnhubQueue.run(() =>
        finnhubGet(`/stock/metric?symbol=${ticker}&metric=all`),
      );
  setCached(cacheKey, data);
  res.json(data);
});

const PERIOD_MAP: Record<string, { range: string; interval: string }> = {
  "1d": { range: "1d", interval: "5m" },
  "1w": { range: "5d", interval: "15m" },
  "1m": { range: "1mo", interval: "1h" },
  "3m": { range: "3mo", interval: "1d" },
  "1y": { range: "1y", interval: "1wk" },
  "5y": { range: "5y", interval: "1mo" },
};

router.get(
  "/history/:ticker/:period",
  async (req: Request, res: Response) => {
    const ticker = String(req.params["ticker"]);
    const period = String(req.params["period"]).toLowerCase();

    const mapping = PERIOD_MAP[period];
    if (!mapping) {
      res.status(400).json({
        error: `Invalid period. Valid values: ${Object.keys(PERIOD_MAP).join(", ")}`,
      });
      return;
    }

    const cacheKey = `history:${ticker}:${period}`;
    const cached = getCached(cacheKey);
    if (cached) { res.json(cached); return; }

    const yahooSymbol = toYahooSymbol(ticker.toUpperCase());
    const raw = await fetchYahooChart(yahooSymbol, mapping.range, mapping.interval);

    if (raw.chart?.error) {
      throw new Error(
        raw.chart.error.description ?? "Yahoo Finance returned an error",
      );
    }

    const result = raw.chart?.result?.[0];
    if (!result) throw new Error(`No history data found for ${ticker}`);

    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];

    const data = timestamps
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().split("T")[0],
        price: closes[i] ?? null,
      }))
      .filter((p): p is { date: string; price: number } => p.price !== null);

    setCached(cacheKey, data);
    res.json(data);
  },
);

export default router;
