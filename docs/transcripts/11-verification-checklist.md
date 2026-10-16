# Transcript 11-verification-checklist

- **Captured:** 2026-10-16T14:20:59.509Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 111.4s
- **Session / request ids:** redacted

## Query

```text
After completing the documented onboarding, what exact checks do the official docs tell a developer to run to confirm the setup works end to end? List every documented verification command or check. If the docs contain no end-to-end verification checklist, say so explicitly and list the closest documented checks instead.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
**The documentation does not contain an end-to-end verification checklist.** There is no single page or section that says "after completing onboarding, run these checks to confirm your setup works."

Instead, the documentation provides **scattered verification commands** at specific points in different guides:

## Documented verification commands

### 1. Foundry installation verification
**Source:** [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)

```bash
cast --version
forge --version
```

**Expected result:** "Both should print a version number. If either fails, re-run foundryup."

### 2. Foundry compilation verification
**Source:** [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide)

```bash
forge build
```

**Expected result:** "You should see `Compiler run successful`. If you see errors, check that the Solidity version in foundry.toml is ^0.8.20 or higher."

### 3. Hardhat compilation and testing
**Source:** [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token)

```bash
npx hardhat compile
npx hardhat test
```

**Expected result:** Not explicitly stated, but implied to succeed without errors.

### 4. Pre-deployment balance check
**Source:** [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide)

```bash
cast wallet address --private-key $PRIVATE_KEY
cast balance $DEPLOYER --rpc-url $RPC --ether
```

**Expected result:** Shows the deployer address and its balance before attempting deployment.

### 5. Contract verification after deployment
**Source:** [Pharos Skill Engine](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide), [Write Your First Token (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-token)

```bash
sleep 10
forge verify-contract <contract_address> src/MyContract.sol:MyContract \
  --chain-id 688689 \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract \
  --verifier blockscout
```

**Expected result:** Contract source code verified on the explorer.

### 6. Node health check (for node operators)
**Source:** [Using Docker](https://docs.pharos.xyz/node-and-validator-guide/validator-node-deployment/using-docker-deployment)

```bash
curl http://localhost:18100
```

**Expected result:** Node responds with health status.

### 7. Network connectivity test (for validators)
**Source:** [Node Management](https://docs.pharos.xyz/node-and-validator-guide/node-management)

```bash
./ops network-test
```

**Expected result:** Tests connectivity to other validators.

### 8. Balance confirmation after receiving PROS
**Source:** [Get PROS Gas](https://docs.pharos.xyz/getting-started/get-pros-gas)

Three methods documented:
1. **Block explorer:** "Go to pharosscan.xyz and paste your address into the search bar"
2. **Wallet:** "Open MetaMask / OKX Wallet / TopNod with the Pharos network selected"
3. **RPC call:**
```bash
curl https://rpc.pharos.xyz \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_getBalance",
    "params": ["<your-address>", "latest"],
    "id": 1
  }'
```

**Expected result:** "The result is a hex-encoded wei value; divide by 1e18 for PROS."

---

## What is NOT documented

The documentation does **not** provide:
- A unified "verify your setup" checklist after onboarding
- Explicit success criteria for each verification step (beyond "should print a version number" or "Compiler run successful")
- A recommended order to run these checks
- Troubleshooting guidance if verification commands fail (beyond "re-run foundryup" for Foundry installation)
- Verification steps for Hardhat installation (no `npx hardhat --version` or similar)
- Verification steps for Node.js installation
- Verification steps for wallet configuration (MetaMask network setup)
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `4120`
