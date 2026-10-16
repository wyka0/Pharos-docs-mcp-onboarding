# Transcript 01-onboarding-path

- **Captured:** 2026-10-16T14:05:54.416Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 41.2s
- **Session / request ids:** redacted

## Query

```text
I am a developer new to Pharos. What is the exact documented onboarding path from zero to a first working build on Pharos? Give the steps in order with the exact URLs, tool names, commands and prerequisites, and name the documentation page each step comes from.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
Here is the exact documented onboarding path from zero to a first working build on Pharos, synthesized from the official docs. The documentation offers two parallel toolchain paths (Hardhat and Foundry); both share the same prerequisites.

---

## Phase 1 — Prerequisites (shared by both paths)

### Step 1: Choose your network
Start on **Atlantic Testnet** for development; move to **Pacific Mainnet** (chain 1672, gas token PROS) when ready for production.

| Parameter | Atlantic Testnet | Pacific Mainnet |
|---|---|---|
| RPC URL | `https://atlantic.dplabs-internal.com` | `https://rpc.pharos.xyz` |
| Chain ID | `688689` | `1672` |
| Explorer | `https://atlantic.pharosscan.xyz/` | `https://www.pharosscan.xyz` |
| Symbol | PHRS | PROS |

**Source:** [Network](https://docs.pharos.xyz/getting-started), [Atlantic Testnet](https://docs.pharos.xyz/getting-started/network/atlantic-testnet), [Pacific Mainnet](https://docs.pharos.xyz/getting-started/network/pacific-mainnet)

---

### Step 2: Set up a wallet
Create an EVM-compatible wallet (MetaMask or any EVM wallet) and add the Pharos Atlantic Testnet:
- **Network Name:** `Pharos Atlantic Testnet`
- **RPC URL:** `https://atlantic.dplabs-internal.com`
- **Chain ID:** `688689`
- **Symbol:** `PHRS`

Export your private key — you will need it for deploying.

**Source:** [Piggy Bank Tutorial — Prerequisites](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Wallet](https://docs.pharos.xyz/tooling-and-infrastructure/wallets)

---

### Step 3: Get testnet PHRS
Get testnet PHRS from the Pharos faucet or directly from the team. (For mainnet PROS, use Halliday, Alchemy Pay, or TopNod at [port.pharos.xyz/get-pros](https://port.pharos.xyz/get-pros).)

**Source:** [Piggy Bank Tutorial — Prerequisites](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Get PROS Gas](https://docs.pharos.xyz/getting-started/get-pros-gas)

---

## Phase 2 — Path A: Hardhat (JavaScript/TypeScript)

### Step 4A: Install Hardhat
Install from [hardhat.org](https://hardhat.org/hardhat-runner/docs/getting-started#installation).

**Source:** [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp)

---

### Step 5A: Set up the project
```shell
git clone https://github.com/PharosNetwork/examples
cd examples/dapp/hardhat
npm install
```

**Source:** [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp)

---

### Step 6A: Deploy the smart contract
```shell
npx hardhat vars set PRIVATE_KEY
cd contract && npm install
npx hardhat ignition deploy ./ignition/modules/Counter.js --network pharos
```

**Source:** [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp)

---

### Step 7A: Build the frontend
Open `src/app.jsx`, replace its content with the React + ethers.js code provided in the docs (a Simple Storage dApp with `set`/`get` functions), and replace `YOUR_CONTRACT_ADDRESS` with the address from Step 6A.

**Source:** [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp)

---

### Step 8A: Run the dApp
```shell
npm start
```
Open `http://localhost:3000` in your browser and interact with the smart contract via the input field and buttons.

**Source:** [Write Your First dApp (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp)

---

## Phase 2 — Path B: Foundry (Solidity-native)

### Step 4B: Install Foundry
```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.zshenv && foundryup
```
Verify:
```bash
cast --version
forge --version
```

**Source:** [Piggy Bank Tutorial — Prerequisites](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide), [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp)

---

### Step 5B: Set up the project
```shell
git clone https://github.com/PharosNetwork/examples
cd examples/dapp/foundry
npm install
```

**Source:** [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp)

---

### Step 6B: Deploy the smart contract
```shell
export PRIVATE_KEY=<your private key>
cd contract
forge install OpenZeppelin/openzeppelin-contracts --no-git
forge script script/Counter.s.sol:CounterScript --rpc-url <PHAROS_RPC_URL> --broadcast
```

**Source:** [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp)

---

### Step 7B: Build the frontend
Same as Step 7A — open `src/app.jsx`, replace with the React + ethers.js code, and substitute `YOUR_CONTRACT_ADDRESS`.

**Source:** [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp)

---

### Step 8B: Run the dApp
```shell
npm start
```
Open `http://localhost:3000`.

**Source:** [Write Your First dApp (Foundry)](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp)

---

## Summary of all documentation pages referenced

| Step | Page |
|---|---|
| Network choice | [Network](https://docs.pharos.xyz/getting-started) |
| Atlantic Testnet params | [Atlantic Testnet](https://docs.pharos.xyz/getting-started/network/atlantic-testnet) |
| Pacific Mainnet params | [Pacific Mainnet](https://docs.pharos.xyz/getting-started/network/pacific-mainnet) |
| Wallet setup | [Wallet](https://docs.pharos.xyz/tooling-and-infrastructure/wallets) |
| Testnet tokens | [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) |
| Mainnet PROS | [Get PROS Gas](https://docs.pharos.xyz/getting-started/get-pros-gas) |
| Hardhat dApp (full path) | [Write Your First dApp — Hardhat](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-dapp) |
| Foundry dApp (full path) | [Write Your First dApp — Foundry](https://docs.pharos.xyz/developer-guide/foundry/write-your-first-dapp) |
| Hardhat overview | [Hardhat](https://docs.pharos.xyz/developer-guide/hardhat) |
| First token (Hardhat) | [Write Your First Token](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token) |

**Prerequisites stated by the docs (both paths):** Git, Node.js (from [nodejs.org](https://nodejs.org/)), and Pharos Devnet/Testnet access (a local or remote Pharos node).
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `6447`
