import { Router, type IRouter } from "express";
import { ethers } from "ethers";
import { CreateStreamBody, ClaimStreamParams, StopStreamParams } from "@workspace/api-zod";
import { listStreams } from "../lib/service";
import {
  getAgentSigner,
  getOwnerSigner,
  treasuryContract,
  resolveToken,
  tokenMeta,
  parseAmount,
  txExplorer,
} from "../lib/chain";

const router: IRouter = Router();

router.get("/streams", async (req, res): Promise<void> => {
  try {
    res.json(await listStreams());
  } catch (err) {
    req.log.error({ err }, "Failed to list streams");
    res.status(503).json({ error: (err as Error).message });
  }
});

router.post("/streams", async (req, res): Promise<void> => {
  const parsed = CreateStreamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const { to, ratePerDay, token, durationDays } = parsed.data;
  if (!ethers.isAddress(to)) {
    res.status(400).json({ error: "Invalid recipient address" });
    return;
  }
  try {
    const tokenAddr = resolveToken(token);
    const meta = tokenMeta(tokenAddr);
    const ratePerSecond = parseAmount(ratePerDay, meta.decimals) / BigInt(86400);
    const stop = durationDays
      ? Math.floor(Date.now() / 1000) + durationDays * 86400
      : 0;
    const tx = await treasuryContract(getAgentSigner()).createStream(
      tokenAddr,
      ethers.getAddress(to),
      ratePerSecond,
      stop,
      `Salary stream — ${ratePerDay} ${meta.symbol}/day`,
    );
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      status: "streaming",
      explorerUrl: txExplorer(receipt.hash),
    });
  } catch (err) {
    req.log.error({ err }, "Create stream failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/streams/:id/claim", async (req, res): Promise<void> => {
  const params = ClaimStreamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid stream id" });
    return;
  }
  try {
    const tx = await treasuryContract(getAgentSigner()).claimStream(params.data.id);
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      status: "claimed",
      explorerUrl: txExplorer(receipt.hash),
    });
  } catch (err) {
    req.log.error({ err }, "Claim stream failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/streams/:id/stop", async (req, res): Promise<void> => {
  const params = StopStreamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid stream id" });
    return;
  }
  try {
    const tx = await treasuryContract(getOwnerSigner()).stopStream(params.data.id);
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      status: "stopped",
      explorerUrl: txExplorer(receipt.hash),
    });
  } catch (err) {
    req.log.error({ err }, "Stop stream failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
