import { Router, type IRouter } from "express";
import { UpdateGuardrailBody } from "@workspace/api-zod";
import { getTreasurySummary } from "../lib/service";
import {
  getOwnerSigner,
  treasuryContract,
  resolveToken,
  tokenMeta,
  parseAmount,
  txExplorer,
} from "../lib/chain";

const router: IRouter = Router();

router.get("/treasury", async (req, res): Promise<void> => {
  try {
    const summary = await getTreasurySummary();
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to load treasury");
    res.status(503).json({ error: (err as Error).message });
  }
});

router.post("/treasury/pause", async (req, res): Promise<void> => {
  try {
    const tx = await treasuryContract(getOwnerSigner()).pause();
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      status: "paused",
      explorerUrl: txExplorer(receipt.hash),
    });
  } catch (err) {
    req.log.error({ err }, "Pause failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/treasury/unpause", async (req, res): Promise<void> => {
  try {
    const tx = await treasuryContract(getOwnerSigner()).unpause();
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      status: "active",
      explorerUrl: txExplorer(receipt.hash),
    });
  } catch (err) {
    req.log.error({ err }, "Unpause failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/treasury/guardrails", async (req, res): Promise<void> => {
  const parsed = UpdateGuardrailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  try {
    const tokenAddr = resolveToken(parsed.data.token);
    const meta = tokenMeta(tokenAddr);
    const tx = await treasuryContract(getOwnerSigner()).setGuardrail(
      tokenAddr,
      parseAmount(parsed.data.perTxCap, meta.decimals),
      parseAmount(parsed.data.dailyCap, meta.decimals),
    );
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      status: "updated",
      explorerUrl: txExplorer(receipt.hash),
    });
  } catch (err) {
    req.log.error({ err }, "Guardrail update failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
