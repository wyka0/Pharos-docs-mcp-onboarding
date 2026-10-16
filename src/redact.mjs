/**
 * Redaction helpers so that published transcripts never contain live credentials.
 *
 * The Pharos Agent Center issues a short-lived anonymous guest JWT and a guest session id.
 * Both are redacted before anything is written to `docs/`.
 */

const JWT_RE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * Redact credentials/identifiers from arbitrary text.
 * @param {string} input
 * @param {{ uuids?: boolean }} [opts] whether to also redact UUIDs (session/request ids)
 * @returns {string}
 */
export function redactText(input, opts = {}) {
  let out = String(input).replace(JWT_RE, "<redacted-jwt>");
  if (opts.uuids !== false) out = out.replace(UUID_RE, "<redacted-id>");
  return out;
}

/**
 * Recursively redact an object/array/primitive. Useful for JSON evidence files.
 * @template T
 * @param {T} value
 * @param {{ uuids?: boolean }} [opts]
 * @returns {T}
 */
export function redactDeep(value, opts = {}) {
  if (typeof value === "string") return /** @type {T} */ (redactText(value, opts));
  if (Array.isArray(value)) return /** @type {T} */ (value.map((v) => redactDeep(v, opts)));
  if (value && typeof value === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/^(accessToken|authorization|refreshToken|token)$/i.test(k)) {
        out[k] = "<redacted>";
      } else {
        out[k] = redactDeep(v, opts);
      }
    }
    return /** @type {T} */ (out);
  }
  return value;
}

/** Redact the `Authorization` header value from a header record. */
export function redactHeaders(headers) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(headers ?? {})) {
    out[k] = /^authorization$/i.test(k) ? "Bearer <redacted>" : redactText(String(v));
  }
  return out;
}
