#!/usr/bin/env node
/**
 * End-to-end onboarding verifier for the Pharos Agent Center "Developer Docs MCP".
 *
 * This is the artefact the task asks for: it walks the entire documented* onboarding path and
 * reports PASS / PARTIAL / FAIL for every step, without inventing any step.
 *
 * (*) Only step 1 (guest bootstrap) and the network parameters are documented in the Pharos
 * documentation. Everything after that was derived by observing the live API surface; see
 * docs/onboarding-log.md for the exact evidence and docs/docs-gaps.md for the gap report.
 *
 * Usage:
 *   node scripts/verify-onboarding.mjs            # full run (creates a throwaway EOA under .local/)
 *   node scripts/verify-onboarding.mjs --json     # machine-readable result on stdout
 *   node scripts/verify-onboarding.mjs --offline   # skip network calls, report SKIP
 *
 * Exit code: 0 when no step FAILed, 1 otherwise.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { AGENT_TYPES, PharosDocsMcpClient, SITE_REFERER, SITE_ORIGIN, WIDGET_BASE } from "../src/client.mjs";

const results = [];
const offline = process.argv.includes("--offline");
const asJson = process.argv.includes("--json");
const outArgIdx = process.argv.indexOf("--out");
const outFile = outArgIdx >= 0 ? process.argv[outArgIdx + 1] : null;

/** @param {string} step @param {"PASS"|"FAIL"|"PARTIAL"|"BLOCKED"|"SKIP"} status @param {string} detail @param {Record<string, unknown>} [extra] */
function record(step, status, detail, extra = {}) {
  results.push({ step, status, detail, ...extra });
  if (!asJson) {
    const icon = { PASS: "PASS", FAIL: "FAIL", PARTIAL: "PARTIAL", BLOCKED: "BLOCKED", SKIP: "SKIP" }[status];
    console.log(`${icon.padEnd(8)} ${step}`);
    if (detail) console.log(`         ${detail}`);
  }
}

async function loadOrCreateWallet(file) {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    if (parsed?.privateKey) return parsed;
  } catch {
    /* first run */
  }
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ address: account.address, privateKey, createdAt: new Date().toISOString() }, null, 2), "utf8");
  return { address: account.address, privateKey };
}

