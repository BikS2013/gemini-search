/**
 * Tests for src/electron/registry-service.ts
 *
 * Mocks the `Registry` class so no real disk I/O touches the live
 * ~/.tool-agents/gemini-nav/registry.json. Uses a mock backend for
 * `registryRefresh` pagination tests.
 *
 * Covers:
 *  - registryList: delegates to Registry().list()
 *  - registryRefresh: paginates listStores fully, calls reconcile, returns list
 *  - registryRefresh: single-page (no nextPageToken) scenario
 *  - registryRefresh: multi-page pagination (follows nextPageToken until null)
 *  - registryPrune: delegates to Registry().remove(), returns its boolean
 *  - registryPrune: returns true when entry found and removed
 *  - registryPrune: returns false when entry not found
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IGeminiBackend } from '../../src/core/backend/backend.js';
import type { RegistryEntry, StoreInfo } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Registry mock state (controlled per test)
// ---------------------------------------------------------------------------

const mockRegistryList = vi.fn<[], RegistryEntry[]>();
const mockRegistryReconcile = vi.fn<[string, StoreInfo[]], void>();
const mockRegistryRemove = vi.fn<[string], boolean>();
const mockRegistryUpsert = vi.fn();

vi.mock('../../src/core/registry.js', () => ({
  Registry: class {
    list() { return mockRegistryList(); }
    reconcile(profile: string, stores: StoreInfo[]) { return mockRegistryReconcile(profile, stores); }
    remove(apiName: string) { return mockRegistryRemove(apiName); }
    upsert(entry: unknown) { return mockRegistryUpsert(entry); }
  },
}));

// ---------------------------------------------------------------------------
// Mock backend factory
// ---------------------------------------------------------------------------

function makeMockBackend(pages: Array<{
  items: Partial<StoreInfo>[];
  nextPageToken: string | null;
}>): IGeminiBackend {
  let callCount = 0;
  return {
    listStores: vi.fn(async () => {
      const page = pages[callCount % pages.length];
      callCount++;
      return page;
    }),
    getStore: vi.fn(),
    createStore: vi.fn(),
    deleteStore: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    replaceDocument: vi.fn(),
    query: vi.fn(),
  } as IGeminiBackend;
}

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { registryList, registryRefresh, registryPrune } from '../../src/electron/registry-service.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockRegistryList.mockReturnValue([]);
  mockRegistryReconcile.mockReturnValue(undefined);
  mockRegistryRemove.mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// registryList
// ---------------------------------------------------------------------------

describe('registryList()', () => {
  it('returns an empty array when Registry.list() returns []', () => {
    mockRegistryList.mockReturnValue([]);
    const result = registryList();
    expect(result).toEqual([]);
  });

  it('delegates to Registry().list() and returns all entries', () => {
    const entries: RegistryEntry[] = [
      {
        apiName: 'fileSearchStores/a',
        profile: 'default',
        lastRefreshedAt: '2026-06-20T00:00:00Z',
      },
      {
        apiName: 'fileSearchStores/b',
        profile: 'default',
        lastRefreshedAt: '2026-06-21T00:00:00Z',
      },
    ];
    mockRegistryList.mockReturnValue(entries);
    const result = registryList();
    expect(result).toEqual(entries);
  });

  it('calls Registry().list() exactly once', () => {
    registryList();
    expect(mockRegistryList).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// registryRefresh — single page
// ---------------------------------------------------------------------------

describe('registryRefresh() — single page (no nextPageToken)', () => {
  it('calls backend.listStores once when nextPageToken is null', async () => {
    const stores: Partial<StoreInfo>[] = [
      { apiName: 'fileSearchStores/s1', displayName: 'Store 1' },
    ];
    const backend = makeMockBackend([{ items: stores as StoreInfo[], nextPageToken: null }]);
    mockRegistryList.mockReturnValue([
      { apiName: 'fileSearchStores/s1', profile: 'default', lastRefreshedAt: new Date().toISOString() },
    ]);
    const result = await registryRefresh('default', backend);
    expect(backend.listStores).toHaveBeenCalledTimes(1);
    expect(result).toBeDefined();
  });

  it('calls reconcile with the profile name and live stores', async () => {
    const stores: StoreInfo[] = [
      {
        apiName: 'fileSearchStores/s1',
        displayName: 'S1',
        activeDocumentsCount: 3,
        pendingDocumentsCount: 0,
        failedDocumentsCount: 0,
        documentCount: 3,
        sizeBytes: 1000,
        createTime: '2026-01-01T00:00:00Z',
        updateTime: '2026-06-01T00:00:00Z',
      },
    ];
    const backend = makeMockBackend([{ items: stores, nextPageToken: null }]);
    await registryRefresh('my-profile', backend);
    expect(mockRegistryReconcile).toHaveBeenCalledWith('my-profile', stores);
  });

  it('returns the result of Registry().list() after reconcile', async () => {
    const backend = makeMockBackend([{ items: [], nextPageToken: null }]);
    const expectedEntries: RegistryEntry[] = [
      { apiName: 'fileSearchStores/x', profile: 'p', lastRefreshedAt: '2026-06-22T00:00:00Z' },
    ];
    mockRegistryList.mockReturnValue(expectedEntries);
    const result = await registryRefresh('p', backend);
    expect(result).toEqual(expectedEntries);
  });

  it('calls listStores with no options on the first call', async () => {
    const backend = makeMockBackend([{ items: [], nextPageToken: null }]);
    await registryRefresh('default', backend);
    // First call should not pass a pageToken
    expect(backend.listStores).toHaveBeenCalledWith(undefined);
  });
});

// ---------------------------------------------------------------------------
// registryRefresh — multi-page pagination
// ---------------------------------------------------------------------------

describe('registryRefresh() — multi-page pagination', () => {
  it('follows nextPageToken until null', async () => {
    const page1: StoreInfo[] = [{ apiName: 'fileSearchStores/p1' } as StoreInfo];
    const page2: StoreInfo[] = [{ apiName: 'fileSearchStores/p2' } as StoreInfo];

    // Simulate two pages
    let callCount = 0;
    const backend: IGeminiBackend = {
      listStores: vi.fn(async (opts?: { pageSize?: number; pageToken?: string }) => {
        callCount++;
        if (callCount === 1) return { items: page1, nextPageToken: 'token-page-2' };
        return { items: page2, nextPageToken: null };
      }),
      getStore: vi.fn(),
      createStore: vi.fn(),
      deleteStore: vi.fn(),
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      uploadDocument: vi.fn(),
      deleteDocument: vi.fn(),
      replaceDocument: vi.fn(),
      query: vi.fn(),
    } as IGeminiBackend;

    await registryRefresh('default', backend);
    expect(backend.listStores).toHaveBeenCalledTimes(2);
  });

  it('passes pageToken on subsequent calls', async () => {
    let callCount = 0;
    const listStores = vi.fn(async (opts?: { pageToken?: string }) => {
      callCount++;
      if (callCount === 1) return { items: [], nextPageToken: 'next-tok' };
      return { items: [], nextPageToken: null };
    });
    const backend = { listStores } as unknown as IGeminiBackend;

    await registryRefresh('default', backend);
    // Second call should carry the pageToken
    expect(listStores).toHaveBeenNthCalledWith(2, { pageToken: 'next-tok' });
  });

  it('accumulates all pages before calling reconcile', async () => {
    const store1 = { apiName: 'fileSearchStores/a' } as StoreInfo;
    const store2 = { apiName: 'fileSearchStores/b' } as StoreInfo;
    const store3 = { apiName: 'fileSearchStores/c' } as StoreInfo;

    let callCount = 0;
    const backend: IGeminiBackend = {
      listStores: vi.fn(async () => {
        callCount++;
        if (callCount === 1) return { items: [store1], nextPageToken: 'tok1' };
        if (callCount === 2) return { items: [store2], nextPageToken: 'tok2' };
        return { items: [store3], nextPageToken: null };
      }),
      getStore: vi.fn(),
      createStore: vi.fn(),
      deleteStore: vi.fn(),
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      uploadDocument: vi.fn(),
      deleteDocument: vi.fn(),
      replaceDocument: vi.fn(),
      query: vi.fn(),
    } as IGeminiBackend;

    await registryRefresh('default', backend);
    // reconcile should receive ALL three stores from all pages
    expect(mockRegistryReconcile).toHaveBeenCalledWith(
      'default',
      [store1, store2, store3],
    );
  });

  it('handles three pages correctly', async () => {
    let callCount = 0;
    const backend: IGeminiBackend = {
      listStores: vi.fn(async () => {
        callCount++;
        if (callCount < 3) return { items: [], nextPageToken: `tok${callCount}` };
        return { items: [], nextPageToken: null };
      }),
      getStore: vi.fn(),
      createStore: vi.fn(),
      deleteStore: vi.fn(),
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      uploadDocument: vi.fn(),
      deleteDocument: vi.fn(),
      replaceDocument: vi.fn(),
      query: vi.fn(),
    } as IGeminiBackend;

    await registryRefresh('default', backend);
    expect(backend.listStores).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// registryPrune
// ---------------------------------------------------------------------------

describe('registryPrune()', () => {
  it('returns true when Registry.remove() returns true (entry found and removed)', () => {
    mockRegistryRemove.mockReturnValue(true);
    const result = registryPrune('fileSearchStores/s1');
    expect(result).toBe(true);
  });

  it('returns false when Registry.remove() returns false (entry not found)', () => {
    mockRegistryRemove.mockReturnValue(false);
    const result = registryPrune('fileSearchStores/nonexistent');
    expect(result).toBe(false);
  });

  it('delegates to Registry().remove() with the apiName', () => {
    mockRegistryRemove.mockReturnValue(true);
    registryPrune('fileSearchStores/target');
    expect(mockRegistryRemove).toHaveBeenCalledWith('fileSearchStores/target');
  });

  it('calls Registry().remove() exactly once per call', () => {
    mockRegistryRemove.mockReturnValue(false);
    registryPrune('fileSearchStores/x');
    expect(mockRegistryRemove).toHaveBeenCalledTimes(1);
  });

  it('does NOT call reconcile or list on prune', () => {
    mockRegistryRemove.mockReturnValue(true);
    registryPrune('fileSearchStores/x');
    expect(mockRegistryReconcile).not.toHaveBeenCalled();
    expect(mockRegistryList).not.toHaveBeenCalled();
  });
});
