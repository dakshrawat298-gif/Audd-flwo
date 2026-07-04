import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import treasuryRouter from "./treasury";
import employeesRouter from "./employees";
import streamsRouter from "./streams";
import activityRouter from "./activity";
import agentRouter from "./agent";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(treasuryRouter);
router.use(employeesRouter);
router.use(streamsRouter);
router.use(activityRouter);
router.use(agentRouter);

export default router;
