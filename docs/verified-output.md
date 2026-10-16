# Verified output

Everything in this file was executed on **2026-10-16** on Windows 11 with Node `v24.14.1`,
npm `11.11.0`, git `2.53.0`. Commands are quoted as run; results are quoted as printed. Nothing
here is illustrative — where something failed or was blocked, that is what is recorded.

---

## 1. Repository checks

### `npm run check` — syntax check of every module

```text
$ npm run check
ok   scripts\ask.mjs
ok   scripts\check-syntax.mjs
ok   scripts\login.mjs
ok   scripts\run-queries.mjs
ok   scripts\verify-network.mjs
ok   scripts\verify-onboarding.mjs
ok   src\client.mjs
ok   src\redact.mjs
ok   src\sse.mjs
ok   test\client.test.mjs
ok   test\redact.test.mjs
ok   test\sse.test.mjs

12/12 files passed syntax check.
```

### `npm test` — unit tests (Node's built-in test runner, no test dependencies)

```text
$ npm test
ℹ tests 26
ℹ pass 26
ℹ fail 0
ℹ duration_ms 320.8301
```

**26/26 passing.** Coverage of the client contract, including the behaviours that were only
discoverable by experiment:

- SSE decoding: chunk boundaries, CRLF, comment frames, `[DONE]`, malformed JSON, final flush.
- Stream assembly: content/reasoning/cards/errors, finished vs. unfinished.
- Redaction: JWTs, UUIDs, nested structures, `Authorization` headers.
- `bootstrap` sends `Origin`/`Referer` and an empty `Authorization`.
- `ask()` resolves the correct `chatSessionId` and rejects the widget session id (regression test
  for the HTTP 500 that cost real debugging time).
- A GUEST session reproduces the observed `401 Unauthorized, please login first`.
- `verifyWallet` sends the guest bearer token (regression test for the misleading
  `WIDGET_ORIGIN_FORBIDDEN`).
- `normalizeTypedData` converts decimal `uint` strings to `BigInt` for EIP-712 signing.
- `waitForOnboarding` stops polling on `nextAction != POLL`.
- A stalled stream keeps its partial answer instead of hanging the caller.

> Note: one test failed when first written — a stalled SSE stream was not unblocked by the fetch
> `AbortSignal`, so `ask()` hung for ~180 s. The client was fixed to race each `reader.read()`
> against the deadline and to cancel the reader; the test now passes in ~50 ms. The failure is
> recorded here rather than hidden.

---

## 2. Live network verification

```text
$ node scripts/verify-network.mjs
PASS     Atlantic Testnet
         rpc       https://atlantic.dplabs-internal.com
         chainId   documented=688689 observed=688689 (match)
         block     31499293
         explorer  https://atlantic.pharosscan.xyz/ -> 200
PASS     Pacific Mainnet
         rpc       https://rpc.pharos.xyz
         chainId   documented=1672 observed=1672 (match)
         block     20399068
         explorer  https://www.pharosscan.xyz -> 200
FAIL     Unnamed "Testnet" (chain id only appears inside Hardhat config examples)
         rpc       https://testnet.dplabs-internal.com
         chainId   documented=688688 observed=- (!)
         block     -
         explorer  https://testnet.pharosscan.xyz/ -> fetch failed
         error     fetch failed (ERR_TLS_CERT_ALTNAME_INVALID)
```

**2 of 3 documented networks verified. 1 documented network is unreachable.** The documented
values are stored in [`queries/network-params.json`](../queries/network-params.json) with their
provenance (transcript `02`), and the machine-readable result in
[`docs/verified-network.json`](../verified-network.json).

Certificate detail for the failing entry:

```text
testnet.dplabs-internal.com   → CNAME alb-jg1s9ishccbkqxst98.ap-southeast-1.alb.aliyuncs.com
                                TLS: ERR_TLS_CERT_ALTNAME_INVALID
testnet.pharosscan.xyz        → CNAME cname.vercel-dns.com
                                TLS: CERT_HAS_EXPIRED
```

---

## 3. Agent-Center onboarding verification

```text
$ node scripts/verify-onboarding.mjs
PASS     1a. guest bootstrap without Origin/Referer
         HTTP 403 {"code":"WIDGET_ORIGIN_FORBIDDEN", …} — the header requirement is enforced but not documented
PASS     1b. guest bootstrap with browser headers
         tokenType=GUEST quota=10 chains=["5734951"]
PASS     2. guest token on the chat endpoint
         HTTP 401 {"code":"401","message":"Unauthorized, please login first"} — the docs/UI advertise 10 guest messages, but chat rejects GUEST scope
PASS     3a. wallet challenge + verify
         signed SIWE-style message; tokenType=AUTHENTICATED
PASS     3b. onboarding status poll
         state=AUTHENTICATED nextAction=ENTER_CHAT
PASS     3c. guardian EIP-712 claim submit
         operationId=claim_… code=000000
PASS     3e. onboarding complete
         not required: the account was already onboarded (nextAction=ENTER_CHAT)
PASS     4a. resolve chatSessionId for PHAROS_DOCS
         pharos-agent-<redacted> (a session-scoped agent id, not a credential)
PASS     4b. Docs MCP answers over SSE
         296 chars, 0 cards, errors=[]

PASS=8 PARTIAL=0 FAIL=0 SKIP=0
```

Machine-readable run: [`docs/verified-onboarding.json`](../verified-onboarding.json).

The **first** time this path ran (fresh account, `node scripts/login.mjs`) the state machine was
observed end to end:

```text
  token type:      ONBOARDING
  onboarding:      GUARDIAN_SIGNATURE_REQUIRED -> FULL_READY -> COMPLETE
  final token:     AUTHENTICATED
  steps: [
    {"step":"status","state":"GUARDIAN_SIGNATURE_REQUIRED","nextAction":"PREPARE_OR_SIGN_GUARDIAN"},
    {"step":"guardian-claim","operationId":"claim_…","ok":true,"code":"000000"},
    {"step":"guardian-claim-status","data":{"status":"IDENTITY_CLAIMING", …}},
    {"step":"status-after-guardian","state":"FULL_READY","nextAction":"COMPLETE_ONBOARDING"},
    {"step":"complete","ok":true,"code":"000000","tokenType":"AUTHENTICATED"}
  ]
```

---

## 4. Docs MCP query run

```text
$ node scripts/run-queries.mjs
→ [01-onboarding-path] asking… ok (6447 chars, 41.2s)
→ [02-network-parameters] asking… ok (4378 chars, 123.2s)
→ [03-self-contained-example] asking… ok (3978 chars, 50.0s)
→ [04-testnet-faucet] asking… ok (2207 chars, 121.4s)
→ [05-deploy-and-verify] asking… ok (6340 chars, 77.5s)
→ [06-common-errors] asking… ok (10853 chars, 94.3s)
→ [07-docs-mcp-access] asking… ok (6501 chars, 96.5s)
→ [08-mcp-tools] asking… ok (2393 chars, 27.2s)
→ [09-chain-mcp-vs-docs-mcp] asking… ok (1190 chars, 55.9s)
→ [10-toolchain-versions] asking… ok (2031 chars, 147.4s)
→ [11-verification-checklist] asking… ok (4120 chars, 111.4s)
→ [12-hardhat-config] asking… ok (2540 chars, 40.6s)
```

**12/12 answered, 0 stream errors, 0 empty answers.** Summary artifact:
[`docs/transcripts/_run-summary.md`](transcripts/_run-summary.md).

Latency ranged from 27 s to 147 s per answer. On the first attempt (before the client kept partial
output) an answer exceeding the 180 s default was dropped; the client now defaults to a 600 s
deadline, keeps partial text, and flags it as `timedOut` in the transcript.

---

## 5. The documented example build (run outside this repository)

Full log: [`docs/transcripts/examples-build.md`](transcripts/examples-build.md).

| # | Documented command | Result |
| --- | --- | --- |
| 1 | `git clone https://github.com/PharosNetwork/examples` | PASS (`f08e921`) |
| 2 | `npm install` | PASS (one transient `ECONNRESET`, retry clean) |
| 3 | `npx hardhat compile` — as documented | **FAIL** `HH1201: Cannot find a value for the configuration variable 'PRIVATE_KEY'` |
| 4 | `npx hardhat vars set PRIVATE_KEY` | **FAIL** interactive prompt, `Error: readline was closed` |
| 5 | `npx hardhat compile` — with `HARDHAT_VAR_PRIVATE_KEY` | PASS — `Compiled 6 Solidity files successfully` |
| 6 | `npx hardhat test` | PASS — `2 passing (979ms)` |
| 7 | `npx hardhat ignition deploy … --network pharos` | **BLOCKED** — interactive confirm, then `IGN410: Gas estimation failed` |
| 8 | balance check on the deployer | `0x0` wei → 0 PHRS (gas price 10 gwei) |

The deploy leg is blocked by Gap 3 in [docs-gaps.md](docs-gaps.md): the only documented way to get
testnet gas is a faucet with no documented URL.

---

## 6. Secret and sensitive-file scan

```text
$ git ls-files | Select-String -Pattern "\.env|wallet|session\.json|\.local"
(no matches — .local/, .env*, node_modules/ are git-ignored)
```

- `.local/wallet.json` (throwaway EOA private key) and `.local/session.json` (guest/authenticated
  bearer token) are created at runtime and are **not** tracked — `.gitignore` covers `.local/`.
- Every transcript passes through [`src/redact.mjs`](../src/redact.mjs) before being written:
  bearer JWTs → `<redacted-jwt>`, session/request UUIDs → `<redacted-id>`, `accessToken` fields →
  `<redacted>`. The redaction rules are covered by five unit tests.
- The one private key used in the example build is Hardhat's publicly known tutorial account
  (`0xf39Fd6e5…`) — it holds no funds on any network — and it is not written into any tracked file.
- No video, no generated build output, and no vendored copy of the upstream examples repository is
  included. `node_modules/`, `dist/`, `coverage/` are ignored.

---

## 7. Limitations — what was *not* verified

- **No deployment, no transaction, no contract verification was performed.** The documented
  testnet cannot be funded from the documentation (Gap 3), so those steps are reported BLOCKED,
  not passing. No claim in this repository says otherwise.
- The Guardian-claim EIP-712 signature was submitted and accepted (`code=000000`) but it targets
  `chainId 1672` in its domain — the hosted agent's own infrastructure — and was not confirmed
  against a block explorer by this project.
- Docs answers were captured by an agent with a context window; questions were asked in one
  session, so later answers could be influenced by earlier ones. Transcripts are stored per
  question and the prompts are self-contained to limit this.
- Cross-referencing the Docs MCP against `docs.pharos.xyz` content was deliberately **not** done,
  to respect the "single source of documentation" rule for this task. Where the MCP's answer was
  contradicted, it was contradicted by an executable test (TLS handshake, `eth_chainId`, Hardhat
  compile/test), not by another documentation source.
- Token/credit accounting was observed only at the account endpoint level
  (`credits.rawCredits = 300`); no attempt was made to exhaust or purchase credits.
