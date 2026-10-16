# Documentation gaps — evidence-backed findings

Every finding below was produced by **actually querying the Pharos Developer Docs MCP**
(`agentType = PHAROS_DOCS` on `https://ai.pharos.xyz`) and then acting on the answer. Each item
carries the exact query, the reply text that exposes the problem, the impact on a developer, and
a concrete correction.

Verbatim transcripts live in [`docs/transcripts/`](transcripts/); live re-checks are stored in
[`docs/verified-network.json`](../verified-network.json) and
[`docs/verified-onboarding.json`](../verified-onboarding.json).

**Summary**

| # | Gap | Severity | Backing query |
| --- | --- | --- | --- |
| 1 | The "Developer Docs MCP" is not documented anywhere; the agent answers about a different product | High | `07`, `09` |
| 2 | No documented programmatic access; the real path is a five-stage, undocumented auth state machine | High | `07`, `08` |
| 3 | No faucet URL → the documented onboarding dead-ends before the first deployment | Critical | `04`, `06`, `01` |
| 4 | A documented network (`688688`) is unreachable: TLS hostname mismatch, expired explorer certificate | High | `02` |
| 5 | The documented quickstart command order fails (`HH1201`); two documented commands require a human at a TTY | High | `03`, `12` |
| 6 | The MCP returns a demonstrably false claim about `hardhat.config.js`, and its snippet does not match the repository it tells you to clone | Medium | `12` |
| 7 | The documented MCP tool list has no input schemas; the Docs MCP's own tool surface is absent from the docs | Medium | `08` |
| 8 | No end-to-end verification checklist, and the two errors this walkthrough actually hit are not in the documented error catalogue | Medium | `11`, `06` |

---

## Gap 1 — The "Developer Docs MCP" has no documentation page, and the agent answers about the Chain MCP instead

**Exact MCP query (`07-docs-mcp-access`):**

```text
What is the Pharos Developer Docs MCP? Describe it precisely using only official documentation:
what it is, how a developer accesses it programmatically (exact endpoint URL, transport,
authentication requirements), how it authenticates, and what its tools and parameters are.
If the official docs do not document programmatic access, answer exactly: 'not documented'.
```

**Response (verbatim excerpt):**

> "## What is the Pharos MCP? The Pharos MCP (Model Context Protocol) server is a public, hosted
> service that brings Pharos chain data and on-chain operations into any MCP-compatible AI client …
> **Hosted endpoint** `https://mcp.pharos.xyz/mcp`"

That is the **Chain MCP**, not the docs assistant that was asked about. It did not return the
requested `not documented` sentinel.

**Second query (`09-chain-mcp-vs-docs-mcp`)**, asking for the difference explicitly:

> "**The Pharos Docs MCP is not documented in the official Pharos documentation.** The GitBook MCP
> server at `https://docs.pharos.xyz/~gitbook/mcp` exists and is functional (I've been using it
> throughout this conversation to query the docs), but … It is not mentioned anywhere in the Pharos
> documentation. … There is no documentation page, endpoint listing, or description of a 'Pharos
> Docs MCP' as a separate service for developers to use."

**Why it is insufficient:** the name in this task's own instructions refers to a product surface
that the documentation never mentions. The two MCPs are easy to confuse and the docs agent itself
confuses them when asked directly, unless the question forces a comparison. A developer who asks
"what is the Docs MCP" gets a confident, fully cited description of an entirely different server.

**Impact:** a developer cannot discover the docs assistant, cannot tell it apart from the Chain
MCP, and — if they follow the returned answer — will integrate the wrong endpoint for
documentation questions.

**Proposed correction:** add a documentation page for the docs assistant and disambiguate both
MCPs on one page, and add the disambiguation to the docs agent's own system prompt.

**Replacement snippet (proposed content for `docs.pharos.xyz/…/mcp`):**

