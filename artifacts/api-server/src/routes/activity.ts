import { Router, type IRouter } from "express";
import { listActivity } from "../lib/service";

const router: IRouter = Router();

router.get("/activity", async (req, res): Promise<void> => {
  try {
    res.json(await listActivity());
  } catch (err) {
    req.log.error({ err }, "Failed to load activity");
    res.status(503).json({ error: (err as Error).message });
  }
});

export default router;
