/**
 * Client for the Pharos Agent Center "Pharos Docs MCP" agent (agentType `PHAROS_DOCS`).
 *
 * Endpoints (observed from the ai.pharos.xyz web bundle and confirmed live — see
 * docs/verified-output.md):
 *
 *   1. Anonymous guest bootstrap
 *      POST https://api.pharosnetwork.xyz/api/v1/widget/bootstrap
 *      body: { appKey: "agent_center", clientNonce: "bootstrap-<uuid>" }
 *      -> { data: { accessToken, tokenType: "GUEST", expiresAt, session: { id, remainingQuota } } }
 *
 *   2. Chat completion (SSE)
 *      POST https://flow.anvita.xyz/api/v1/pharos/chat/completions
 *      headers: { Content-Type: application/json, Accept: text/event-stream,
 *                 Authorization: Bearer <accessToken> }
 *      body: { spaceType: "pharos", operationType: "chat", agentType, sessionId,
 *              message, requestId, stream: true }
 *
 * Only the two endpoints above are used. No other documentation source is consulted.
 */

import { randomUUID } from "node:crypto";
import { createSseDecoder, collectReply } from "./sse.mjs";

export const AGENT_CENTER_BASE = "https://flow.anvita.xyz";
/** The Agents API (widget bootstrap, chat completions and token refresh) all live on this host. */
export const WIDGET_BASE = AGENT_CENTER_BASE;
export const CHAT_BASE = AGENT_CENTER_BASE;
export const APP_KEY = "agent_center";
/**
 * The Agent Center API rejects requests that do not look like they come from the web app.
 * Observed on 2026-10-16 against `https://api.pharosnetwork.xyz/api/v1/widget/bootstrap`:
 * HTTP 403 `{ code: 1, msg: "Referer header is required" }` when no `Referer` is sent.
 * The ai.pharos.xyz web client supplies these values implicitly via the browser.
 */
export const SITE_ORIGIN = "https://ai.pharos.xyz";
export const SITE_REFERER = "https://ai.pharos.xyz/";

/** Agent ids exposed by the ai.pharos.xyz "Developer Docs MCP" surface. */
export const AGENT_TYPES = Object.freeze({
  GENERAL: "PHAROS_PERSONAL_AGENT",
  DOCS: "PHAROS_DOCS",
  SKILL_ENGINE: "PHAROS_SKILL_ENGINE",
  CHAIN_MCP: "PHAROS_MCP",
});

/** Longest observed client-side timeout before the web client aborts a stream. */
export const DEFAULT_STREAM_TIMEOUT_MS = 180_000;

export class PharosApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, url?: string, body?: unknown }} [meta]
   */
  constructor(message, meta = {}) {
    super(message);
    this.name = "PharosApiError";
    this.status = meta.status;
    this.url = meta.url;
    this.body = meta.body;
  }
}

/**
 * @param {string} url
 * @param {any} body
 * @param {Record<string,string>} headers
 * @param {typeof fetch} fetchImpl
 * @param {AbortSignal} [signal]
 */
async function postJson(url, body, headers, fetchImpl, signal) {
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 500) };
  }
  if (!res.ok || (parsed && parsed.code && parsed.code !== "000000" && parsed.success === false)) {
    throw new PharosApiError(`POST ${url} failed with HTTP ${res.status}`, {
      status: res.status,
      url,
      body: parsed,
    });
  }
  return { status: res.status, json: parsed };
}

export class PharosDocsMcpClient {
  /**
   * @param {{
   *   fetch?: typeof fetch,
   *   streamTimeoutMs?: number,
   *   onTrace?: (entry: { kind: string, at: string, detail: Record<string, unknown>, raw?: string }) => void
   * }} [options]
   */
  constructor(options = {}) {
    this.fetch = options.fetch ?? globalThis.fetch;
    if (typeof this.fetch !== "function") {
      throw new Error("A fetch implementation is required (Node >= 18).");
    }
    this.streamTimeoutMs = options.streamTimeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS;
    this.onTrace = options.onTrace ?? null;
    /** @type {{ accessToken: string, tokenType: string, expiresAt: string, sessionId: string, remainingQuota: number|null } | null} */
    this.auth = null;
  }

