# Transcript 10-toolchain-versions

- **Captured:** 2026-10-16T14:19:08.084Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 147.4s
- **Session / request ids:** redacted

## Query

```text
Which exact toolchain versions does the Pharos documentation require or recommend for building (Node.js version, Hardhat version, Foundry version, ethers.js version, viem version)? Quote the documented version numbers, and say explicitly if a version is not pinned anywhere in the docs.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
Based on the official Pharos documentation, here are the exact toolchain version requirements:

## Documented versions

| Tool | Version | Source |
|---|---|---|
| **Solidity compiler (Hardhat)** | `0.8.28` | [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token) — `hardhat.config.js` shows `solidity: "0.8.28"` |
| **Solidity compiler (Foundry)** | `^0.8.20` or higher | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) — "check that the Solidity version in foundry.toml is ^0.8.20 or higher" |
| **ethers.js** | `v6` | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) — "JS (ethers.js v6)" in the templates folder description |

## Not pinned in the documentation

| Tool | What the docs say |
|---|---|
| **Node.js** | "Node.js: Install it from [nodejs.org](https://nodejs.org/)" — no version specified |
| **Hardhat** | Links to [Hardhat installation](https://hardhat.org/hardhat-runner/docs/getting-started#installation) — no version specified |
| **Foundry** | "Install Foundry" via `curl -L https://foundry.paradigm.xyz \| bash` and `foundryup` — no version specified, just says to verify with `cast --version` and `forge --version` |
| **viem** | Mentioned as "TypeScript (viem)" in the Skill Engine templates — no version specified |
| **web3.py** | Mentioned as "Python (web3.py)" in the Skill Engine templates — no version specified |

## Solidity pragma versions in code examples

The documentation shows various Solidity pragma versions in different code examples:
- `pragma solidity ^0.8.20;` — Token contract examples
- `pragma solidity ^0.8.0;` — Foundry Token contract example
- `pragma solidity ^0.8.13;` — Foundry interaction script example

These are minimum version requirements in the source code, but the actual compiler version used is determined by the Hardhat config (`0.8.28`) or Foundry's `foundry.toml` (`^0.8.20` or higher).
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `2031`
