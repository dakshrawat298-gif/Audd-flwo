import { ethers } from "ethers";
import {
  loadDeployment,
  requireDeployment,
  getProvider,
  treasuryContract,
  NATIVE,
  EXPLORER_URL,
  FAUCET_URL,
  pretty,
  txExplorer,
  tokenMeta,
} from "./chain";

const SECONDS_PER_MONTH = 60 * 60 * 24 * 30;

export function buildConfig() {
  const d = loadDeployment();
  const chainId = d?.chainId ?? Number(process.env.BOTCHAIN_CHAIN_ID ?? 968);
  const rpcUrl =
    d?.rpcUrl ?? process.env.BOTCHAIN_RPC_URL ?? "https://rpc.bohr.life";
  return {
    network: {
      name: d?.network ?? "BOT Chain Testnet",
      chainId,
      rpcUrl,
      explorerUrl: EXPLORER_URL,
      faucetUrl: FAUCET_URL,
      nativeToken: d?.tokens.NATIVE ?? {
        symbol: "BOT",
        address: NATIVE,
        decimals: 18,
      },
      ausdToken: d?.tokens.aUSD ?? null,
    },
    deployment: {
      deployed: !!d,
      owner: d?.owner ?? null,
      agent: d?.agent ?? null,
      treasuryAddress: d?.contracts.AuddTreasury.address ?? null,
      ausdAddress: d?.contracts.AuddUSD.address ?? null,
      deployedAtBlock: d?.deployedAtBlock ?? null,
      deployedAt: d?.deployedAt ?? null,
    },
  };
}

interface RawEmployee {
  wallet: string;
  name: string;
  role: string;
  salary: bigint;
  salaryToken: string;
  active: boolean;
  addedAt: bigint;
}

export async function fetchEmployeesRaw(): Promise<RawEmployee[]> {
  const t = treasuryContract(getProvider());
  const list = await t.getEmployees();
  return list.map((e: unknown[]) => ({
    wallet: e[0] as string,
    name: e[1] as string,
    role: e[2] as string,
    salary: e[3] as bigint,
    salaryToken: e[4] as string,
    active: e[5] as boolean,
    addedAt: e[6] as bigint,
  }));
}

export function mapEmployee(e: RawEmployee) {
  const meta = tokenMeta(e.salaryToken);
  return {
    address: e.wallet,
    name: e.name,
    role: e.role,
    salary: e.salary.toString(),
    salaryFormatted: pretty(e.salary, meta.decimals),
    salaryToken: e.salaryToken,
    salarySymbol: meta.symbol,
    active: e.active,
    addedAt: Number(e.addedAt),
  };
}

export async function listEmployees() {
  const raw = await fetchEmployeesRaw();
  return raw.map(mapEmployee);
}

export async function getTreasurySummary() {
  const d = requireDeployment();
  const t = treasuryContract(getProvider());

  const [paused, employeesRaw] = await Promise.all([
    t.paused() as Promise<boolean>,
    fetchEmployeesRaw(),
  ]);

  const tokens = [d.tokens.aUSD, d.tokens.NATIVE];
  const balances = [];
  const guardrails = [];
  for (const tok of tokens) {
    const [bal, perTx, daily, spent] = await Promise.all([
      t.balanceOf(tok.address) as Promise<bigint>,
      t.perTxCap(tok.address) as Promise<bigint>,
      t.dailyCap(tok.address) as Promise<bigint>,
      t.spentToday(tok.address) as Promise<bigint>,
    ]);
    balances.push({
      token: tok.address,
      symbol: tok.symbol,
      decimals: tok.decimals,
      raw: bal.toString(),
      formatted: pretty(bal, tok.decimals),
    });
    const remaining = daily > spent ? daily - spent : 0n;
    guardrails.push({
      token: tok.address,
      symbol: tok.symbol,
      perTxCap: perTx.toString(),
      perTxCapFormatted: pretty(perTx, tok.decimals),
      dailyCap: daily.toString(),
      dailyCapFormatted: pretty(daily, tok.decimals),
      spentToday: spent.toString(),
      spentTodayFormatted: pretty(spent, tok.decimals),
      remainingToday: remaining.toString(),
      remainingTodayFormatted: pretty(remaining, tok.decimals),
    });
  }

  const active = employeesRaw.filter((e) => e.active);
  let monthly = 0n;
  for (const e of active) {
    if (e.salaryToken === d.tokens.aUSD.address) monthly += e.salary;
  }

  return {
    treasuryAddress: d.contracts.AuddTreasury.address,
    paused,
    balances,
    guardrails,
    employeeCount: employeesRaw.length,
    activeEmployeeCount: active.length,
    monthlyPayroll: monthly.toString(),
    monthlyPayrollFormatted: pretty(monthly, d.tokens.aUSD.decimals),
  };
}

