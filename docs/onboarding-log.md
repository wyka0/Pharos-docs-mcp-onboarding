# Onboarding log — Pharos Developer Docs MCP

Chronological record of what was tried, the exact questions asked to the Developer Docs MCP,
the answers received, and what happened when each answer was acted on.

**Session:** 2026-10-16, Windows 11, Node `v24.14.1`, npm `11.11.0`, git `2.53.0`.
**Surface:** `https://ai.pharos.xyz` → agent type `PHAROS_DOCS` (labelled "Pharos Docs MCP" in the site's own navigation).
**Rule followed throughout:** the Docs MCP was the only source of documentation. No web search,
no third-party docs, no other MCP server was used to fill gaps. Where an answer was missing or
wrong, that is recorded as such rather than patched from elsewhere.

Legend for results: **PASS** · **FAIL** · **BLOCKED** · **PARTIAL**

---

## Phase 1 — Inspecting the real environment

### Step 1 — Inventory of the environment

**Goal:** find out what "the Pharos Developer Docs MCP" actually is before asking it anything.

**Action:** inspected the local OpenCode configuration, the workspace, and the live
`https://ai.pharos.xyz` application (its own JavaScript bundle and network traffic).

**Result: PARTIAL (informational).** Findings:

| Finding | Evidence |
| --- | --- |
| No Pharos MCP server is configured in this environment | `%USERPROFILE%\.config\opencode\opencode.json*` contains providers only, no `mcp` block |
| `ai.pharos.xyz` exposes four named agent surfaces, one of which is literally labelled "Pharos Docs MCP" | site bundle maps `PHAROS_DOCS` → label `"Pharos Docs MCP"`, routed from `/network-info` and `/build-tools` |
| The docs agent is a **hosted chat agent**, not a locally installed MCP server | every request goes through the site's own HTTP API |
| The site also configures wallets (wagmi/AppKit) and shows a `Connect Wallet` control | `localStorage` keys `wagmi.store`, `@appkit/connection_status` |

The four agent ids exposed by the product are:

```text
PHAROS_PERSONAL_AGENT   → "General Chat"
PHAROS_DOCS             → "Pharos Docs MCP"
PHAROS_SKILL_ENGINE     → "Pharos Official Skill"
PHAROS_MCP              → "PharosMCP"
```

**What was learned / next step:** the "Developer Docs MCP" is reachable only through the
Agent Center API. Its request contract had to be established empirically, because the Pharos
documentation does not describe it (see query 07/09 below).

### Step 2 — Establish the wire protocol empirically

**Goal:** be able to send a question and capture the answer verbatim.

**Action:** observed the live application's own requests and reproduced them:

```text
POST https://flow.anvita.xyz/api/v1/widget/bootstrap
     body: {"appKey":"agent_center","clientNonce":"bootstrap-<uuid>"}
POST https://flow.anvita.xyz/api/v1/pharos/chat/completions
     headers: Accept: text/event-stream, Authorization: Bearer <token>
     body: {"spaceType":"pharos","operationType":"chat","agentType":"PHAROS_DOCS",
            "sessionId":"<chat session id>","message":"…","requestId":"<uuid>","stream":true}
     response: SSE frames `data: {…}` terminated by `data: [DONE]`
```

**Result: PASS** for the transport, after three undocumented obstacles (each recorded in the gap
report):

| Attempt | Observed result | Conclusion |
| --- | --- | --- |
| bootstrap without a browser `Referer` | `HTTP 403 {"code":"WIDGET_ORIGIN_FORBIDDEN","message":"Widget origin forbidden"}` | a `Referer`/`Origin` header is mandatory and undocumented |
| bootstrap against `api.pharosnetwork.xyz` | `HTTP 403 {"code":1,"msg":"Referer header is required"}` | the Agents API lives on `flow.anvita.xyz` |
| guest token on `/pharos/chat/completions` | `HTTP 401 {"code":"401","message":"Unauthorized, please login first"}` | guest sessions cannot chat |

### Step 3 — Work out how a session becomes usable

**Goal:** determine what a guest has to do to talk to the Docs MCP.

**Action:** probed each agent-center endpoint the web client uses, in order.

**Result: PARTIAL.** The dependency chain is:

```text
GUEST  ──wallet/challenge + agentcenter/wallet/verify──▶  ONBOARDING
ONBOARDING ──poll /widget/onboarding/status──▶ GUARDIAN_SIGNATURE_REQUIRED
GUARDIAN_SIGNATURE_REQUIRED ──EIP-712 "ClaimIntent" signature──▶ FULL_READY
FULL_READY ──/agentcenter/onboarding/complete──▶ AUTHENTICATED  (the only scope chat accepts)
```

Two traps found on the way:

- `POST /widget/agentcenter/wallet/verify` returns
  `HTTP 403 {"code":"WIDGET_ORIGIN_FORBIDDEN","message":"Widget origin forbidden"}` when the
  request is missing the **bearer token** — the error names the wrong cause.
- the `sessionId` sent to the chat endpoint must be the agent's **`chatSessionId`** from
  `GET /api/v1/pharos/conversations/session/<parent>/agents`, not the widget session id
  returned by bootstrap; the wrong id produces `HTTP 500` with an empty body.

**What was learned / next step:** the surface is reachable, but only after an undocumented
wallet sign-in. The Docs MCP itself has no documentation on any of this.

---

## Phase 2 — Reproducible onboarding, using only the Docs MCP as documentation

### Step 4 — Ask the Docs MCP for the documented onboarding path

**Query (verbatim):**

```text
I am a developer new to Pharos. What is the exact documented onboarding path from zero to a
first working build on Pharos? Give the steps in order with the exact URLs, tool names,
commands and prerequisites, and name the documentation page each step comes from.
```

**Answer:** a two-path (Hardhat / Foundry) eight-step guide, with per-step sources. Key facts
returned: start on **Atlantic Testnet**, clone `https://github.com/PharosNetwork/examples`, run
`cd examples/dapp/hardhat && npm install`, deploy with
`npx hardhat ignition deploy ./ignition/modules/Counter.js --network pharos`, run the frontend
with `npm start`. Prerequisites stated: Git, Node.js, testnet access.

Full text: [`docs/transcripts/01-onboarding-path.md`](transcripts/01-onboarding-path.md).

**Action attempted:** followed it, starting with the network parameters the MCP supplied.

**Result: PASS** (answer received, 41.2 s, 6447 characters, no stream errors).

---

### Step 5 — Verify the documented network parameters against the live chains

**Query:** `02-network-parameters` (see [transcript](transcripts/02-network-parameters.md)) —
asked for RPC URL, chain id, explorer, native symbol and faucet URL for every documented network.

**Answer:** two documented networks plus a third that only exists inside Hardhat config examples:

| Network | RPC URL | Chain id | Explorer | Symbol | Faucet |
| --- | --- | --- | --- | --- | --- |
| Atlantic Testnet | `https://atlantic.dplabs-internal.com` | `688689` | `https://atlantic.pharosscan.xyz/` | PHRS | **not documented** |
| Pacific Mainnet | `https://rpc.pharos.xyz` | `1672` | `https://www.pharosscan.xyz` | PROS | n/a (purchase) |
| "Testnet" (config comments only) | `https://testnet.dplabs-internal.com` | `688688` | `https://testnet.pharosscan.xyz/` | **not documented** | **not documented** |

**Action attempted:** `node scripts/verify-network.mjs` — a read-only script that asks each
documented RPC for `eth_chainId` / `eth_blockNumber` and each explorer for an HTTP status,
comparing the observed chain id to the documented one.

**Result: 2 PASS, 1 FAIL.**

```text
PASS     Atlantic Testnet        chainId documented=688689 observed=688689  block=31499282  explorer=200
PASS     Pacific Mainnet         chainId documented=1672   observed=1672    block=20399026  explorer=200
FAIL     "Testnet" (688688)      rpc=https://testnet.dplabs-internal.com -> fetch failed (ERR_TLS_CERT_ALTNAME_INVALID)
                                 explorer=https://testnet.pharosscan.xyz/ -> CERT_HAS_EXPIRED
```

Machine-readable evidence: [`docs/verified-network.json`](../verified-network.json).

**What was learned / next step:** the two headline networks are real and correctly documented;
the third network a developer is invited to configure cannot be reached at all.

---

### Step 6 — Ask for a self-contained example

**Query:** `03-self-contained-example` ([transcript](transcripts/03-self-contained-example.md)) —
explicitly requested a from-scratch project without cloning anything, and asked the MCP to say
so if only an external repository exists.

**Answer (verbatim opening):**

> "The documentation does **not** provide a fully self-contained from-scratch example. Every
> developer guide in the Pharos docs begins with 'Clone the example repo.'"

It then supplied the smallest documented path, `examples/token/hardhat/contract`, the inline
`Token.sol` source, an inline `hardhat.config.js`, and the deploy/verify commands.

**Result: PARTIAL** (the MCP answered honestly; the documentation itself has no self-contained path).

---

### Step 7 — Run the documented repository build

**Action attempted:** cloned `PharosNetwork/examples` (resolved to `f08e921`) into a temporary
directory **outside** this repository — the upstream repository is not vendored here — then ran
every documented command in `token/hardhat/contract`.

**Results:** see [`docs/transcripts/examples-build.md`](transcripts/examples-build.md) for the
verbatim log.

| Documented step | Result | Notes |
| --- | --- | --- |
| `git clone` | **PASS** | repository exists, documented paths exist |
| `npm install` | **PASS** | one transient `ECONNRESET`, retry succeeded |
| `npx hardhat compile` (as written) | **FAIL** | `HH1201: Cannot find a value for the configuration variable 'PRIVATE_KEY'` — docs order the commands so that compile runs before the key is set |
| `npx hardhat vars set PRIVATE_KEY` | **FAIL** | interactive password prompt; not runnable from scripts/CI, no documented alternative |
| `npx hardhat compile` (with `HARDHAT_VAR_PRIVATE_KEY`) | **PASS** | 6 Solidity files compiled |
| `npx hardhat test` | **PASS** | 2 passing |
| `npx hardhat ignition deploy … --network pharos` | **BLOCKED** | interactive confirm, then `IGN410: Gas estimation failed: The execution has run out of gas` |

**Diagnosis of the BLOCKED step (using only the RPC URL the Docs MCP supplied):**

```text
deployer 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
balance wei 0x0 -> 0.000000 PHRS
gasPrice wei 0x2540be400 -> 10.0000 gwei
```

The deployer has no testnet gas, and the documented way to obtain it is a faucet with no
documented URL (step 8).

**What was learned / next step:** the documented example builds and its tests pass; the
onboarding chain dead-ends at the first on-chain action.

---

### Step 8 — Ask specifically for the faucet

**Query:** `04-testnet-faucet` ([transcript](transcripts/04-testnet-faucet.md)) — asked for the
exact faucet URL, steps, prerequisites and limits, and instructed the agent to say so explicitly
if no public faucet is documented.

**Answer (verbatim opening):**

> "**No public faucet URL is documented.** … The only mention of obtaining testnet PHRS is a
> single sentence … *'Get testnet PHRS from the Pharos faucet or directly from the team.'*"

The agent also reported that it checked two plausible doc URLs (`/getting-started/faucet`,
`/getting-started/get-testnet-phrs`), both "Page not found".

**Result: BLOCKED** for the deployment leg. Confirmed by step 7's `IGN410`.

---

### Step 9 — Ask for deployment, verification and error guidance

**Queries:** `05-deploy-and-verify`, `06-common-errors`, `11-verification-checklist`,
`12-hardhat-config` ([transcripts](transcripts/)).

**Answers:** the deploy command set, the `hardhat verify` form, the explorer-side API URL
(`https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract`), and an
explicit admission that **no end-to-end verification checklist exists** in the docs.

**Result: PARTIAL.** Two problems surfaced while acting on these answers:

1. `npx hardhat vars set PRIVATE_KEY` (the documented way to provide the key) cannot be scripted.
2. The MCP's `hardhat.config.js` snippet does not byte-match the repository it tells you to
   clone (`browserURL` differs), and its claim that the config needs an extra `vars` import was
   **refuted experimentally** — the unmodified file compiles and tests cleanly (evidence in
   [`examples-build.md`](transcripts/examples-build.md), step 7).

---

### Step 10 — Ask what the Docs MCP itself is

**Queries:** `07-docs-mcp-access`, `08-mcp-tools`, `09-chain-mcp-vs-docs-mcp`
([transcripts](transcripts/)).

**Answers:**

- `07` was asked "what is the Developer Docs MCP … if the official docs do not document
  programmatic access, answer exactly: 'not documented'". It answered with a full description of
  the **Chain MCP** (`https://mcp.pharos.xyz/mcp`) instead, quoting
  `docs.pharos.xyz/tooling-and-infrastructure/mcp`.
- `08` confirmed the documented tool list (`get_chain_info`, `get_block`, `get_logs`, …) and
  stated plainly: *"The documentation does not list the complete input parameter schemas for each
  tool."*
- `09` was the only answer that named the distinction:

  > "**The Pharos Docs MCP is not documented in the official Pharos documentation.** The GitBook
  > MCP server at `https://docs.pharos.xyz/~gitbook/mcp` exists and is functional (I've been using
  > it throughout this conversation to query the docs), but … It is not mentioned anywhere in the
  > Pharos documentation."

**Result: PARTIAL.** A developer following the Docs MCP's own advice would integrate the Chain
MCP, not the docs assistant.

---

### Step 11 — Complete the agent onboarding and query the Docs MCP end to end

**Action attempted:** `node scripts/verify-onboarding.mjs`, which performs every step of the
agent onboarding with a throwaway local key pair and reports per-step status.

**Result: PASS=8, PARTIAL=0, FAIL=0.**

```text
PASS  1a. guest bootstrap without Origin/Referer → HTTP 403 (requirement enforced, undocumented)
PASS  1b. guest bootstrap with browser headers   → tokenType=GUEST quota=10 chains=["5734951"]
PASS  2.  guest token on the chat endpoint       → HTTP 401 "Unauthorized, please login first"
PASS  3a. wallet challenge + verify              → tokenType=AUTHENTICATED
PASS  3b. onboarding status poll                 → state=AUTHENTICATED nextAction=ENTER_CHAT
PASS  3c. guardian EIP-712 claim submit          → code=000000 (fresh accounts only)
PASS  4a. resolve chatSessionId for PHAROS_DOCS  → pharos-agent-<redacted> (session-scoped id)
PASS  4b. Docs MCP answers over SSE              → finished with content, 0 stream errors
```

Machine-readable evidence: [`docs/verified-onboarding.json`](../verified-onboarding.json).

**What was learned / next step:** the Developer Docs MCP can be queried programmatically once
the undocumented wallet + guardian onboarding is completed. Cost model observed on the account
endpoint: `credits.rawCredits=300` (≈ `0.300` USDC) for a new account, and the UI can surface
*"Your Credit balance is too low for the Guardian Agent to reply"* — a paywall that the
onboarding path never mentions.

---

### Step 12 — Full question set, captured verbatim

**Action:** `node scripts/run-queries.mjs` ran the twelve questions in
[`queries/onboarding-questions.json`](../queries/onboarding-questions.json) against
`PHAROS_DOCS` and wrote one transcript per question.

**Result: PASS 12/12** (no failed or empty answers).

| Query | Status | Answer chars | Duration |
| --- | --- | --- | --- |
| `01-onboarding-path` | PASS | 6447 | 41.2s |
| `02-network-parameters` | PASS | 4378 | 123.2s |
| `03-self-contained-example` | PASS | 3978 | 50.0s |
| `04-testnet-faucet` | PASS | 2207 | 121.4s |
| `05-deploy-and-verify` | PASS | 6340 | 77.5s |
| `06-common-errors` | PASS | 10853 | 94.3s |
| `07-docs-mcp-access` | PASS | 6501 | 96.5s |
| `08-mcp-tools` | PASS | 2393 | 27.2s |
| `09-chain-mcp-vs-docs-mcp` | PASS | 1190 | 55.9s |
| `10-toolchain-versions` | PASS | 2031 | 147.4s |
| `11-verification-checklist` | PASS | 4120 | 111.4s |
| `12-hardhat-config` | PASS | 2540 | 40.6s |

Answers take 30 s to 150 s each; a 180 s client-side timeout truncated the very first attempt, so
the client now keeps partial answers and defaults to a 600 s deadline.

---

## Final position

| Leg of the onboarding | Outcome |
| --- | --- |
| Reach the docs assistant programmatically | **PASS** — after undocumented wallet sign-in + guardian claim |
| Get the documented onboarding path | **PASS** — 12/12 queries answered, sources cited |
| Install and build the documented example | **PASS** — compiles, 2/2 tests pass |
| Deploy to the documented testnet | **BLOCKED** — no documented faucet, 0 PHRS, `IGN410` |
| Query the Docs MCP about itself | **PARTIAL** — the Docs MCP is undocumented; it answers with the Chain MCP |

Eight evidence-backed documentation gaps are written up in
[`docs/docs-gaps.md`](../docs-gaps.md).
