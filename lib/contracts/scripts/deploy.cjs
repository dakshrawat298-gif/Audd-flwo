const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const NATIVE = "0x0000000000000000000000000000000000000000";

// Demo employees (deterministic testnet addresses; keys not needed to receive).
const DEMO_EMPLOYEES = [
  { name: "Alice Nguyen", role: "Engineering", salary: "6000" },
  { name: "Bruno Costa", role: "Design", salary: "5000" },
  { name: "Carol Idris", role: "Operations", salary: "4500" },
  { name: "Dele Okoro", role: "Growth", salary: "4000" },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const agentKey = process.env.AGENT_PRIVATE_KEY;
  if (!agentKey) throw new Error("AGENT_PRIVATE_KEY missing");
  const agent = new ethers.Wallet(agentKey, ethers.provider);

  const provider = ethers.provider;
  const bal = await provider.getBalance(deployer.address);
  console.log("Network:", network.name, "chainId:", (await provider.getNetwork()).chainId.toString());
  console.log("Deployer:", deployer.address, "balance:", ethers.formatEther(bal), "BOT");
  console.log("Agent:", agent.address);
  if (bal === 0n) throw new Error("Deployer has 0 BOT — fund it from the faucet first");

  // 1. Deploy aUSD
  const USD = await ethers.getContractFactory("AuddUSD");
  const usd = await USD.deploy(deployer.address);
  await usd.waitForDeployment();
  const usdAddr = await usd.getAddress();
  console.log("AuddUSD:", usdAddr, "tx:", usd.deploymentTransaction().hash);

  // 2. Deploy Treasury
  const Treasury = await ethers.getContractFactory("AuddTreasury");
  const treasury = await Treasury.deploy(deployer.address, agent.address);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("AuddTreasury:", treasuryAddr, "tx:", treasury.deploymentTransaction().hash);

  // 3. Guardrails
  await (await treasury.setGuardrail(usdAddr, ethers.parseEther("8000"), ethers.parseEther("60000"))).wait();
  await (await treasury.setGuardrail(NATIVE, ethers.parseEther("1"), ethers.parseEther("3"))).wait();
  console.log("Guardrails set.");

  // 4. Fund treasury: mint aUSD + send a little native BOT for streams/native payroll
  await (await usd.mint(treasuryAddr, ethers.parseEther("120000"))).wait();
  await (await deployer.sendTransaction({ to: treasuryAddr, value: ethers.parseEther("0.05") })).wait();
  console.log("Treasury funded: 120000 aUSD + 0.05 BOT.");

  // 5. Fund agent with a bit of gas
  const agentBal = await provider.getBalance(agent.address);
  if (agentBal < ethers.parseEther("0.02")) {
    await (await deployer.sendTransaction({ to: agent.address, value: ethers.parseEther("0.03") })).wait();
    console.log("Agent funded with 0.03 BOT for gas.");
  }

  // 6. Add demo employees
  const employees = [];
  for (const e of DEMO_EMPLOYEES) {
    const w = ethers.Wallet.createRandom();
    await (
      await treasury.addEmployee(w.address, e.name, e.role, ethers.parseEther(e.salary), usdAddr)
    ).wait();
    employees.push({ ...e, address: w.address });
    console.log("Employee:", e.name, w.address);
  }

  // 7. Write deployment record + ABIs for the backend
  const usdArtifact = require("../artifacts/contracts/AuddUSD.sol/AuddUSD.json");
  const treasuryArtifact = require("../artifacts/contracts/AuddTreasury.sol/AuddTreasury.json");
  const net = await provider.getNetwork();
  const block = await provider.getBlockNumber();

  const record = {
    network: network.name,
    chainId: Number(net.chainId),
    rpcUrl: process.env.BOTCHAIN_RPC_URL || "https://rpc.bohr.life",
    explorer: "https://scan.bohr.life",
    deployedAtBlock: block,
    deployedAt: new Date().toISOString(),
    owner: deployer.address,
    agent: agent.address,
    contracts: {
      AuddUSD: { address: usdAddr, abi: usdArtifact.abi },
      AuddTreasury: { address: treasuryAddr, abi: treasuryArtifact.abi },
    },
    tokens: {
      NATIVE: { symbol: "BOT", address: NATIVE, decimals: 18 },
      aUSD: { symbol: "aUSD", address: usdAddr, decimals: 18 },
    },
    employees,
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2));
  console.log("Wrote", outFile);
  console.log("\nDONE. Explorer:", `https://scan.bohr.life/address/${treasuryAddr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
