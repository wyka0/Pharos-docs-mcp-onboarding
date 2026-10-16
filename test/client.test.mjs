import test from "node:test";
import assert from "node:assert/strict";
import { PharosDocsMcpClient, PharosApiError, AGENT_TYPES, APP_KEY } from "../src/client.mjs";

const GUEST_BOOTSTRAP = {
  code: "000000",
  success: true,
  data: {
    config: { agentName: "Pharos", supportedChains: ["5734951"], guestLimit: 10, newUserCredits: 300 },
    accessToken: "eyJhbGciOiJIUzI1NiJ9.guest.token",
    tokenType: "GUEST",
    expiresAt: "2026-10-17T13:23:40Z",
    session: { id: "widget-session-1", remainingQuota: 10 },
  },
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function sseResponse(frames, { close = true } = {}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      if (close) controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
}

/** Records every request and answers by URL. */
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : null, headers: init.headers ?? {} });
    for (const [match, responder] of routes) {
      if (url.includes(match)) return responder(url, init);
    }
    throw new Error(`unexpected request: ${url}`);
  };
  impl.calls = calls;
  return impl;
}

const CHAT_SSE = [
  'data:{"choices":[{"delta":{"reasoning_content":"checking docs "}}]}\n\n',
  'data:{"choices":[{"delta":{"content":"Pharos is "}}]}\n\n',
  'data:{"choices":[{"delta":{"content":"an L1."},"finish_reason":"stop"}]}\n\n',
  "data:[DONE]\n\n",
];

test("bootstrap sends the browser Origin/Referer the API requires and parses the guest token", async () => {
  const fetchImpl = fakeFetch([["/api/v1/widget/bootstrap", () => jsonResponse(GUEST_BOOTSTRAP)]]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl });
  const session = await client.bootstrap();

  assert.equal(session.tokenType, "GUEST");
  assert.equal(session.remainingQuota, 10);
  assert.equal(session.sessionId, "widget-session-1");
  assert.deepEqual(session.supportedChains, ["5734951"]);

  const call = fetchImpl.calls[0];
  assert.equal(call.headers.Origin, "https://ai.pharos.xyz");
  assert.equal(call.headers.Referer, "https://ai.pharos.xyz/");
  assert.equal(call.headers.Authorization, "");
  assert.equal(call.body.appKey, APP_KEY);
  assert.match(call.body.clientNonce, /^bootstrap-/);
});

test("bootstrap rejects a response that carries no access token", async () => {
  const fetchImpl = fakeFetch([["/api/v1/widget/bootstrap", () => jsonResponse({ code: "1", msg: "Referer header is required" }, 403)]]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl });
  await assert.rejects(
    () => client.bootstrap(),
    (err) => {
      assert.ok(err instanceof PharosApiError);
      assert.equal(err.status, 403);
      assert.match(err.message, /HTTP 403/);
      return true;
    },
  );
});

test("ask() resolves the chatSessionId for the requested agent and streams the answer", async () => {
  const fetchImpl = fakeFetch([
    ["/api/v1/widget/bootstrap", () => jsonResponse(GUEST_BOOTSTRAP)],
    ["/api/v1/pharos/conversations/session/parent-1/agents", () =>
      jsonResponse({
        code: "000000",
        data: {
          agents: [
            { agentType: "PHAROS_PERSONAL_AGENT", chatSessionId: "chat-personal" },
            { agentType: "PHAROS_DOCS", chatSessionId: "chat-docs" },
          ],
        },
      })],
    ["/api/v1/pharos/conversations/session", () => jsonResponse({ code: "000000", data: [{ sessionId: "parent-1" }] })],
    ["/api/v1/pharos/chat/completions", () => sseResponse(CHAT_SSE)],
  ]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl });
  await client.bootstrap();
  const reply = await client.ask("In one sentence: what is Pharos?");

  assert.equal(reply.text, "Pharos is an L1.");
  assert.equal(reply.reasoning, "checking docs ");
  assert.equal(reply.finished, true);
  assert.equal(reply.timedOut, false);
  assert.equal(reply.errors.length, 0);
  assert.equal(reply.agentType, AGENT_TYPES.DOCS);

  const chatCall = fetchImpl.calls.find((c) => c.url.includes("/chat/completions"));
  assert.equal(chatCall.body.spaceType, "pharos");
  assert.equal(chatCall.body.operationType, "chat");
  assert.equal(chatCall.body.agentType, "PHAROS_DOCS");
  assert.equal(chatCall.body.sessionId, "chat-docs", "chat must use the agents' chatSessionId, not the widget session");
  assert.equal(chatCall.body.stream, true);
  assert.match(chatCall.headers.Authorization, /^Bearer /);
  assert.equal(chatCall.headers.Accept, "text/event-stream");
});

test("a guest session is rejected by the chat endpoint with the observed 401", async () => {
  const fetchImpl = fakeFetch([
    ["/api/v1/widget/bootstrap", () => jsonResponse(GUEST_BOOTSTRAP)],
    ["/api/v1/pharos/conversations/session/parent-1/agents", () =>
      jsonResponse({ code: "000000", data: { agents: [{ agentType: "PHAROS_DOCS", chatSessionId: "chat-docs" }] } })],
    ["/api/v1/pharos/conversations/session", () => jsonResponse({ code: "000000", data: [{ sessionId: "parent-1" }] })],
    ["/api/v1/pharos/chat/completions", () => jsonResponse({ code: "401", message: "Unauthorized, please login first" }, 401)],
  ]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl });
  await assert.rejects(() => client.ask("hello"), (err) => {
    assert.ok(err instanceof PharosApiError);
    assert.equal(err.status, 401);
    assert.match(err.body, /Unauthorized, please login first/);
    return true;
  });
});

