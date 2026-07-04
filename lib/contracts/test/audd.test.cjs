const { expect } = require("chai");
const { ethers } = require("hardhat");

const NATIVE = "0x0000000000000000000000000000000000000000";

describe("Audd Flow contracts", function () {
  let owner, agent, alice, bob, outsider;
  let usd, treasury;

  beforeEach(async function () {
    [owner, agent, alice, bob, outsider] = await ethers.getSigners();

    const USD = await ethers.getContractFactory("AuddUSD");
    usd = await USD.deploy(owner.address);
    await usd.waitForDeployment();

    const Treasury = await ethers.getContractFactory("AuddTreasury");
    treasury = await Treasury.deploy(owner.address, agent.address);
    await treasury.waitForDeployment();

    // Fund treasury with aUSD and native BOT
    await usd.connect(owner).mint(await treasury.getAddress(), ethers.parseEther("100000"));
    await owner.sendTransaction({ to: await treasury.getAddress(), value: ethers.parseEther("10") });

    // Enable aUSD spending: per-tx 5000, daily 50000
    await treasury
      .connect(owner)
      .setGuardrail(await usd.getAddress(), ethers.parseEther("5000"), ethers.parseEther("50000"));
    // Enable native BOT: per-tx 2, daily 5
    await treasury.connect(owner).setGuardrail(NATIVE, ethers.parseEther("2"), ethers.parseEther("5"));

    await treasury.connect(owner).addEmployee(alice.address, "Alice", "Engineering", ethers.parseEther("6000"), await usd.getAddress());
    await treasury.connect(owner).addEmployee(bob.address, "Bob", "Design", ethers.parseEther("5000"), await usd.getAddress());
  });

  it("lets the agent pay an active employee within caps", async function () {
    const usdAddr = await usd.getAddress();
    await expect(treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("4000"), 0))
      .to.emit(treasury, "PaymentSent");
    expect(await usd.balanceOf(alice.address)).to.equal(ethers.parseEther("4000"));
  });

  it("blocks payments over the per-tx cap", async function () {
    const usdAddr = await usd.getAddress();
    await expect(
      treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("6000"), 0)
    ).to.be.revertedWith("Audd: over per-tx cap");
  });

  it("blocks payments that exceed the daily cap", async function () {
    const usdAddr = await usd.getAddress();
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    // 25000 spent so far, 10x5000 daily=50000; do 5 more
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0);
    await expect(
      treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("5000"), 0)
    ).to.be.revertedWith("Audd: over daily cap");
  });

  it("refuses to pay a non-allow-listed recipient", async function () {
    const usdAddr = await usd.getAddress();
    await expect(
      treasury.connect(agent).pay(usdAddr, outsider.address, ethers.parseEther("100"), 0)
    ).to.be.revertedWith("Audd: recipient not active employee");
  });

  it("runs a payroll batch and logs an intent", async function () {
    const usdAddr = await usd.getAddress();
    await expect(
      treasury
        .connect(agent)
        .executePayroll(
          usdAddr,
          [alice.address, bob.address],
          [ethers.parseEther("4000"), ethers.parseEther("3000")],
          "June payroll for Engineering + Design"
        )
    ).to.emit(treasury, "IntentLogged");
    expect(await usd.balanceOf(alice.address)).to.equal(ethers.parseEther("4000"));
    expect(await usd.balanceOf(bob.address)).to.equal(ethers.parseEther("3000"));
    expect(await treasury.intentCount()).to.equal(1n);
  });

  it("accrues and claims a salary stream", async function () {
    const usdAddr = await usd.getAddress();
    // 1 aUSD/sec to Alice
    await treasury.connect(agent).createStream(usdAddr, alice.address, ethers.parseEther("1"), 0, "Alice salary stream");
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);
    const claimable = await treasury.claimable(0);
    expect(claimable).to.be.greaterThan(0n);
    await treasury.connect(alice).claimStream(0);
    expect(await usd.balanceOf(alice.address)).to.be.greaterThan(0n);
  });

  it("honors pause for agent payments but allows owner withdraw", async function () {
    const usdAddr = await usd.getAddress();
    await treasury.connect(owner).pause();
    await expect(
      treasury.connect(agent).pay(usdAddr, alice.address, ethers.parseEther("100"), 0)
    ).to.be.revertedWithCustomError(treasury, "EnforcedPause");
    // owner can still withdraw while paused
    await treasury.connect(owner).withdraw(usdAddr, owner.address, ethers.parseEther("100"));
  });

  it("restricts owner-only policy setters", async function () {
    await expect(
      treasury.connect(outsider).setGuardrail(await usd.getAddress(), 1, 1)
    ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
  });
});
