import { ethers } from "ethers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";
import {
  requireDeployment,
  getProvider,
  getAgentSigner,
  getOwnerSigner,
  treasuryContract,
  resolveToken,
  tokenMeta,
  parseAmount,
  pretty,
  txExplorer,
  NATIVE,
} from "./chain";
import { fetchEmployeesRaw } from "./service";

export type PlanActionType =
  | "pay"
  | "payroll"
  | "stream"
  | "pause"
  | "unpause"
  | "guardrail"
  | "unknown";

export interface PlanAction {
  type: PlanActionType;
  description: string;
  token: string | null;
  tokenSymbol: string | null;
  amount: string | null;
  amountFormatted: string | null;
  recipient: string | null;
  recipientName: string | null;
  // internal (not serialized to client via schema, but harmless if present)
  perTxCap?: string;
  dailyCap?: string;
  ratePerSecond?: string;
  stop?: number;
}

export interface AgentPlan {
  intent: string;
  category: string;
  feasible: boolean;
  notes: string | null;
  actions: PlanAction[];
}

export interface GuardrailCheck {
  ok: boolean;
  violations: string[];
}

export interface PlanResult {
  category: string;
  summary: string;
  reasoning: string;
  plan: AgentPlan;
  validation: GuardrailCheck;
}

interface EmployeeLite {
  wallet: string;
  name: string;
  role: string;
  salary: bigint;
  salaryToken: string;
  active: boolean;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

function geminiModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new AiUnavailableError(
      "GEMINI_API_KEY is not configured. Add it in the Secrets tab to enable the AI treasury agent.",
    );
  }
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
}

/** Ask the LLM to classify the instruction into a structured skeleton. */
async function aiClassify(
  prompt: string,
  employees: EmployeeLite[],
): Promise<{
  category: string;
  reasoning: string;
  actions: {
    type: PlanActionType;
    employeeName?: string | null;
    all?: boolean;
    token?: string | null;
    amount?: string | null;
    ratePerDay?: string | null;
    durationDays?: number | null;
    perTxCap?: string | null;
    dailyCap?: string | null;
  }[];
}> {
  const model = geminiModel();
  const roster = employees
    .map((e) => `- ${e.name} (${e.role}) active=${e.active}`)
    .join("\n");
  const sys = `You are the treasury operations agent for a company on the BOT Chain. You translate a plain-English instruction from the operator into a strict JSON plan. You never invent employees or amounts. Available tokens: "aUSD" (stablecoin) and "BOT" (native gas token). Current employees:\n${roster}\n\nReturn ONLY JSON of shape: {"category": string, "reasoning": string, "actions": [{"type": "pay"|"payroll"|"stream"|"pause"|"unpause"|"guardrail"|"unknown", "employeeName": string|null, "all": boolean, "token": "aUSD"|"BOT"|null, "amount": string|null, "ratePerDay": string|null, "durationDays": number|null, "perTxCap": string|null, "dailyCap": string|null}]}. "amount"/"ratePerDay"/caps are plain decimal strings without symbols. "payroll" with all=true means pay every active employee their monthly salary. "reasoning" is one or two sentences explaining what you understood and why it is safe.`;

  try {
    const result = await model.generateContent(
      `${sys}\n\nOperator instruction: ${prompt}`,
    );
    const content = result.response.text();
    if (!content) {
      throw new AiUnavailableError("The AI agent returned an empty response.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new AiUnavailableError(
        "The AI agent returned a response that was not valid JSON.",
      );
    }
    return normalizeSkeleton(parsed);
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    logger.error({ err }, "Gemini classify failed");
    throw new AiUnavailableError(
      `The AI treasury agent could not process this instruction: ${(err as Error).message}`,
    );
  }
}

const VALID_ACTION_TYPES: PlanActionType[] = [
  "pay",
  "payroll",
  "stream",
  "pause",
  "unpause",
  "guardrail",
  "unknown",
];

