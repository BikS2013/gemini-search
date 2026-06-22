import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import type { ApiConfig } from '../src/config.js';
import type { IGeminiBackend } from '../../src/core/backend/backend.js';
import { RateLimitError, FileTooLargeError } from '../../src/core/errors.js';

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

describe('health and openapi are served before auth', () => {
  it('GET /health returns 200 even with auth enabled', async () => {
    const app = buildApp({
      config: makeConfig({ staticAuth: { values: ['secret'], headerName: 'X-Gemini-Nav-Auth' } }),
      backendFactory: () => stubBackend(),
    });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /openapi returns the spec without auth', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).get('/openapi');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Gemini File Search Store Navigator API');
  });
});

describe('static-auth gate (opt-in)', () => {
  it('passes through when no secret is configured', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], nextPageToken: null });
  });

  it('rejects with 401 STATIC_AUTH_FAILED when secret set and header missing', async () => {
    const app = buildApp({
      config: makeConfig({ staticAuth: { values: ['secret'], headerName: 'X-Gemini-Nav-Auth' } }),
      backendFactory: () => stubBackend(),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('STATIC_AUTH_FAILED');
  });

  it('accepts when correct header is supplied', async () => {
    const app = buildApp({
      config: makeConfig({ staticAuth: { values: ['secret'], headerName: 'X-Gemini-Nav-Auth' } }),
      backendFactory: () => stubBackend(),
    });
    const res = await request(app).get('/stores').set('X-Gemini-Nav-Auth', 'secret');
    expect(res.status).toBe(200);
  });
});

describe('routes map to the backend', () => {
  it('GET /stores forwards pagination and returns the page shape', async () => {
    const listStores = vi
      .fn()
      .mockResolvedValue({ items: [{ apiName: 'fileSearchStores/a' }], nextPageToken: 'tok' });
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores?pageSize=5&pageToken=abc');
    expect(res.status).toBe(200);
    expect(res.body.nextPageToken).toBe('tok');
    expect(listStores).toHaveBeenCalledWith({ pageSize: 5, pageToken: 'abc' });
  });

  it('POST /stores requires displayName', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).post('/stores').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('DELETE /stores/:name returns 204', async () => {
    const deleteStore = vi.fn().mockResolvedValue(undefined);
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ deleteStore }),
    });
    const res = await request(app).delete('/stores/fileSearchStores%2Fa?force=true');
    expect(res.status).toBe(204);
    expect(deleteStore).toHaveBeenCalledWith('fileSearchStores/a', true);
  });

  it('POST /stores/:name/query returns the normalized result', async () => {
    const query = vi.fn().mockResolvedValue({
      answer: 'hi',
      sources: [],
      citations: [],
    });
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend({ query }) });
    const res = await request(app)
      .post('/stores/s1/query')
      .send({ prompt: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe('hi');
    expect(query).toHaveBeenCalledWith(['s1'], 'hello', {
      model: undefined,
      metadataFilter: undefined,
    });
  });

  it('?raw=true returns the raw grounding subtree', async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ answer: 'a', sources: [], citations: [], raw: { grounding: 1 } });
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend({ query }) });
    const res = await request(app).post('/stores/s1/query?raw=true').send({ prompt: 'x' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ raw: { grounding: 1 } });
  });
});

describe('error mapping', () => {
  it('maps RateLimitError to 429 with Retry-After', async () => {
    const listStores = vi.fn().mockRejectedValue(new RateLimitError('slow down', 2000));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBe('2');
  });

  it('maps FileTooLargeError to 413', async () => {
    const uploadDocument = vi
      .fn()
      .mockRejectedValue(new FileTooLargeError(200_000_000, 100_000_000));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ uploadDocument }),
    });
    const res = await request(app)
      .post('/stores/s1/documents')
      .send({ filePath: '/tmp/big.pdf' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