```markdown
## Pharos MCPs — which one do you need?

| | Pharos Chain MCP | Pharos Docs MCP |
|---|---|---|
| Purpose | read/write Pharos chain data (blocks, balances, logs, broadcast) | answer questions from this documentation site |
| Endpoint | `https://mcp.pharos.xyz/mcp` | hosted in the Agent Center: `https://ai.pharos.xyz` (agent `PHAROS_DOCS`) |
| Transport | Streamable HTTP | chat completions over SSE |
| Authentication | none (public, 120 req/min per IP) | wallet sign-in required (see the Agent Center quickstart) |
| Tools | `get_chain_info`, `get_block`, `get_logs`, … | documentation retrieval |

> These are different servers. Use the Chain MCP for on-chain data and the Docs MCP for
> documentation questions. The Docs MCP is *not* the GitBook service at
> `https://docs.pharos.xyz/~gitbook/mcp`.
```

---

## Gap 2 — No documented programmatic access, and the real onboarding is a five-stage state machine

**Exact MCP queries:** `07-docs-mcp-access` (above) and `08-mcp-tools`, both asking for
"exact endpoint URL, transport, authentication requirements" and "how a developer accesses it
programmatically". Both describe only the Chain MCP; neither returns the Agent Center endpoints.

**Observed reality** (documented nowhere; established by probing, reproducible with
`node scripts/verify-onboarding.mjs`, raw results in
[`docs/verified-onboarding.json`](../verified-onboarding.json)):

```text
1. POST /api/v1/widget/bootstrap              → 403 WIDGET_ORIGIN_FORBIDDEN unless Origin/Referer are set
2. POST /api/v1/widget/bootstrap              → 200, tokenType=GUEST, guestLimit=10, newUserCredits=300
3. POST /api/v1/pharos/chat/completions       → 401 "Unauthorized, please login first"   ← guest is useless
4. POST /api/v1/widget/wallet/challenge       → SIWE-style message to sign
5. POST /api/v1/widget/agentcenter/wallet/verify → tokenType=ONBOARDING
   (returns 403 WIDGET_ORIGIN_FORBIDDEN if the guest bearer token is omitted — misleading name)
6. GET  /api/v1/widget/onboarding/status      → HOSTED_AGENT_INITIALIZING → GUARDIAN_SIGNATURE_REQUIRED
7. POST /api/v1/widget/onboarding/guardian-claims/prepare → EIP-712 ClaimIntent typed data (domain chainId 1672)
8. POST /api/v1/widget/onboarding/guardian-claims/{id}/submit
9. POST /api/v1/widget/agentcenter/onboarding/complete → tokenType=AUTHENTICATED
10. GET /api/v1/pharos/conversations/session → parent sessionId
11. GET /api/v1/pharos/conversations/session/{id}/agents → per-agent chatSessionId
12. POST /api/v1/pharos/chat/completions      → 200 SSE  (widget sessionId here = HTTP 500, empty body)
```

The account also exposes a credit balance (`credits.rawCredits = 300`, `usdcValue = 0.300`) and
the UI can raise *"Your Credit balance is too low for the Guardian Agent to reply. Please add
funds and try again."* — a paywall the onboarding material never mentions.

**Why it is insufficient:** every one of steps 1–11 is undocumented. Two of them fail with error
codes whose names point at the wrong cause (`WIDGET_ORIGIN_FORBIDDEN` for a missing bearer token;
HTTP 500 with an empty body for the wrong session id), and the advertised guest quota
(`guestLimit: 10`) is unusable on the chat route.

**Impact:** a developer cannot build an automated or agent-driven Docs MCP client from the
documentation. The natural first attempt (take the guest token, call chat) fails with a bare 401,
and there is no documented pointer to the wallet flow that fixes it.

**Proposed correction:** publish an "Agent Center API" quickstart covering the token scopes
(`GUEST → ONBOARDING → AUTHENTICATED`), the required headers, the guardian-claim step, the
parent-session/`chatSessionId` distinction, and the credit model. Fix the two misleading error
codes (`WIDGET_ORIGIN_FORBIDDEN` → `MISSING_BEARER_TOKEN`; return 400 with a body for an unknown
`sessionId`).

**Replacement snippet (proposed quickstart):**

````markdown
## Query the Docs MCP programmatically

| Step | Request |
|---|---|
| 1 | `POST https://flow.anvita.xyz/api/v1/widget/bootstrap` with `Origin: https://ai.pharos.xyz` and `Referer: https://ai.pharos.xyz/` |
| 2 | `POST /api/v1/widget/wallet/challenge` — sign the returned message with your wallet (EIP-191) |
| 3 | `POST /api/v1/widget/agentcenter/wallet/verify` — send the guest bearer token **and** the signature |
| 4 | Poll `GET /api/v1/widget/onboarding/status`; when `nextAction=PREPARE_OR_SIGN_GUARDIAN`, sign the EIP-712 `ClaimIntent` and submit it |
| 5 | `POST /api/v1/widget/agentcenter/onboarding/complete` — the token becomes `AUTHENTICATED` |
| 6 | Resolve your chat session: `GET /api/v1/pharos/conversations/session` → `GET …/{sessionId}/agents` → use that agent's `chatSessionId` |
| 7 | `POST /api/v1/pharos/chat/completions` with `Accept: text/event-stream` |

