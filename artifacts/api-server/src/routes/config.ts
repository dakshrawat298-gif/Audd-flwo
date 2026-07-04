import { Router, type IRouter } from "express";
import { buildConfig } from "../lib/service";

const router: IRouter = Router();

router.get("/config", async (_req, res): Promise<void> => {
  res.json(buildConfig());
});

export default router;
