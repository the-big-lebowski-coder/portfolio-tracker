import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const piggyBankDir = path.resolve(workspaceRoot, "artifacts/piggy-bank/dist/public");

const app: Express = express();
app.set("etag", false); // prevent 304s so clients always get fresh market-cap data

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve piggy bank React app at /piggy-bank/
app.use("/piggy-bank", express.static(piggyBankDir));
app.get("/piggy-bank/{*path}", (_req, res) => {
  res.sendFile(path.join(piggyBankDir, "index.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "portfolio-tracker.html"));
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  req.log.error({ err }, message);
  res.status(500).json({ error: message });
});

export default app;
