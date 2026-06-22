/**
 * Unit tests for src/util/redact.ts — redactString.
 *
 * Verifies that:
 *  - API key patterns (Google AIza..., OpenAI sk-...) are masked
 *  - Auth header tokens (Bearer, Basic) are masked
 *  - JWT patterns are masked
 *  - Long base64/hex key-shaped strings are masked
 *  - Generic JSON "key"/"token"/"secret" etc. values are masked
 *  - Ordinary non-secret text is left unchanged
 *  - The function is pure: same input → same output, no mutation
 */

import { describe, it, expect } from 'vitest';
import { redactString } from '../../src/util/redact.js';

// ---------------------------------------------------------------------------
// Google API key pattern — AIza + 35 chars (the Gemini / Google Cloud pattern)
// ---------------------------------------------------------------------------
describe('redactString — Google API key (AIza pattern)', () => {
  it('masks a well-formed Google API key', () => {
    // AIza + 35 alphanumeric chars = total 39 chars (the spec is AIza + 35)
    const key = 'AIza' + 'A'.repeat(35);
    const result = redactString(`my key is ${key} done`);
    expect(result).toContain('[REDACTED-KEY]');
    expect(result).not.toContain(key);
  });

  it('masks AIza key with mixed case and underscores', () => {
    // AIza(4) + SyD(3) = prefix of 7; need 32 more to reach 35 suffix chars total.
    // 'AIzaSyD' = 7 chars; need 32 more so total suffix after AIza = 35.
    const key = 'AIzaSyD' + 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6';
    expect(key.length).toBe(39); // sanity: AIza(4) + 35
    const result = redactString(key);
    expect(result).toContain('[REDACTED-KEY]');
    expect(result).not.toContain('AIzaSyD');
  });

  it('masks AIza key with hyphens and underscores in suffix', () => {
    // AIza + exactly 35 chars (all matching [0-9A-Za-z_\-])
    const key = 'AIza' + 'A_1-B_2-C_3-D_4-E_5-F_6-G_7-H_8-I_2';
    expect(key.length).toBe(39); // sanity
    const result = redactString(`Authorization: ${key}`);
    expect(result).toContain('[REDACTED-KEY]');
    expect(result).not.toContain('AIza');
  });

  it('masks AIza key embedded in a JSON-like string', () => {
    const key = 'AIza' + '1234567890abcdefABCDEF1234567890123';
    const json = `{"apiKey": "${key}"}`;
    const result = redactString(json);
    expect(result).not.toContain(key);
  });

  it('masks multiple AIza keys in the same string', () => {
    const key1 = 'AIza' + 'a'.repeat(35);
    const key2 = 'AIza' + 'b'.repeat(35);
    const result = redactString(`first: ${key1} second: ${key2}`);
    expect(result).not.toContain(key1);
    expect(result).not.toContain(key2);
    // Two [REDACTED-KEY] tokens expected (one per key).
    const count = (result.match(/\[REDACTED-KEY\]/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('leaves text without an AIza pattern unchanged in that part', () => {
    const result = redactString('hello world, no key here');
    expect(result).toBe('hello world, no key here');
  });
});

// ---------------------------------------------------------------------------
// OpenAI-style keys — sk-... and sk-proj-...
// ---------------------------------------------------------------------------
describe('redactString — OpenAI-style keys (sk- prefix)', () => {
  it('masks a sk-... key', () => {
    const key = 'sk-AbCdEfGhIjKlMnOp';
    const result = redactString(`key=${key}`);
    expect(result).toContain('[REDACTED-KEY]');
    expect(result).not.toContain(key);
  });

  it('masks a sk-proj-... key', () => {
    const key = 'sk-proj-abcDEF123456789';
    const result = redactString(`key=${key}`);
    expect(result).toContain('[REDACTED-KEY]');
    expect(result).not.toContain(key);
  });

  it('does NOT mask sk- with fewer than 8 suffix chars (too short to be a key)', () => {
    // Pattern requires 8+ chars after sk- (or sk-proj-)
    const short = 'sk-abc';
    const result = redactString(short);
    // Only 3 suffix chars — should not match.
    expect(result).toBe(short);
  });

  it('masks sk- key regardless of case', () => {
    const key = 'sk-ABCDEFGHIJ1234567890';
    const result = redactString(key);
    expect(result).not.toContain(key);
  });
});

// ---------------------------------------------------------------------------
// Bearer / Basic Authorization headers
// ---------------------------------------------------------------------------
describe('redactString — Authorization header tokens', () => {
  it('masks Bearer token value but preserves the header name', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.payload.sig';
    const result = redactString(input);
    expect(result).toContain('Authorization:');
    expect(result).toContain('Bearer');
    expect(result).not.toContain('eyJhbGciOiJSUzI1NiJ9');
  });

  it('masks Basic auth token value but preserves the header name', () => {
    const input = 'Authorization: Basic dXNlcjpwYXNz';
    const result = redactString(input);
    expect(result).toContain('Authorization:');
    expect(result).toContain('Basic');
    expect(result).not.toContain('dXNlcjpwYXNz');
  });

  it('is case-insensitive for "authorization"', () => {
    const input = 'authorization: bearer TOKEN_VALUE_HERE_12345';
    const result = redactString(input);
    expect(result).not.toContain('TOKEN_VALUE_HERE_12345');
  });

  it('replaces the token with [REDACTED]', () => {
    const input = 'Authorization: Bearer mytoken123';
    const result = redactString(input);
    expect(result).toContain('[REDACTED]');
  });
});

// ---------------------------------------------------------------------------
// JWT pattern — ey...ey...sig
// ---------------------------------------------------------------------------
describe('redactString — JWT tokens', () => {
  it('masks a well-formed JWT', () => {
    const jwt =
      'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = redactString(jwt);
    expect(result).toContain('[REDACTED-JWT]');
    expect(result).not.toContain('eyJhbGci');
  });

  it('masks JWT embedded in a larger log line', () => {
    const jwt =
      'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMSJ9.abc123def456';
    const result = redactString(`Token received: ${jwt} for user`);
    expect(result).not.toContain('eyJhbGci');
    expect(result).toContain('[REDACTED-JWT]');
  });
});

// ---------------------------------------------------------------------------
// Long base64/hex key-shaped strings (64+ chars)
// ---------------------------------------------------------------------------
describe('redactString — long base64/hex strings', () => {
  it('masks a 64-character base64 string', () => {
    const long = 'A'.repeat(64);
    const result = redactString(`secret=${long}`);
    expect(result).not.toContain(long);
    expect(result).toContain('[REDACTED-KEY]');
  });

  it('masks a 128-character hex-like string', () => {
    const hex = '0123456789abcdef'.repeat(8); // 128 chars
    const result = redactString(hex);
    expect(result).not.toContain(hex);
    expect(result).toContain('[REDACTED-KEY]');
  });

  it('does NOT mask a 63-character string (below threshold)', () => {
    const notLong = 'A'.repeat(63);
    const result = redactString(notLong);
    // 63 chars should NOT be redacted by the 64+ rule.
    expect(result).toBe(notLong);
  });
});

// ---------------------------------------------------------------------------
// Generic JSON key/token/secret/password/apiKey values
// ---------------------------------------------------------------------------
describe('redactString — generic JSON secret fields', () => {
  it('masks "token" JSON field value', () => {
    const input = '{"token": "superSecretValue123"}';
    const result = redactString(input);
    expect(result).not.toContain('superSecretValue123');
    expect(result).toContain('[REDACTED]');
  });

  it('masks "key" JSON field value', () => {
    const input = '{"key": "some-api-key-value"}';
    const result = redactString(input);
    expect(result).not.toContain('some-api-key-value');
  });

  it('masks "secret" JSON field value', () => {
    const input = '{"secret": "my-secret-here"}';
    const result = redactString(input);
    expect(result).not.toContain('my-secret-here');
  });

  it('masks "password" JSON field value', () => {
    const input = '{"password": "p@ssw0rd!123"}';
    const result = redactString(input);
    expect(result).not.toContain('p@ssw0rd!123');
  });

  it('masks "apiKey" JSON field value', () => {
    const input = '{"apiKey": "ApiKeyValue1234"}';
    const result = redactString(input);
    expect(result).not.toContain('ApiKeyValue1234');
  });

  it('masks "api_key" JSON field value', () => {
    const input = '{"api_key": "underscored_api_key_value"}';
    const result = redactString(input);
    expect(result).not.toContain('underscored_api_key_value');
  });

  it('masks "accountKey" JSON field value', () => {
    const input = '{"accountKey": "account-key-value123"}';
    const result = redactString(input);
    expect(result).not.toContain('account-key-value123');
  });

  it('masks "sasToken" JSON field value', () => {
    const input = '{"sasToken": "sas-token-value-here"}';
    const result = redactString(input);
    expect(result).not.toContain('sas-token-value-here');
  });

  it('is case-insensitive for field names', () => {
    // The pattern is /gi so "Token", "KEY" etc. should also match.
    const input = '{"Token": "some-secret-token-value"}';
    const result = redactString(input);
    expect(result).not.toContain('some-secret-token-value');
  });

  it('does NOT mask short (< 8 char) field values', () => {
    // The pattern requires value length >= 8.
    const input = '{"key": "short"}'; // 5 chars value — too short
    const result = redactString(input);
    // "short" is only 5 chars so it should NOT be redacted by the generic pattern.
    expect(result).toContain('short');
  });
});

// ---------------------------------------------------------------------------
// Non-secret text is preserved
// ---------------------------------------------------------------------------
describe('redactString — non-secret text passes through unchanged', () => {
  it('returns empty string unchanged', () => {
    expect(redactString('')).toBe('');
  });

  it('leaves normal log text unchanged', () => {
    const text = 'Store listing completed: 3 stores found.';
    expect(redactString(text)).toBe(text);
  });

  it('leaves a URL without key material unchanged', () => {
    const url = 'https://generativelanguage.googleapis.com/v1beta/fileSearchStores';
    expect(redactString(url)).toBe(url);
  });

  it('leaves numeric values unchanged', () => {
    const text = 'sizeBytes: 1234567890';
    expect(redactString(text)).toBe(text);
  });

  it('leaves ordinary JSON without secret field names unchanged', () => {
    const json = '{"displayName": "my-store", "documentCount": 42}';
    expect(redactString(json)).toBe(json);
  });

  it('leaves timestamps unchanged', () => {
    const ts = '2026-06-20T00:00:00.000Z';
    expect(redactString(ts)).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// Purity and determinism
// ---------------------------------------------------------------------------
describe('redactString — purity', () => {
  it('does not mutate the input string', () => {
    const input = 'AIza' + 'X'.repeat(35);
    const original = input;
    redactString(input);
    // Strings are immutable in JS — this test documents the contract.
    expect(input).toBe(original);
  });

  it('is deterministic — same input produces same output', () => {
    const input = 'AIza' + 'Y'.repeat(35) + ' some text';
    expect(redactString(input)).toBe(redactString(input));
  });

  it('handles a string with no patterns multiple times without error', () => {
    const safe = 'safe log message with no secrets';
    const r1 = redactString(safe);
    const r2 = redactString(safe);
    expect(r1).toBe(r2);
    expect(r1).toBe(safe);
  });
});

// ---------------------------------------------------------------------------
// Combined / realistic log lines
// ---------------------------------------------------------------------------
describe('redactString — realistic log lines', () => {
  it('redacts a Google key from a realistic log line', () => {
    const key = 'AIza' + 'AbCdEfGhIjKlMnOpQrStUvWxYz12345ABCD';
    const log = `[INFO] Resolved Gemini API key for profile "default": ${key}`;
    const result = redactString(log);
    expect(result).toContain('[INFO]');
    expect(result).toContain('Resolved Gemini API key');
    expect(result).not.toContain(key);
    expect(result).toContain('[REDACTED-KEY]');
  });

  it('redacts multiple secrets from a single complex log line', () => {
    // AIza(4) + 35 chars = 39 total
    const apiKey = 'AIza' + 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7S';
    const bearer = 'Authorization: Bearer eyABC.eyXYZ.sigPQR';
    const log = `${bearer} apiKey=${apiKey} user=alice`;
    const result = redactString(log);
    expect(result).not.toContain(apiKey);
    expect(result).not.toContain('eyABC');
    expect(result).toContain('user=alice');
  });

  it('redacts a key embedded in an agent debug output JSON line', () => {
    const log = `{"event":"backend_init","profile":"prod","apiKey":"sk-prodABCDEFGH12345678"}`;
    const result = redactString(log);
    expect(result).not.toContain('sk-prodABCDEFGH12345678');
    expect(result).toContain('[REDACTED');
  });
});
