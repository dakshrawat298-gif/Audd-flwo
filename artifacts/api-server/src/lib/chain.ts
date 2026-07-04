import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";
import { logger } from "./logger";

export const NATIVE = "0x0000000000000000000000000000000000000000";
export const EXPLORER_URL = "https://scan.bohr.life";
export const FAUCET_URL = "https://faucet.botchain.ai/basic";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const DEPLOYMENTS_DIR = path.resolve(workspaceRoot, "lib/contracts/deployments");

export interface TokenMeta {
  symbol: string;
  address: string;
  decimals: number;
}

export interface DeploymentRecord {
  network: string;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  deployedAtBlock: number;
  deployedAt: string;
  owner: string;
  agent: string;
  contracts: {
    AuddUSD: { address: string; abi: unknown[] };
    AuddTreasury: { address: string; abi: unknown[] };
  };
  tokens: {
    NATIVE: TokenMeta;
    aUSD: TokenMeta;
  };
  employees: { name: string; role: string; salary: string; address: string }[];
}

// Cache the successfully-loaded deployment only. A missing deployment is never
// cached, so the API auto-recovers once contracts are deployed while it runs.
let cached: DeploymentRecord | null = null;

export function loadDeployment(): DeploymentRecord | null {
  if (cached) return cached;
  try {
    if (!fs.existsSync(DEPLOYMENTS_DIR)) return null;
    const files = fs
      .readdirSync(DEPLOYMENTS_DIR)
      .filter((f) => f.endsWith(".json"));
    const preferred = files.find((f) => f === "bohrTestnet.json") ?? files[0];
    if (!preferred) return null;
    const raw = fs.readFileSync(path.join(DEPLOYMENTS_DIR, preferred), "utf8");
    cached = JSON.parse(raw) as DeploymentRecord;
    return cached;
  } catch (err) {
    logger.error({ err }, "Failed to load deployment record");
    return null;
  }
}

export function isDeployed(): boolean {
  return loadDeployment() !== null;
}

export function requireDeployment(): DeploymentRecord {
  const d = loadDeployment();
  if (!d) {
    throw new Error(
      "Contracts are not deployed yet. Fund the deployer and run the testnet deploy first.",
    );
  }
  return d;
}

let providerRef: ethers.JsonRpcProvider | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  const d = requireDeployment();
  if (!providerRef) {
    providerRef = new ethers.JsonRpcProvider(d.rpcUrl, d.chainId, {
      staticNetwork: true,
    });
  }
  return providerRef;
}

function requireKey(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} environment variable is required`);
  return v;
}

export function getAgentSigner(): ethers.Wallet {
  return new ethers.Wallet(requireKey("AGENT_PRIVATE_KEY"), getProvider());
}

export function getOwnerSigner(): ethers.Wallet {
  return new ethers.Wallet(requireKey("DEPLOYER_PRIVATE_KEY"), getProvider());
}

export function treasuryContract(
  runner: ethers.ContractRunner,
): ethers.Contract {
  const d = requireDeployment();
  return new ethers.Contract(
    d.contracts.AuddTreasury.address,
    d.contracts.AuddTreasury.abi as ethers.InterfaceAbi,
    runner,
  );
}

export function usdContract(runner: ethers.ContractRunner): ethers.Contract {
  const d = requireDeployment();
  return new ethers.Contract(
    d.contracts.AuddUSD.address,
    d.contracts.AuddUSD.abi as ethers.InterfaceAbi,
    runner,
  );
}

/** Resolve a token label ("aUSD" | "BOT" | address) to its on-chain address. */
export function resolveToken(label: string | null | undefined): string {
  const d = requireDeployment();
  if (!label) return d.tokens.aUSD.address;
  const l = label.trim();
  if (l.toLowerCase() === "bot" || l.toLowerCase() === "native") return NATIVE;
  if (l.toLowerCase() === "ausd") return d.tokens.aUSD.address;
  if (ethers.isAddress(l)) return ethers.getAddress(l);
  return d.tokens.aUSD.address;
}

export function tokenMeta(address: string): TokenMeta {
  const d = requireDeployment();
  if (address === NATIVE || address.toLowerCase() === NATIVE) {
    return d.tokens.NATIVE;
  }
  return d.tokens.aUSD;
}

export function symbolFor(address: string): string {
  return tokenMeta(address).symbol;
}

export function fmt(raw: bigint, decimals = 18): string {
  const s = ethers.formatUnits(raw, decimals);
  return s.replace(/\.0$/, "");
}

/** Human-readable amount formatting with thousands separators, trimmed. */
export function pretty(raw: bigint, decimals = 18): string {
  const n = Number(ethers.formatUnits(raw, decimals));
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function parseAmount(human: string, decimals = 18): bigint {
  return ethers.parseUnits(human, decimals);
}

export function txExplorer(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function addressExplorer(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}
