import test from "node:test";
import assert from "node:assert/strict";
import { redactText, redactDeep, redactHeaders } from "../src/redact.mjs";

// Synthetic fixture only — this JWT is hand-written for the test and is not a live credential.
const JWT =
  "eyJhbGciOiJIUzI1NiJ9.eyJ3aWRnZXRTZXNzaW9uSWQiOiI1ZWRhZjk0OCJ9.RKJQNMqBoBABF0lq4Yh6Cc5gRSWf3kaowluv-Khsok4";
const UUID = "5edaf948-5554-4f21-9587-32ad66ef10ff";

test("redacts JWTs", () => {
  const out = redactText(`Authorization: Bearer ${JWT}`);
  assert.ok(!out.includes("eyJhbGciOiJIUzI1NiJ9"));
  assert.ok(out.includes("<redacted-jwt>"));
});

test("redacts UUIDs by default so session/request ids never ship", () => {
  const out = redactText(`session ${UUID} done`);
  assert.ok(!out.includes(UUID));
  assert.ok(out.includes("<redacted-id>"));
});

test("can keep UUIDs when explicitly requested", () => {
  const out = redactText(`session ${UUID}`, { uuids: false });
  assert.ok(out.includes(UUID));
});

test("redactDeep walks nested structures and drops token fields", () => {
  const input = {
    accessToken: JWT,
    nested: { authorization: `Bearer ${JWT}`, sessionId: UUID, list: [JWT] },
    message: "hello",
  };
  const out = redactDeep(input);
  assert.equal(out.accessToken, "<redacted>");
  assert.equal(out.nested.authorization, "<redacted>");
  assert.ok(!JSON.stringify(out).includes(JWT));
  assert.ok(!JSON.stringify(out).includes(UUID));
  assert.equal(out.message, "hello");
});

test("redactHeaders masks only the authorization header", () => {
  const out = redactHeaders({ Authorization: `Bearer ${JWT}`, Accept: "text/event-stream" });
  assert.equal(out.Authorization, "Bearer <redacted>");
  assert.equal(out.Accept, "text/event-stream");
});
