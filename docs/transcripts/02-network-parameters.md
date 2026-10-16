# Transcript 02-network-parameters

- **Captured:** 2026-10-16T14:07:57.637Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 123.2s
- **Session / request ids:** redacted

## Query

```text
Give the exact network parameters the documentation defines for Pharos: for every network (testnet and mainnet) list the network name, RPC URL, chain ID, block explorer URL, native gas token symbol and faucet URL. Quote the documented values exactly, and say explicitly if any value is not documented.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
Here are the exact documented network parameters, drawn from the official Pharos documentation. The docs define **two primary networks** on the [Network](https://docs.pharos.xyz/getting-started/network) overview page, plus a third **"Testnet"** that appears only inside Hardhat config examples (no dedicated page).

---

## 1. Atlantic Testnet

**Source page:** [Atlantic Testnet](https://docs.pharos.xyz/getting-started/network/atlantic-testnet)

| Parameter | Documented value |
|---|---|
| **Network name** | `Atlantic Testnet` |
| **RPC URL (HTTPS)** | `https://atlantic.dplabs-internal.com` |
| **RPC URL (WSS)** | `wss://atlantic.dplabs-internal.com` |
| **Chain ID** | `688689` |
| **Block explorer** | `https://atlantic.pharosscan.xyz/` |
| **Native gas token symbol** | `PHRS` — documented in the [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) wallet setup ("Symbol: PHRS") and in the [x402 Atlantic Testnet](https://docs.pharos.xyz/developer-guide/x402/x402-atlantic-testnet) code (`nativeCurrency: { name: "PHRS", symbol: "PHRS", decimals: 18 }`). **Not stated on the Atlantic Testnet page itself.** |
| **Faucet URL** | **Not documented.** The [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) says *"Get testnet PHRS from the Pharos faucet or directly from the team"* but provides no URL. No dedicated faucet page exists in the docs. |

Additional documented parameters (Atlantic Testnet page):
- **Environment:** `Atlantic Testnet`
- **Rate limit:** `500 times/5m`
- **Max Pending TXs (Addr):** `64`

---

## 2. Pacific Mainnet

**Source page:** [Pacific Mainnet](https://docs.pharos.xyz/getting-started/network/pacific-mainnet)

| Parameter | Documented value |
|---|---|
| **Network name** | `Pharos Pacific Mainnet` |
| **RPC URL** | `https://rpc.pharos.xyz` |
| **Chain ID** | `1672` |
| **Block explorer** | `https://www.pharosscan.xyz` |
| **Native gas token symbol** | `PROS` (documented as "Coin Symbol/Ticker: PROS") |
| **Faucet URL** | **Not applicable / not documented.** Mainnet uses real-value gas; the [Get PROS Gas](https://docs.pharos.xyz/getting-started/get-pros-gas) page describes on-ramp options (Halliday, Alchemy Pay, TopNod) at `port.pharos.xyz/get-pros`, but this is a purchase flow, not a faucet. |

---

## 3. "Testnet" (chain ID 688688) — undocumented as a standalone network

This network appears **only** inside Hardhat config examples on two pages:
- [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token)
- [Write Your First NFT (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-nft)

It is presented as an alternative to Atlantic Testnet in the config block, with the comment `// Or use Pharos Atlantic Testnet chain id 688689`. There is **no dedicated network page** for it (`/getting-started/network/testnet` returns "Page not found"), and the [Network overview](https://docs.pharos.xyz/getting-started/network) lists only Atlantic Testnet and Pacific Mainnet.

| Parameter | Documented value |
|---|---|
| **Network name** | Referred to only as `Testnet` in config comments. No formal name given. |
| **RPC URL** | `https://testnet.dplabs-internal.com` |
| **Chain ID** | `688688` |
| **Block explorer** | `https://testnet.pharosscan.xyz/` |
| **Explorer API (verification)** | `https://api.socialscan.io/pharos-testnet/v1/explorer/command_api/contract` |
| **Native gas token symbol** | **Not documented.** |
| **Faucet URL** | **Not documented.** |

---

## Summary of what is and isn't documented

| Field | Atlantic Testnet | Pacific Mainnet | "Testnet" (688688) |
|---|---|---|---|
| Network name | ✅ `Atlantic Testnet` | ✅ `Pharos Pacific Mainnet` | ⚠️ Only `Testnet` in config comments |
| RPC URL | ✅ `https://atlantic.dplabs-internal.com` | ✅ `https://rpc.pharos.xyz` | ✅ `https://testnet.dplabs-internal.com` |
| Chain ID | ✅ `688689` | ✅ `1672` | ✅ `688688` |
| Block explorer | ✅ `https://atlantic.pharosscan.xyz/` | ✅ `https://www.pharosscan.xyz` | ✅ `https://testnet.pharosscan.xyz/` |
| Native gas token | ✅ `PHRS` (from Piggy Bank / x402 pages) | ✅ `PROS` | ❌ Not documented |
| Faucet URL | ❌ Not documented (mentioned but no URL given) | N/A (purchase, not faucet) | ❌ Not documented |
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `4378`