Guest tokens are **read-only** and cannot call `/api/v1/pharos/*`. Replies consume credits.
````

---

## Gap 3 — No faucet URL: the documented onboarding cannot reach its first deployment

**Exact MCP query (`04-testnet-faucet`):**

```text
How exactly does a developer obtain Atlantic Testnet PHRS? Give the exact faucet URL, the steps,
and any prerequisites or limits the documentation states. If no public faucet is documented, say
so explicitly instead of guessing.
```

**Response (verbatim excerpt):**

> "**No public faucet URL is documented.** … The only mention of obtaining testnet PHRS is a single
> sentence … *'Get testnet PHRS from the Pharos faucet or directly from the team.'* That is the
> entirety of the documented guidance. No URL, no steps, no prerequisites, and no limits are
> provided."

The query set also asked for the deployment path (`01`, `05`) and for common errors (`06`). The
error catalogue's remedy for the most likely failure is circular:

> "`insufficient funds` | Not enough balance for gas | … get testnet PHRS from the faucet"

**Confirmed live (see [`examples-build.md`](transcripts/examples-build.md)):**

```text
$ npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos
IgnitionError: IGN410: Gas estimation failed: The execution has run out of gas.

$ eth_getBalance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 latest
0x0  →  0.000000 PHRS        (gasPrice: 10 gwei)
```

**Why it is insufficient:** the only documented way to get the gas needed for every documented
deploy step is a faucet that the documentation does not identify. The deployment leg of the
onboarding is therefore unreachable by following the docs, for anyone who is not already in
contact with the team.

**Impact:** the happy path stops exactly at the first on-chain action. The example project
compiles and its tests pass, but nothing can be deployed, verified, or read back from a
deployment the developer made — which is the entire point of the quickstart.

**Proposed correction:** publish a faucet page (URL, limits, eligibility, captcha/wallet
requirement as applicable) and link it from the network table, the quickstart guides and the
error catalogue. If no self-service faucet exists, say so explicitly and give the request channel
and expected turnaround.

**Replacement snippet (proposed row in the Atlantic Testnet parameter table):**

```markdown
| **Testnet faucet** | https://<faucet-host>/atlantic — one claim per address per 24 h, 0.5 PHRS per claim.
  Requires the claiming wallet to be added to Atlantic Testnet (chain id 688689). |
| **No self-service faucet?** | If you are rate-limited, request testnet PHRS in the
  <documented support channel> with your address and use case. |
```

---

## Gap 4 — A documented network is unreachable: TLS hostname mismatch and an expired certificate

**Exact MCP query (`02-network-parameters`):** asked for the network name, RPC URL, chain ID,
explorer URL, native symbol and faucet URL of every documented network, "quote the documented
values exactly".

**Response (verbatim excerpt):**

> "### 3. 'Testnet' (chain ID 688688) — undocumented as a standalone network
> This network appears **only** inside Hardhat config examples …
> | **RPC URL** | `https://testnet.dplabs-internal.com` |
> | **Chain ID** | `688688` |
> | **Block explorer** | `https://testnet.pharosscan.xyz/` |
> | **Native gas token symbol** | **Not documented.** |"

**Live re-check (`node scripts/verify-network.mjs`, 2026-10-16):**