/** Validate and coerce the raw model output into the expected skeleton shape. */
function normalizeSkeleton(raw: unknown): {
  category: string;
  reasoning: string;
  actions: {
    type: PlanActionType;
    employeeName?: string | null;
    all?: boolean;
    token?: string | null;
    amount?: string | null;
    ratePerDay?: string | null;
    durationDays?: number | null;
    perTxCap?: string | null;
    dailyCap?: string | null;
  }[];
} {
  if (typeof raw !== "object" || raw === null) {
    throw new AiUnavailableError(
      "The AI agent returned an unexpected response shape.",
    );
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.actions)) {
    throw new AiUnavailableError(
      "The AI agent did not return a list of actions.",
    );
  }
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;
  const actions = obj.actions.map((a) => {
    const action = (a ?? {}) as Record<string, unknown>;
    const type = VALID_ACTION_TYPES.includes(action.type as PlanActionType)
      ? (action.type as PlanActionType)
      : "unknown";
    return {
      type,
      employeeName: str(action.employeeName),
      all: action.all === true,
      token: str(action.token),
      amount: str(action.amount),
      ratePerDay: str(action.ratePerDay),
      durationDays:
        typeof action.durationDays === "number" ? action.durationDays : null,
      perTxCap: str(action.perTxCap),
      dailyCap: str(action.dailyCap),
    };
  });
  return {
    category: str(obj.category) ?? "unknown",
    reasoning: str(obj.reasoning) ?? "",
    actions,
  };
}

function findEmployee(
  name: string,
  employees: EmployeeLite[],
): EmployeeLite | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  let hit = employees.find((e) => e.name.toLowerCase() === n);
  if (hit) return hit;
  hit = employees.find(
    (e) => e.name.toLowerCase().split(" ")[0] === n.split(" ")[0],
  );
  if (hit) return hit;
  hit = employees.find((e) => e.name.toLowerCase().includes(n));
  return hit ?? null;
}