interface RawStream {
  to: string;
  token: string;
  ratePerSecond: bigint;
  start: bigint;
  stop: bigint;
  lastClaim: bigint;
  claimed: bigint;
  active: boolean;
}

export async function listStreams() {
  const t = treasuryContract(getProvider());
  const [rawList, employeesRaw] = await Promise.all([
    t.getStreams() as Promise<unknown[][]>,
    fetchEmployeesRaw(),
  ]);
  const names = new Map(
    employeesRaw.map((e) => [e.wallet.toLowerCase(), e.name]),
  );

  const out = [];
  for (let i = 0; i < rawList.length; i++) {
    const s: RawStream = {
      to: rawList[i][0] as string,
      token: rawList[i][1] as string,
      ratePerSecond: rawList[i][2] as bigint,
      start: rawList[i][3] as bigint,
      stop: rawList[i][4] as bigint,
      lastClaim: rawList[i][5] as bigint,
      claimed: rawList[i][6] as bigint,
      active: rawList[i][7] as boolean,
    };
    const meta = tokenMeta(s.token);
    const claimable = (await t.claimable(i)) as bigint;
    const ratePerDay = s.ratePerSecond * BigInt(60 * 60 * 24);
    out.push({
      id: i,
      to: s.to,
      toName: names.get(s.to.toLowerCase()) ?? "External wallet",
      token: s.token,
      symbol: meta.symbol,
      ratePerSecond: s.ratePerSecond.toString(),
      ratePerDayFormatted: pretty(ratePerDay, meta.decimals),
      start: Number(s.start),
      stop: Number(s.stop),
      lastClaim: Number(s.lastClaim),
      claimed: s.claimed.toString(),
      claimedFormatted: pretty(s.claimed, meta.decimals),
      claimable: claimable.toString(),
      claimableFormatted: pretty(claimable, meta.decimals),
      active: s.active,
    });
  }
  return out;
}

type ActivityEvent = {
  type: string;
  title: string;
  subtitle: string;
  amount: string | null;
  amountFormatted: string | null;
  symbol: string | null;
  address: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  blockNumber: number | null;
  timestamp: number | null;
};