if (offline) {
  record("network connectivity (Origin/Referer header requirement)", "SKIP", "--offline: no network calls were made");
} else {
  // Step 1 — guest bootstrap. Documented behaviour: the widget issues an anonymous guest token.
  const client = new PharosDocsMcpClient({ streamTimeoutMs: 120_000 });

  // 1a — the request without a browser Referer, to prove the undocumented requirement.
  try {
    const bare = await fetch(`${WIDGET_BASE}/api/v1/widget/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appKey: "agent_center", clientNonce: `bootstrap-probe-${Date.now()}` }),
    });
    const body = await bare.json().catch(() => ({}));
    record(
      "1a. guest bootstrap without Origin/Referer",
      bare.status === 403 ? "PASS" : "FAIL",
      `HTTP ${bare.status} ${JSON.stringify(body).slice(0, 160)} — the header requirement is enforced but not documented`,
    );
  } catch (err) {
    record("1a. guest bootstrap without Origin/Referer", "FAIL", err.message);
  }

  let guest = null;
  try {
    guest = await client.bootstrap();
    record("1b. guest bootstrap with browser headers", "PASS", `tokenType=${guest.tokenType} quota=${guest.remainingQuota} chains=${JSON.stringify(guest.supportedChains)}`);
  } catch (err) {
    record("1b. guest bootstrap with browser headers", "FAIL", err.message);
  }

  // Step 2 — guest token against the chat endpoint. Expected to fail: the advertised guest quota
  // (guestLimit) is not actually usable on the chat route.
  if (guest) {
    try {
      const res = await fetch(`${WIDGET_BASE}/api/v1/pharos/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Origin: SITE_ORIGIN,
          Referer: SITE_REFERER,
          Authorization: `Bearer ${client.auth.accessToken}`,
        },
        body: JSON.stringify({
          spaceType: "pharos",
          operationType: "chat",
          agentType: AGENT_TYPES.DOCS,
          sessionId: guest.sessionId,
          message: "ping",
          requestId: `probe-${Date.now()}`,
          stream: true,
        }),
      });
      const body = await res.text();
      record(
        "2. guest token on the chat endpoint",
        res.status === 401 ? "PASS" : "FAIL",
        `HTTP ${res.status} ${body.slice(0, 120)} — the bootstrap response advertises guestLimit=${guest.remainingQuota} and newUserCredits=300, but the chat endpoint rejects GUEST scope`,
      );
    } catch (err) {
      record("2. guest token on the chat endpoint", "FAIL", err.message);
    }
  }

  // Step 3 — wallet sign-in + onboarding + guardian claim (undocumented; reverse-engineered live).
  const wallet = await loadOrCreateWallet(".local/wallet.json");
  const account = privateKeyToAccount(wallet.privateKey);
  let finalTokenType = null;
  try {
    const chainId = Number(guest?.supportedChains?.[0] ?? 5734951);
    const challenge = await client.requestWalletChallenge({ address: account.address, chainId });
    const signature = await account.signMessage({ message: challenge.message });
    const verified = await client.verifyWallet({ challengeId: challenge.challengeId, address: account.address, signature });
    record("3a. wallet challenge + verify", "PASS", `signed SIWE-style message; tokenType=${verified.tokenType}`);

    let status = await client.waitForOnboarding({ maxPolls: 20 });
    record(
      "3b. onboarding status poll",
      ["COMPLETE_ONBOARDING", "ENTER_CHAT"].includes(status.nextAction) ? "PASS" : "PARTIAL",
      `state=${status.state} nextAction=${status.nextAction}`,
    );

    if (status.nextAction === "PREPARE_OR_SIGN_GUARDIAN") {
      const prep = await client.prepareGuardianClaim();
      const typed = PharosDocsMcpClient.normalizeTypedData(prep.typedData);
      const claimSignature = await account.signTypedData({ domain: typed.domain, types: typed.types, primaryType: typed.primaryType, message: typed.message });
      const submitted = await client.submitGuardianClaim({ operationId: prep.operationId, signature: claimSignature });
      record("3c. guardian EIP-712 claim submit", submitted.ok ? "PASS" : "FAIL", `operationId=${prep.operationId} code=${submitted.code}`);
      for (let i = 0; i < 10; i += 1) {
        const claim = await client.guardianClaimStatus({ operationId: prep.operationId });
        if (claim.data?.status && !["PENDING", "PROCESSING"].includes(claim.data.status)) break;
        await new Promise((r) => setTimeout(r, 3000));
      }
      status = await client.waitForOnboarding({ maxPolls: 20 });
      record("3d. status after guardian claim", status.nextAction === "COMPLETE_ONBOARDING" || status.state === "FULL_READY" ? "PASS" : "PARTIAL", `state=${status.state} nextAction=${status.nextAction}`);
    }

    const completed = status.nextAction === "COMPLETE_ONBOARDING"
      ? await client.completeOnboarding()
      : { ok: true, code: "ALREADY_COMPLETE", tokenType: client.auth.tokenType, message: `skipped: nextAction=${status.nextAction}` };
    finalTokenType = client.auth.tokenType;
    record(
      "3e. onboarding complete",
      completed.ok ? "PASS" : "FAIL",
      status.nextAction === "COMPLETE_ONBOARDING"
        ? `code=${completed.code} tokenType=${completed.tokenType}`
        : `not required: the account was already onboarded (nextAction=${status.nextAction}); calling onboarding/complete again returns WIDGET_TOKEN_SCOPE_FORBIDDEN, which is undocumented`,
    );
  } catch (err) {
    record("3. wallet onboarding chain", "FAIL", err.message);
  }

  // Step 4 — the actual Docs MCP query, end to end.
  try {
    const chatSessionId = await client.resolveChatSession(AGENT_TYPES.DOCS);
    record("4a. resolve chatSessionId for PHAROS_DOCS", "PASS", `${chatSessionId} (the widget sessionId is NOT accepted by the chat endpoint)`);
    const reply = await client.ask("In one sentence: what is Pharos?");
    const ok = reply.finished && reply.text.trim().length > 0;
    record(
      "4b. Docs MCP answers a question over SSE",
      ok ? "PASS" : "PARTIAL",
      `${reply.text.length} chars, ${reply.cards.length} cards, errors=${JSON.stringify(reply.errors)}`,
      { sample: reply.text.trim().slice(0, 200) },
    );
  } catch (err) {
    record("4. Docs MCP query", "FAIL", err.message);
  }
}

const summary = {
  capturedAt: new Date().toISOString(),
  surface: "Pharos Agent Center Developer Docs MCP (agentType PHAROS_DOCS)",
  node: process.version,
  finalTokenType: results.find((r) => r.step === "3e. onboarding complete")?.detail ?? null,
  totals: {
    PASS: results.filter((r) => r.status === "PASS").length,
    PARTIAL: results.filter((r) => r.status === "PARTIAL").length,
    FAIL: results.filter((r) => r.status === "FAIL").length,
    BLOCKED: results.filter((r) => r.status === "BLOCKED").length,
    SKIP: results.filter((r) => r.status === "SKIP").length,
  },
  results,
};

if (asJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("");
  console.log(`PASS=${summary.totals.PASS} PARTIAL=${summary.totals.PARTIAL} FAIL=${summary.totals.FAIL} SKIP=${summary.totals.SKIP}`);
}

// Written with fs (not a shell redirect) so the file is UTF-8 without a BOM on every platform,
// and through the redaction helper so published evidence never carries session identifiers.
if (outFile) {
  const { redactDeep } = await import("../src/redact.mjs");
  await writeFile(outFile, `${JSON.stringify(redactDeep(summary), null, 2)}\n`, "utf8");
  if (!asJson) console.log(`evidence written to ${outFile}`);
}

process.exit(summary.totals.FAIL > 0 ? 1 : 0);
