import test from "node:test";
import assert from "node:assert/strict";
import { redactText, redactDeep, redactHeaders } from "../src/redact.mjs";

// Fully fabricated fixture — header, payload and signature were all authored for this test.
// It is not a credential: the signature segment is the base64url of the literal string
// "fabricated-signature-not-real!!!" and authenticates nothing.
const JWT =
  "eyJhbGciOiJIUzI1NiJ9.eyJ3aWRnZXRTZXNzaW9uSWQiOiI1ZWRhZjk0OCJ9.ZmFicmljYXRlZC1zaWduYXR1cmUtbm90LXJlYWwhISE";
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