```text
PASS     Atlantic Testnet   chainId documented=688689 observed=688689  block=31499282  explorer=200
PASS     Pacific Mainnet    chainId documented=1672   observed=1672    block=20399026  explorer=200
FAIL     "Testnet" (688688) rpc=https://testnet.dplabs-internal.com → fetch failed (ERR_TLS_CERT_ALTNAME_INVALID)
                            explorer=https://testnet.pharosscan.xyz/ → CERT_HAS_EXPIRED
```

DNS resolves (`testnet.dplabs-internal.com` → `alb-jg1s9ishccbkqxst98.ap-southeast-1.alb.aliyuncs.com`),
so the endpoint exists but is unusable over HTTPS: the presented certificate does not match the
hostname, and the explorer's certificate has expired.

**Why it is insufficient:** the docs invite developers to put this network in a config file,
without marking it deprecated, unsupported or internal — while the docs overview lists only two
networks and no page describes this one (`/getting-started/network/testnet` → page not found,
according to the same answer).

**Impact:** a developer who copies the config example gets a raw TLS failure (`fetch failed`, cause
hidden by most tooling) with nothing in the docs to explain it, and may conclude their own
environment is broken.

**Proposed correction:** remove the 688688 example from the guides, or label it explicitly as an
internal/deprecated endpoint in a clearly marked block, and renew the explorer certificate. Add
the third network to the network overview page with a status column.

**Replacement snippet (proposed guide text):**

```markdown
Pharos documents two public networks. If you find a third chain id in older examples, it is an
internal environment that is not reachable from the public internet — do not use it.

| Network | Chain id | RPC | Status |
| --- | --- | --- | --- |
| Atlantic Testnet | 688689 | https://atlantic.dplabs-internal.com | current |
| Pacific Mainnet | 1672 | https://rpc.pharos.xyz | current |
```

---

## Gap 5 — The documented quickstart fails as written, and two documented commands need a human at a terminal

**Exact MCP queries:** `03-self-contained-example` (commands to build the smallest example) and
`12-hardhat-config` (the exact config file). The returned command list was:

```shell
git clone https://github.com/PharosNetwork/examples
cd examples/token/hardhat/contract
npm install
npx hardhat compile
npx hardhat test
npx hardhat vars set PRIVATE_KEY
npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos
```

**Observed results (verbatim, [`examples-build.md`](transcripts/examples-build.md)):**

```text
$ npx hardhat compile
Error HH1201: Cannot find a value for the configuration variable 'PRIVATE_KEY'.
Use 'npx hardhat vars set PRIVATE_KEY' to set it or 'npx hardhat vars setup' to list all the
configuration variables used by this project.

$ echo <key> | npx hardhat vars set PRIVATE_KEY
? Enter value: *******************
Error: readline was closed            # interactive prompt; not automatable

$ npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos
? Confirm deploy to network pharos (688689)? (y/N)     # undocumented interactive prompt
```

`compile` only succeeds after the variable exists (`HARDHAT_VAR_PRIVATE_KEY=` in the environment):

```text
Compiled 6 Solidity files successfully (evm target: paris).
2 passing (979ms)
```

**Why it is insufficient:** the documented order is wrong — `compile` and `test` are listed before
the only step that makes the config loadable. `npx hardhat vars set` cannot be driven from a
script, a CI job or an agent, and no environment-variable alternative is documented. The deploy
command stops on a confirmation prompt the docs do not mention, and `HH1201` itself is absent from
the documented error catalogue (which lists only generic errors such as `Contract Deployment
Fails`).

**Impact:** the very first command in the guide fails on a clean machine. Developers literally
cannot complete a scripted onboarding, and the failure message points to a command that cannot be
automated.

**Proposed correction:** reorder the commands (key first), document the non-interactive
`HARDHAT_VAR_<NAME>` environment override (or `HARDHAT_VAR_PRIVATE_KEY`), add `--confirm`/`--yes`
guidance for Ignition, and add `HH1201` plus the `IGN*` family to the error catalogue.

**Replacement snippet (proposed command block):**

