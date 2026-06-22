/**
 * pagination.test.ts — Pagination utilities and profile selection.
 *
 * Scope:
 *   - src/util/pagination.ts (parsePage, asQueryString, getParam)
 *   - Profile selection from X-Gemini-Nav-Profile header / ?profile= query param
 *     (resolveProfile in src/routes/stores.ts, exercised via HTTP layer)
 *   - Page shape returned by /stores and /stores/:name/documents routes via
 *     an injected fake backend.
 *
 * Strategy:
 *   - parsePage, asQueryString, getParam are tested as pure units (imported
 *     directly) — fastest path to coverage.
 *   - Profile selection and Page shape are exercised through the HTTP layer
 *     (buildApp + supertest) to ensure the wiring from query/header → backend
 *     is correct end-to-end.
 */

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../src/app.js';
import type { ApiConfig } from '../src/config.js';
import type { IGeminiBackend } from '../../src/core/backend/backend.js';
import { parsePage, asQueryString, getParam } from '../src/util/pagination.js';

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
// parsePage — unit tests
// ---------------------------------------------------------------------------

describe('parsePage', () => {
  const defaults = { defaultPageSize: 20, maxPageSize: 100 };

  it('returns defaultPageSize when pageSize is absent', () => {
    const result = parsePage({}, defaults);
    expect(result.pageSize).toBe(20);
    expect(result.pageToken).toBeUndefined();
  });

  it('returns defaultPageSize when pageSize is an empty string', () => {
    const result = parsePage({ pageSize: '' }, defaults);
    expect(result.pageSize).toBe(20);
  });

  it('parses a valid integer pageSize string', () => {
    const result = parsePage({ pageSize: '50' }, defaults);
    expect(result.pageSize).toBe(50);
  });

  it('parses pageSize of 1 (minimum valid)', () => {
    const result = parsePage({ pageSize: '1' }, defaults);
    expect(result.pageSize).toBe(1);
  });

  it('parses pageSize equal to maxPageSize (boundary)', () => {
    const result = parsePage({ pageSize: '100' }, defaults);
    expect(result.pageSize).toBe(100);
  });

  it('throws BAD_REQUEST for non-numeric pageSize', () => {
    expect(() => parsePage({ pageSize: 'abc' }, defaults)).toThrow();
  });

  it('throws BAD_REQUEST for zero pageSize', () => {
    expect(() => parsePage({ pageSize: '0' }, defaults)).toThrow();
  });

  it('throws BAD_REQUEST for negative pageSize', () => {
    expect(() => parsePage({ pageSize: '-5' }, defaults)).toThrow();
  });

  it('throws BAD_REQUEST for float pageSize', () => {
    expect(() => parsePage({ pageSize: '1.5' }, defaults)).toThrow();
  });

  it('throws BAD_REQUEST when pageSize exceeds maxPageSize', () => {
    expect(() => parsePage({ pageSize: '101' }, defaults)).toThrow();
  });

  it('passes pageToken through unchanged', () => {
    const result = parsePage({ pageToken: 'opaque-cursor-abc' }, defaults);
    expect(result.pageToken).toBe('opaque-cursor-abc');
  });

  it('passes pageToken undefined when absent', () => {
    const result = parsePage({}, defaults);
    expect(result.pageToken).toBeUndefined();
  });

  it('returns both pageSize and pageToken together', () => {
    const result = parsePage({ pageSize: '10', pageToken: 'cursor' }, defaults);
    expect(result).toEqual({ pageSize: 10, pageToken: 'cursor' });
  });
});

// ---------------------------------------------------------------------------
// asQueryString — unit tests
// ---------------------------------------------------------------------------

