/**
 * Tests for Registry (src/core/registry.ts)
 *
 * Uses a temp dir injected via vi.mock to redirect all file I/O away from
 * the real ~/.tool-agents/gemini-nav/. The mock replaces `getToolAgentDir`
 * and `ensureToolAgentDir` with functions that point to an os.tmpdir()-based
 * temp directory that is created/deleted per test.
 *
 * Covers:
 *  - list: returns copies of all entries
 *  - get: returns a copy of a found entry or undefined
 *  - upsert: insert new + replace existing keyed by apiName
 *  - remove: deletes an entry and returns true; returns false when not found
 *  - reconcile: upsert live stores into cache, stamp lastRefreshedAt, leave absent entries
 *  - persistence: save/load across Registry instance construction
 *  - corrupt registry.json: gracefully recovers with empty cache
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { RegistryEntry, StoreInfo } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Mock profile-config so Registry points to a temp dir
// ---------------------------------------------------------------------------

let tempDir = '';

vi.mock('../../src/config/profile-config.js', () => ({
  getToolAgentDir: () => tempDir,
  ensureToolAgentDir: () => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
  },
}));

// Import AFTER the mock is set up
const { Registry } = await import('../../src/core/registry.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<RegistryEntry> = {}): RegistryEntry {
  return {
    apiName: 'fileSearchStores/abc',
    profile: 'default',
    lastRefreshedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-registry-test-'));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  tempDir = '';
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe('Registry — list', () => {
  it('returns an empty array when no registry file exists', () => {
    const reg = new Registry();
    expect(reg.list()).toEqual([]);
  });

  it('returns all entries after upserts', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/a' }));
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/b' }));
    expect(reg.list()).toHaveLength(2);
  });

  it('returns copies — mutation of the returned array does not affect the registry', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/a' }));
    const items = reg.list();
    items[0].displayName = 'MUTATED';
    // The internal state should not be mutated
    expect(reg.get('fileSearchStores/a')?.displayName).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------

describe('Registry — get', () => {
  it('returns undefined when the apiName is not found', () => {
    const reg = new Registry();
    expect(reg.get('fileSearchStores/nonexistent')).toBeUndefined();
  });

  it('returns a matching entry', () => {
    const reg = new Registry();
    const entry = makeEntry({ apiName: 'fileSearchStores/x', displayName: 'X Store' });
    reg.upsert(entry);
    const found = reg.get('fileSearchStores/x');
    expect(found?.apiName).toBe('fileSearchStores/x');
    expect(found?.displayName).toBe('X Store');
  });

  it('returns a copy — mutation does not affect the registry', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/y', displayName: 'Y' }));
    const found = reg.get('fileSearchStores/y')!;
    found.displayName = 'CHANGED';
    expect(reg.get('fileSearchStores/y')?.displayName).toBe('Y');
  });
});

// ---------------------------------------------------------------------------
// upsert
// ---------------------------------------------------------------------------

describe('Registry — upsert', () => {
  it('inserts a new entry when apiName is not present', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/new' }));
    expect(reg.get('fileSearchStores/new')).toBeDefined();
  });

  it('replaces an existing entry with the same apiName', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/a', displayName: 'Old Name' }));
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/a', displayName: 'New Name' }));
    expect(reg.get('fileSearchStores/a')?.displayName).toBe('New Name');
    // No duplicate — still exactly one entry
    expect(reg.list()).toHaveLength(1);
  });

  it('persists to disk so a new Registry instance sees the entry', () => {
    const entry = makeEntry({ apiName: 'fileSearchStores/persist', displayName: 'Persist Me' });
    new Registry().upsert(entry);
    // New instance reads the same temp dir
    const reg2 = new Registry();
    expect(reg2.get('fileSearchStores/persist')?.displayName).toBe('Persist Me');
  });

  it('stores a copy — subsequent mutation of the original entry does not affect the stored one', () => {
    const reg = new Registry();
    const entry = makeEntry({ apiName: 'fileSearchStores/copy', displayName: 'Original' });
    reg.upsert(entry);
    entry.displayName = 'Mutated After Upsert';
    expect(reg.get('fileSearchStores/copy')?.displayName).toBe('Original');
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe('Registry — remove', () => {
  it('returns false and does nothing when apiName not found', () => {
    const reg = new Registry();
    expect(reg.remove('fileSearchStores/nonexistent')).toBe(false);
  });

  it('removes an entry and returns true', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/del' }));
    const result = reg.remove('fileSearchStores/del');
    expect(result).toBe(true);
    expect(reg.get('fileSearchStores/del')).toBeUndefined();
    expect(reg.list()).toHaveLength(0);
  });

  it('does not remove unrelated entries', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/keep' }));
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/del' }));
    reg.remove('fileSearchStores/del');
    expect(reg.get('fileSearchStores/keep')).toBeDefined();
    expect(reg.list()).toHaveLength(1);
  });

  it('persists the removal so a new instance does not see the removed entry', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/gone' }));
    reg.remove('fileSearchStores/gone');
    const reg2 = new Registry();
    expect(reg2.get('fileSearchStores/gone')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// reconcile
// ---------------------------------------------------------------------------

describe('Registry — reconcile', () => {
  it('inserts new live stores into the cache', () => {
    const reg = new Registry();
    const liveStores: StoreInfo[] = [
      {
        apiName: 'fileSearchStores/live1',
        displayName: 'Live Store 1',
        activeDocumentsCount: 5,
        pendingDocumentsCount: 0,
        failedDocumentsCount: 0,
        documentCount: 5,
        sizeBytes: 12345,
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-06-01T00:00:00Z',
      },
    ];
    reg.reconcile('default', liveStores);
    const entry = reg.get('fileSearchStores/live1');
    expect(entry).toBeDefined();
    expect(entry?.displayName).toBe('Live Store 1');
    expect(entry?.profile).toBe('default');
    expect(entry?.activeDocumentsCount).toBe(5);
    expect(entry?.sizeBytes).toBe(12345);
    expect(entry?.lastRefreshedAt).toMatch(/^\d{4}-/); // ISO 8601
  });

  it('updates an existing entry when a live store matches', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({
      apiName: 'fileSearchStores/s1',
      displayName: 'Old Name',
      activeDocumentsCount: 0,
    }));
    const liveStores: StoreInfo[] = [
      {
        apiName: 'fileSearchStores/s1',
        displayName: 'Updated Name',
        activeDocumentsCount: 10,
      },
    ];
    reg.reconcile('default', liveStores);
    const entry = reg.get('fileSearchStores/s1');
    expect(entry?.displayName).toBe('Updated Name');
    expect(entry?.activeDocumentsCount).toBe(10);
  });

  it('leaves entries NOT in the live list in place (stale, not pruned)', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/stale', displayName: 'Stale' }));
    // Reconcile with a different store — stale must survive
    reg.reconcile('default', [{ apiName: 'fileSearchStores/new' }]);
    expect(reg.get('fileSearchStores/stale')).toBeDefined();
    expect(reg.list()).toHaveLength(2);
  });

  it('stamps lastRefreshedAt close to now (within 5 seconds)', () => {
    const before = Date.now();
    const reg = new Registry();
    reg.reconcile('myprofile', [{ apiName: 'fileSearchStores/ts' }]);
    const after = Date.now();
    const entry = reg.get('fileSearchStores/ts')!;
    const ts = new Date(entry.lastRefreshedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after + 1000); // small buffer for test overhead
  });

  it('stamps the correct profile on reconciled entries', () => {
    const reg = new Registry();
    reg.reconcile('team-profile', [{ apiName: 'fileSearchStores/p1' }]);
    expect(reg.get('fileSearchStores/p1')?.profile).toBe('team-profile');
  });

  it('persists reconcile results so a new instance sees them', () => {
    new Registry().reconcile('default', [{ apiName: 'fileSearchStores/persist' }]);
    expect(new Registry().get('fileSearchStores/persist')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Persistence / load
// ---------------------------------------------------------------------------

describe('Registry — persistence', () => {
  it('writes a valid JSON file to the temp dir', () => {
    const reg = new Registry();
    reg.upsert(makeEntry({ apiName: 'fileSearchStores/file-check' }));
    const registryFile = path.join(tempDir, 'registry.json');
    expect(fs.existsSync(registryFile)).toBe(true);
    const raw = fs.readFileSync(registryFile, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0].apiName).toBe('fileSearchStores/file-check');
  });

  it('recovers gracefully from a corrupt registry.json (starts with empty cache)', () => {
    const registryFile = path.join(tempDir, 'registry.json');
    fs.writeFileSync(registryFile, 'NOT_VALID_JSON', 'utf-8');
    const reg = new Registry();
    // Should not throw, should return empty list
    expect(reg.list()).toEqual([]);
  });

  it('handles a registry.json with missing entries field (treats as empty)', () => {
    const registryFile = path.join(tempDir, 'registry.json');
    fs.writeFileSync(registryFile, JSON.stringify({ someOtherField: true }), 'utf-8');
    const reg = new Registry();
    expect(reg.list()).toEqual([]);
  });
});
