# BOT Chain Builder Challenge #1 — PR / Bug / Optimization Bounty

## Documentation Optimization Proposal: Developer Onboarding Path

**Category:** PR / Bug / Optimization Bounty → Documentation Improvement / Optimization Proposal
**Target surface:** BOT Chain Developer Docs — Quick Guide + Faucet documentation
**Prepared:** July 2026 (verify against live docs at submission time — see "Verification note" below)

> **Verification note.** Every fact, URL, chain ID, and quoted string below was checked
> against the *live* BOT Chain docs and tools on the build date. Docs change, so re-open
> each source link before final submission and drop any item the team has already fixed.
> Nothing here is invented — each finding links to the exact live page it was observed on.

---

## Summary of findings

This proposal contains **three independent, individually-submittable findings**, ordered by
impact. Each targets a concrete, verified friction point on the path a brand-new EVM
developer walks: *connect wallet → get test tokens → deploy*.

| # | Finding | Type | Live source |
|---|---------|------|-------------|
| 1 | Faucet docs describe a **different faucet** than the one that is actually live (Discord bot + token picker + 1 tBOT cap vs. the real web faucet: 10 BOT / 24h + Cloudflare check) | Bug / Doc inconsistency | [Claim test tBOT Tokens](https://dev-docs.botchain.ai/docs/Developers/claim-test-tbot-tokens/) vs [live faucet](https://faucet.botchain.ai/basic) |
| 2 | Quick Guide network config is loose text lines, not a copy-paste "Add to MetaMask" block; **Currency Symbol** and **Network Name** (the exact wallet form fields) are never stated | Documentation optimization | [Quick Guide → Connecting](https://dev-docs.botchain.ai/docs/Developers/quick-guide/#connecting) |
| 3 | No troubleshooting section for the most common first-connection errors (chain ID mismatch, wrong symbol, RPC unreachable, stuck nonce) | Documentation optimization | [Quick Guide](https://dev-docs.botchain.ai/docs/Developers/quick-guide/) |

Screenshots referenced below are saved in `attached_assets/screenshots/`:
- `dev-docs_botchain_ai_docs_Developers_quick-guide.png` (Quick Guide, Connecting section)
- `faucet_botchain_ai_basic.png` (live faucet UI)

---

# Finding 1 — Faucet documentation does not match the live faucet (highest impact)

### Issue title
Faucet docs (`Claim test tBOT Tokens`) describe a Discord-bot faucet with a token picker and a 1 tBOT cap, but the live faucet is a web form that sends "up to 10 BOT every 24 hours" — new developers follow steps that don't exist.

### Description
The Developer Docs contain two different, contradictory descriptions of how to get testnet tokens, and **neither matches the tool that is actually live**:

1. **Quick Guide → Get Tokens** links test-token seekers to the web faucet:
   `https://faucet.botchain.ai/basic`.
2. **Claim test tBOT Tokens** page instead describes a *Discord bot* faucet:
   > "To get some tBOT of BOT Chain testnet for testing purposes, you can contact us to obtain your tokens.
   > 1. Copy your wallet address and paste the address into the textbox
   > 2. Select the tokens you need to claim. Major pegged tokens like TUSDT, TUSDC, and others are supported.
   > 3. Please note if your wallet balance is larger than **1 tBOT**, you can not get new tBOT from the Discord bot faucet."

But the **actual live faucet** at `https://faucet.botchain.ai/basic` is a plain web form that:
- Shows the network as **"BOT Chain Testnet"**,
- States **"Receive up to 10 BOT every 24 hours"**,
- Requires a **Cloudflare "I am not a robot" (Turnstile) verification**,
- Has a single **"Send 10 BOT"** button — there is **no token picker**, no TUSDT/TUSDC selection, and **no "1 tBOT balance" rule** shown.

So a new developer reading the docs looks for a Discord bot and a token-selection dropdown that don't exist on the linked faucet, and is never told the real constraints (10 BOT/24h, human-verification step). This is the single most common first-15-minutes task on any testnet, so the mismatch has outsized impact.

### Steps to reproduce
1. Open the Quick Guide: `https://dev-docs.botchain.ai/docs/Developers/quick-guide/` → "Get Tokens" section → click the faucet link.
2. Open the Claim page: `https://dev-docs.botchain.ai/docs/Developers/claim-test-tbot-tokens/`.
3. Open the live faucet: `https://faucet.botchain.ai/basic`.
4. Compare: the Claim page describes a Discord bot + token picker + "1 tBOT" cap; the live faucet is a web form with a Cloudflare check and a fixed "up to 10 BOT / 24h" limit. They do not match.

### Scope of impact
- **Who:** every new developer/team getting testnet BOT before their first deploy (the required first step of the challenge itself).
- **Severity:** high — the documented procedure cannot be followed on the linked tool; developers waste time hunting a non-existent Discord flow, or don't learn the 24h rate limit and human-verification requirement.
- **Frequency:** hit by essentially 100% of new testnet users.

### Screenshots / logs / links
- Live faucet UI (10 BOT / 24h, Cloudflare check, single "Send 10 BOT" button): `attached_assets/screenshots/faucet_botchain_ai_basic.png`
- Claim docs page: https://dev-docs.botchain.ai/docs/Developers/claim-test-tbot-tokens/
- Quick Guide "Get Tokens": https://dev-docs.botchain.ai/docs/Developers/quick-guide/#get-tokens
- Live faucet: https://faucet.botchain.ai/basic

### Proposed solution (ready-to-drop-in doc text)
Replace the body of **Claim test tBOT Tokens** with a description of the faucet that is
actually live, and make the Quick Guide link consistent with it:

```markdown
## Claim test BOT from the Testnet Faucet

Get free testnet BOT to pay for gas while testing contracts and dApps.

**Faucet:** https://faucet.botchain.ai/basic

### Steps
1. Go to https://faucet.botchain.ai/basic
2. Confirm the **Network** shows **BOT Chain Testnet**.
3. Paste your wallet address (0x…) into the **Wallet address** field.
4. Complete the **"I am not a robot"** verification.
5. Click **Send 10 BOT**. Tokens arrive shortly after the transaction confirms
   (block time is ~0.7s, so this is typically seconds, not minutes).

### Limits & eligibility
- **Amount:** up to **10 BOT per request**.
- **Rate limit:** once every **24 hours** per address.
- **Verification:** a Cloudflare human-verification check is required on each request.
- **Cost:** free — testnet tokens have no real value and are for testing only.

> Need more than the faucet provides, or a different token? Ask in the
> Builders Telegram: https://t.me/BotChain_official/61
```

If the Discord-bot faucet and pegged test tokens (TUSDT/TUSDC) genuinely still exist as a
*separate* channel, keep that content but move it under its own clearly-labelled
"Discord faucet (alternative)" heading so it is not confused with the primary web faucet
that the Quick Guide links to.

### PR / doc improvement link
Doc text supplied above; can be delivered as a PR/side-by-side against the docs source repo
if the maintainers share access. No code change required — content-only edit.

### Contact info and wallet address
- **Contact:** `<CONTACT_PLACEHOLDER — email / Telegram handle to be filled in on the form>`
- **Payout wallet (USDT):** `<WALLET_ADDRESS_PLACEHOLDER — to be filled in manually at submission time>`

---

# Finding 2 — Quick Guide network config is not copy-paste "Add to MetaMask" ready

### Issue title
Quick Guide "Connecting" lists network parameters as loose text lines and never labels the exact wallet form fields (Network Name, Currency Symbol), forcing new developers to guess when adding BOT Chain to MetaMask.

### Description
In the Quick Guide → **Connecting** section, the testnet config is presented as:

> Chain ID：968
> RPC： https://rpc.bohr.life
> Native Token：BOT
> Total Supply：150 Million
> Explorer： https://scan.bohr.life/

MetaMask's "Add a network manually" form asks for five specific fields: **Network Name**,
**New RPC URL**, **Chain ID**, **Currency Symbol**, **Block Explorer URL**. The docs:
- never give a **Network Name** to type,
- label the token **"Native Token"** rather than **"Currency Symbol"** (the actual field name), so a beginner isn't sure whether `BOT` goes in the Currency Symbol box,
- include **"Total Supply: 150 Million"**, which is *not* a wallet field and adds noise to a setup checklist,
- provide no single copy-paste block and no one-click `wallet_addEthereumChain` snippet.

The information is technically present but not in a shape a newcomer can act on without
guessing. A clean, labelled table (plus an EIP-3085 one-click snippet) removes that guesswork.

### Steps to reproduce
1. Open https://dev-docs.botchain.ai/docs/Developers/quick-guide/#connecting.
2. Open MetaMask → Networks → "Add a network manually".
3. Try to fill the five required fields from the doc lines: there is no Network Name given, and "Native Token" must be mentally mapped to "Currency Symbol". "Total Supply" has no corresponding field.

### Scope of impact
- **Who:** every developer adding BOT Chain (testnet or mainnet) to a wallet — the step before any interaction with the chain.
- **Severity:** medium — solvable, but a recurring, avoidable friction point and a frequent cause of "wrong network / wrong symbol" confusion.
- **Frequency:** every new user, once per network.

### Screenshots / logs / links
- Quick Guide Connecting section (loose lines, "Total Supply" mixed in, no Currency Symbol / Network Name labels): `attached_assets/screenshots/dev-docs_botchain_ai_docs_Developers_quick-guide.png`
- Source: https://dev-docs.botchain.ai/docs/Developers/quick-guide/#connecting

### Proposed solution (ready-to-drop-in doc text)
Replace the loose lines with copy-paste tables using MetaMask's exact field names, plus a
one-click add snippet. All values below are taken directly from the live docs / faucet.

```markdown
## Connecting to BOT Chain

Add BOT Chain to MetaMask (or any EVM wallet) using **Settings → Networks →
Add a network manually**. Field names below match the wallet form exactly.

### Testnet

| Wallet field         | Value                     |
|----------------------|---------------------------|
| Network Name         | BOT Chain Testnet         |
| New RPC URL          | https://rpc.bohr.life     |
| Chain ID             | 968  (hex: 0x3C8)         |
| Currency Symbol      | BOT                       |
| Block Explorer URL   | https://scan.bohr.life/   |

### Mainnet

| Wallet field         | Value                       |
|----------------------|-----------------------------|
| Network Name         | BOT Chain Mainnet           |
| New RPC URL          | https://rpc.botchain.ai     |
| Chain ID             | 677  (hex: 0x2A5)           |
| Currency Symbol      | BOT                         |
| Block Explorer URL   | https://scan.botchain.ai    |

Additional mainnet RPC endpoints (use any one): https://rpc.gwnwl.cn ·
https://rpc.xfdsv.cn · https://rpc.ygble.cn · https://rpc.myseq.cn · https://rpc.ktpvy.cn

### One-click add (EIP-3085)

Paste into your browser console on any page with an injected wallet to add the **testnet**:

```js
await window.ethereum.request({
  method: "wallet_addEthereumChain",
  params: [{
    chainId: "0x3C8",                       // 968
    chainName: "BOT Chain Testnet",
    nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
    rpcUrls: ["https://rpc.bohr.life"],
    blockExplorerUrls: ["https://scan.bohr.life/"]
  }]
});
```
```

> Note verified against live docs: the testnet uses `bohr.life` domains
> (`rpc.bohr.life`, `scan.bohr.life`) while mainnet uses `botchain.ai` domains. Stating
> both explicitly, side by side, prevents the common mistake of pointing a testnet wallet
> at a mainnet RPC. ("Total Supply" is intentionally dropped — it is not a wallet field.)

### PR / doc improvement link
Content-only edit; can be submitted as a PR/side-by-side to the docs source if access is shared.

### Contact info and wallet address
- **Contact:** `<CONTACT_PLACEHOLDER>`
- **Payout wallet (USDT):** `<WALLET_ADDRESS_PLACEHOLDER>`

---

# Finding 3 — No first-connection troubleshooting section (small, optional)

### Issue title
Quick Guide has no troubleshooting list for the most common first-connection failures, so new developers have no self-serve path when the wallet or RPC misbehaves.

### Description
The Quick Guide ends at "Developer Tools" with no troubleshooting content. The four errors
below account for the large majority of "it doesn't work" moments for newcomers on any EVM
L1, and each has a one-line fix worth documenting.

### Steps to reproduce
1. Open https://dev-docs.botchain.ai/docs/Developers/quick-guide/ and read to the end.
2. Observe there is no "Troubleshooting" / "Common issues" section.

### Scope of impact
- **Who:** newcomers who hit a wallet/RPC error and would otherwise fall back to Telegram for answers already known.
- **Severity:** low — quality-of-life, but deflects repetitive support questions.

### Screenshots / logs / links
- Source: https://dev-docs.botchain.ai/docs/Developers/quick-guide/

### Proposed solution (ready-to-drop-in doc text)
```markdown
## Troubleshooting

- **"Chain ID mismatch" / wrong network.** The RPC's chain ID must match the value you
  entered. Testnet is **968**, mainnet is **677**. Re-check the network entry if they differ.
- **Balance shows a different/blank symbol.** Set **Currency Symbol** to `BOT` for both
  networks. A wrong symbol is cosmetic but signals the network was added incorrectly.
- **RPC not responding / requests hang.** Confirm the RPC URL exactly (testnet
  `https://rpc.bohr.life`, mainnet `https://rpc.botchain.ai`). On mainnet, try an
  alternate endpoint (e.g. `https://rpc.gwnwl.cn`).
- **Transaction stuck as "pending".** With ~0.7s block times, a long-pending tx usually
  means a nonce gap. In MetaMask: Settings → Advanced → **Clear activity tab data** to
  reset the local nonce, then resend.
- **Faucet won't send.** The faucet is rate-limited to **10 BOT / 24h per address** and
  requires the Cloudflare human-verification check — complete it, and wait 24h between claims.
```

### PR / doc improvement link
Content-only edit; deliverable as a PR/side-by-side.

### Contact info and wallet address
- **Contact:** `<CONTACT_PLACEHOLDER>`
- **Payout wallet (USDT):** `<WALLET_ADDRESS_PLACEHOLDER>`

---

## Submission checklist (for the bounty form: https://forms.gle/ZEU6B4SDXvZAjs9T8)

Per finding, the form fields map as follows:
- **Issue title** → the "Issue title" line of each finding.
- **Description** → the "Description" section.
- **Steps to reproduce** → the "Steps to reproduce" section.
- **Scope of impact** → the "Scope of impact" section.
- **Screenshots / logs / links / transaction hash** → the "Screenshots / links" section (attach the PNGs from `attached_assets/screenshots/`).
- **Proposed solution** → the "Proposed solution" section (paste the improved doc text).
- **PR or doc/tool improvement link (if any)** → offer a PR/side-by-side against the docs source repo.
- **Contact info and wallet address** → fill in manually before submitting. **Never store the real wallet address in this repo.**

Each finding can be submitted separately — accepted submissions are paid individually
(50–100 USDT each, up to 900 USDT total). Submit Finding 1 first (highest impact).