export async function listActivity(): Promise<ActivityEvent[]> {
  const d = requireDeployment();
  const provider = getProvider();
  const t = treasuryContract(provider);
  const employeesRaw = await fetchEmployeesRaw();
  const names = new Map(
    employeesRaw.map((e) => [e.wallet.toLowerCase(), e.name]),
  );
  const nameFor = (addr: string) =>
    names.get(addr.toLowerCase()) ?? shorten(addr);

  const fromBlock = Math.max(0, d.deployedAtBlock - 1);
  const logs = await t.queryFilter("*", fromBlock, "latest");

  const blockTimes = new Map<number, number>();
  const events: ActivityEvent[] = [];

  for (const log of logs) {
    const parsed =
      "args" in log && log.args
        ? (log as ethers.EventLog)
        : null;
    if (!parsed || !parsed.eventName) continue;
    const name = parsed.eventName;
    const bn = log.blockNumber;
    if (!blockTimes.has(bn)) {
      const block = await provider.getBlock(bn);
      blockTimes.set(bn, block ? Number(block.timestamp) : 0);
    }
    const ts = blockTimes.get(bn) ?? 0;
    const base = {
      txHash: log.transactionHash,
      explorerUrl: txExplorer(log.transactionHash),
      blockNumber: bn,
      timestamp: ts,
    };

    if (name === "PaymentSent") {
      const meta = tokenMeta(parsed.args[1] as string);
      const amount = parsed.args[3] as bigint;
      events.push({
        type: "payment",
        title: `Paid ${nameFor(parsed.args[2] as string)}`,
        subtitle: `${pretty(amount, meta.decimals)} ${meta.symbol} salary payment`,
        amount: amount.toString(),
        amountFormatted: pretty(amount, meta.decimals),
        symbol: meta.symbol,
        address: parsed.args[2] as string,
        ...base,
      });
    } else if (name === "IntentLogged") {
      events.push({
        type: "intent",
        title: `Agent intent: ${parsed.args[2] as string}`,
        subtitle: parsed.args[3] as string,
        amount: null,
        amountFormatted: null,
        symbol: null,
        address: parsed.args[1] as string,
        ...base,
      });
    } else if (name === "StreamCreated") {
      const meta = tokenMeta(parsed.args[2] as string);
      events.push({
        type: "stream_created",
        title: `Stream opened to ${nameFor(parsed.args[1] as string)}`,
        subtitle: `Continuous ${meta.symbol} salary stream`,
        amount: null,
        amountFormatted: null,
        symbol: meta.symbol,
        address: parsed.args[1] as string,
        ...base,
      });
    } else if (name === "StreamClaimed") {
      const amount = parsed.args[2] as bigint;
      events.push({
        type: "stream_claimed",
        title: `Stream claimed by ${nameFor(parsed.args[1] as string)}`,
        subtitle: `${pretty(amount)} claimed from salary stream`,
        amount: amount.toString(),
        amountFormatted: pretty(amount),
        symbol: null,
        address: parsed.args[1] as string,
        ...base,
      });
    } else if (name === "Deposited") {
      const meta = tokenMeta(parsed.args[0] as string);
      const amount = parsed.args[2] as bigint;
      events.push({
        type: "deposit",
        title: `Treasury funded`,
        subtitle: `${pretty(amount, meta.decimals)} ${meta.symbol} deposited`,
        amount: amount.toString(),
        amountFormatted: pretty(amount, meta.decimals),
        symbol: meta.symbol,
        address: parsed.args[1] as string,
        ...base,
      });
    } else if (name === "GuardrailUpdated") {
      const meta = tokenMeta(parsed.args[0] as string);
      events.push({
        type: "guardrail",
        title: `Guardrail updated`,
        subtitle: `${meta.symbol} caps: ${pretty(parsed.args[1] as bigint, meta.decimals)}/tx, ${pretty(parsed.args[2] as bigint, meta.decimals)}/day`,
        amount: null,
        amountFormatted: null,
        symbol: meta.symbol,
        address: null,
        ...base,
      });
    } else if (name === "EmployeeAdded") {
      events.push({
        type: "employee",
        title: `Employee added`,
        subtitle: `${parsed.args[1] as string} joined the allow-list`,
        amount: null,
        amountFormatted: null,
        symbol: null,
        address: parsed.args[0] as string,
        ...base,
      });
    } else if (name === "EmployeeUpdated") {
      events.push({
        type: "employee",
        title: `Employee ${(parsed.args[1] as boolean) ? "activated" : "deactivated"}`,
        subtitle: nameFor(parsed.args[0] as string),
        amount: null,
        amountFormatted: null,
        symbol: null,
        address: parsed.args[0] as string,
        ...base,
      });
    } else if (name === "Paused") {
      events.push({
        type: "paused",
        title: "Agent spending paused",
        subtitle: "All autonomous payments halted by owner",
        amount: null,
        amountFormatted: null,
        symbol: null,
        address: null,
        ...base,
      });
    } else if (name === "Unpaused") {
      events.push({
        type: "unpaused",
        title: "Agent spending resumed",
        subtitle: "Autonomous payments re-enabled by owner",
        amount: null,
        amountFormatted: null,
        symbol: null,
        address: null,
        ...base,
      });
    }
  }

  events.reverse();
  return events.slice(0, 100);
}

function shorten(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export { SECONDS_PER_MONTH };
