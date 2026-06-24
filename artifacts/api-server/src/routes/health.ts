import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/debug-env", (_req, res) => {
  res.json({
    FINNHUB_API_KEY: !!process.env["FINNHUB_API_KEY"],
    NODE_ENV: process.env["NODE_ENV"] ?? "not set",
    PORT: process.env["PORT"] ?? "not set",
  });
});

export default router;