````markdown
```shell
git clone https://github.com/PharosNetwork/examples
cd examples/token/hardhat/contract
npm install

# Provide the deployer key BEFORE any Hardhat command: the config reads it at load time.
# Interactive (local development):
npx hardhat vars set PRIVATE_KEY
# Non-interactive (CI, containers, agents):
export HARDHAT_VAR_PRIVATE_KEY=0x<your-key>

npx hardhat compile        # expect: Compiled 6 Solidity files successfully
npx hardhat test           # expect: 2 passing

# Ignition asks for confirmation on an unknown network; --confirm skips the prompt.
npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos --confirm
```

> `HH1201: Cannot find a value for the configuration variable 'PRIVATE_KEY'` means the variable
> was not set before the command ran. Set it with either method above and re-run.
````

---

## Gap 6 — The MCP's `hardhat.config.js` answer contains a false claim, and the snippet does not match the repository

**Exact MCP query (`12-hardhat-config`):**

```text
Show the exact hardhat.config.js file content that the Pharos documentation provides for
deploying to the Atlantic Testnet, including the network entry, the ethers plugin version and
the solidity version. If the documented file does not include the Atlantic Testnet network
entry, point that out explicitly.
```

**Response (verbatim excerpt):**

> "The config references `vars.get("PRIVATE_KEY")` but does **not** import `vars`. … The documented
> file omits this import, so copying it verbatim would produce a `ReferenceError: vars is not
> defined` at runtime. This is a documentation bug, not a user error."

**Refutation (experimental, not opinion):** the unmodified `hardhat.config.js` from the repository
the docs tell you to clone — which has exactly that shape — loaded, compiled (6 files) and passed
its tests (2/2) with Hardhat `2.29.1`. Hardhat injects `vars` as a config-file global:

- `node_modules/hardhat/src/internal/core/config/config-env.ts:172` → `export const vars = { … }`
- `node_modules/hardhat/src/internal/core/config/config-loading.ts:90-96` → every key of that
  module is copied onto `global` before the user's config is `require()`-d

The answer also mis-matches the repository in a second way. The snippet it returns has
`browserURL: "https://atlantic.pharosscan.xyz/"`, while the actual file has
`browserURL: "https://pharos-atlantic-testnet.socialscan.io"`. Everything else is identical.

**Why it is insufficient:** the answer is presented as "quoted verbatim" and includes a confident
bug report that is factually wrong; a developer who trusts it will edit a working config, or will
waste a debugging cycle on a non-existent `ReferenceError`. The mismatch between "the exact file"
and the real file means neither copy can be trusted as the source of truth.

**Impact:** eroded trust in the docs assistant precisely on the file most developers touch first;
risk of unnecessary edits to a working project.

**Proposed correction:** have the docs assistant quote the repository file byte-for-byte (or link
to it) instead of paraphrasing it, and remove the incorrect `vars` claim — Hardhat 2.x provides
`vars` as a config global, so no import is required.

**Replacement snippet (proposed footnote on the guide page):**

```markdown
`vars` is provided by Hardhat as a global inside `hardhat.config.js` — no import is needed.
The authoritative file is `token/hardhat/contract/hardhat.config.js` in
https://github.com/PharosNetwork/examples (last verified 2026-10-16 against commit f08e921).
```

---

## Gap 7 — Documented MCP tools ship without input schemas, and the Docs MCP's own tools are absent from the docs

**Exact MCP query (`08-mcp-tools`):**

```text
Does Pharos document an MCP server for developers? If yes give the exact endpoint URL, the
transport type, the authentication requirements, and the complete list of tool names with their
input parameters. If the documentation does not list the available tools, say so explicitly.
```

**Response (verbatim excerpt):**

> "**The documentation does not list the complete input parameter schemas for each tool.**
> … it does **not** provide: The exact field names each tool accepts as input; Which fields are
> required vs. optional; Data types for each parameter; Example request payloads for each tool."

The same answer lists only tool names and their underlying JSON-RPC methods
(`get_chain_info`, `get_block`, `get_balance`, `eth_call`, `get_logs`, `send_raw_transaction`, …).

**Why it is insufficient:** a tool list without schemas cannot be used to author calls or to
validate an integration; the docs invite the reader to reverse-engineer the schema from
`tools/list` on a live server or from the server's source code. There is no reference page for the
Docs MCP's own capabilities at all (Gap 1).

