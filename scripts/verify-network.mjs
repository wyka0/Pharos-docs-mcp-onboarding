#!/usr/bin/env node
/**
 * Live verification of the network parameters quoted by the Docs MCP.
 *
 * The point of this script is the honesty check the onboarding documentation asks for:
 * every RPC URL, chain id and explorer URL in queries/network-params.json comes from
 * docs/transcripts/02-network-parameters.md, and this script re-tests each one live.
 *
 * Usage: node scripts/verify-network.mjs [--out docs/verified-network.json] [--timeout 15000]
 *
 * Read-only JSON-RPC (`eth_chainId`, `eth_blockNumber`) and HTTP HEAD requests only.
 * No keys, no transactions, no state changes.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const out = { set: "queries/network-params.json", out: "docs/verified-network.json", timeout: 15_000 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--set") out.set = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
    else if (argv[i] === "--timeout") out.timeout = Number(argv[++i]);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const spec = JSON.parse(await readFile(args.set, "utf8"));

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function rpc(url, method, timeout) {
  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    }),
    timeout,
    method,
  );
  const json = await res.json();
  if (json.error) throw new Error(`JSON-RPC error: ${JSON.stringify(json.error)}`);
  return { status: res.status, result: json.result };
}

async function headOk(url, timeout) {
  try {
    const res = await withTimeout(fetch(url, { method: "GET" }), timeout, "explorer");
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: null, error: err.message };
  }
}

const results = [];
for (const net of spec.networks) {
  const entry = {
    name: net.name,
    documentedOn: net.documentedOn,
    rpcUrl: net.rpcUrl,
    documentedChainId: net.chainId,
    chainIdMatch: null,
    rpcReachable: false,
    blockNumber: null,
    explorer: net.explorer,
    explorerReachable: null,
    symbol: net.symbol,
    error: null,
  };
  try {
    const chainId = await rpc(net.rpcUrl, "eth_chainId", args.timeout);
    entry.rpcReachable = true;
    entry.observedChainIdHex = chainId.result;
    entry.observedChainId = Number.parseInt(chainId.result, 16);
    entry.chainIdMatch = entry.observedChainId === net.chainId;
    const block = await rpc(net.rpcUrl, "eth_blockNumber", args.timeout);
    entry.blockNumber = Number.parseInt(block.result, 16);
  } catch (err) {
    entry.error = err.message;
    entry.errorCause = err.cause?.code ?? err.cause?.message ?? null;
  }
  if (net.explorer) entry.explorerReachable = await headOk(net.explorer, args.timeout);
  results.push(entry);
  const verdict = entry.error ? "FAIL" : entry.chainIdMatch ? "PASS" : "MISMATCH";
  console.log(`${verdict.padEnd(8)} ${net.name}`);
  console.log(`         rpc       ${net.rpcUrl}`);
  console.log(`         chainId   documented=${net.chainId} observed=${entry.observedChainId ?? "-"} ${entry.chainIdMatch === true ? "(match)" : "(!)"}`);
  console.log(`         block     ${entry.blockNumber ?? "-"}`);
  console.log(`         explorer  ${net.explorer} -> ${entry.explorerReachable?.status ?? entry.explorerReachable?.error ?? "-"}`);
  if (entry.error) console.log(`         error     ${entry.error}${entry.errorCause ? ` (${entry.errorCause})` : ""}`);
}

const evidence = {
  capturedAt: new Date().toISOString(),
  provenance: spec.provenance,
  node: process.version,
  results,
};
await mkdir(path.dirname(args.out), { recursive: true });
await writeFile(args.out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`\nevidence written to ${args.out}`);

const failures = results.filter((r) => r.error || r.chainIdMatch === false).length;
console.log(`${results.length - failures}/${results.length} documented networks verified against the live endpoint.`);
process.exit(failures > 0 ? 1 : 0);
