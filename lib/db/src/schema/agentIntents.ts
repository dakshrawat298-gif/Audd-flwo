import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentIntentsTable = pgTable("agent_intents", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  category: text("category").notNull().default("unknown"),
  summary: text("summary").notNull().default(""),
  status: text("status").notNull().default("planned"),
  reasoning: text("reasoning").notNull().default(""),
  plan: jsonb("plan").notNull(),
  validation: jsonb("validation").notNull(),
  txHashes: text("tx_hashes").array().notNull().default([]),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  executedAt: timestamp("executed_at", { withTimezone: true }),
});

export const insertAgentIntentSchema = createInsertSchema(agentIntentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentIntent = z.infer<typeof insertAgentIntentSchema>;
export type AgentIntentRow = typeof agentIntentsTable.$inferSelect;
