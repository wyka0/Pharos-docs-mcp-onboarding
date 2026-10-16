/**
 * Minimal Server-Sent Events (SSE) parser for the Pharos Agent Center chat stream.
 *
 * The wire format observed live from `POST https://flow.anvita.xyz/api/v1/pharos/chat/completions`
 * is a `text/event-stream` where every event is a single `data: <json>` line and the stream is
 * terminated by `data: [DONE]`.
 *
 * This module is intentionally dependency-free and pure so it can be unit tested without network
 * access. It reproduces the parsing behaviour of the official ai.pharos.xyz web client:
 *   - split the buffer on newlines
 *   - keep the trailing partial line in the buffer
 *   - ignore blank lines, comment lines (`:`) and non-`data:` lines
 *   - `data: [DONE]` becomes `{ type: "done" }`
 */

/** @typedef {{ type: "content", delta: string }
 *  | { type: "reasoning", delta: string }
 *  | { type: "finish", reason: string }
 *  | { type: "card", card: unknown }
 *  | { type: "error", code: string, message: string }
 *  | { type: "done" }} StreamEvent */

/**
 * Normalise one decoded SSE `data:` payload (already JSON-parsed) into stream events.
 * Shape mirrors the chat-completions chunks served by the Pharos gateway.
 * @param {any} payload
 * @returns {StreamEvent[]}
 */
export function normalizePayload(payload) {
  /** @type {StreamEvent[]} */
  const events = [];
  if (!payload || typeof payload !== "object") return events;

  if (payload.error) {
    events.push({
      type: "error",
      code: String(payload.error.code ?? ""),
      message: String(payload.error.message ?? ""),
    });
    return events;
  }

  // Card payloads (structured widgets returned by the agent).
  let sawCard = false;
  for (const card of payload.card ?? []) {
    if (card && typeof card.type === "string") {
      events.push({ type: "card", card });
      sawCard = true;
    }
  }
  if (payload.content_type === "CARD" && !sawCard) {
    const withResult = (payload.card ?? []).find((c) => c && c.result) ?? null;
    events.push({
      type: "card",
      card: { type: payload.card_type ?? payload.type ?? "card", result: withResult?.result ?? null },
    });
  }

  for (const choice of payload.choices ?? []) {
    const delta = choice?.delta ?? {};
    if (typeof delta.content === "string" && delta.content !== "") {
      events.push({ type: "content", delta: delta.content });
    }
    if (typeof delta.reasoning_content === "string" && delta.reasoning_content !== "") {
      events.push({ type: "reasoning", delta: delta.reasoning_content });
    }
    if (choice?.finish_reason) {
      events.push({ type: "finish", reason: String(choice.finish_reason) });
    }
  }
  return events;
}

/**
 * Stateful, incremental SSE decoder. Feed it decoded text chunks; it returns the complete
 * events that became available after each `push`.
 * @returns {{ push(chunk: string): StreamEvent[], flush(): StreamEvent[] }}
 */
export function createSseDecoder() {
  let buffer = "";

  /**
   * @param {string} text
   * @returns {StreamEvent[]}
   */
  function consume(text) {
    /** @type {StreamEvent[]} */
    const events = [];
    const lines = text.split("\n");
    buffer = lines.pop() ?? "";
    for (const rawLine of lines) {
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
      if (!line || line.startsWith(":") || !line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      if (data === "[DONE]") {
        events.push({ type: "done" });
        continue;
      }
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue; // ignore malformed frames, same as the reference client
      }
      events.push(...normalizePayload(parsed));
    }
    return events;
  }

  return {
    push(chunk) {
      buffer += chunk;
      return consume(buffer);
    },
    flush() {
      // A final partial line without a newline is still a valid event terminator at EOF.
      const remaining = buffer.endsWith("\n") ? buffer : `${buffer}\n`;
      buffer = "";
      return consume(remaining);
    },
  };
}

/**
 * Reduce a list of stream events into the assistant reply text.
 * @param {StreamEvent[]} events
 * @returns {{ text: string, reasoning: string, cards: unknown[], errors: {code: string, message: string}[], finished: boolean }}
 */
export function collectReply(events) {
  let text = "";
  let reasoning = "";
  const cards = [];
  const errors = [];
  let finished = false;
  for (const ev of events) {
    if (ev.type === "content") text += ev.delta;
    else if (ev.type === "reasoning") reasoning += ev.delta;
    else if (ev.type === "card") cards.push(ev.card);
    else if (ev.type === "error") errors.push({ code: ev.code, message: ev.message });
    else if (ev.type === "done") finished = true;
  }
  return { text, reasoning, cards, errors, finished };
}
