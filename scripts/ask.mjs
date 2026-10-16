#!/usr/bin/env node
/**
 * Ask the Pharos "Docs MCP" agent (agentType PHAROS_DOCS) a question and write a sanitized
 * transcript to docs/transcripts/.
 *
 * Usage:
 *   node scripts/ask.mjs --id 01-onboarding-path "I am a developer new to Pharos ..."
 *   node scripts/ask.mjs --agent PHAROS_MCP --id 07-mcp "Does Pharos document an MCP server?"
 *
 * Options:
 *   --id <slug>        transcript base name (default: timestamp)
 *   --agent <id>       one of PHAROS_DOCS (default) | PHAROS_MCP | PHAROS_PERSONAL_AGENT | PHAROS_SKILL_ENGINE
 *   --out <dir>        transcript output dir (default: docs/transcripts)
 *   --state <file>     session cache path (default: .local/session.json, git-ignored)
 *   --no-state         force a fresh guest session (do not read/write the cache)
 *   --raw              also write the raw (redacted) SSE frames
 *   --json             print machine-readable JSON to stdout instead of the markdown block
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PharosDocsMcpClient, AGENT_TYPES } from "../src/client.mjs";
import { redactDeep, redactText } from "../src/redact.mjs";

function parseArgs(argv) {
  const out = { agent: AGENT_TYPES.DOCS, out: "docs/transcripts", state: ".local/session.json", raw: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--id") out.id = argv[++i];
    else if (a === "--agent") out.agent = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--state") out.state = argv[++i];
    else if (a === "--session") out.session = argv[++i];
    else if (a === "--no-state") out.noState = true;
    else if (a === "--raw") out.raw = true;
    else if (a === "--json") out.json = true;
    else if (!a.startsWith("--")) out.message = (out.message ? `${out.message} ` : "") + a;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.message) {
  console.error("error: provide a question as the final argument. See the header of this file for usage.");
  process.exit(2);
}

const trace = [];

async function loadState() {
  if (args.noState) return null;
  try {
    return JSON.parse(await readFile(args.state, "utf8"));
  } catch {
    return null;
  }
}

async function saveState(state) {
  if (args.noState) return;
  await mkdir(path.dirname(args.state), { recursive: true });
  await writeFile(args.state, JSON.stringify(state, null, 2), "utf8");
}

const cached = await loadState();
const timeoutMs = Number(process.env.PHAROS_STREAM_TIMEOUT_MS ?? 600_000);
const client = new PharosDocsMcpClient({ streamTimeoutMs: timeoutMs, onTrace: (e) => trace.push(e) });

let bootstrap = null;
if (!cached?.accessToken) {
  bootstrap = await client.bootstrap();
  await saveState({
    accessToken: client.auth.accessToken,
    expiresAt: client.auth.expiresAt,
    sessionId: client.auth.sessionId,
    tokenType: client.auth.tokenType,
    updatedAt: new Date().toISOString(),
  });
} else {
  client.auth = { accessToken: cached.accessToken, tokenType: cached.tokenType ?? "GUEST", expiresAt: cached.expiresAt, sessionId: cached.sessionId, remainingQuota: null };
}

const result = await client.ask(args.message, { agentType: args.agent, ...(args.session ? { sessionId: args.session } : {}) });

// Refresh the cached token if the agent rotated it.
await saveState({
  ...(cached ?? {}),
  accessToken: client.auth.accessToken,
  expiresAt: client.auth.expiresAt,
  sessionId: client.auth.sessionId,
  tokenType: client.auth.tokenType,
  chatSessionId: result.sessionId,
  updatedAt: new Date().toISOString(),
});

const stamp = new Date().toISOString();
const id = args.id ?? stamp.replace(/[:.]/g, "-");
const outDir = args.out;
await mkdir(outDir, { recursive: true });

const transcript = {
  id,
  capturedAt: stamp,
  source: {
    surface: "https://ai.pharos.xyz — Developer Docs MCP agent",
    chatEndpoint: "https://flow.anvita.xyz/api/v1/pharos/chat/completions",
    bootstrapEndpoint: "https://api.pharosnetwork.xyz/api/v1/widget/bootstrap",
    agentType: result.agentType,
    transport: "HTTP POST + text/event-stream (SSE)",
  },
  request: {
    agentType: result.agentType,
    message: args.message,
    sessionId: result.sessionId,
    requestId: result.requestId,
    stream: true,
  },
  response: {
    finished: result.finished,
    timedOut: result.timedOut,
    errors: result.errors,
    cardCount: result.cards.length,
    contentChars: result.text.length,
    content: result.text,
  },
  trace: trace.map((t) => ({ kind: t.kind, at: t.at, detail: t.detail })),
};

const sanitized = redactDeep(transcript);
await writeFile(path.join(outDir, `${id}.json`), `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");

const md = [
  `# Transcript ${id}`,
  "",
  `- **Captured:** ${stamp}`,
  `- **Surface:** https://ai.pharos.xyz — Developer Docs MCP`,
  `- **Agent type:** \`${result.agentType}\``,
  `- **Endpoint:** \`POST https://flow.anvita.xyz/api/v1/pharos/chat/completions\` (SSE)`,
  `- **Session / request ids:** redacted`,
  "",
  "## Query",
  "",
  "```text",
  redactText(args.message),
  "```",
  "",
  "## Answer (verbatim, credentials redacted)",
  "",
  "```text",
  redactText(result.text) || "(empty response)",
  "```",
  "",
  "## Stream metadata",
  "",
  `- finished: \`${result.finished}\``,
  `- client-side timeout reached (partial answer kept): \`${result.timedOut}\``,
  `- stream errors: \`${JSON.stringify(result.errors)}\``,
  `- structured cards returned: \`${result.cards.length}\``,
  `- content characters: \`${result.text.length}\``,
  "",
];
await writeFile(path.join(outDir, `${id}.md`), md.join("\n"), "utf8");

if (args.raw) {
  const rawLines = result.sseFrames.map((l) => redactText(l));
  await writeFile(path.join(outDir, `${id}.sse.txt`), `${rawLines.join("\n")}\n`, "utf8");
}

if (args.json) {
  console.log(JSON.stringify({ id, finished: result.finished, errors: result.errors, content: result.text }, null, 2));
} else {
  console.log(`[${id}] agent=${result.agentType} finished=${result.finished} errors=${JSON.stringify(result.errors)}`);
  console.log("─".repeat(70));
  console.log(result.text || "(empty response)");
  console.log("─".repeat(70));
  console.log(`transcript → ${path.join(outDir, `${id}.md`)} and ${path.join(outDir, `${id}.json`)}`);
}
