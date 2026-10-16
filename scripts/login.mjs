#!/usr/bin/env node
/**
 * Wallet sign-in for the Pharos Agent Center (required before the Docs MCP will answer).
 *
 * Observed behaviour (2026-10-16): an anonymous GUEST token from
 * `POST /api/v1/widget/bootstrap` is rejected by the chat endpoint with
 * HTTP 401 `{ "code": "401", "message": "Unauthorized, please login first" }`.
 * The web UI therefore keeps its composer disabled with the hint
 * "Connect your wallet to send a message" until a wallet signature upgrades the session.
 *
 * This script performs the same two-step handshake the web app performs:
 *   1. POST /api/v1/widget/wallet/challenge        { address, chainId, appKey: "agent_center" }
 *   2. POST /api/v1/widget/agentcenter/wallet/verify { challengeId, address, signature,
 *                                                      appKey: "pharos", terminalSource }
 *
 * The signing identity is a throwaway local EOA created under `.local/` (git-ignored).
 * It never needs funds: only `personal_sign` is used.
 *
 * Usage:
 *   node scripts/login.mjs [--state .local/session.json] [--wallet .local/wallet.json] [--chain 5734951]
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { PharosDocsMcpClient } from "../src/client.mjs";

function parseArgs(argv) {
  const out = { state: ".local/session.json", wallet: ".local/wallet.json", chain: null, maxPolls: 20 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--state") out.state = argv[++i];
    else if (argv[i] === "--wallet") out.wallet = argv[++i];
    else if (argv[i] === "--chain") out.chain = Number(argv[++i]);
    else if (argv[i] === "--max-polls") out.maxPolls = Number(argv[++i]);
  }
  return out;
}

/** Load the local throwaway EOA, creating it on first run. Never prints the key. */
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
  const record = { address: account.address, privateKey, createdAt: new Date().toISOString() };
  await writeFile(file, JSON.stringify(record, null, 2), "utf8");
  return record;
}

const args = parseArgs(process.argv.slice(2));
const wallet = await loadOrCreateWallet(args.wallet);
const account = privateKeyToAccount(wallet.privateKey);

const client = new PharosDocsMcpClient();
const guest = await client.bootstrap();
const chainId = args.chain ?? (Number(guest.supportedChains?.[0]) || 5734951);

const challenge = await client.requestWalletChallenge({ address: account.address, chainId });
const signature = await account.signMessage({ message: challenge.message });
const verified = await client.verifyWallet({
  challengeId: challenge.challengeId,
  address: account.address,
  signature,
  terminalSource: "UNKNOWN_WALLET",
});

// After wallet verification the token is `ONBOARDING`, not `AUTHENTICATED`.
// The account is provisioned asynchronously (hosted Guardian agent) and must be polled,
// then the guardian must sign an EIP-712 `ClaimIntent`, then onboarding is completed.
let status = await client.waitForOnboarding({ maxPolls: args.maxPolls ?? 20 });
const steps = [{ step: "status", state: status.state, nextAction: status.nextAction }];

if (status.nextAction === "PREPARE_OR_SIGN_GUARDIAN") {
  const prep = await client.prepareGuardianClaim();
  const typed = PharosDocsMcpClient.normalizeTypedData(prep.typedData);
  // EIP-712 signature: the guardian wallet authorises its own agent account.
  const claimSignature = await account.signTypedData({
    domain: typed.domain,
    types: typed.types,
    primaryType: typed.primaryType,
    message: typed.message,
  });
  const submitted = await client.submitGuardianClaim({ operationId: prep.operationId, signature: claimSignature });
  steps.push({ step: "guardian-claim", operationId: prep.operationId, ok: submitted.ok, code: submitted.code });

  for (let i = 0; i < 10; i += 1) {
    const claim = await client.guardianClaimStatus({ operationId: prep.operationId });
    steps.push({ step: "guardian-claim-status", data: claim.data });
    if (claim.data?.status && claim.data.status !== "PENDING" && claim.data.status !== "PROCESSING") break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  status = await client.waitForOnboarding({ maxPolls: args.maxPolls ?? 20 });
  steps.push({ step: "status-after-guardian", state: status.state, nextAction: status.nextAction });
}

const completed = await client.completeOnboarding();
steps.push({ step: "complete", ok: completed.ok, code: completed.code, tokenType: completed.tokenType });

await mkdir(path.dirname(args.state), { recursive: true });
await writeFile(
  args.state,
  JSON.stringify(
    {
      accessToken: client.auth.accessToken,
      expiresAt: client.auth.expiresAt,
      sessionId: client.auth.sessionId,
      tokenType: client.auth.tokenType,
      address: account.address,
      chainId,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
  "utf8",
);

console.log("wallet sign-in complete");
console.log("  address:        ", account.address);
console.log("  chainId:        ", chainId);
console.log("  guest token:    ", guest.tokenType, `(quota ${guest.remainingQuota})`);
console.log("  signed message: ", JSON.stringify(challenge.message));
console.log("  token type:     ", verified.tokenType);
console.log("  expires at:     ", verified.expiresAt);
console.log("  onboarding:     ", status.state, "->", completed.state ?? (completed.ok ? "COMPLETE" : "UNKNOWN"));
console.log("  final token:    ", client.auth.tokenType);
console.log("  steps:          ", JSON.stringify(steps));
console.log("  session id:      <redacted>");
console.log("  cached at:      ", args.state, "(git-ignored)");
