# Transcript 12-hardhat-config

- **Captured:** 2026-10-16T14:21:40.106Z
- **Surface:** https://ai.pharos.xyz — Developer Docs MCP
- **Agent type:** `PHAROS_DOCS`
- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)
- **Duration:** 40.6s
- **Session / request ids:** redacted

## Query

```text
Show the exact hardhat.config.js file content that the Pharos documentation provides for deploying to the Atlantic Testnet, including the network entry, the ethers plugin version and the solidity version. If the documented file does not include the Atlantic Testnet network entry, point that out explicitly.
```

## Answer (verbatim from the Docs MCP; credentials redacted)

```text
Here is the exact `hardhat.config.js` content documented for Atlantic Testnet, quoted verbatim from [Write Your First Token (Hardhat)](https://docs.pharos.xyz/developer-guide/hardhat/write-your-first-token):

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

## Key details from the documented file

| Field | Value |
|---|---|
| **Hardhat plugin** | `@nomicfoundation/hardhat-toolbox` (which bundles `@nomicfoundation/hardhat-ethers` and therefore ethers.js v6) |
| **Solidity version** | `"0.8.28"` |
| **Network name** | `pharos` |
| **Chain ID** | `688689` |
| **RPC URL** | `https://atlantic.dplabs-internal.com` |
| **Explorer API URL** | `https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract` |
| **Explorer browser URL** | `https://atlantic.pharosscan.xyz/` |
| **API key** | `"Put a random string"` — the docs explicitly note: *"Note we don't need a apiKey here, just leave a random string"* |
| **Private key source** | `vars.get("PRIVATE_KEY")` — set via `npx hardhat vars set PRIVATE_KEY` |

## The Atlantic Testnet network entry IS present

The documented file **does** include the Atlantic Testnet network entry (chain ID `688689`, RPC `https://atlantic.dplabs-internal.com`). The docs also provide a separate variant for the older "Testnet" (chain ID `688688`, RPC `https://testnet.dplabs-internal.com`) on the same page.

## Notable issue in the documented file

The config references `vars.get("PRIVATE_KEY")` but does **not** import `vars`. The file only has `require("@nomicfoundation/hardhat-toolbox");` at the top. In a working Hardhat project, `vars` must be imported from `hardhat/config`:

```js
const { vars } = require("hardhat/config");
```

The documented file omits this import, so copying it verbatim would produce a `ReferenceError: vars is not defined` at runtime. This is a documentation bug, not a user error.
```

## Stream metadata

- finished: `true`
- client-side timeout reached (partial answer kept): `false`
- errors: `[]`
- content characters: `2540`
