# Transcript 03-self-contained-example

- **Captured:** 2026-10-16T14:08:47.634Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 50.0s
- **Session / request ids:** redacted

## Query

```text
Show the smallest self-contained runnable example that the documentation supports for the Pharos Atlantic Testnet: the exact commands to create the project from scratch, the exact config file contents, and the exact source code, without cloning an external repository. If the docs only provide an external example repository, say so explicitly and give the exact repository URL and directory path.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
The documentation does **not** provide a fully self-contained from-scratch example. Every developer guide in the Pharos docs begins with "Clone the example repo." The smallest documented path is the Hardhat Token guide.

## What the docs require

**Repository URL:** `https://github.com/PharosNetwork/examples`
**Smallest directory path:** `examples/token/hardhat/contract`

**Source page:** [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token)

The exact documented commands to set up the project are:

```shell
git clone https://github.com/PharosNetwork/examples
cd examples/token/hardhat/contract
npm install
```

The repo supplies `package.json`, the Ignition deploy module at `ignition/modules/Token.js`, and the test files — none of which are reproduced inline in the docs.

---

## What the docs *do* give you inline

The following two files and the build/deploy commands are quoted exactly from the documentation and can be copied verbatim once the repo is cloned.

### `contracts/Token.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(uint256 initialSupply) ERC20("Token", "MTK") {
        _mint(msg.sender, initialSupply);
    }
}
```

### `hardhat.config.js` (Atlantic Testnet)

```js
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    pharos: {
      url: "https://atlantic.dplabs-internal.com",
      accounts: [vars.get("PRIVATE_KEY")],
    },
  },
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
};
```

### Build, test, and deploy commands

```shell
npx hardhat compile
npx hardhat test
npx hardhat vars set PRIVATE_KEY
npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos
```

### Verification command

```shell
npx hardhat verify --network pharos <contract_address> <constructor_args_params>
```

---

## What is missing from the docs for a true from-scratch build

To reconstruct the project without cloning the repo, you would need to create on your own:

1. `package.json` — the docs only say `npm install` (which installs OpenZeppelin Contracts into the repo-supplied package manifest).
2. `ignition/modules/Token.js` — the deploy module is referenced by the deploy command but its source is not shown.
3. Test files — `npx hardhat test` is documented but no test source is shown.
4. The `vars` import — the config uses `vars.get("PRIVATE_KEY")` but the docs do not show the required `const vars = require("hardhat/config");` (or equivalent) import at the top of `hardhat.config.js`.

---

## Closest alternative: Foundry Piggy Bank tutorial

The [Piggy Bank Tutorial](https://docs.pharos.xyz/tooling-and-infrastructure/pharos-skill-engine-guide/piggybank-skill-guide) comes closest to a from-scratch flow because it starts with `forge init vault-test` (which scaffolds a new Foundry project locally), then has you copy in a complete `SimpleVault.sol` and run `forge build` + `forge script`. However, it is framed as a Skill Engine tutorial rather than a standalone "first contract" guide, and the deploy script it gives contains placeholders (`<lockDurationSeconds>`, etc.) that must be filled in by the reader. It also requires the Skill Engine folder structure for full operation.

**Bottom line:** for the smallest documented runnable example on Atlantic Testnet, clone `https://github.com/PharosNetwork/examples` and work inside `examples/token/hardhat/contract`.
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `3978`
