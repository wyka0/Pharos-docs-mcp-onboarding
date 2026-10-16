# pharos-docs-mcp-onboarding

A reproducible onboarding through the **Pharos Developer Docs MCP** — the "Pharos Docs MCP" agent
at [ai.pharos.xyz](https://ai.pharos.xyz) — plus an evidence-backed report of where that
documentation breaks down.

This repository is the deliverable for the *Docs MCP Onboarding* task: it records the exact
questions asked to the Docs MCP, the answers received, what happened when each answer was acted
on, and at least three — in fact **eight** — concrete documentation gaps with proposed fixes.

> **Source rule:** the Docs MCP was the *only* source of documentation used. No web search, no
> third-party documentation and no other MCP server was consulted to fill gaps. Where an answer was
> missing or wrong, it is reported as missing or wrong; where a claim could be tested on this
> machine, the test result is what is reported.

---

## What is here

| Path | What it is |
| --- | --- |
| [`docs/onboarding-log.md`](docs/onboarding-log.md) | Chronological, per-step record: goal, exact query, answer, action, result, error, next step |
| [`docs/docs-gaps.md`](docs/docs-gaps.md) | **8 evidence-backed gaps** — each with the exact query, the reply that exposes it, impact, and a proposed correction with a replacement snippet |
| [`docs/verified-output.md`](docs/verified-output.md) | Every command actually run, with its real output, plus what was *not* verified |
| [`docs/transcripts/`](docs/transcripts/) | Sanitized per-question transcripts (`.md` + `.json`), the examples-build log, and a run summary |
| [`docs/verified-network.json`](docs/verified-network.json) | Machine-readable live check of every documented network |
| [`docs/verified-onboarding.json`](docs/verified-onboarding.json) | Machine-readable per-step onboarding verification |
| [`queries/`](queries/) | The question set and the documented network parameters (with provenance) |
| [`src/`](src/) | Docs MCP client, SSE decoder, redaction helpers |
| [`scripts/`](scripts/) | Runnable entry points (login, ask, batch run, verifiers) |
| [`test/`](test/) | 26 unit tests, no test-framework dependencies |

---

## Actual outcome, honestly stated

| Leg of the onboarding | Outcome |
| --- | --- |
| Reach the Docs MCP programmatically | **PASS** — after an entirely undocumented wallet sign-in + guardian-claim onboarding chain |
| Get the documented onboarding path from it | **PASS** — 12/12 questions answered with cited sources |
| Install and build the documented example | **PASS** — `Compiled 6 Solidity files successfully`, `2 passing` |
| Deploy to the documented testnet | **BLOCKED** — the documentation has no faucet URL, the deployer has 0 PHRS, Ignition reports `IGN410` |
| Ask the Docs MCP what it is | **PARTIAL** — the Docs MCP is undocumented; asked directly, it describes the *Chain* MCP instead |
| Documented third network (chain id 688688) | **FAIL** — TLS hostname mismatch on the RPC; expired certificate on the explorer |

**Nothing was submitted to Agent Arena, no deployment was faked, and no artificial website was
created to inflate the deliverable.**

### The eight gaps in one line each

1. The "Developer Docs MCP" has no documentation page, and the agent answers about the Chain MCP.
2. No documented programmatic access; the real path is a five-stage, undocumented auth state machine.
3. No faucet URL — the documented onboarding dead-ends before its first deployment.
4. A documented network is unreachable (TLS hostname mismatch, expired explorer certificate).
5. The documented quickstart order fails (`HH1201`), and two documented commands need a human at a TTY.
6. The MCP's `hardhat.config.js` answer contains a demonstrably false claim and does not match the repo.
7. The documented MCP tool list ships without input schemas; the Docs MCP's own tools are absent.
8. No end-to-end verification checklist, and the two errors actually hit are not in the error catalogue.

Details and proposed fixes: [`docs/docs-gaps.md`](docs/docs-gaps.md).

---

## What was built

A small, dependency-light client for the Docs MCP plus verifiers that make every claim in the docs
auditable.

```text
src/sse.mjs                 incremental SSE decoder for the docs agent's text/event-stream
src/client.mjs              Docs MCP client: bootstrap, wallet challenge/verify, guardian claim,
                            onboarding polling, conversation/session resolution, SSE chat
src/redact.mjs              credential + identifier redaction for published transcripts
scripts/login.mjs           wallet sign-in + full agent onboarding (creates a throwaway EOA)
scripts/ask.mjs             ask one question, write a sanitized transcript
scripts/run-queries.mjs     run the whole question set, write transcripts + a summary
scripts/verify-onboarding.mjs   PASS/PARTIAL/FAIL/BLOCKED per onboarding step
scripts/verify-network.mjs      live check of every documented network against its RPC
scripts/check-syntax.mjs    zero-dependency syntax check for every module
```

Runtime dependency: `viem` (used only to sign the sign-in message and the EIP-712 guardian claim).
Everything else is Node's standard library.

---

## Reproduce it

Requirements: Node.js ≥ 20, npm, git. No API keys.

```bash
npm install

# 1. Static checks + unit tests (no network)
npm run verify            # syntax check (12/12) + tests (26/26)

# 2. Verify the documented network parameters live (read-only JSON-RPC)
node scripts/verify-network.mjs
#    -> 2 PASS, 1 FAIL (chain id 688688 is unreachable)  [exit code 1]

# 3. Sign in and complete the agent onboarding (creates .local/wallet.json — git-ignored)
node scripts/login.mjs

# 4. Walk the whole onboarding and report per-step status
node scripts/verify-onboarding.mjs
#    -> PASS=8 PARTIAL=0 FAIL=0

# 5. Ask the Docs MCP the recorded question set (12 questions, ~15 min)
node scripts/run-queries.mjs

# 6. Or ask a single question
node scripts/ask.mjs --id my-question "How do I deploy to Atlantic Testnet?"
```

`scripts/login.mjs` generates a throwaway key pair under `.local/` (git-ignored) and signs two
messages with it. It never needs funds and never prints the key. `.local/session.json` holds the
bearer token for subsequent commands.

Environment overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PHAROS_STREAM_TIMEOUT_MS` | `600000` | client-side deadline for one Docs MCP answer |
| `PHAROS_ACCESS_TOKEN` | — | reuse an existing bearer token instead of `.local/session.json` |

Reproducing the documented example build is described step by step in
[`docs/transcripts/examples-build.md`](docs/transcripts/examples-build.md).

---

## How the MCP was reached (summary)

The Developer Docs MCP is not a locally installed server; it is the Agent Center's `PHAROS_DOCS`
agent. Reaching it required reverse-engineering this chain, none of which is documented:

```text
POST /api/v1/widget/bootstrap                     (Origin/Referer required: 403 otherwise)
  → tokenType=GUEST
POST /api/v1/widget/wallet/challenge              → SIWE-style message
POST /api/v1/widget/agentcenter/wallet/verify     → tokenType=ONBOARDING
  poll GET /api/v1/widget/onboarding/status       → GUARDIAN_SIGNATURE_REQUIRED
POST /api/v1/widget/onboarding/guardian-claims/prepare + EIP-712 signature + …/submit
POST /api/v1/widget/agentcenter/onboarding/complete → tokenType=AUTHENTICATED
GET  /api/v1/pharos/conversations/session[/{id}/agents]   → the agent's chatSessionId
POST /api/v1/pharos/chat/completions              → SSE answer
```

Guest tokens are rejected by the chat endpoint with
`401 {"code":"401","message":"Unauthorized, please login first"}`, despite the bootstrap response
advertising a guest quota of 10. This is Gap 2 in [docs/docs-gaps.md](docs/docs-gaps.md).

---

## License

MIT © 2026 wyka0 — see [LICENSE](LICENSE).