/** Plan a natural-language treasury intent into validated on-chain actions. */
export async function planIntent(prompt: string): Promise<PlanResult> {
  requireDeployment();
  const rawEmployees = await fetchEmployeesRaw();
  const employees: EmployeeLite[] = rawEmployees.map((e) => ({
    wallet: e.wallet,
    name: e.name,
    role: e.role,
    salary: e.salary,
    salaryToken: e.salaryToken,
    active: e.active,
  }));

  const skeleton = await aiClassify(prompt, employees);

  const actions: PlanAction[] = [];
  const violations: string[] = [];
  let feasible = true;

  // Track per-token spend to validate daily caps across a batch.
  const t = treasuryContract(getProvider());
  const projectedSpend: Record<string, bigint> = {};

  const capCheck = async (tokenAddr: string, amount: bigint) => {
    const meta = tokenMeta(tokenAddr);
    const perTx = (await t.perTxCap(tokenAddr)) as bigint;
    const daily = (await t.dailyCap(tokenAddr)) as bigint;
    const spent = (await t.spentToday(tokenAddr)) as bigint;
    if (perTx === 0n || daily === 0n) {
      violations.push(`${meta.symbol} is not enabled for agent spending.`);
      feasible = false;
      return;
    }
    if (amount > perTx) {
      violations.push(
        `${pretty(amount, meta.decimals)} ${meta.symbol} exceeds the per-transaction cap of ${pretty(perTx, meta.decimals)} ${meta.symbol}.`,
      );
      feasible = false;
    }
    const already = projectedSpend[tokenAddr] ?? 0n;
    if (spent + already + amount > daily) {
      violations.push(
        `This would exceed today's ${meta.symbol} spend cap (${pretty(daily, meta.decimals)} ${meta.symbol}/day).`,
      );
      feasible = false;
    }
    projectedSpend[tokenAddr] = already + amount;
  };

  for (const a of skeleton.actions) {
    if (a.type === "pause") {
      actions.push(mkAction("pause", "Pause all autonomous agent spending."));
    } else if (a.type === "unpause") {
      actions.push(
        mkAction("unpause", "Resume all autonomous agent spending."),
      );
    } else if (a.type === "guardrail") {
      const tokenAddr = resolveToken(a.token);
      const meta = tokenMeta(tokenAddr);
      const perTx = a.perTxCap ?? null;
      const daily = a.dailyCap ?? a.perTxCap ?? null;
      if (!perTx || !daily) {
        feasible = false;
        violations.push("Guardrail update needs a per-tx and daily cap.");
      }
      actions.push({
        ...mkAction(
          "guardrail",
          `Set ${meta.symbol} guardrails to ${perTx ?? "?"}/tx and ${daily ?? "?"}/day.`,
        ),
        token: tokenAddr,
        tokenSymbol: meta.symbol,
        perTxCap: perTx ?? undefined,
        dailyCap: daily ?? undefined,
      });
    } else if (a.type === "payroll") {
      const active = employees.filter((e) => e.active);
      if (active.length === 0) {
        feasible = false;
        violations.push("No active employees to pay.");
      }
      for (const e of active) {
        await capCheck(e.salaryToken, e.salary);
        const meta = tokenMeta(e.salaryToken);
        actions.push({
          type: "payroll",
          description: `Pay ${e.name} ${pretty(e.salary, meta.decimals)} ${meta.symbol}`,
          token: e.salaryToken,
          tokenSymbol: meta.symbol,
          amount: e.salary.toString(),
          amountFormatted: pretty(e.salary, meta.decimals),
          recipient: e.wallet,
          recipientName: e.name,
        });
      }
    } else if (a.type === "pay") {
      const emp = a.employeeName ? findEmployee(a.employeeName, employees) : null;
      const tokenAddr = resolveToken(a.token);
      const meta = tokenMeta(tokenAddr);
      if (!emp) {
        feasible = false;
        violations.push(
          `Could not find an active employee matching "${a.employeeName ?? "?"}".`,
        );
      } else if (!emp.active) {
        feasible = false;
        violations.push(`${emp.name} is not an active employee.`);
      }
      if (!a.amount) {
        feasible = false;
        violations.push("No amount was specified for this payment.");
      }
      const amt = a.amount ? parseAmount(a.amount, meta.decimals) : 0n;
      if (emp && emp.active && amt > 0n) await capCheck(tokenAddr, amt);
      actions.push({
        type: "pay",
        description: emp
          ? `Pay ${emp.name} ${a.amount ?? "?"} ${meta.symbol}`
          : `Pay ${a.amount ?? "?"} ${meta.symbol}`,
        token: tokenAddr,
        tokenSymbol: meta.symbol,
        amount: amt > 0n ? amt.toString() : null,
        amountFormatted: a.amount ?? null,
        recipient: emp?.wallet ?? null,
        recipientName: emp?.name ?? null,
      });
    } else if (a.type === "stream") {
      const emp = a.employeeName ? findEmployee(a.employeeName, employees) : null;
      const tokenAddr = resolveToken(a.token);
      const meta = tokenMeta(tokenAddr);
      if (!emp || !emp.active) {
        feasible = false;
        violations.push(
          `Streams require an active employee${a.employeeName ? ` (couldn't match "${a.employeeName}")` : ""}.`,
        );
      }
      if (!a.ratePerDay) {
        feasible = false;
        violations.push("No daily rate was specified for the stream.");
      }
      const daily = (await t.dailyCap(tokenAddr)) as bigint;
      const perTx = (await t.perTxCap(tokenAddr)) as bigint;
      if (daily === 0n || perTx === 0n) {
        feasible = false;
        violations.push(`${meta.symbol} is not enabled for streaming.`);
      }
      const perDay = a.ratePerDay ? parseAmount(a.ratePerDay, meta.decimals) : 0n;
      if (perDay > 0n && daily > 0n && perDay > daily) {
        feasible = false;
        violations.push(
          `A stream of ${a.ratePerDay} ${meta.symbol}/day exceeds the ${meta.symbol} daily cap of ${pretty(daily, meta.decimals)} ${meta.symbol}.`,
        );
      }
      const ratePerSecond = perDay / BigInt(60 * 60 * 24);
      const stop = a.durationDays
        ? Math.floor(Date.now() / 1000) + a.durationDays * 86400
        : 0;
      actions.push({
        type: "stream",
        description: emp
          ? `Stream ${a.ratePerDay ?? "?"} ${meta.symbol}/day to ${emp.name}${a.durationDays ? ` for ${a.durationDays} days` : ""}`
          : `Stream ${a.ratePerDay ?? "?"} ${meta.symbol}/day`,
        token: tokenAddr,
        tokenSymbol: meta.symbol,
        amount: perDay > 0n ? perDay.toString() : null,
        amountFormatted: a.ratePerDay ?? null,
        recipient: emp?.wallet ?? null,
        recipientName: emp?.name ?? null,
        ratePerSecond: ratePerSecond.toString(),
        stop,
      });
    } else {
      feasible = false;
      actions.push(
        mkAction(
          "unknown",
          "This instruction could not be mapped to a treasury action.",
        ),
      );
    }
  }

  const summary = buildSummary(skeleton.category, actions);
  const plan: AgentPlan = {
    intent: prompt,
    category: skeleton.category,
    feasible,
    notes: "Planned by the Gemini AI treasury agent.",
    actions,
  };

  return {
    category: skeleton.category,
    summary,
    reasoning: skeleton.reasoning,
    plan,
    validation: { ok: violations.length === 0, violations },
  };
}

function mkAction(type: PlanActionType, description: string): PlanAction {
  return {
    type,
    description,
    token: null,
    tokenSymbol: null,
    amount: null,
    amountFormatted: null,
    recipient: null,
    recipientName: null,
  };
}

function buildSummary(category: string, actions: PlanAction[]): string {
  if (actions.length === 0) return "No actions.";
  if (actions.length === 1) return actions[0].description;
  if (category === "payroll") {
    const total = actions.length;
    const sym = actions[0].tokenSymbol ?? "";
    return `Run payroll for ${total} employees in ${sym}`;
  }
  return `${actions.length} actions`;
}

/** Execute a validated plan on-chain. Returns the resulting tx hashes. */
export async function executePlan(
  plan: AgentPlan,
): Promise<{ txHashes: string[] }> {
  requireDeployment();
  const agent = getAgentSigner();
  const owner = getOwnerSigner();
  const treasuryAsAgent = treasuryContract(agent);
  const treasuryAsOwner = treasuryContract(owner);
  const txHashes: string[] = [];

  // Group payroll actions into a single batch per token.
  const payrollByToken = new Map<
    string,
    { to: string[]; amounts: bigint[] }
  >();

  for (const a of plan.actions) {
    if (a.type === "payroll" && a.recipient && a.amount) {
      const g = payrollByToken.get(a.token!) ?? { to: [], amounts: [] };
      g.to.push(a.recipient);
      g.amounts.push(BigInt(a.amount));
      payrollByToken.set(a.token!, g);
    }
  }

  for (const [token, batch] of payrollByToken) {
    const tx = await treasuryAsAgent.executePayroll(
      token,
      batch.to,
      batch.amounts,
      `Monthly payroll — ${batch.to.length} employees`,
    );
    const receipt = await tx.wait();
    txHashes.push(receipt.hash);
  }

  for (const a of plan.actions) {
    if (a.type === "pay" && a.recipient && a.amount) {
      const tx = await treasuryAsAgent.executePayroll(
        a.token,
        [a.recipient],
        [BigInt(a.amount)],
        a.description,
      );
      const receipt = await tx.wait();
      txHashes.push(receipt.hash);
    } else if (a.type === "stream" && a.recipient && a.ratePerSecond) {
      const tx = await treasuryAsAgent.createStream(
        a.token,
        a.recipient,
        BigInt(a.ratePerSecond),
        BigInt(a.stop ?? 0),
        a.description,
      );
      const receipt = await tx.wait();
      txHashes.push(receipt.hash);
    } else if (a.type === "pause") {
      const tx = await treasuryAsOwner.pause();
      const receipt = await tx.wait();
      txHashes.push(receipt.hash);
    } else if (a.type === "unpause") {
      const tx = await treasuryAsOwner.unpause();
      const receipt = await tx.wait();
      txHashes.push(receipt.hash);
    } else if (a.type === "guardrail" && a.token && a.perTxCap && a.dailyCap) {
      const meta = tokenMeta(a.token);
      const tx = await treasuryAsOwner.setGuardrail(
        a.token,
        parseAmount(a.perTxCap, meta.decimals),
        parseAmount(a.dailyCap, meta.decimals),
      );
      const receipt = await tx.wait();
      txHashes.push(receipt.hash);
    }
  }

  return { txHashes };
}

export { txExplorer, NATIVE, ethers };
