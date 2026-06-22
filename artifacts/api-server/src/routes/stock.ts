import { Router, type IRouter, type Request, type Response } from "express";
import { getCached, setCached } from "../lib/cache.js";

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

router.get("/quote/:ticker", async (req: Request, res: Response) => {
  const ticker = String(req.params["ticker"]).toUpperCase();
  const cacheKey = `quote:${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const data = await finnhubGet(`/quote?symbol=${ticker}`);
  setCached(cacheKey, data);
  res.json(data);
});

router.get("/metrics/:ticker", async (req: Request, res: Response) => {
  const ticker = String(req.params["ticker"]).toUpperCase();
  const cacheKey = `metrics:${ticker}`;
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const data = await finnhubGet(`/stock/metric?symbol=${ticker}&metric=all`);
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
    const ticker = String(req.params["ticker"]).toUpperCase();
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
    if (cached) {
      res.json(cached);
      return;
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${mapping.range}&interval=${mapping.interval}&includeTimestamps=true`;
    const yahooRes = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!yahooRes.ok) {
      throw new Error(
        `Yahoo Finance error ${yahooRes.status}: ${yahooRes.statusText}`,
      );
    }

    const raw = (await yahooRes.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: number[];
              high?: number[];
              low?: number[];
              close?: number[];
              volume?: number[];
            }>;
          };
          meta?: { currency?: string; symbol?: string };
        }>;
        error?: { description?: string };
      };
    };

    if (raw.chart?.error) {
      throw new Error(
        raw.chart.error.description ?? "Yahoo Finance returned an error",
      );
    }

    const result = raw.chart?.result?.[0];
    if (!result) {
      throw new Error("No data returned from Yahoo Finance");
    }

    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};

    const candles = timestamps.map((t, i) => ({
      t,
      o: quote.open?.[i] ?? null,
      h: quote.high?.[i] ?? null,
      l: quote.low?.[i] ?? null,
      c: quote.close?.[i] ?? null,
      v: quote.volume?.[i] ?? null,
    }));

    const data = {
      ticker,
      period,
      currency: result.meta?.currency ?? "USD",
      candles,
    };

    setCached(cacheKey, data);
    res.json(data);
  },
);

export default router;
