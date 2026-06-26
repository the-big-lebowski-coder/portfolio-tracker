import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import stockRouter from "./stock.js";
import bankRouter from "./bank.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bankRouter);
router.use(stockRouter);

export default router;