describe('asQueryString', () => {
  it('returns the string as-is', () => {
    expect(asQueryString('hello')).toBe('hello');
  });

  it('returns undefined for undefined input', () => {
    expect(asQueryString(undefined)).toBeUndefined();
  });

  it('returns undefined for a number', () => {
    expect(asQueryString(42)).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(asQueryString(null)).toBeUndefined();
  });

  it('returns the first element when given a string array', () => {
    expect(asQueryString(['first', 'second'])).toBe('first');
  });

  it('returns undefined for an empty array', () => {
    expect(asQueryString([])).toBeUndefined();
  });

  it('returns undefined for an array of numbers', () => {
    expect(asQueryString([1, 2])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getParam — unit tests
// ---------------------------------------------------------------------------

describe('getParam', () => {
  it('returns the param value when present', () => {
    // Build a minimal mock Express Request
    const mockReq = { params: { name: 'fileSearchStores/abc' } } as unknown as import('express').Request;
    expect(getParam(mockReq, 'name')).toBe('fileSearchStores/abc');
  });

  it('throws BAD_REQUEST ApiError when param is absent', () => {
    const mockReq = { params: {} } as unknown as import('express').Request;
    expect(() => getParam(mockReq, 'name')).toThrow();
  });

  it('throws BAD_REQUEST ApiError when param is an empty string', () => {
    const mockReq = { params: { name: '' } } as unknown as import('express').Request;
    expect(() => getParam(mockReq, 'name')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Page shape via HTTP — /stores
// ---------------------------------------------------------------------------

describe('GET /stores page shape', () => {
  it('returns { items, nextPageToken } with null nextPageToken when no more pages', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty('nextPageToken', null);
  });

  it('returns nextPageToken from the backend when present', async () => {
    const listStores = vi.fn().mockResolvedValue({
      items: [{ apiName: 'fileSearchStores/x' }],
      nextPageToken: 'next-tok',
    });
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    const res = await request(app).get('/stores');
    expect(res.status).toBe(200);
    expect(res.body.nextPageToken).toBe('next-tok');
    expect(res.body.items).toHaveLength(1);
  });

  it('forwards pageSize and pageToken to backend.listStores', async () => {
    const listStores = vi.fn().mockResolvedValue({ items: [], nextPageToken: null });
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listStores }),
    });
    await request(app).get('/stores?pageSize=5&pageToken=cursor-abc');
    expect(listStores).toHaveBeenCalledWith({ pageSize: 5, pageToken: 'cursor-abc' });
  });

  it('uses defaultPageSize when pageSize is omitted', async () => {
    const listStores = vi.fn().mockResolvedValue({ items: [], nextPageToken: null });
    const app = buildApp({
      config: makeConfig({ pagination: { defaultPageSize: 15, maxPageSize: 50 } }),
      backendFactory: () => stubBackend({ listStores }),
    });
    await request(app).get('/stores');
    expect(listStores).toHaveBeenCalledWith({ pageSize: 15, pageToken: undefined });
  });

  it('returns 400 when pageSize exceeds maxPageSize', async () => {
    const app = buildApp({
      config: makeConfig({ pagination: { defaultPageSize: 20, maxPageSize: 50 } }),
      backendFactory: () => stubBackend(),
    });
    const res = await request(app).get('/stores?pageSize=51');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 for non-integer pageSize', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).get('/stores?pageSize=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

// ---------------------------------------------------------------------------
// Page shape via HTTP — /stores/:name/documents
// ---------------------------------------------------------------------------

describe('GET /stores/:name/documents page shape', () => {
  it('returns { items, nextPageToken } with null nextPageToken when no more pages', async () => {
    const app = buildApp({ config: makeConfig(), backendFactory: () => stubBackend() });
    const res = await request(app).get('/stores/s1/documents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty('nextPageToken', null);
  });

  it('returns nextPageToken from the backend when present', async () => {
    const listDocuments = vi.fn().mockResolvedValue({
      items: [{ apiName: 'fileSearchStores/s1/documents/d1', state: 'STATE_ACTIVE' }],
      nextPageToken: 'doc-tok',
    });
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listDocuments }),
    });
    const res = await request(app).get('/stores/s1/documents');
    expect(res.status).toBe(200);
    expect(res.body.nextPageToken).toBe('doc-tok');
    expect(res.body.items).toHaveLength(1);
  });

  it('forwards storeName, pageSize, and pageToken to backend.listDocuments', async () => {
    const listDocuments = vi.fn().mockResolvedValue({ items: [], nextPageToken: null });
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listDocuments }),
    });
    await request(app).get('/stores/myStore/documents?pageSize=10&pageToken=tok123');
    expect(listDocuments).toHaveBeenCalledWith('myStore', { pageSize: 10, pageToken: 'tok123' });
  });

  it('decodes URL-encoded store name', async () => {
    const listDocuments = vi.fn().mockResolvedValue({ items: [], nextPageToken: null });
    const app = buildApp({
      config: makeConfig(),
      backendFactory: () => stubBackend({ listDocuments }),
    });
    await request(app).get('/stores/fileSearchStores%2Fabc/documents');
    expect(listDocuments).toHaveBeenCalledWith(
      'fileSearchStores/abc',
      expect.objectContaining({ pageSize: expect.any(Number) }),
    );
  });
});

// ---------------------------------------------------------------------------
// Profile selection
// ---------------------------------------------------------------------------

describe('profile selection (X-Gemini-Nav-Profile header / ?profile= query)', () => {
  it('uses X-Gemini-Nav-Profile header when provided', async () => {
    let capturedProfile: string | undefined;
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend();
      },
    });
    await request(app).get('/stores').set('X-Gemini-Nav-Profile', 'my-profile');
    expect(capturedProfile).toBe('my-profile');
  });

  it('uses ?profile= query param when header is absent', async () => {
    let capturedProfile: string | undefined;
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend();
      },
    });
    await request(app).get('/stores?profile=query-profile');
    expect(capturedProfile).toBe('query-profile');
  });

  it('header takes precedence over ?profile= query param', async () => {
    let capturedProfile: string | undefined;
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend();
      },
    });
    await request(app)
      .get('/stores?profile=query-profile')
      .set('X-Gemini-Nav-Profile', 'header-profile');
    expect(capturedProfile).toBe('header-profile');
  });

  it('falls back to config.geminiProfile when neither header nor query is present', async () => {
    let capturedProfile: string | undefined;
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'configured-default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend();
      },
    });
    await request(app).get('/stores');
    expect(capturedProfile).toBe('configured-default');
  });

  it('ignores a blank (whitespace-only) header and uses config default', async () => {
    let capturedProfile: string | undefined;
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'configured-default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend();
      },
    });
    await request(app).get('/stores').set('X-Gemini-Nav-Profile', '   ');
    expect(capturedProfile).toBe('configured-default');
  });

  it('ignores a blank ?profile= and uses config default', async () => {
    let capturedProfile: string | undefined;
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'configured-default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend();
      },
    });
    await request(app).get('/stores?profile=   ');
    expect(capturedProfile).toBe('configured-default');
  });

  it('profile selection works on document routes too', async () => {
    let capturedProfile: string | undefined;
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend();
      },
    });
    await request(app)
      .get('/stores/s1/documents')
      .set('X-Gemini-Nav-Profile', 'doc-profile');
    expect(capturedProfile).toBe('doc-profile');
  });

  it('profile selection works on query route too', async () => {
    let capturedProfile: string | undefined;
    const query = vi.fn().mockResolvedValue({ answer: 'ok', sources: [], citations: [] });
    const app = buildApp({
      config: makeConfig({ geminiProfile: 'default' }),
      backendFactory: (profile) => {
        capturedProfile = profile;
        return stubBackend({ query });
      },
    });
    await request(app)
      .post('/stores/s1/query')
      .set('X-Gemini-Nav-Profile', 'query-route-profile')
      .send({ prompt: 'hi' });
    expect(capturedProfile).toBe('query-route-profile');
  });
});
