import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import stockRouter from "./stock.js";
import bankRouter from "./bank.js";
import ronaRouter from "./rona.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bankRouter);
router.use(ronaRouter);
router.use(stockRouter);

export default router;
