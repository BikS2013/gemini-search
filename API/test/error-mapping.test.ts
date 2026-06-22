/**
 * error-mapping.test.ts — Typed-error → HTTP status mapping.
 *
 * Scope:
 *   - src/errors/error-middleware.ts (errorMiddleware / toApiError)
 *
 * Each typed core/backend error class is injected via a fake backendFactory that
 * throws the error from the relevant backend method.  No live @google/genai calls
 * are made.
 *
 * Mapping table under test (from errorMiddleware JSDoc):
 *   RateLimitError           → 429 RATE_LIMITED      (+ Retry-After header)
 *   ConfigurationError       → 500 CONFIG_MISSING
 *   FileTooLargeError        → 413 PAYLOAD_TOO_LARGE
 *   UnsupportedMimeTypeError → 422 UNPROCESSABLE_ENTITY
 *   StoreLimitError          → 409 CONFLICT
 *   UploadOperationError     → 502 UPSTREAM_ERROR
 *   ApiError (pass-through)  → its own status / code
 *   Unknown error            → 500 INTERNAL (message hidden)
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import type { ApiConfig } from '../src/config.js';
import type { IGeminiBackend } from '../../src/core/backend/backend.js';
import {
  RateLimitError,
  FileTooLargeError,
  UnsupportedMimeTypeError,
  StoreLimitError,
  UploadOperationError,
} from '../../src/core/errors.js';
import { ConfigurationError } from '../../src/config/config-error.js';

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
// RateLimitError → 429
// ---------------------------------------------------------------------------

describe('RateLimitError → 429 RATE_LIMITED', () => {
  it('returns 429 with RATE_LIMITED code', async () => {
    const listStores = vi.fn().mockRejectedValue(new RateLimitError('quota hit'));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('includes Retry-After header when retryAfterMs is provided', async () => {
    const listStores = vi.fn().mockRejectedValue(new RateLimitError('slow down', 3000));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(429);
    // 3000 ms → ceil(3000/1000) = 3 seconds
    expect(res.headers['retry-after']).toBe('3');
  });

  it('rounds up sub-second retryAfterMs to 1', async () => {
    const listStores = vi.fn().mockRejectedValue(new RateLimitError('slow down', 500));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(429);
    // 500ms → ceil(0.5) = 1, then max(1,1) = 1
    expect(res.headers['retry-after']).toBe('1');
  });

  it('omits Retry-After header when retryAfterMs is undefined', async () => {
    // RateLimitError with no retryAfterMs argument
    const listStores = vi.fn().mockRejectedValue(new RateLimitError('quota hit'));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeUndefined();
  });

  it('response error body contains correlationId', async () => {
    const listStores = vi.fn().mockRejectedValue(new RateLimitError('x'));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.body.error).toHaveProperty('correlationId');
  });
});

// ---------------------------------------------------------------------------
// ConfigurationError → 500 CONFIG_MISSING
// ---------------------------------------------------------------------------

describe('ConfigurationError → 500 CONFIG_MISSING', () => {
  it('returns 500 with CONFIG_MISSING code', async () => {
    const listStores = vi
      .fn()
      .mockRejectedValue(
        new ConfigurationError('GEMINI_API_KEY', ['env', 'vault'], 'key not found'),
      );
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('CONFIG_MISSING');
  });

  it('error body contains the configuration error message', async () => {
    const listStores = vi
      .fn()
      .mockRejectedValue(new ConfigurationError('SOME_SETTING', ['env']));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toContain('SOME_SETTING');
  });

  it('ConfigurationError thrown from createStore also maps to 500', async () => {
    const createStore = vi
      .fn()
      .mockRejectedValue(new ConfigurationError('API_KEY', ['env']));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ createStore }),
    });
    const res = await request(app)
      .post('/stores')
      .send({ displayName: 'my-store' });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('CONFIG_MISSING');
  });
});

// ---------------------------------------------------------------------------
// FileTooLargeError → 413 PAYLOAD_TOO_LARGE
// ---------------------------------------------------------------------------

describe('FileTooLargeError → 413 PAYLOAD_TOO_LARGE', () => {
  it('returns 413 with PAYLOAD_TOO_LARGE code', async () => {
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

  it('error message describes the size violation', async () => {
    const uploadDocument = vi
      .fn()
      .mockRejectedValue(new FileTooLargeError(150_000_000, 100_000_000));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ uploadDocument }),
    });
    const res = await request(app)
      .post('/stores/s1/documents')
      .send({ filePath: '/tmp/huge.pdf' });
    expect(res.status).toBe(413);
    expect(res.body.error.message).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// UnsupportedMimeTypeError → 422 UNPROCESSABLE_ENTITY
// ---------------------------------------------------------------------------

describe('UnsupportedMimeTypeError → 422 UNPROCESSABLE_ENTITY', () => {
  it('returns 422 with UNPROCESSABLE_ENTITY code', async () => {
    const uploadDocument = vi
      .fn()
      .mockRejectedValue(new UnsupportedMimeTypeError('video/mp4'));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ uploadDocument }),
    });
    const res = await request(app)
      .post('/stores/s1/documents')
      .send({ filePath: '/tmp/video.mp4' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNPROCESSABLE_ENTITY');
  });

  it('error message includes the unsupported MIME type', async () => {
    const uploadDocument = vi
      .fn()
      .mockRejectedValue(new UnsupportedMimeTypeError('audio/mpeg'));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ uploadDocument }),
    });
    const res = await request(app)
      .post('/stores/s1/documents')
      .send({ filePath: '/tmp/audio.mp3' });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain('audio/mpeg');
  });
});

// ---------------------------------------------------------------------------
// StoreLimitError → 409 CONFLICT
// ---------------------------------------------------------------------------

describe('StoreLimitError → 409 CONFLICT', () => {
  it('returns 409 with CONFLICT code', async () => {
    const createStore = vi
      .fn()
      .mockRejectedValue(new StoreLimitError('project has 10 stores'));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ createStore }),
    });
    const res = await request(app)
      .post('/stores')
      .send({ displayName: 'eleventh-store' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('StoreLimitError without detail still maps to 409', async () => {
    const createStore = vi.fn().mockRejectedValue(new StoreLimitError());
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ createStore }),
    });
    const res = await request(app)
      .post('/stores')
      .send({ displayName: 'overflow' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

// ---------------------------------------------------------------------------
// UploadOperationError → 502 UPSTREAM_ERROR
// ---------------------------------------------------------------------------

describe('UploadOperationError → 502 UPSTREAM_ERROR', () => {
  it('returns 502 with UPSTREAM_ERROR code', async () => {
    const uploadDocument = vi
      .fn()
      .mockRejectedValue(new UploadOperationError('import failed', { reason: 'backend timeout' }));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ uploadDocument }),
    });
    const res = await request(app)
      .post('/stores/s1/documents')
      .send({ filePath: '/tmp/doc.pdf' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });

  it('UploadOperationError with no operationError still maps to 502', async () => {
    const uploadDocument = vi
      .fn()
      .mockRejectedValue(new UploadOperationError());
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ uploadDocument }),
    });
    const res = await request(app)
      .post('/stores/s1/documents')
      .send({ filePath: '/tmp/doc.pdf' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Unknown / unhandled error → 500 INTERNAL (message hidden)
// ---------------------------------------------------------------------------

describe('unknown error → 500 INTERNAL', () => {
  it('plain Error maps to 500 INTERNAL and hides the real message', async () => {
    const listStores = vi.fn().mockRejectedValue(new Error('unexpected internal detail'));
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    // The real error message must NOT be leaked to the client.
    expect(res.body.error.message).not.toContain('unexpected internal detail');
  });

  it('non-Error thrown value maps to 500 INTERNAL', async () => {
    const listStores = vi.fn().mockRejectedValue('string thrown instead of error');
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
  });
});

// ---------------------------------------------------------------------------
// ApiError pass-through (built-in API validation errors)
// ---------------------------------------------------------------------------

describe('ApiError pass-through (built-in validation)', () => {
  it('400 BAD_REQUEST from missing displayName is passed through', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).post('/stores').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('400 BAD_REQUEST from missing filePath is passed through', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app)
      .post('/stores/s1/documents')
      .send({ displayName: 'no-path' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('400 BAD_REQUEST from missing prompt is passed through', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app)
      .post('/stores/s1/query')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});