**Impact:** integration cost moves from "read a table" to "run the server and introspect it"; any
schema change is invisible to anyone reading the documentation.

**Proposed correction:** generate a schema table per tool from the server's own tool definitions
(name, description, parameter, type, required/optional, default, example) and publish it next to
the existing table; do the same for the Docs MCP.

**Replacement snippet (proposed reference-table format):**

```markdown
### `get_logs`

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `address` | string \| string[] | no | — | contract address(es) to filter on |
| `topics` | (string \| string[] \| null)[] | no | — | topic0..topic3 filter, same semantics as `eth_getLogs` |
| `fromBlock` | string \| number | no | `latest` | tag, decimal, or 0x-hex |
| `toBlock` | string \| number | no | `latest` | inclusive; `fromBlock`…`toBlock` must span ≤ 1000 blocks |

Example: `{"address":"0x…","topics":["0xddf252ad…"],"fromBlock":31499000,"toBlock":31499211}`
```

---

## Gap 8 — No end-to-end verification checklist, and the errors a newcomer actually hits are not in the error catalogue

**Exact MCP queries:** `11-verification-checklist` and `06-common-errors`.

**Responses (verbatim excerpts):**

> "**The documentation does not contain an end-to-end verification checklist.** There is no single
> page or section that says 'after completing onboarding, run these checks to confirm your setup
> works.' … [the docs] do not provide: A unified 'verify your setup' checklist after onboarding;
> Explicit success criteria for each verification step …; A recommended order to run these checks;
> Troubleshooting guidance if verification commands fail"

> "The documentation does **not** provide error handling guidance for: … **Hardhat-specific
> errors** beyond the generic 'Contract Deployment Fails' and 'Interaction Issues' — no
> Hardhat-specific error messages are listed."

**Cross-check against what this walkthrough actually hit:** `HH1201` (documented command order)
and `IGN410: Gas estimation failed` (documented deploy without faucet funds) appear nowhere in the
catalogue, while the remedy the catalogue does give for insufficient funds loops back to the
undocumented faucet (Gap 3).

**Why it is insufficient:** a developer has no ordered way to tell "my setup is correct" from "my
setup is subtly broken", and the two failures that occur first on the documented path are not
covered.

**Impact:** every newcomer debugs the same two undocumented failures from scratch, and cannot tell
how far they have progressed in the onboarding.

**Proposed correction:** add a short "Verify your setup" section with an ordered checklist and
explicit expected output per step, and add `HH1201` / `IGN410` (plus `insufficient funds`) to the
error catalogue with the exact remedies used in this repository's scripts.

**Replacement snippet (proposed checklist):**

````markdown
## Verify your setup (run in this order)

| # | Command | Expected output |
| --- | --- | --- |
| 1 | `node --version` | `v20` or newer |
| 2 | `npx hardhat --version` | a `2.x` version (e.g. `2.29.1`) |
| 3 | `npx hardhat compile` | `Compiled N Solidity files successfully` |
| 4 | `npx hardhat test` | all tests passing |
| 5 | `cast balance <deployer> --rpc-url https://atlantic.dplabs-internal.com --ether` | a non-zero PHRS balance |
| 6 | `npx hardhat ignition deploy ./ignition/modules/Token.js --network pharos --confirm` | `deployed to 0x…` |
| 7 | open `https://atlantic.pharosscan.xyz/address/<address>` | contract code visible |

If step 3 prints `HH1201`, set `HARDHAT_VAR_PRIVATE_KEY` first (see the quickstart).
If step 6 prints `IGN410`, the deployer has no PHRS (see the faucet page).
````

---

## Notes on method

- No gap was accepted without a retained query and response. Every quotation above can be matched
  against the corresponding file in [`docs/transcripts/`](transcripts/).
- Where a claim could be tested on this machine (TLS reachability, chain ids, compile/test/deploy,
  the `vars` global), the test result — not the MCP's assertion — is what is reported.
- Findings that were **not** turned into gaps because they were transactional, not documentary:
  one `ECONNRESET` during `npm install` (retry succeeded) and initial client-side timeouts on
  long answers (the client now keeps partial output).
