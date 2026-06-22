/**
 * Tests for src/electron/profile-state.ts
 *
 * Mocks `CredentialStore` and `makeBackend` so no real disk I/O or Gemini
 * API calls are made. Tests the singleton's state machine:
 *
 *  - getActiveProfile() returns null when no profile has been selected
 *  - getBackend() throws ConfigurationError when no profile is selected
 *  - selectProfile() throws ConfigurationError when the profile does not exist
 *  - selectProfile() sets the active profile and builds a new backend
 *  - getActiveProfile() returns the name of the last selected profile
 *  - getBackend() returns the backend built by the most recent selectProfile()
 *  - listProfileSummaries() returns name+keyMode only (no key material)
 *
 * NOTE: Because profile-state.ts uses module-level mutable variables, test
 * isolation requires resetting them via a second vi.mock call that clears the
 * module registry, OR by structuring tests so state is predictable. We use
 * vi.resetModules() + dynamic import inside each test to guarantee isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IGeminiBackend } from '../../src/core/backend/backend.js';

/**
 * NOTE: We cannot import ConfigurationError and use `instanceof` here because
 * vi.resetModules() causes a fresh module graph on each dynamic import, which
 * means the ConfigurationError class in the test file and the one used by
 * profile-state.ts are different objects. We test the error type by checking
 * the class name and the shape of the error instead.
 */
function isConfigurationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'ConfigurationError'
  );
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

/** Build a minimal IGeminiBackend stub. */
function makeMockBackend(id = 'mock-backend'): IGeminiBackend & { _id: string } {
  return {
    _id: id,
    listStores: vi.fn(),
    getStore: vi.fn(),
    createStore: vi.fn(),
    deleteStore: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    replaceDocument: vi.fn(),
    query: vi.fn(),
  };
}

/** A minimal ProfileEntry shape (matches what CredentialStore.listProfiles / getProfile returns). */
function makeProfileEntry(name: string, keyMode: 'stored' | 'env' = 'stored') {
  return { name, keyMode } as { name: string; keyMode: 'stored' | 'env' };
}

// ---------------------------------------------------------------------------
// Module-scoped mock stubs (replaced per-test via vi.mocked assignments)
// ---------------------------------------------------------------------------

const mockListProfiles = vi.fn();
const mockGetProfile = vi.fn();
const mockGetApiKey = vi.fn();
const mockMakeBackend = vi.fn();

// We mock CredentialStore as a class whose constructor returns the mock methods.
vi.mock('../../src/core/credential-store.js', () => ({
  CredentialStore: class {
    listProfiles() { return mockListProfiles(); }
    getProfile(name: string) { return mockGetProfile(name); }
    getApiKey(name: string) { return mockGetApiKey(name); }
  },
}));

vi.mock('../../src/core/backend/factory.js', () => ({
  makeBackend: (...args: unknown[]) => mockMakeBackend(...args),
}));

// ---------------------------------------------------------------------------
// Reset module state between tests by resetting modules + re-importing.
// This avoids the singleton's module-level variables bleeding across tests.
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helper — fresh import of profile-state after module reset
// ---------------------------------------------------------------------------

async function importProfileState() {
  return import('../../src/electron/profile-state.js');
}

// ---------------------------------------------------------------------------
// getActiveProfile() — initial state
// ---------------------------------------------------------------------------

