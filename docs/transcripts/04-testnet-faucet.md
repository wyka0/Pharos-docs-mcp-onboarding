# Transcript 04-testnet-faucet

- **Captured:** 2026-10-16T14:10:49.012Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 121.4s
- **Session / request ids:** redacted

## Query

```text
How exactly does a developer obtain Atlantic Testnet PHRS? Give the exact faucet URL, the steps, and any prerequisites or limits the documentation states. If no public faucet is documented, say so explicitly instead of guessing.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
**No public faucet URL is documented.** I verified this by:

1. Searching the docs for "faucet," "testnet PHRS," "claim tokens," and related terms — no faucet URL appeared in any result.
2. Attempting to load two plausible faucet page URLs directly:
   - `https://docs.pharos.xyz/getting-started/faucet` → **Page not found**
   - `https://docs.pharos.xyz/getting-started/get-testnet-phrs` → **Page not found**
3. Asking the docs' own `askQuestion` tool, which confirmed: *"The docs do not publish a public faucet URL or specify faucet claim steps, eligibility, or claim limits."*

---

## What the documentation *does* say

The only mention of obtaining testnet PHRS is a single sentence in the [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), under **Wallet Setup**:

> *"Get testnet PHRS from the Pharos faucet or directly from the team."*

That is the entirety of the documented guidance. No URL, no steps, no prerequisites, and no limits are provided.

---

## What is documented (prerequisites for using PHRS once you have it)

The same tutorial lists the wallet setup you must complete before you can use PHRS:

1. Create an EVM-compatible wallet (MetaMask or any EVM wallet).
2. Add the Pharos Atlantic Testnet to your wallet:
   - **Network Name:** `Pharos Atlantic Testnet`
   - **RPC URL:** `https://atlantic.dplabs-internal.com`
   - **Chain ID:** `688689`
   - **Symbol:** `PHRS`
3. Export your private key (needed for deploying).

The [Atlantic Testnet](https://docs.pharos.xyz/getting-started/network/atlantic-testnet) page documents RPC-level limits, but these are **not faucet claim limits**:
- **Rate limit:** `500 times/5m`
- **Max Pending TXs (Addr):** `64`

---

## Bottom line

The Pharos documentation does not provide a public faucet URL, step-by-step claim instructions, eligibility criteria, or claim limits for Atlantic Testnet PHRS. The only documented paths are "the Pharos faucet" (no URL given) and "directly from the team" (no contact method given). A developer would need to reach out to the Pharos team through an external channel (e.g., Discord, Telegram, or website contact) to obtain testnet PHRS.
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `2207`
