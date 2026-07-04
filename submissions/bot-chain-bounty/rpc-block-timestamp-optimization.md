# BOT Chain Builder Challenge #1 — PR / Bug / Optimization Bounty

## RPC / Consensus Finding: Non-Monotonic Block Timestamps at Sub-Second Block Time

**Category:** PR / Bug / Optimization Bounty → Verified technical friction (RPC / EVM compatibility)
**Target surface:** BOT Chain Testnet public RPC (`https://rpc.bohr.life`, chainId 968 / `0x3c8`)
**Method:** Read-only JSON-RPC only. No stress testing, no malformed-request flooding, no faucet abuse, no gas-bomb contracts. Every number below comes from ordinary `eth_getBlockByNumber` / `eth_blockNumber` calls any client makes.
**Prepared:** July 2026 (re-run the reproduction script at submission time — block numbers advance).

> **Verification note.** Every value below was observed live on the build date against
> `https://rpc.bohr.life`. Client version reported by the node: `Geth/v1.5.13-c0bf2757-20260529/linux-amd64/go1.26.3`.
> Re-run the one-file script in "Steps to reproduce" before submitting and update the block range.

---

## Summary of findings

Two independent, individually-submittable findings surfaced from a read-only DevEx audit, ordered by impact.

| # | Finding | Type | How observed |
|---|---------|------|--------------|
| 1 | **Block timestamps are non-monotonic** — block time is ~0.75 s but timestamps are integer-second, so ~25% of consecutive blocks share an *identical* timestamp (Δ = 0 s). Breaks any tooling that assumes strictly increasing timestamps. | Bug / EVM-compatibility friction | `eth_getBlockByNumber` over 80 consecutive blocks |
| 2 | **EIP-1559 fee signals are degenerate** — `baseFeePerGas` is `0x0` on every recent block, yet `eth_gasPrice` **and** `eth_maxPriorityFeePerGas` return the *same* ~47.6 Gwei value. Fee-estimation libraries that build 1559 txs from these signals misprice or misreport the tip. | Optimization / DevEx | `eth_feeHistory`, `eth_gasPrice`, `eth_maxPriorityFeePerGas` |

Finding 1 is the primary submission (most reproducible, most obscure, clearest impact). Finding 2 is included as a verified secondary.

---

# Finding 1 — Non-monotonic block timestamps (primary)

### Issue title
BOT Chain testnet produces blocks faster than one per second (~0.747 s avg) but stamps them with integer-second Unix timestamps, so ~25% of consecutive blocks carry an **identical** `timestamp`. This violates the common EVM invariant that a child block's timestamp is strictly greater than its parent's, and silently breaks indexers, `block.timestamp`-based contracts, and any code that computes an interval from adjacent block timestamps.

### Description
The chain targets a sub-second block cadence but exposes block time only at whole-second resolution in the `timestamp` field. Because ~1.34 blocks are produced per second, roughly one in four adjacent block pairs end up with the same timestamp value.

The Ethereum execution-layer convention (and the Yellow Paper, §4.3.4 `H_s > P(H)_H_s`) is that each block's timestamp must be **strictly greater** than its parent's. Here the observed relationship is `>=`, not `>`. That is technically legal for a standalone chain but is a real compatibility surprise for the EVM tooling ecosystem BOT Chain targets:

- **Interval math divides by zero.** Indexers/analytics computing block time or TPS as `ts[n] - ts[n-1]` hit `0` and produce `Infinity`/`NaN` (e.g. "blocks per second", staking-APR estimators, MEV timing tools).
- **`block.timestamp` in contracts can equal the parent's.** Contracts that assume time advances every block (rate limiters, per-block accrual, "one action per timestamp" guards) can be defeated or stall, because two consecutive blocks report the same second.
- **Time-series stores keyed on `(timestamp)` collide.** Subgraph/Dune-style pipelines that treat timestamp as a monotonic sort key produce out-of-order or dropped rows.
- **Docs advertise the fast block time as a headline feature**, so builders are actively encouraged to rely on the cadence the timestamp field cannot express.

### Steps to reproduce
Read-only, ~10 seconds, no keys, no writes. Node 18+ (global `fetch`):

```js
const RPC = "https://rpc.bohr.life";
const rpc = (method, params) =>
  fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }).then((r) => r.json());

(async () => {
  const bn = parseInt((await rpc("eth_blockNumber", [])).result, 16);
  const N = 80, start = bn - N + 1;
  const ts = [];
  for (let i = start; i <= bn; i++) {
    const b = (await rpc("eth_getBlockByNumber", ["0x" + i.toString(16), false])).result;
    ts.push(parseInt(b.timestamp, 16));
  }
  const deltas = ts.slice(1).map((t, i) => t - ts[i]);
  const zero = deltas.filter((d) => d === 0).length;
  const span = ts.at(-1) - ts[0];
  console.log(`blocks ${start}-${bn}`);
  console.log(`avg block time: ${(span / (N - 1)).toFixed(3)} s (~${((N - 1) / span).toFixed(2)} blk/s)`);
  console.log(`duplicate-timestamp intervals: ${zero}/${deltas.length} = ${(100 * zero / deltas.length).toFixed(1)}%`);
  console.log("delta histogram:", deltas.reduce((a, d) => ((a[d] = (a[d] || 0) + 1), a), {}));
})();
```

**Observed output (blocks 14882131–14882210, live):**
```
avg block time: 0.747 s (~1.34 blk/s)
duplicate-timestamp intervals: 20/79 = 25.3%
delta histogram: { "0": 20, "1": 59 }
```

