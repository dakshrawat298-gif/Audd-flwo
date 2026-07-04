const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const net = await provider.getNetwork();
  console.log("chainId:", net.chainId.toString());
  console.log("Deployer:", deployer.address, ethers.formatEther(await provider.getBalance(deployer.address)), "BOT");
  if (process.env.AGENT_PRIVATE_KEY) {
    const agent = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
    console.log("Agent:", agent.address, ethers.formatEther(await provider.getBalance(agent.address)), "BOT");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
