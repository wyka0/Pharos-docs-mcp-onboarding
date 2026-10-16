# Transcript 05-deploy-and-verify

- **Captured:** 2026-10-16T14:12:06.514Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 77.5s
- **Session / request ids:** redacted

## Query

```text
What are the exact documented steps to deploy a smart contract to Pharos, and afterwards to verify that the deployment succeeded? Include the exact commands, the explorer URL pattern for checking an address or transaction, and the exact verification command if the docs document contract verification.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
The documentation provides two parallel deployment paths — **Hardhat** and **Foundry** — each with its own deploy and verify commands. Both paths share the same explorer URL patterns for checking deployment success.

---

## Explorer URL patterns (shared by both paths)

**Source:** [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) and [Atlantic Testnet](https://docs.pharos.xyz/getting-started/network/atlantic-testnet) / [Pacific Mainnet](https://docs.pharos.xyz/getting-started/network/pacific-mainnet)

| Network | Explorer base URL | Address pattern | Transaction pattern |
|---|---|---|---|
| Atlantic Testnet | `https://atlantic.pharosscan.xyz/` | `https://atlantic.pharosscan.xyz/address/<address>` | `https://atlantic.pharosscan.xyz/tx/<txHash>` |
| Pacific Mainnet | `https://www.pharosscan.xyz` | `https://www.pharosscan.xyz/address/<address>` | `https://www.pharosscan.xyz/tx/<txHash>` |

The Piggy Bank Tutorial uses the shorthand `<explorerUrl>/address/<vaultAddress>` and `<explorerUrl>/tx/<txHash>`.

---

## Path A: Hardhat

**Source pages:** [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token), [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp)

### Step 1 — Set the private key
```shell
npx hardhat vars set PRIVATE_KEY
```

### Step 2 — Deploy
```shell
npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos
```
(The module path varies by guide — `./ignition/modules/Counter.js` for the dApp guide, `./ignition/modules/Token.js` for the token guide.)

The deploy command outputs the new contract address. Use it in the explorer URL pattern above.

### Step 3 — Verify the contract on the explorer
```shell
npx hardhat verify --network pharos <contract_address> <constructor_args_params>
```

The `hardhat.config.js` must include an `etherscan.customChains` entry pointing at the Pharos explorer API. For Atlantic Testnet:
```js
etherscan: {
  customChains: [
    {
      network: "pharos",
      chainId: 688689,
      urls: {
        apiURL: "https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract",
        browserURL: "https://atlantic.pharosscan.xyz/",
      },
    },
  ],
  apiKey: {
    pharos: "Put a random string", // Note we don't need a apiKey here, just leave a random string
  },
}
```

### Step 4 — Confirm on the block explorer
Open `https://atlantic.pharosscan.xyz/address/<contract_address>` in a browser. The [Block Explorer](https://docs.pharos.xyz/tooling-and-infrastructure/block-explorer) page states you can use it to *"verify deployed contracts and view source code"* and *"view transactions and check their status."*

---

## Path B: Foundry

**Source pages:** [Write Your First Token (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-token), [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp)

### Step 1 — Set the private key
```shell
export PRIVATE_KEY=<your private key>
```

### Step 2 — Compile
```shell
forge build
```

### Step 3 — Deploy
```shell
forge script script/DeployToken.s.sol --rpc-url <PHAROS_RPC_URL> --broadcast
```
Where `<PHAROS_RPC_URL>` is:
- Atlantic Testnet: `https://atlantic.dplabs-internal.com`
- Pacific Mainnet: `https://rpc.pharos.xyz`

The Piggy Bank Tutorial shows the fuller form with explicit private key:
```shell
forge script script/DeploySimpleVault.s.sol:DeploySimpleVault \
  --rpc-url <rpc> \
  --private-key $PRIVATE_KEY \
  --broadcast
```

The deploy output includes the new contract address and transaction hash.

### Step 4 — Verify the contract on the explorer

**For Atlantic Testnet (chain ID 688689):**
```shell
forge verify-contract \
  <contract_address> \
  --constructor-args <abi_encoded_args> \
  src/Token.sol:*** 688688 \
  --verifier blockscout \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract
```

**For Testnet (chain ID 688688):**
```shell
forge verify-contract \
  <contract_address> \
  --constructor-args <abi_encoded_args> \
  src/Token.sol:*** 688689 \
  --verifier blockscout \
  --verifier-url https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract
```

> **Note:** The docs contain a likely typo — the "Atlantic Testnet" heading uses chain ID `688688` and the "Testnet" heading uses `688689`, which is the reverse of what the network parameter pages state (Atlantic = 688689, Testnet = 688688). The Piggy Bank Tutorial's verify command uses the correct pattern: `--chain-id <chain_id>` read from `assets/networks.json`.

The Piggy Bank Tutorial shows the canonical form with `cast abi-encode` for constructor args:
```shell
forge verify-contract <vault_address> src/vault/SimpleVault.sol:SimpleVault \
  --chain-id <chain_id> \
  --verifier-url <explorer_api_url>/v1/explorer/command_api/contract \
  --verifier blockscout \
  --constructor-args $(cast abi-encode "constructor(uint256)" <lockDurationSeconds>)
```

### Step 5 — Confirm on the block explorer
Open `https://atlantic.pharosscan.xyz/address/<contract_address>` to see the verified source code, or `https://atlantic.pharosscan.xyz/tx/<txHash>` to confirm the deployment transaction status.

---

## Documented troubleshooting

Both paths list the same failure modes ([Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token), [Write Your First Token (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-token)):

| Problem | Cause | Fix |
|---|---|---|
| Contract deployment fails | Not enough testnet tokens for gas | Ensure wallet has PHRS/PROS |
| Interaction issues | Wrong contract address or ABI | Verify address and ABI are correct |
| Insufficient balance | Wallet has no tokens | Fund the wallet |
| `contract not found` during verify | Explorer hasn't indexed yet | Wait 10–15 seconds and retry |
| `verification failed` | Source mismatch | Check compiler version matches |
| `constructor arguments mismatch` | Wrong args encoding | Confirm constructor arg values |
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `6340`