describe('getActiveProfile() — initial state', () => {
  it('returns null before any profile is selected', async () => {
    const { getActiveProfile } = await importProfileState();
    expect(getActiveProfile()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getBackend() — no profile selected
// ---------------------------------------------------------------------------

describe('getBackend() — no profile selected', () => {
  it('throws when backend is null', async () => {
    const { getBackend } = await importProfileState();
    expect(() => getBackend()).toThrow();
  });

  it('throws a ConfigurationError (by name) naming the active-profile setting', async () => {
    const { getBackend } = await importProfileState();
    try {
      getBackend();
      expect.fail('should have thrown');
    } catch (err) {
      expect(isConfigurationError(err)).toBe(true);
      const ce = err as { missingSetting: string };
      expect(ce.missingSetting).toBe('active profile');
    }
  });

  it('does NOT return null or undefined — always throws when unset', async () => {
    const { getBackend } = await importProfileState();
    expect(() => getBackend()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// selectProfile() — profile not found
// ---------------------------------------------------------------------------

describe('selectProfile() — profile not found', () => {
  it('throws when CredentialStore.getProfile returns undefined', async () => {
    mockGetProfile.mockReturnValue(undefined);
    const { selectProfile } = await importProfileState();
    expect(() => selectProfile('nonexistent')).toThrow();
  });

  it('throws a ConfigurationError (by name) naming the "profile" setting', async () => {
    mockGetProfile.mockReturnValue(undefined);
    const { selectProfile } = await importProfileState();
    try {
      selectProfile('ghost');
      expect.fail('should have thrown');
    } catch (err) {
      expect(isConfigurationError(err)).toBe(true);
      const ce = err as { missingSetting: string };
      expect(ce.missingSetting).toBe('profile');
    }
  });

  it('does NOT build a backend when the profile is not found', async () => {
    mockGetProfile.mockReturnValue(undefined);
    const { selectProfile } = await importProfileState();
    try { selectProfile('ghost'); } catch { /* expected */ }
    expect(mockMakeBackend).not.toHaveBeenCalled();
  });

  it('does NOT update activeProfile when the profile is not found', async () => {
    mockGetProfile.mockReturnValue(undefined);
    const { selectProfile, getActiveProfile } = await importProfileState();
    try { selectProfile('ghost'); } catch { /* expected */ }
    expect(getActiveProfile()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// selectProfile() — profile found
// ---------------------------------------------------------------------------

describe('selectProfile() — successful selection', () => {
  it('sets the active profile name', async () => {
    mockGetProfile.mockReturnValue(makeProfileEntry('default'));
    const mockBe = makeMockBackend();
    mockMakeBackend.mockReturnValue(mockBe);
    const { selectProfile, getActiveProfile } = await importProfileState();
    selectProfile('default');
    expect(getActiveProfile()).toBe('default');
  });

  it('calls makeBackend with the profile name', async () => {
    mockGetProfile.mockReturnValue(makeProfileEntry('prod'));
    mockMakeBackend.mockReturnValue(makeMockBackend());
    const { selectProfile } = await importProfileState();
    selectProfile('prod');
    expect(mockMakeBackend).toHaveBeenCalledWith('prod');
  });

  it('getBackend() returns the backend built for the selected profile', async () => {
    mockGetProfile.mockReturnValue(makeProfileEntry('default'));
    const mockBe = makeMockBackend('be-default');
    mockMakeBackend.mockReturnValue(mockBe);
    const { selectProfile, getBackend } = await importProfileState();
    selectProfile('default');
    expect(getBackend()).toBe(mockBe);
  });

  it('switching profile rebuilds the backend', async () => {
    mockGetProfile.mockReturnValue(makeProfileEntry('p1'));
    const be1 = makeMockBackend('be-p1');
    const be2 = makeMockBackend('be-p2');
    mockMakeBackend.mockReturnValueOnce(be1).mockReturnValueOnce(be2);
    const { selectProfile, getBackend, getActiveProfile } = await importProfileState();
    selectProfile('p1');
    expect(getBackend()).toBe(be1);
    expect(getActiveProfile()).toBe('p1');

    // Now switch to p2
    mockGetProfile.mockReturnValue(makeProfileEntry('p2'));
    selectProfile('p2');
    expect(getActiveProfile()).toBe('p2');
    expect(getBackend()).toBe(be2);
    // Old backend is no longer the active one
    expect(getBackend()).not.toBe(be1);
  });

  it('selecting the same profile twice re-builds the backend (idempotent but fresh)', async () => {
    mockGetProfile.mockReturnValue(makeProfileEntry('default'));
    const be1 = makeMockBackend('be-1');
    const be2 = makeMockBackend('be-2');
    mockMakeBackend.mockReturnValueOnce(be1).mockReturnValueOnce(be2);
    const { selectProfile, getBackend } = await importProfileState();
    selectProfile('default');
    selectProfile('default');
    // On second select, makeBackend was called again
    expect(mockMakeBackend).toHaveBeenCalledTimes(2);
    expect(getBackend()).toBe(be2);
  });
});

// ---------------------------------------------------------------------------
// listProfileSummaries() — key-free output
// ---------------------------------------------------------------------------

describe('listProfileSummaries() — key-free ProfileSummary[]', () => {
  it('returns an empty array when no profiles exist', async () => {
    mockListProfiles.mockReturnValue([]);
    const { listProfileSummaries } = await importProfileState();
    expect(listProfileSummaries()).toEqual([]);
  });

  it('maps profiles to { name, keyMode } only', async () => {
    mockListProfiles.mockReturnValue([
      { name: 'default', keyMode: 'stored', encryptedKey: 'SOME_SECRET', iv: 'abc' },
      { name: 'env-profile', keyMode: 'env' },
    ]);
    const { listProfileSummaries } = await importProfileState();
    const summaries = listProfileSummaries();
    expect(summaries).toEqual([
      { name: 'default', keyMode: 'stored' },
      { name: 'env-profile', keyMode: 'env' },
    ]);
  });

  it('does NOT include apiKey / encryptedKey / secret / credential fields', async () => {
    mockListProfiles.mockReturnValue([
      { name: 'p1', keyMode: 'stored', encryptedKey: 'ENCRYPTED_SECRET', otherSecret: 'hidden' },
    ]);
    const { listProfileSummaries } = await importProfileState();
    const summaries = listProfileSummaries();
    const serialized = JSON.stringify(summaries);
    expect(serialized).not.toContain('ENCRYPTED_SECRET');
    expect(serialized).not.toContain('encryptedKey');
    expect(serialized).not.toContain('otherSecret');
    expect(serialized).not.toContain('hidden');
  });

  it('returns keyMode "stored" for stored profiles', async () => {
    mockListProfiles.mockReturnValue([{ name: 'stored-profile', keyMode: 'stored' }]);
    const { listProfileSummaries } = await importProfileState();
    const [s] = listProfileSummaries();
    expect(s.keyMode).toBe('stored');
  });

  it('returns keyMode "env" for env profiles', async () => {
    mockListProfiles.mockReturnValue([{ name: 'env-profile', keyMode: 'env' }]);
    const { listProfileSummaries } = await importProfileState();
    const [s] = listProfileSummaries();
    expect(s.keyMode).toBe('env');
  });

  it('returns multiple profiles in order', async () => {
    mockListProfiles.mockReturnValue([
      { name: 'alpha', keyMode: 'stored' },
      { name: 'beta', keyMode: 'env' },
      { name: 'gamma', keyMode: 'stored' },
    ]);
    const { listProfileSummaries } = await importProfileState();
    const names = listProfileSummaries().map((s) => s.name);
    expect(names).toEqual(['alpha', 'beta', 'gamma']);
  });
});

// ---------------------------------------------------------------------------
// config_validation: no fallback — getBackend always throws when no profile
// ---------------------------------------------------------------------------

describe('config_validation — no fallback for missing profile', () => {
  it('getBackend() throws a ConfigurationError (by name) instead of returning a default backend', async () => {
    const { getBackend } = await importProfileState();
    let threw = false;
    try {
      getBackend();
    } catch (e) {
      threw = true;
      expect(isConfigurationError(e)).toBe(true);
    }
    expect(threw).toBe(true);
  });

  it('selectProfile() throws a ConfigurationError (by name) when profile not found', async () => {
    mockGetProfile.mockReturnValue(undefined);
    const { selectProfile } = await importProfileState();
    let threw = false;
    try {
      selectProfile('does-not-exist');
    } catch (e) {
      threw = true;
      expect(isConfigurationError(e)).toBe(true);
    }
    expect(threw).toBe(true);
  });
});
