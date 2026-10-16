# Transcript 06-common-errors

- **Captured:** 2026-10-16T14:13:40.862Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 94.3s
- **Session / request ids:** redacted

## Query

```text
What errors do developers commonly hit when deploying to Pharos and what exactly do the official docs say to fix each one? Include exact error messages and the documented remedies, or say explicitly if the docs do not document an error case.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
Here is every error the official Pharos documentation documents, organized by category, with exact error messages and documented remedies.

---

## 1. Deployment errors

| Error | Cause | Documented fix | Source page |
|---|---|---|---|
| `compiler error` | Contract compilation failed | Check source file path and Foundry setup; check Foundry is up to date with `foundryup` | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `insufficient funds` | Not enough balance for gas | Check balance with `cast balance <address> --rpc-url <rpc> --ether`; get testnet PHRS from the faucet | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `connection refused` | Missing `--rpc-url` or RPC unreachable; Foundry defaulted to `localhost:8545` | Always pass `--rpc-url` explicitly in every command | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| `Contract Deployment Fails` | Not enough testnet tokens to cover the deployment cost | Ensure you have enough testnet tokens | [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp), [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp), [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token), [Write Your First Token (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-token), [Write Your First NFT (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-nft), [Write Your First Uniswap Contract (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-uniswap-contract), [Write Your First Uniswap Contract (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-uniswap-contract), [Rust](https://docs.pharos.xyz/developer-guide/rust), [Call EVM From WASM](https://docs.pharos.xyz/developer-guide/interoperability/call-evm-from-wasm) |
| `out-of-gas error` | Gas limit set too tightly (equal to actual gas used before refunds), so the refund cannot be processed | Set a slightly higher gas limit — e.g., if you expect 100,000 gas used, set the limit to 120,000; use `estimateGas()` and add a buffer (e.g., 20%) | [FAQs](https://docs.pharos.xyz/getting-started/faqs), [Gas Model](https://docs.pharos.xyz/getting-started/gas-model) |

---

## 2. Contract verification errors

| Error | Cause | Documented fix | Source page |
|---|---|---|---|
| `contract not found` | Contract not indexed by the explorer yet | Wait 10–15 seconds and retry verification | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `verification failed` | Source mismatch | Check compiler version matches | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `constructor arguments mismatch` | Wrong args encoding | Confirm constructor argument values | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `psycopg2 / SQL error on verify` | `forge verify-contract` run too soon after deployment | Add `sleep 10` between deployment and verification | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| Verification may fail if bytecode or compiler settings do not match | Incorrect compilation settings | Ensure your contract is compiled with the correct settings before verification | [Hemera SocialScan](https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer/hemara-socialscan) |

---

## 3. Contract interaction errors

| Error | Cause | Documented fix | Source page |
|---|---|---|---|
| `execution reverted: Must send PHRS` | `--value` flag missing or 0 | Add `--value <amount>ether` to the command | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `execution reverted: Still locked` | Time lock not expired yet | Run `timeLeft()` to see remaining time, wait and retry | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `execution reverted: Not owner` | Wrong private key | Confirm `$PRIVATE_KEY` belongs to the deployer wallet | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `execution reverted: Nothing to withdraw` | Vault balance is 0 | Deposit PHRS first | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `execution reverted` (general) | Contract call reverted | Extract the revert reason from the error message; check business logic | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| `Interaction Issues` | Wrong contract address or ABI | Verify that the contract address and ABI are correct | [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token), [Write Your First Token (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-token), [Write Your First NFT (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-nft), [Write Your First Uniswap Contract (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-uniswap-contract), [Write Your First Uniswap Contract (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-uniswap-contract), [Rust](https://docs.pharos.xyz/developer-guide/rust), [Call EVM From WASM](https://docs.pharos.xyz/developer-guide/interoperability/call-evm-from-wasm) |
| `Frontend Connection Issues` | Wrong contract address or ABI in frontend | Verify that the contract address and ABI are correct | [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp), [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp) |
| `Insufficient Balance` | Wallet has not enough tokens to transfer | Ensure your wallet has enough tokens to transfer | [Write Your First NFT (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-nft), [Rust](https://docs.pharos.xyz/developer-guide/rust), [Call EVM From WASM](https://docs.pharos.xyz/developer-guide/interoperability/call-evm-from-wasm) |
| `Test Failures` | Test logic issues | Check the test output for detailed error messages and adjust the tests accordingly | [Write Your First Uniswap Contract (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-uniswap-contract), [Write Your First Uniswap Contract (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-uniswap-contract) |

---

## 4. Address and transaction errors

| Error | Cause | Documented fix | Source page |
|---|---|---|---|
| `invalid address` | Wrong address format | Confirm address is `0x` + 40 hex characters (42 chars total) | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| `transaction not found` | TX hash doesn't exist or node hasn't synced | Double-check the hash; wait and retry if the node is still syncing | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| Empty return value from `cast call` | No contract code at the target address | Confirm the contract address and that you're on the right network | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| Empty result from `cast logs` | No events emitted yet | Inform user no activity has occurred on this vault/contract | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| `Connection timeout` | RPC unreachable | Check network connection | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |

---

## 5. Environment and setup errors

| Error | Cause | Documented fix | Source page |
|---|---|---|---|
| `nonce too low` | Nonce conflict — previous transaction still pending | Wait for prior transaction to confirm, or manually set `--nonce` | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| `assets/networks.json unreadable` | Config file missing or malformed JSON | Confirm you are running commands from inside the `pharos-skill-engine` directory | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| `PRIVATE_KEY not set` | `export PRIVATE_KEY` not run in current shell | Run: `export PRIVATE_KEY=0x...` | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |
| `forge/cast: command not found` | Foundry not installed | Run: `curl -L https://foundry.paradigm.xyz \| bash` then `foundryup` | [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide) |

---

## What the docs do NOT document

The documentation does **not** provide error handling guidance for:

- **RPC rate limiting errors** — The [Atlantic Testnet](https://docs.pharos.xyz/getting-started/network/atlantic-testnet) page states the rate limit is `500 times/5m` and max pending TXs per address is `64`, but does not document what error message you get when you hit these limits or how to handle them.
- **Wallet connection errors** (e.g., MetaMask not connected to the right network, user rejecting a transaction) — not documented.
- **Network misconfiguration errors** (e.g., deploying to mainnet when you meant testnet, wrong chain ID in config) — not documented.
- **Dependency installation errors** (e.g., `npm install` failures, OpenZeppelin version conflicts) — not documented.
- **Hardhat-specific errors** beyond the generic "Contract Deployment Fails" and "Interaction Issues" — no Hardhat-specific error messages are listed.
- **Node/validator deployment errors** — the node guides describe setup steps but do not include a troubleshooting section for common node startup or sync failures.
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `10853`