  /**
   * Create an anonymous guest session (this is what the public ai.pharos.xyz page does on first load).
   * @returns {Promise<{ tokenType: string, expiresAt: string, sessionId: string, remainingQuota: number|null }>}
   */
  async bootstrap() {
    const url = `${WIDGET_BASE}/api/v1/widget/bootstrap`;
    const body = { appKey: APP_KEY, clientNonce: `bootstrap-${randomUUID()}` };
    const { status, json } = await postJson(
      url,
      body,
      { Authorization: "", Origin: SITE_ORIGIN, Referer: SITE_REFERER },
      this.fetch,
    );
    const data = json?.data ?? {};
    const accessToken = data.accessToken ?? "";
    const sessionId = data?.session?.id ?? "";
    this.auth = {
      accessToken,
      tokenType: data.tokenType ?? "GUEST",
      expiresAt: data.expiresAt ?? "",
      sessionId,
      remainingQuota: typeof data?.session?.remainingQuota === "number" ? data.session.remainingQuota : null,
    };
    this.#trace("bootstrap", {
      url,
      requestBody: body,
      status,
      responseCode: json?.code,
      tokenType: this.auth.tokenType,
      expiresAt: this.auth.expiresAt,
      hint: data?.config?.agentName ?? null,
      supportedChains: data?.config?.supportedChains ?? null,
      guestLimit: data?.config?.guestLimit ?? null,
      remainingQuota: this.auth.remainingQuota,
    });
    return {
      tokenType: this.auth.tokenType,
      expiresAt: this.auth.expiresAt,
      sessionId: this.auth.sessionId,
      remainingQuota: this.auth.remainingQuota,
      supportedChains: data?.config?.supportedChains ?? [],
    };
  }

  /**
   * Step 1 of wallet sign-in: request the SIWE-style message to sign.
   * @param {{ address: string, chainId: number }} params
   * @returns {Promise<{ challengeId: string, message: string, expiresAt: string }>}
   */
  async requestWalletChallenge({ address, chainId }) {
    const url = `${WIDGET_BASE}/api/v1/widget/wallet/challenge`;
    const { status, json } = await postJson(url, { address, chainId, appKey: APP_KEY }, this.#siteHeaders(), this.fetch);
    const data = json?.data ?? {};
    this.#trace("wallet.challenge", { url, status, responseCode: json?.code, chainId, expiresAt: data.expiresAt });
    if (!data.challengeId || !data.message) {
      throw new PharosApiError("wallet challenge response did not contain challengeId/message", { url, body: json });
    }
    return { challengeId: data.challengeId, message: data.message, expiresAt: data.expiresAt };
  }

  /**
   * Step 2 of wallet sign-in: submit the EIP-191 signature over the challenge message.
   * The `signMessage` callback is injected so the core client stays dependency-free
   * (scripts/login.mjs wires it to viem's `privateKeyToAccount().signMessage`).
   * @param {{ challengeId: string, address: string, signature: string, terminalSource?: string, signMessage?: (message: string) => Promise<string> }} params
   */
  async verifyWallet({ challengeId, address, signature, terminalSource = "UNKNOWN_WALLET", signMessage }) {
    void signMessage; // signing happens in the caller; kept for API symmetry
    const url = `${WIDGET_BASE}/api/v1/widget/agentcenter/wallet/verify`;
    const body = { challengeId, address, signature, appKey: "pharos", terminalSource };
    const { status, json } = await postJson(url, body, this.#siteHeaders(), this.fetch);
    const data = json?.data ?? {};
    const accessToken = data.accessToken ?? "";
    const sessionId = data?.session?.id ?? this.auth?.sessionId ?? "";
    if (!accessToken) {
      throw new PharosApiError("wallet verify response did not contain an accessToken", { url, body: json });
    }
    this.auth = {
      accessToken,
      tokenType: data.tokenType ?? "AUTHENTICATED",
      expiresAt: data.expiresAt ?? "",
      sessionId,
      remainingQuota: typeof data?.session?.remainingQuota === "number" ? data.session.remainingQuota : null,
    };
    this.#trace("wallet.verify", {
      url,
      status,
      responseCode: json?.code,
      tokenType: this.auth.tokenType,
      expiresAt: this.auth.expiresAt,
      accountMode: data?.account?.accountMode ?? data?.accountMode ?? null,
    });
    return {
      tokenType: this.auth.tokenType,
      expiresAt: this.auth.expiresAt,
      sessionId: this.auth.sessionId,
      remainingQuota: this.auth.remainingQuota,
      raw: data,
    };
  }

  /** Headers the ai.pharos.xyz web app sends implicitly via the browser (plus its bearer token). */
  #siteHeaders({ withAuth = true } = {}) {
    return {
      Origin: SITE_ORIGIN,
      Referer: SITE_REFERER,
      ...(withAuth && this.auth?.accessToken ? { Authorization: `Bearer ${this.auth.accessToken}` } : {}),
    };
  }

  /**
   * Convert the API's EIP-712 payload into the shape signing libraries expect
   * (`uint*`/`bytes32` values arrive as decimal strings / 0x-strings).
   * @param {any} typedData
   */
  static normalizeTypedData(typedData) {
    const clone = JSON.parse(JSON.stringify(typedData));
    const uintFields = new Set();
    for (const fields of Object.values(clone.types ?? {})) {
      for (const f of fields) if (/^uint\d*$/.test(f.type)) uintFields.add(f.name);
    }
    for (const [k, v] of Object.entries(clone.message ?? {})) {
      if (uintFields.has(k) && typeof v === "string" && /^\d+$/.test(v)) clone.message[k] = BigInt(v);
    }
    if (typeof clone.domain?.chainId === "string" && /^\d+$/.test(clone.domain.chainId)) {
      clone.domain.chainId = Number(clone.domain.chainId);
    }
    return clone;
  }

  /** `POST /api/v1/widget/onboarding/guardian-claims/prepare` */
  async prepareGuardianClaim() {
    const url = `${WIDGET_BASE}/api/v1/widget/onboarding/guardian-claims/prepare`;
    const res = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.#siteHeaders() },
      body: JSON.stringify({ clientRequestId: randomUUID() }),
    });
    const json = await res.json().catch(() => null);
    const data = json?.data ?? {};
    this.#trace("onboarding.guardian.prepare", {
      url,
      status: res.status,
      responseCode: json?.code,
      operationId: data.operationId,
      primaryType: data?.typedData?.primaryType,
      domain: data?.typedData?.domain,
    });
    if (!data.operationId || !data.typedData) {
      throw new PharosApiError("guardian-claims/prepare did not return operationId/typedData", { url, body: json });
    }
    return { operationId: data.operationId, typedData: data.typedData, deadline: data.deadline };
  }

  /** `POST /api/v1/widget/onboarding/guardian-claims/{operationId}/submit` */
  async submitGuardianClaim({ operationId, signature }) {
    const url = `${WIDGET_BASE}/api/v1/widget/onboarding/guardian-claims/${encodeURIComponent(operationId)}/submit`;
    const res = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.#siteHeaders() },
      body: JSON.stringify({ signature, clientRequestId: randomUUID() }),
    });
    const json = await res.json().catch(() => null);
    this.#trace("onboarding.guardian.submit", {
      url,
      status: res.status,
      responseCode: json?.code,
      message: json?.message,
    });
    return { ok: json?.code === "000000", code: json?.code, message: json?.message ?? null, data: json?.data ?? null };
  }

  /** `GET /api/v1/widget/onboarding/guardian-claims/{operationId}` */
  async guardianClaimStatus({ operationId }) {
    const url = `${WIDGET_BASE}/api/v1/widget/onboarding/guardian-claims/${encodeURIComponent(operationId)}`;
    const res = await this.fetch(url, { headers: this.#siteHeaders() });
    const json = await res.json().catch(() => null);
    this.#trace("onboarding.guardian.status", { url, status: res.status, responseCode: json?.code, data: json?.data });
    return { status: res.status, code: json?.code, data: json?.data ?? null };
  }

  /**
   * Poll `GET /api/v1/widget/onboarding/status` until the hosted agent stops reporting
   * `nextAction: "POLL"`. Honours the `retryAfterMs` hint the API returns.
   * @param {{ maxPolls?: number, sleep?: (ms:number)=>Promise<void> }} [options]
   */
  async waitForOnboarding(options = {}) {
    const maxPolls = options.maxPolls ?? 20;
    const sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    const url = `${WIDGET_BASE}/api/v1/widget/onboarding/status`;
    let last = null;
    for (let i = 0; i < maxPolls; i += 1) {
      const res = await this.fetch(url, { headers: this.#siteHeaders() });
      const json = await res.json().catch(() => null);
      const data = json?.data ?? {};
      last = data;
      this.#trace("onboarding.status", {
        url,
        poll: i + 1,
        status: res.status,
        responseCode: json?.code,
        state: data.state,
        nextAction: data.nextAction,
        guardianClaimStatus: data?.account?.guardianClaimStatus,
        deployStatus: data?.account?.deployStatus,
        accountGeneration: data?.account?.accountGeneration,
      });
      if (res.status !== 200) {
        throw new PharosApiError(`onboarding status returned HTTP ${res.status}`, { url, body: json });
      }
      if (data.nextAction !== "POLL") return data;
      await sleep(typeof data.retryAfterMs === "number" ? data.retryAfterMs : 3000);
    }
    return last;
  }

  /**
   * `POST /api/v1/widget/agentcenter/onboarding/complete`. On success the session token is
   * upgraded to `AUTHENTICATED`, which is the scope the chat endpoint accepts.
   */
  async completeOnboarding() {
    const url = `${WIDGET_BASE}/api/v1/widget/agentcenter/onboarding/complete`;
    const res = await this.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.#siteHeaders() },
      body: JSON.stringify({ clientRequestId: randomUUID() }),
    });
    const json = await res.json().catch(() => null);
    const data = json?.data ?? {};
    if (data.accessToken) {
      this.auth = {
        accessToken: data.accessToken,
        tokenType: data.tokenType ?? this.auth?.tokenType ?? "ONBOARDING",
        expiresAt: data.expiresAt ?? this.auth?.expiresAt ?? "",
        sessionId: this.auth?.sessionId ?? "",
        remainingQuota: null,
      };
    }
    const ok = json?.code === "000000";
    this.#trace("onboarding.complete", {
      url,
      status: res.status,
      responseCode: json?.code,
      message: json?.message,
      tokenType: this.auth?.tokenType,
    });
    return { ok, code: json?.code, message: json?.message ?? null, state: data.state ?? null, tokenType: this.auth?.tokenType };
  }

  /** `GET /api/v1/widget/onboarding/status` (raw, single call). */
  async onboardingStatus() {
    const url = `${WIDGET_BASE}/api/v1/widget/onboarding/status`;
    const res = await this.fetch(url, { headers: this.#siteHeaders() });
    const json = await res.json().catch(() => null);
    return { status: res.status, code: json?.code, data: json?.data ?? null };
  }

  /**
   * List the caller's parent conversation sessions.
   * `GET /api/v1/pharos/conversations/session` -> `[{ sessionId, agentId, spaceType, name, ... }]`
   */
  async listConversations() {
    const url = `${CHAT_BASE}/api/v1/pharos/conversations/session`;
    const res = await this.fetch(url, { headers: this.#siteHeaders() });
    const json = await res.json().catch(() => null);
    this.#trace("conversations.list", { url, status: res.status, responseCode: json?.code, count: json?.data?.length ?? 0 });
    if (!Array.isArray(json?.data) || json.data.length === 0) {
      throw new PharosApiError("no conversation session was returned for this account", { url, body: json });
    }
    return json.data;
  }

  /**
   * List the agents attached to a parent session.
   * `GET /api/v1/pharos/conversations/session/{sessionId}/agents`
   * Each entry carries the `chatSessionId` that must be sent to the chat endpoint,
   * plus the agent's `contextPrompt`, `welcomeMessage` and `recommendedPrompts`.
   */
  async listSessionAgents(sessionId) {
    const url = `${CHAT_BASE}/api/v1/pharos/conversations/session/${encodeURIComponent(sessionId)}/agents`;
    const res = await this.fetch(url, { headers: this.#siteHeaders() });
    const json = await res.json().catch(() => null);
    const agents = json?.data?.agents ?? [];
    this.#trace("conversations.agents", {
      url,
      status: res.status,
      responseCode: json?.code,
      agentTypes: agents.map((a) => a.agentType),
    });
    if (agents.length === 0) {
      throw new PharosApiError("the conversation session exposed no agents", { url, body: json });
    }
    return agents;
  }

  /**
   * Resolve the `chatSessionId` that the chat endpoint expects for a given agent type.
   * (The `sessionId` returned by `/widget/bootstrap` is a *widget* session and is rejected
   * by the chat endpoint — observed HTTP 500 / 401.)
   */
  async resolveChatSession(agentType = AGENT_TYPES.DOCS) {
    this.#chatSessions ??= new Map();
    if (this.#chatSessions.has(agentType)) return this.#chatSessions.get(agentType);
    const [parent] = await this.listConversations();
    const agents = await this.listSessionAgents(parent.sessionId);
    const match = agents.find((a) => a.agentType === agentType);
    if (!match) {
      throw new PharosApiError(
        `agent ${agentType} is not attached to session ${parent.sessionId} (available: ${agents.map((a) => a.agentType).join(", ")})`,
      );
    }
    this.#chatSessions.set(agentType, match.chatSessionId);
    return match.chatSessionId;
  }

  /** @type {Map<string,string> | undefined} */
  #chatSessions;

  /**
   * Ask the Docs agent a question. Returns the accumulated reply plus the raw event list.
   * @param {{ agentType?: string, sessionId?: string, signal?: AbortSignal, stream?: boolean }} [options]
   * @returns {Promise<{ reply: string, reasoning: string, cards: unknown[], errors: {code:string,message:string}[], finished: boolean, events: any[], requestId: string, sessionId: string, agentType: string, sseFrames: string[] }>}
   */
  async ask(message, options = {}) {
    const agentType = options.agentType ?? AGENT_TYPES.DOCS;
    if (!this.auth) await this.bootstrap();
    const sessionId = options.sessionId ?? (await this.resolveChatSession(agentType));
    const requestId = randomUUID();
    const url = `${CHAT_BASE}/api/v1/pharos/chat/completions`;
    const body = {
      spaceType: "pharos",
      operationType: "chat",
      agentType,
      sessionId,
      message,
      requestId,
      stream: options.stream !== false,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.streamTimeoutMs);
    const externalAbort = () => controller.abort();
    options.signal?.addEventListener("abort", externalAbort, { once: true });

    const headers = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Origin: SITE_ORIGIN,
      Referer: SITE_REFERER,
      ...(this.auth.accessToken ? { Authorization: `Bearer ${this.auth.accessToken}` } : {}),
    };

    this.#trace("chat.request", {
      url,
      agentType,
      requestBody: { ...body, sessionId: "<session>" },
      headers: { Accept: headers.Accept, Authorization: headers.Authorization ? "Bearer <redacted>" : undefined },
    });

    /** @type {any[]} */
    const events = [];
    /** @type {string[]} */
    const sseFrames = [];
    let timedOut = false;
    /** @type {ReadableStreamDefaultReader<Uint8Array> | undefined} */
    let reader;
    try {
      const res = await this.fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      this.#trace("chat.response.headers", { status: res.status, contentType: res.headers?.get?.("content-type") ?? null });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new PharosApiError(`chat request failed with HTTP ${res.status}`, {
          status: res.status,
          url,
          body: text.slice(0, 1000),
        });
      }

      const decoder = createSseDecoder();
      reader = res.body.getReader();
      const textDecoder = new TextDecoder();
      // `fetch`'s AbortSignal does not necessarily unblock a stalled body read, so race the
      // read against the same deadline explicitly. This is what makes partial answers survive
      // a slow hosted-agent run instead of hanging the caller forever.
      const deadline = new Promise((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(new DOMException("stream deadline reached", "AbortError")),
          { once: true },
        );
      });
      for (;;) {
        const { done, value } = await Promise.race([reader.read(), deadline]);
        if (done) break;
        const chunk = textDecoder.decode(value, { stream: true });
        for (const frame of chunk.split("\n")) {
          if (frame.trim()) sseFrames.push(frame);
        }
        events.push(...decoder.push(chunk));
      }
      events.push(...decoder.flush());
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError" && events.length > 0) {
        // The hosted agent can legitimately take minutes on multi-page doc lookups.
        // Keep whatever streamed in before the client-side timeout instead of discarding it.
        timedOut = true;
      } else if (err instanceof DOMException && err.name === "AbortError") {
        throw new PharosApiError(
          `stream aborted after ${this.streamTimeoutMs}ms (client timeout) or by caller`,
          { url },
        );
      } else {
        throw err;
      }
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", externalAbort);
      if (timedOut) await reader?.cancel?.().catch(() => {});
    }

    const reply = collectReply(events);
    this.#trace("chat.result", {
      agentType,
      finished: reply.finished,
      timedOut,
      contentChars: reply.text.length,
      cardCount: reply.cards.length,
      errors: reply.errors,
    });

    return {
      ...reply,
      timedOut,
      events,
      requestId,
      sessionId,
      agentType,
      sseFrames,
    };
  }

  /** @param {string} kind @param {Record<string, unknown>} detail @param {string} [raw] */
  #trace(kind, detail, raw) {
    this.onTrace?.({ kind, at: new Date().toISOString(), detail, raw });
  }
}

export default PharosDocsMcpClient;
