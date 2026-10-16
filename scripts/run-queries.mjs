#!/usr/bin/env node
/**
 * Reproduce the full Docs MCP query set recorded in queries/onboarding-questions.json.
 *
 * Requires an authenticated session (run `node scripts/login.mjs` first, or set
 * PHAROS_ACCESS_TOKEN to a valid bearer token). Without one, the runner fails fast with the
 * documented 401 the Docs MCP returns for guest sessions.
 *
 * Usage:
 *   node scripts/run-queries.mjs                       # all queries in order
 *   node scripts/run-queries.mjs --only 05-deploy-and-verify
 *   node scripts/run-queries.mjs --from 06-common-errors
 *
 * Output: docs/transcripts/<id>.md + .json (credentials redacted) and a summary table.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { AGENT_TYPES, PharosDocsMcpClient } from "../src/client.mjs";
import { redactDeep, redactText } from "../src/redact.mjs";

const setFile = "queries/onboarding-questions.json";
const stateFile = ".local/session.json";
const outDir = "docs/transcripts";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--only") out.only = argv[++i];
    else if (argv[i] === "--from") out.from = argv[++i];
    else if (argv[i] === "--set") out.set = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const spec = JSON.parse(await readFile(args.set ?? setFile, "utf8"));
let queries = spec.queries;
if (args.only) queries = queries.filter((q) => q.id === args.only);
if (args.from) {
  const idx = queries.findIndex((q) => q.id === args.from);
  if (idx < 0) throw new Error(`--from ${args.from} not found in ${args.set ?? setFile}`);
  queries = queries.slice(idx);
}

// Authentication: reuse the session produced by scripts/login.mjs.
let auth = null;
try {
  auth = JSON.parse(await readFile(stateFile, "utf8"));
} catch {
  /* no cached session */
}
if (!auth?.accessToken && process.env.PHAROS_ACCESS_TOKEN) {
  auth = { accessToken: process.env.PHAROS_ACCESS_TOKEN, tokenType: "AUTHENTICATED", sessionId: "" };
}
if (!auth?.accessToken) {
  console.error("error: no authenticated session found.");
  console.error("       run `node scripts/login.mjs` first (performs the wallet sign-in + onboarding),");
  console.error("       or set PHAROS_ACCESS_TOKEN.");
  console.error("       Guest sessions are rejected by the Docs MCP: HTTP 401 \"Unauthorized, please login first\".");
  process.exit(3);
}

const client = new PharosDocsMcpClient({ streamTimeoutMs: Number(process.env.PHAROS_STREAM_TIMEOUT_MS ?? 600_000) });
client.auth = { accessToken: auth.accessToken, tokenType: auth.tokenType ?? "AUTHENTICATED", expiresAt: auth.expiresAt ?? "", sessionId: auth.sessionId ?? "", remainingQuota: null };

await mkdir(args.out ?? outDir, { recursive: true });
const rows = [];
const startedAt = new Date().toISOString();

for (const q of queries) {
  const t0 = Date.now();
  process.stdout.write(`→ [${q.id}] asking… `);
  let record;
  try {
    const r = await client.ask(q.question, { agentType: q.agent ?? spec.agent ?? AGENT_TYPES.DOCS });
    const durationMs = Date.now() - t0;
    record = {
      id: q.id,
      capturedAt: new Date().toISOString(),
      question: q.question,
      agentType: r.agentType,
      finished: r.finished,
      timedOut: r.timedOut,
      errors: r.errors,
      cardCount: r.cards.length,
      durationMs,
      contentChars: r.text.length,
      content: r.text,
      sseFrames: r.sseFrames,
    };
    rows.push({ id: q.id, status: r.timedOut ? "PARTIAL" : r.finished ? "PASS" : "NO_DONE_FRAME", chars: r.text.length, ms: durationMs });
    process.stdout.write(`${r.timedOut ? "partial" : "ok"} (${r.text.length} chars, ${(durationMs / 1000).toFixed(1)}s)\n`);
  } catch (err) {
    const durationMs = Date.now() - t0;
    record = {
      id: q.id,
      capturedAt: new Date().toISOString(),
      question: q.question,
      agentType: q.agent ?? spec.agent ?? AGENT_TYPES.DOCS,
      finished: false,
      timedOut: false,
      errors: [{ code: err.name ?? "ERROR", message: err.message }],
      contentChars: 0,
      content: "",
    };
    rows.push({ id: q.id, status: "FAIL", chars: 0, ms: durationMs, error: err.message });
    process.stdout.write(`FAIL: ${err.message}\n`);
  }

  const sanitized = redactDeep(record);
  await writeFile(path.join(args.out ?? outDir, `${q.id}.json`), `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");

  const md = [
    `# Transcript ${q.id}`,
    "",
    `- **Captured:** ${record.capturedAt}`,
    "- **Surface:** https://ai.pharos.xyz — Developer Docs MCP",
    `- **Agent type:** \`${record.agentType}\``,
    "- **Endpoint:** `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions` (SSE)",
    `- **Duration:** ${((record.durationMs ?? 0) / 1000).toFixed(1)}s`,
    "- **Session / request ids:** redacted",
    "",
    "## Query",
    "",
    "```text",
    redactText(q.question),
    "```",
    "",
    "## Answer (verbatim from the Docs MCP; credentials redacted)",
    "",
    "```text",
    redactText(record.content) || "(empty response)",
    "```",
    "",
    "## Stream metadata",
    "",
    `- finished: \`${record.finished}\``,
    `- client-side timeout reached (partial answer kept): \`${record.timedOut}\``,
    `- errors: \`${JSON.stringify(record.errors)}\``,
    `- content characters: \`${record.contentChars}\``,
    "",
  ];
  await writeFile(path.join(args.out ?? outDir, `${q.id}.md`), md.join("\n"), "utf8");
}

// Summary file so a reviewer can audit the whole run at a glance.
const summary = [
  "# Docs MCP query run summary",
  "",
  `- Started: ${startedAt}`,
  `- Finished: ${new Date().toISOString()}`,
  `- Agent: \`${spec.agent}\` via \`POST https://flow.anvita.xyz/api/v1/pharos/chat/completions\``,
  "",
  "| Query id | Status | Answer chars | Duration |",
  "| --- | --- | --- | --- |",
  ...rows.map((r) => `| \`${r.id}\` | ${r.status} | ${r.chars} | ${(r.ms / 1000).toFixed(1)}s |`),
  "",
];
await writeFile(path.join(args.out ?? outDir, "_run-summary.md"), summary.join("\n"), "utf8");

console.log("\n" + summary.join("\n"));
const failed = rows.filter((r) => r.status === "FAIL").length;
process.exit(failed > 0 ? 1 : 0);
