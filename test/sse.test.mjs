import test from "node:test";
import assert from "node:assert/strict";
import { createSseDecoder, normalizePayload, collectReply } from "../src/sse.mjs";

test("decodes a single content frame", () => {
  const decoder = createSseDecoder();
  const events = decoder.push('data:{"choices":[{"delta":{"content":"Hello"}}]}\n');
  assert.deepEqual(events, [{ type: "content", delta: "Hello" }]);
});

test("keeps a partial line buffered across chunks", () => {
  const decoder = createSseDecoder();
  assert.deepEqual(decoder.push('data:{"choices":[{"delta":{"cont'), []);
  const events = decoder.push('ent":"split"}}]}\n');
  assert.deepEqual(events, [{ type: "content", delta: "split" }]);
});

test("ignores comments, blank lines and non-data lines", () => {
  const decoder = createSseDecoder();
  const events = decoder.push(': keep-alive\n\nevent: ping\ndata:{"choices":[{"delta":{"content":"x"}}]}\n');
  assert.deepEqual(events, [{ type: "content", delta: "x" }]);
});

test("treats data: [DONE] as the terminal frame", () => {
  const decoder = createSseDecoder();
  const events = decoder.push("data:[DONE]\n");
  assert.deepEqual(events, [{ type: "done" }]);
});

test("tolerates CRLF line endings (the live stream uses blank CRLF separators)", () => {
  const decoder = createSseDecoder();
  const events = decoder.push('data:{"choices":[{"delta":{"content":"ok"}}]}\r\n\r\n');
  assert.deepEqual(events, [{ type: "content", delta: "ok" }]);
});

test("ignores malformed JSON frames instead of throwing", () => {
  const decoder = createSseDecoder();
  const events = decoder.push("data:{not json}\ndata:{\"choices\":[{\"delta\":{\"content\":\"safe\"}}]}\n");
  assert.deepEqual(events, [{ type: "content", delta: "safe" }]);
});

test("flush() emits a final un-terminated frame", () => {
  const decoder = createSseDecoder();
  const streamed = decoder.push('data:{"choices":[{"delta":{"content":"tail"}}]}');
  assert.deepEqual(streamed, []);
  assert.deepEqual(decoder.flush(), [{ type: "content", delta: "tail" }]);
});

test("normalises card-only payloads", () => {
  const events = normalizePayload({ content_type: "CARD", card: [{ type: "UNKNOWN_CARD", result: { a: 1 } }] });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "card");
});

test("normalises structured cards and finish reasons", () => {
  const events = normalizePayload({
    card: [{ type: "TX_CARD", result: { hash: "0x1" } }],
    choices: [{ delta: { content: "hi", reasoning_content: "why" }, finish_reason: "stop" }],
  });
  assert.deepEqual(
    events.map((e) => e.type),
    ["card", "content", "reasoning", "finish"],
  );
});

test("surfaces stream errors verbatim", () => {
  const events = normalizePayload({ error: { code: "120001", message: "Your Credit balance is too low" } });
  assert.deepEqual(events, [{ type: "error", code: "120001", message: "Your Credit balance is too low" }]);
});

test("collectReply merges deltas and flags completion", () => {
  const events = [
    { type: "reasoning", delta: "thinking " },
    { type: "content", delta: "Hello " },
    { type: "content", delta: "world" },
    { type: "done" },
  ];
  const reply = collectReply(events);
  assert.equal(reply.text, "Hello world");
  assert.equal(reply.reasoning, "thinking ");
  assert.equal(reply.finished, true);
  assert.deepEqual(reply.errors, []);
});

test("collectReply reports an unfinished stream", () => {
  const reply = collectReply([{ type: "content", delta: "partial" }]);
  assert.equal(reply.finished, false);
  assert.equal(reply.text, "partial");
});
