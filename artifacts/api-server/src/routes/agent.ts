import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, agentIntentsTable, type AgentIntentRow } from "@workspace/db";
import { CreateIntentBody, GetIntentParams, ExecuteIntentParams } from "@workspace/api-zod";
import { planIntent, executePlan, type AgentPlan, type GuardrailCheck } from "../lib/planner";

const router: IRouter = Router();

function serialize(row: AgentIntentRow) {
  return {
    id: row.id,
    prompt: row.prompt,
    category: row.category,
    summary: row.summary,
    status: row.status as "planned" | "executed" | "failed" | "rejected",
    reasoning: row.reasoning,
    plan: row.plan as AgentPlan,
    validation: row.validation as GuardrailCheck,
    txHashes: row.txHashes ?? [],
    error: row.error ?? undefined,
    createdAt: row.createdAt.toISOString(),
    executedAt: row.executedAt ? row.executedAt.toISOString() : undefined,
  };
}

router.get("/agent/intents", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(agentIntentsTable)
      .orderBy(desc(agentIntentsTable.createdAt))
      .limit(50);
    res.json(rows.map(serialize));
  } catch (err) {
    req.log.error({ err }, "Failed to list intents");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/agent/intents", async (req, res): Promise<void> => {
  const parsed = CreateIntentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  try {
    const result = await planIntent(parsed.data.prompt);
    const [row] = await db
      .insert(agentIntentsTable)
      .values({
        prompt: parsed.data.prompt,
        category: result.category,
        summary: result.summary,
        status: "planned",
        reasoning: result.reasoning,
        plan: result.plan,
        validation: result.validation,
        txHashes: [],
      })
      .returning();
    res.json(serialize(row));
  } catch (err) {
    req.log.error({ err }, "Plan intent failed");
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/agent/intents/:id", async (req, res): Promise<void> => {
  const params = GetIntentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select()
    .from(agentIntentsTable)
    .where(eq(agentIntentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Intent not found" });
    return;
  }
  res.json(serialize(row));
});

router.post("/agent/intents/:id/execute", async (req, res): Promise<void> => {
  const params = ExecuteIntentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select()
    .from(agentIntentsTable)
    .where(eq(agentIntentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Intent not found" });
    return;
  }
  if (row.status === "executed") {
    res.json(serialize(row));
    return;
  }
  const validation = row.validation as GuardrailCheck;
  const plan = row.plan as AgentPlan;
  if (!validation.ok || !plan.feasible) {
    const [rejected] = await db
      .update(agentIntentsTable)
      .set({ status: "rejected", error: null })
      .where(eq(agentIntentsTable.id, row.id))
      .returning();
    res.status(422).json(serialize(rejected));
    return;
  }

  try {
    const { txHashes } = await executePlan(plan);
    const [done] = await db
      .update(agentIntentsTable)
      .set({ status: "executed", txHashes, error: null, executedAt: new Date() })
      .where(eq(agentIntentsTable.id, row.id))
      .returning();
    res.json(serialize(done));
  } catch (err) {
    req.log.error({ err }, "Execute intent failed");
    const [failed] = await db
      .update(agentIntentsTable)
      .set({ status: "failed", error: (err as Error).message })
      .where(eq(agentIntentsTable.id, row.id))
      .returning();
    res.status(500).json(serialize(failed));
  }
});

export default router;
