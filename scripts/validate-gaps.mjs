#!/usr/bin/env node
/**
 * Validate that every documentation gap claimed in docs/docs-gaps.md is backed by a captured
 * transcript. Each claim below cites the transcript that must contain it and a set of substrings
 * that must appear in that transcript's verbatim answer.
 *
 * This exists so a reviewer does not have to take the gap report on trust: if a transcript is
 * missing, truncated, or edited so that the quoted evidence no longer appears, this check fails.
 *
 * Usage: node scripts/validate-gaps.mjs
 */

import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const TRANSCRIPTS = "docs/transcripts";

/** @type {{ gap: string, claim: string, transcript: string, mustContain: string[] }[]} */
const CLAIMS = [
  {
    gap: "1",
    claim: "'Developer Docs MCP' has no documentation page (the agent answers about the Chain MCP instead)",
    transcript: "09-chain-mcp-vs-docs-mcp",
    mustContain: [
      "The Pharos Docs MCP is not documented in the official Pharos documentation",
      "docs.pharos.xyz/~gitbook/mcp",
    ],
  },
  {
    gap: "1",
    claim: "asked what the Docs MCP is, the agent describes the hosted Chain MCP",
    transcript: "07-docs-mcp-access",
    mustContain: ["What is the Pharos MCP?", "https://mcp.pharos.xyz/mcp"],
  },
  {
    gap: "2",
    claim: "no documented programmatic access path",
    transcript: "08-mcp-tools",
    mustContain: [
      "The documentation does not list the complete input parameter schemas for each tool",
    ],
  },
  {
    gap: "3",
    claim: "no public faucet URL is documented",
    transcript: "04-testnet-faucet",
    mustContain: [
      "No public faucet URL is documented",
      "Get testnet PHRS from the Pharos faucet or directly from the team",
    ],
  },
  {
    gap: "3",
    claim: "the documented remedy for insufficient funds points back at the undocumented faucet",
    transcript: "06-common-errors",
    mustContain: ["insufficient funds", "get testnet PHRS from the faucet"],
  },
  {
    gap: "4",
    claim: "a documented network (chain id 688688, RPC + explorer) is presented in the docs",
    transcript: "02-network-parameters",
    mustContain: [
      "688688",
      "https://testnet.dplabs-internal.com",
      "https://testnet.pharosscan.xyz/",
    ],
  },
  {
    gap: "5",
    claim: "the docs say a fully self-contained example does not exist",
    transcript: "03-self-contained-example",
    mustContain: [
      "does **not** provide a fully self-contained from-scratch example",
      "https://github.com/PharosNetwork/examples",
    ],
  },
  {
    gap: "5",
    claim: "the documented command order puts compile before the private key is set",
    transcript: "03-self-contained-example",
    mustContain: ["npx hardhat compile", "npx hardhat vars set PRIVATE_KEY"],
  },
  {
    gap: "6",
    claim: "the MCP claims the config would raise 'ReferenceError: vars is not defined'",
    transcript: "12-hardhat-config",
    mustContain: [
      "ReferenceError: vars is not defined",
      "This is a documentation bug, not a user error",
    ],
  },
  {
    gap: "6",
    claim: "the MCP returns a browserURL that differs from the repository it tells you to clone",
    transcript: "12-hardhat-config",
    mustContain: ["browserURL: \"https://atlantic.pharosscan.xyz/\""],
  },
  {
    gap: "7",
    claim: "the docs do not list tool input parameter schemas",
    transcript: "08-mcp-tools",
    mustContain: [
      "Tool names and their JSON-RPC method mappings",
      "Which fields are required vs. optional",
    ],
  },
  {
    gap: "8",
    claim: "the docs contain no end-to-end verification checklist",
    transcript: "11-verification-checklist",
    mustContain: [
      "The documentation does not contain an end-to-end verification checklist",
      "A unified \"verify your setup\" checklist after onboarding",
    ],
  },
  {
    gap: "8",
    claim: "the documented error catalogue omits Hardhat-specific errors",
    transcript: "06-common-errors",
    mustContain: [
      "no Hardhat-specific error messages are listed",
      "Contract Deployment Fails",
    ],
  },
];

const failures = [];
let checked = 0;

// Guard: the transcripts directory must exist and be non-empty.
const present = (await readdir(TRANSCRIPTS)).filter((f) => f.endsWith(".md"));
if (present.length === 0) {
  failures.push(`${TRANSCRIPTS} contains no transcripts`);
}

const cache = new Map();
async function transcriptText(id) {
  if (!cache.has(id)) {
    const file = path.join(TRANSCRIPTS, `${id}.md`);
    try {
      cache.set(id, await readFile(file, "utf8"));
    } catch {
      cache.set(id, null);
    }
  }
  return cache.get(id);
}

for (const claim of CLAIMS) {
  checked += 1;
  const text = await transcriptText(claim.transcript);
  if (text === null) {
    failures.push(`gap ${claim.gap}: missing transcript ${claim.transcript}.md`);
    continue;
  }
  for (const needle of claim.mustContain) {
    if (!text.includes(needle)) {
      failures.push(
        `gap ${claim.gap}: ${claim.transcript}.md no longer contains the quoted evidence: ${JSON.stringify(needle)}`,
      );
    }
  }
  if (!failures.some((f) => f.includes(claim.transcript))) {
    console.log(`ok   gap ${claim.gap}  ${claim.transcript}  — ${claim.claim}`);
  }
}

console.log(`\n${checked} evidence claims checked; ${failures.length} problem(s).`);
if (failures.length > 0) {
  console.error("\nProblems:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("Every claimed gap is backed by its transcript.");