A raw 10-block window makes the collision obvious (each pair marked ⟵ shares its parent's second):
```
block      timestamp     Δ
14882167   1782992720    —
14882168   1782992721   +1s
14882169   1782992722   +1s
14882170   1782992722    0s  ⟵ same as parent
14882171   1782992723   +1s
14882172   1782992724   +1s
14882173   1782992725   +1s
14882174   1782992725    0s  ⟵ same as parent
14882175   1782992726   +1s
14882176   1782992727   +1s
```

### Scope of impact
- **Who:** Every builder using indexers/analytics, block-time or TPS dashboards, block-explorers, subgraphs, or smart contracts that read `block.timestamp` for timing. This is the exact "AA integration / dApp builder" audience the challenge targets.
- **Severity:** Medium. Not a fund-loss bug and not a chain-halt, but a silent correctness bug: tooling doesn't error, it produces wrong numbers or subtly-exploitable contract timing. Silent-wrong is worse for DevEx than a loud failure.
- **Reproducibility:** ~100%. At ~1.34 blk/s the duplicate rate is a structural ~25%, observable in any 80-block window at any time.

### Proposed fix (pick one)
1. **Preferred — millisecond precision where it counts.** Expose sub-second block time via an explicit millisecond field (e.g. `timestampMs` in the block header/RPC result) so tooling can get true intervals without changing the standard `timestamp` semantics. Document it in the RPC reference.
2. **Enforce strict monotonicity.** Have the sequencer guarantee `child.timestamp > parent.timestamp` (bump by at least 1 s when the wall clock hasn't advanced), matching the EVM convention. Trade-off: timestamps then drift ahead of wall-clock under sustained >1 blk/s load — so this is inferior to (1) for a fast chain.
3. **Minimum — document it.** If the behavior is intentional, add a prominent note to the Developer Docs: *"Block time is sub-second; `block.timestamp` has 1-second resolution and consecutive blocks may share a timestamp. Do not assume strictly-increasing block timestamps; do not compute intervals from adjacent blocks — use block number for ordering."* Include the reproduction snippet above.

The doc note (3) should ship regardless, because it is zero-risk and immediately unblocks builders; (1) is the durable engineering fix.

---

# Finding 2 — Degenerate EIP-1559 fee signals (secondary)

### Issue title
On BOT Chain testnet, `baseFeePerGas` is `0x0` for every recent block, but `eth_gasPrice` and `eth_maxPriorityFeePerGas` return the identical ~47.6 Gwei value — so EIP-1559-aware wallets/libraries receive contradictory fee signals (zero base fee, full-price "priority tip").

### Description
Observed live:
- `eth_gasPrice` → `0xb165100c4` (~47.6 Gwei)
- `eth_maxPriorityFeePerGas` → `0xb165100c4` (**identical** to gasPrice)
- `eth_feeHistory(0x4,"latest",[25,50,75])` → `baseFeePerGas: ["0x0","0x0","0x0","0x0","0x0"]`, `reward` rows all `["0xb165100c4","0xb165100c4","0xc3225e73e"]`, `gasUsedRatio: [0,0,0,0]`

On a standard EIP-1559 chain, `maxPriorityFeePerGas` (the tip) is a small fraction of `gasPrice` (which ≈ baseFee + tip). Here base fee is pinned at zero while the "priority fee" suggestion equals the entire gas price. Wallets that estimate `maxFeePerGas = 2·baseFee + priorityFee` still land on a workable number, but:
- Fee UIs that display "base" vs "priority" show a nonsensical split (0 base, 100% tip).
- Tooling that derives dynamic fees from `feeHistory` base-fee trends degenerates because the base fee never moves off zero.
- `eth_maxPriorityFeePerGas` returning the full gas price is misleading as a *tip* suggestion.

### Steps to reproduce
```bash
RPC=https://rpc.bohr.life
curl -s -X POST $RPC -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_gasPrice","params":[]}'
curl -s -X POST $RPC -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_maxPriorityFeePerGas","params":[]}'
curl -s -X POST $RPC -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_feeHistory","params":["0x4","latest",[25,50,75]]}'
```
Expect: first two return the same hex value; the third shows `baseFeePerGas` all `0x0`.

### Scope of impact
- **Who:** Wallet integrators and any dApp using ethers/viem automatic fee estimation on BOT Chain.
- **Severity:** Low–Medium. Transactions still send, but fee UX and fee-estimation libraries behave unexpectedly, and the values are self-contradictory as documented EIP-1559 semantics.
- **Reproducibility:** ~100% on current testnet state.

### Proposed fix
- Make `eth_maxPriorityFeePerGas` return a true tip suggestion distinct from `eth_gasPrice`, **or**
- Document the testnet fee model explicitly: *"BOT Chain testnet runs with a zero base fee; `eth_gasPrice` reflects the effective price and `eth_maxPriorityFeePerGas` mirrors it. Set `maxFeePerGas = maxPriorityFeePerGas` for 1559 txs."* Add to the RPC/Developer docs.

---

## Submission block (fill in before sending)

**Contact:** _<your handle / email>_
**Reward wallet (BOT Chain):** _<paste your wallet address here — intentionally left blank; no wallet is committed to the repo>_
**PR link (if submitting the doc note as a PR):** _<link>_
**Attachments:** reproduction script above (self-contained); node client version `Geth/v1.5.13-c0bf2757-20260529`.

> Security note: no private key, wallet address, or credential is included in this file. Insert your reward wallet manually at submission time.
