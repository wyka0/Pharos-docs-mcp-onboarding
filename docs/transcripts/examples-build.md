# Evidence: running the documented Pharos example build

Captured 2026-10-16 on Windows 11, Node `v24.14.1`, npm `11.11.0`, git `2.53.0`.

This file records what happened when the commands returned by the Docs MCP (transcripts
[`01-onboarding-path`](01-onboarding-path.md) and [`03-self-contained-example`](03-self-contained-example.md))
were executed verbatim. The clone lives in a temporary directory outside this repository; the
official example repository is **not** vendored here.

---

## Step 1 — clone the repository the docs point at

```text
$ git clone --depth 1 https://github.com/PharosNetwork/examples
Cloning into 'examples'...
```

Result: **PASS**. `git ls-remote https://github.com/PharosNetwork/examples` resolves to
`f08e921b7643f3ecfa5f388b8508778daa93b97a` (`refs/heads/main`, "Merge pull request #12 from
PharosNetwork/x402_mainnet"). The documented paths exist:

```text
token/hardhat/contract/contracts/Token.sol
token/hardhat/contract/ignition/modules/Token.js
token/hardhat/contract/test/Token.js
token/hardhat/contract/hardhat.config.js
token/hardhat/contract/package.json
```

## Step 2 — `npm install` (documented)

```text
$ cd examples/token/hardhat/contract && npm install
added 640 packages, and removed 2 packages in 2m
```

Result: **PASS**. (The first attempt died with `ECONNRESET` mid-download; a plain retry
succeeded. Transient network failure, not a documentation problem — recorded for honesty.)

Resolved versions of interest:

| Package | Version |
| --- | --- |
| `hardhat` | `2.29.1` (satisfies the documented `^2.22.17`) |
| `@nomicfoundation/hardhat-toolbox` | `^5.0.0` |
| `@openzeppelin/contracts` | `^5.1.0` |

## Step 3 — `npx hardhat compile` (documented, first attempt)

```text
$ npx hardhat compile
Error HH1201: Cannot find a value for the configuration variable 'PRIVATE_KEY'.
Use 'npx hardhat vars set PRIVATE_KEY' to set it or 'npx hardhat vars setup' to list all the
configuration variables used by this project.
```

Result: **FAIL** — and it fails for a documentation-ordering reason, not a user error. The docs
list the commands as `compile`, `test`, then `vars set PRIVATE_KEY`. Because
`hardhat.config.js` calls `vars.get("PRIVATE_KEY")` at config-load time, nothing works until the
variable exists.

## Step 4 — `npx hardhat vars set PRIVATE_KEY` (documented)

```text
$ echo <key> | npx hardhat vars set PRIVATE_KEY
? Enter value: *******************
Error: readline was closed
```

Result: **FAIL (not automatable)**. The documented command is an interactive `enquirer`
password prompt; it cannot be driven from stdin/CI. The docs give no non-interactive
alternative.

Workaround actually used (undocumented in the Pharos docs, standard Hardhat behaviour):

```text
$ export HARDHAT_VAR_PRIVATE_KEY=0x....   # publicly known throwaway test key, no funds
$ npx hardhat compile
Downloading compiler 0.8.28
Compiled 6 Solidity files successfully (evm target: paris).
```

Result: **PASS**.

## Step 5 — `npx hardhat test` (documented)

```text
$ npx hardhat test
  Token
    ✔ Should have the correct initial supply
    ✔ Should transfer tokens between accounts

  2 passing (979ms)
```

Result: **PASS** (2/2 tests).

## Step 6 — `npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos` (documented)

First attempt — the documented command stops on an interactive confirmation that the docs do
not mention:

```text
? Confirm deploy to network pharos (688689)? (y/N)
```

Second attempt with the prompt answered:

```text
IgnitionError: IGN410: Gas estimation failed: The execution has run out of gas.
    at sendTransactionForOnchainInteraction (@nomicfoundation/ignition-core ...)
```

Result: **BLOCKED**. The cause is provable from the chain itself, using the RPC URL the Docs MCP
supplied:

```text
deployer 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
balance wei 0x0 -> 0.000000 PHRS
gasPrice wei 0x2540be400 -> 10.0000 gwei
```

Zero PHRS, so gas estimation cannot succeed. Getting PHRS requires the faucet that
transcript [`04-testnet-faucet`](04-testnet-faucet.md) shows is not documented anywhere.

## Step 7 — the Docs MCP's own claim about `vars`, tested

Transcript [`12-hardhat-config`](12-hardhat-config.md) claims:

> "The documented file omits this import, so copying it verbatim would produce a
> `ReferenceError: vars is not defined` at runtime. This is a documentation bug, not a user error."

Result: **the claim is wrong.** The unmodified `hardhat.config.js` from the documented repository
loaded and compiled successfully in step 4 above. Hardhat injects `vars` (and the other config
helpers) as globals while loading the config file:

- `node_modules/hardhat/src/internal/core/config/config-env.ts` declares `export const vars = {…}` (line 172).
- `node_modules/hardhat/src/internal/core/config/config-loading.ts` copies every key of that
  module onto `global` before `require()`-ing the user's config (lines 90–96).

No `const { vars } = require("hardhat/config")` line is required in Hardhat 2.x.

## Step 8 — documented config snippet vs. the real repository file

| Field | Docs MCP snippet (`12-hardhat-config`) | Actual `examples/token/hardhat/contract/hardhat.config.js` |
| --- | --- | --- |
| `browserURL` | `https://atlantic.pharosscan.xyz/` | `https://pharos-atlantic-testnet.socialscan.io` |
| everything else | identical | identical |

The snippet the Docs MCP returns for "the exact `hardhat.config.js`" does not byte-match the
repository it tells you to clone.

---

## Summary

| # | Documented step | Result |
| --- | --- | --- |
| 1 | `git clone https://github.com/PharosNetwork/examples` | PASS |
| 2 | `npm install` | PASS (one transient retry) |
| 3 | `npx hardhat compile` (as documented) | FAIL — `HH1201`, ordering bug in the guide |
| 4 | `npx hardhat vars set PRIVATE_KEY` | FAIL — interactive prompt, not automatable |
| 5 | `npx hardhat compile` (with env-var workaround) | PASS — 6 files compiled |
| 6 | `npx hardhat test` | PASS — 2 passing |
| 7 | `npx hardhat ignition deploy ... --network pharos` | BLOCKED — 0 PHRS, `IGN410` |
| 8 | Docs MCP claim about the missing `vars` import | FAIL — claim is incorrect |
