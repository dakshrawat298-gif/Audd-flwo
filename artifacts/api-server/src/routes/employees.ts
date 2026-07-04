import { Router, type IRouter } from "express";
import { ethers } from "ethers";
import { AddEmployeeBody, UpdateEmployeeParams, UpdateEmployeeBody } from "@workspace/api-zod";
import { listEmployees, fetchEmployeesRaw, mapEmployee } from "../lib/service";
import {
  getOwnerSigner,
  treasuryContract,
  resolveToken,
  tokenMeta,
  parseAmount,
  txExplorer,
} from "../lib/chain";

const router: IRouter = Router();

router.get("/employees", async (req, res): Promise<void> => {
  try {
    res.json(await listEmployees());
  } catch (err) {
    req.log.error({ err }, "Failed to list employees");
    res.status(503).json({ error: (err as Error).message });
  }
});

router.post("/employees", async (req, res): Promise<void> => {
  const parsed = AddEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const { address, name, role, salary, token } = parsed.data;
  if (!ethers.isAddress(address)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  try {
    const tokenAddr = resolveToken(token);
    const meta = tokenMeta(tokenAddr);
    const tx = await treasuryContract(getOwnerSigner()).addEmployee(
      ethers.getAddress(address),
      name,
      role,
      parseAmount(salary, meta.decimals),
      tokenAddr,
    );
    const receipt = await tx.wait();
    const raw = (await fetchEmployeesRaw()).find(
      (e) => e.wallet.toLowerCase() === address.toLowerCase(),
    );
    res.json({
      txHash: receipt.hash,
      explorerUrl: txExplorer(receipt.hash),
      employee: raw ? mapEmployee(raw) : undefined,
    });
  } catch (err) {
    req.log.error({ err }, "Add employee failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/employees/:address", async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  const body = UpdateEmployeeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const tx = await treasuryContract(getOwnerSigner()).setEmployeeActive(
      ethers.getAddress(params.data.address),
      body.data.active,
    );
    const receipt = await tx.wait();
    res.json({
      txHash: receipt.hash,
      status: body.data.active ? "active" : "inactive",
      explorerUrl: txExplorer(receipt.hash),
    });
  } catch (err) {
    req.log.error({ err }, "Update employee failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
