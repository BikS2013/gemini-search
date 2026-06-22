/**
 * auth.test.ts — Static-auth middleware opt-in behavior.
 *
 * Scope:
 *   - src/auth/static-auth.ts (staticAuthMiddleware)
 *   - app.ts wiring (gate installed after /health and /openapi, before data routes)
 *
 * Invariants under test:
 *   - With NO secret configured (values: []) → gate is a pass-through;
 *     requests to data routes succeed without any auth header.
 *   - With a secret configured:
 *       missing header          → 401 STATIC_AUTH_FAILED
 *       wrong header value      → 401 STATIC_AUTH_FAILED
 *       correct header value    → 200 / data response
 *       multiple allowed values → any matching value is accepted
 *   - Header comparison is case-insensitive (Express req.header behaviour).
 *   - Custom header name is respected.
 *   - /health and /openapi are exempted regardless of auth config.
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import type { ApiConfig } from '../src/config.js';
import type { IGeminiBackend } from '../../src/core/backend/backend.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<ApiConfig> = {}): ApiConfig {
  return {
    port: 3000,
    logLevel: 'silent',
    swaggerUiEnabled: false,
    geminiProfile: 'default',
    pagination: { defaultPageSize: 20, maxPageSize: 100 },
    staticAuth: { values: [], headerName: 'X-Gemini-Nav-Auth' },
    ...overrides,
  };
}

function stubBackend(partial: Partial<IGeminiBackend> = {}): IGeminiBackend {
  const base: IGeminiBackend = {
    listStores: vi.fn().mockResolvedValue({ items: [], nextPageToken: null }),
    getStore: vi.fn(),
    createStore: vi.fn(),
    deleteStore: vi.fn().mockResolvedValue(undefined),
    listDocuments: vi.fn().mockResolvedValue({ items: [], nextPageToken: null }),
    getDocument: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn().mockResolvedValue(undefined),
    replaceDocument: vi.fn(),
    query: vi.fn(),
  };
  return { ...base, ...partial };
}

// ---------------------------------------------------------------------------
// Pass-through: gate DISABLED (no secret configured)
// ---------------------------------------------------------------------------

describe('static-auth gate DISABLED (values: [])', () => {
  it('data route succeeds without any auth header', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  it('data route succeeds even when a (correct) header is sent', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'some-value');
    expect(res.status).toBe(200);
  });

  it('data route succeeds even when a wrong header value is sent', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'wrong-value');
    expect(res.status).toBe(200);
  });

  it('/health is accessible without auth header', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// Gate ENABLED (values non-empty)
// ---------------------------------------------------------------------------

describe('static-auth gate ENABLED (single secret)', () => {
  const authConfig = makeConfig({
    staticAuth: { values: ['my-secret'], headerName: 'X-Gemini-Nav-Auth' },
  });

  it('missing header returns 401 STATIC_AUTH_FAILED', async () => {
    const app = buildApp({ config: authConfig, backendFactory: () => stubBackend() });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('STATIC_AUTH_FAILED');
  });

  it('wrong header value returns 401 STATIC_AUTH_FAILED', async () => {
    const app = buildApp({ config: authConfig, backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'not-the-secret');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('STATIC_AUTH_FAILED');
    expect(res.body.error).toHaveProperty('correlationId');
  });

  it('correct header value allows access (200)', async () => {
    const app = buildApp({ config: authConfig, backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'my-secret');
    expect(res.status).toBe(200);
  });

  it('correct header allows POST /stores/:name/query', async () => {
    const query = vi.fn().mockResolvedValue({ answer: 'ok', sources: [], citations: [] });
    const app = buildApp({
      config: authConfig,
      backendFactory: () => stubBackend({ query }),
    });
    const res = await request(app)
      .post('/stores/s1/query')
      .set('X-Gemini-Nav-Auth', 'my-secret')
      .send({ prompt: 'test' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('ok');
  });

  it('/health bypasses auth gate even with secret configured', async () => {
    const app = buildApp({ config: authConfig, backendFactory: () => stubBackend() });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('/openapi bypasses auth gate even with secret configured', async () => {
    const app = buildApp({ config: authConfig, backendFactory: () => stubBackend() });
    const res = await request(app).get('/openapi');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Multiple allowed values
// ---------------------------------------------------------------------------

describe('static-auth gate ENABLED (multiple secrets)', () => {
  const multiConfig = makeConfig({
    staticAuth: { values: ['secret-a', 'secret-b', 'secret-c'], headerName: 'X-Gemini-Nav-Auth' },
  });

  it('first secret is accepted', async () => {
    const app = buildApp({ config: multiConfig, backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'secret-a');
    expect(res.status).toBe(200);
  });

  it('second secret is accepted', async () => {
    const app = buildApp({ config: multiConfig, backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'secret-b');
    expect(res.status).toBe(200);
  });

  it('last secret is accepted', async () => {
    const app = buildApp({ config: multiConfig, backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'secret-c');
    expect(res.status).toBe(200);
  });

  it('a value not in the list is rejected with 401', async () => {
    const app = buildApp({ config: multiConfig, backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'not-in-list');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('STATIC_AUTH_FAILED');
  });
});

// ---------------------------------------------------------------------------
// Custom header name
// ---------------------------------------------------------------------------

describe('custom auth header name', () => {
  const customHeaderConfig = makeConfig({
    staticAuth: { values: ['tok'], headerName: 'X-My-Custom-Token' },
  });

  it('correct value in the custom header is accepted', async () => {
    const app = buildApp({ config: customHeaderConfig, backendFactory: () => stubBackend() });
    const res = await request(app)
      .get('/stores')
      .set('X-My-Custom-Token', 'tok');
    expect(res.status).toBe(200);
  });

  it('correct value in the DEFAULT header name is rejected when custom header is configured', async () => {
    const app = buildApp({ config: customHeaderConfig, backendFactory: () => stubBackend() });
    // Sending the correct value on the wrong header should fail.
    const res = await request(app)
      .get('/stores')
      .set('X-Gemini-Nav-Auth', 'tok');
    expect(res.status).toBe(401);
  });

  it('missing custom header returns 401', async () => {
    const app = buildApp({ config: customHeaderConfig, backendFactory: () => stubBackend() });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('STATIC_AUTH_FAILED');
  });
});

// ---------------------------------------------------------------------------
// Error shape
// ---------------------------------------------------------------------------

describe('401 response body structure', () => {
  it('error body includes code, message, and correlationId fields', async () => {
    const app = buildApp({
      config: makeConfig({ staticAuth: { values: ['s'], headerName: 'X-Gemini-Nav-Auth' } }),
      backendFactory: () => stubBackend(),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'STATIC_AUTH_FAILED');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error).toHaveProperty('correlationId');
    expect(typeof res.body.error.correlationId).toBe('string');
  });
});