test("a missing agent type fails with a message that lists the available agents", async () => {
  const fetchImpl = fakeFetch([
    ["/api/v1/widget/bootstrap", () => jsonResponse(GUEST_BOOTSTRAP)],
    ["/api/v1/pharos/conversations/session/parent-1/agents", () =>
      jsonResponse({ code: "000000", data: { agents: [{ agentType: "PHAROS_MCP", chatSessionId: "chat-mcp" }] } })],
    ["/api/v1/pharos/conversations/session", () => jsonResponse({ code: "000000", data: [{ sessionId: "parent-1" }] })],
  ]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl });
  await assert.rejects(() => client.resolveChatSession("PHAROS_DOCS"), /available: PHAROS_MCP/);
});

test("wallet sign-in chain: challenge -> verify upgrades the token to AUTHENTICATED", async () => {
  const fetchImpl = fakeFetch([
    ["/api/v1/widget/bootstrap", () => jsonResponse(GUEST_BOOTSTRAP)],
    ["/api/v1/widget/wallet/challenge", () =>
      jsonResponse({ code: "000000", data: { challengeId: "wch-1", message: "Anvita Widget Sign-In\nNonce: abc", expiresAt: "2026-10-16T13:49:54Z" } })],
    ["/api/v1/widget/agentcenter/wallet/verify", () =>
      jsonResponse({
        code: "000000",
        data: { accessToken: "eyJ.onboarding.token", tokenType: "ONBOARDING", expiresAt: "2026-10-16T14:20:21Z", session: { id: "widget-session-1" } },
      })],
  ]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl });
  await client.bootstrap();
  const challenge = await client.requestWalletChallenge({ address: "0xabc", chainId: 5734951 });
  assert.equal(challenge.challengeId, "wch-1");

  const verified = await client.verifyWallet({ challengeId: challenge.challengeId, address: "0xabc", signature: "0xsig" });
  assert.equal(verified.tokenType, "ONBOARDING");

  const verifyCall = fetchImpl.calls.find((c) => c.url.includes("/wallet/verify"));
  assert.equal(verifyCall.body.appKey, "pharos");
  assert.equal(verifyCall.body.terminalSource, "UNKNOWN_WALLET");
  assert.match(verifyCall.headers.Authorization, /^Bearer /, "verify needs the guest bearer token or the API answers WIDGET_ORIGIN_FORBIDDEN");
});

test("normalizeTypedData converts decimal uint strings to BigInt for EIP-712 signing", () => {
  const typed = {
    domain: { name: "AnvitaAgentClaim", version: "1", chainId: "1672", verifyingContract: "0xdead" },
    types: {
      EIP712Domain: [{ name: "chainId", type: "uint256" }],
      ClaimIntent: [
        { name: "operationId", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint48" },
      ],
    },
    primaryType: "ClaimIntent",
    message: { operationId: "0xaa", nonce: "0", deadline: "1792159592" },
  };
  const out = PharosDocsMcpClient.normalizeTypedData(typed);
  assert.equal(out.message.nonce, 0n);
  assert.equal(out.message.deadline, 1792159592n);
  assert.equal(out.message.operationId, "0xaa", "bytes32 values stay untouched");
  assert.equal(out.domain.chainId, 1672);
  assert.equal(typed.message.nonce, "0", "input is not mutated");
});

test("waitForOnboarding stops polling once nextAction is no longer POLL", async () => {
  let poll = 0;
  const fetchImpl = fakeFetch([
    ["/api/v1/widget/bootstrap", () => jsonResponse(GUEST_BOOTSTRAP)],
    ["/api/v1/widget/onboarding/status", () => {
      poll += 1;
      if (poll === 1) return jsonResponse({ code: "000000", data: { state: "HOSTED_AGENT_INITIALIZING", nextAction: "POLL", retryAfterMs: 0 } });
      return jsonResponse({ code: "000000", data: { state: "FULL_READY", nextAction: "COMPLETE_ONBOARDING" } });
    }],
  ]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl });
  await client.bootstrap();
  const status = await client.waitForOnboarding({ maxPolls: 5, sleep: async () => {} });
  assert.equal(status.state, "FULL_READY");
  assert.equal(status.nextAction, "COMPLETE_ONBOARDING");
  assert.equal(poll, 2);
});

test("a stalled stream keeps the partial answer instead of discarding it", async () => {
  const encoder = new TextEncoder();
  const fetchImpl = fakeFetch([
    ["/api/v1/widget/bootstrap", () => jsonResponse(GUEST_BOOTSTRAP)],
    ["/api/v1/pharos/conversations/session/parent-1/agents", () =>
      jsonResponse({ code: "000000", data: { agents: [{ agentType: "PHAROS_DOCS", chatSessionId: "chat-docs" }] } })],
    ["/api/v1/pharos/conversations/session", () => jsonResponse({ code: "000000", data: [{ sessionId: "parent-1" }] })],
    ["/api/v1/pharos/chat/completions", () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data:{"choices":[{"delta":{"content":"partial answer"}}]}\n\n'));
          // never closes: the client must hit its own timeout
        },
      });
      return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
    }],
  ]);
  const client = new PharosDocsMcpClient({ fetch: fetchImpl, streamTimeoutMs: 50 });
  await client.bootstrap();
  const reply = await client.ask("slow question");
  assert.equal(reply.timedOut, true);
  assert.equal(reply.text, "partial answer");
  assert.equal(reply.finished, false);
});
