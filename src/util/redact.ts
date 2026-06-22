/**
 * Redaction utility for log output (agent logging and anywhere a secret could
 * reach a log line). Ported from the storage-navigator reference
 * `src/util/redact.ts`, with a Google API key pattern (`AIza...`) added for the
 * Gemini data plane.
 *
 * Redacts patterns that commonly appear in log lines:
 * - Bearer / Basic auth tokens
 * - Google API keys (AIza...)
 * - OpenAI-style API keys (sk-..., sk-proj-...)
 * - JWT structures (header.payload.signature)
 * - Long base64/hex key-shaped runs
 * - Generic "key"/"token"/"secret"/"apiKey" JSON values
 */

const REDACT_PATTERNS: [RegExp, string][] = [
  // Bearer / Basic authorization headers
  [/(Authorization:\s*(?:Bearer|Basic)\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1[REDACTED]'],
  // Google API keys (AIza + 35 chars) — Gemini / Google Cloud
  [/AIza[0-9A-Za-z_\-]{35}/g, '[REDACTED-KEY]'],
  // OpenAI-style API keys (sk-..., sk-proj-...)
  [/sk-(?:proj-)?[A-Za-z0-9\-_]{8,}/g, '[REDACTED-KEY]'],
  // JWT structure (header.payload.signature)
  [/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[REDACTED-JWT]'],
  // Generic long base64 key-shaped strings (64+ chars)
  [/[A-Za-z0-9+/]{64,}={0,2}/g, '[REDACTED-KEY]'],
  // Generic "key": "value" where value looks like a secret
  [
    /("(?:token|key|secret|password|apiKey|api_key|accountKey|sasToken)":\s*")[^"]{8,}(")/gi,
    '$1[REDACTED]$2',
  ],
];

/**
 * Redact sensitive values from a log line string.
 * Returns the sanitized string; safe to write to stderr or log files.
 */
export function redactString(input: string): string {
  let out = input;
  for (const [pattern, replacement] of REDACT_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
