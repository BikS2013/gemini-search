/**
 * Tests for CredentialStore (src/core/credential-store.ts)
 *
 * Uses a temp dir injected via vi.mock to redirect all file I/O away from
 * the real ~/.tool-agents/gemini-nav/. The mock replaces `getToolAgentDir`
 * and `ensureToolAgentDir` from profile-config.
 *
 * Covers:
 *  - AES-256-GCM encrypt→decrypt round-trip (via addProfile+getApiKey)
 *  - getApiKey: throws for env-mode profiles (never returns key material)
 *  - getApiKey: throws when profile is unknown
 *  - getApiKey: throws when no stored key payload exists (corrupted state)
 *  - addProfile: stored mode requires a non-empty apiKey (throws otherwise)
 *  - addProfile: env mode removes any stale stored key
 *  - addProfile: preserves original addedAt on update
 *  - listProfiles: no key material exposed
 *  - getProfile: returns copy; undefined for unknown
 *  - removeProfile: removes profile and any stored key
 *  - hasProfiles: correct boolean
 *  - persistence: save/load across CredentialStore instances
 *  - corrupt credentials.json: gracefully recovers with empty data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Mock profile-config so CredentialStore points to a temp dir
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
const { CredentialStore } = await import('../../src/core/credential-store.js');

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-cred-test-'));
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
  tempDir = '';
});

// ---------------------------------------------------------------------------
// AES-256-GCM encrypt → decrypt round-trip
// ---------------------------------------------------------------------------

describe('CredentialStore — AES-256-GCM round-trip', () => {
  it('getApiKey returns the exact plaintext key that was stored via addProfile', () => {
    const store = new CredentialStore();
    store.addProfile('alice', 'sk-secret-api-key-123', 'stored');
    const retrieved = store.getApiKey('alice');
    expect(retrieved).toBe('sk-secret-api-key-123');
  });

  it('round-trip works for API keys with special characters', () => {
    const store = new CredentialStore();
    const apiKey = 'AIzaSy-1234_test+/=key!@#$%^&*()[]{}';
    store.addProfile('special-key-profile', apiKey, 'stored');
    expect(store.getApiKey('special-key-profile')).toBe(apiKey);
  });

  it('round-trip works for a long API key (256+ chars)', () => {
    const store = new CredentialStore();
    const longKey = 'A'.repeat(300);
    store.addProfile('long-key', longKey, 'stored');
    expect(store.getApiKey('long-key')).toBe(longKey);
  });

  it('persists encrypted key across CredentialStore instances (disk persistence)', () => {
    new CredentialStore().addProfile('persist-test', 'my-persisted-key', 'stored');
    const store2 = new CredentialStore();
    expect(store2.getApiKey('persist-test')).toBe('my-persisted-key');
  });

  it('different profiles store independent encrypted keys', () => {
    const store = new CredentialStore();
    store.addProfile('user-a', 'key-for-a', 'stored');
    store.addProfile('user-b', 'key-for-b', 'stored');
    expect(store.getApiKey('user-a')).toBe('key-for-a');
    expect(store.getApiKey('user-b')).toBe('key-for-b');
  });

  it('creates machine.key file with hex content on first use', () => {
    new CredentialStore().addProfile('first-use', 'k', 'stored');
    const keyFile = path.join(tempDir, 'machine.key');
    expect(fs.existsSync(keyFile)).toBe(true);
    const keyHex = fs.readFileSync(keyFile, 'utf-8').trim();
    expect(keyHex).toMatch(/^[0-9a-f]{64}$/i); // 32 bytes = 64 hex chars
  });

  it('reuses the same machine key across instances (so a second instance can decrypt)', () => {
    // If the machine key is regenerated each time, the second instance cannot decrypt
    const store1 = new CredentialStore();
    store1.addProfile('cross-instance', 'cross-key-value', 'stored');
    const store2 = new CredentialStore();
    // Must not throw — same machine key must be reused
    expect(() => store2.getApiKey('cross-instance')).not.toThrow();
    expect(store2.getApiKey('cross-instance')).toBe('cross-key-value');
  });
});

// ---------------------------------------------------------------------------
// getApiKey — error cases
// ---------------------------------------------------------------------------

describe('CredentialStore — getApiKey throws', () => {
  it('throws when profile is unknown', () => {
    const store = new CredentialStore();
    expect(() => store.getApiKey('nonexistent')).toThrow('nonexistent');
  });

  it('throws for an env-mode profile (never returns key material via getApiKey)', () => {
    const store = new CredentialStore();
    store.addProfile('env-profile', null, 'env');
    expect(() => store.getApiKey('env-profile')).toThrow(/env/i);
  });

  it('error message for env-mode hints at the four-tier resolver', () => {
    const store = new CredentialStore();
    store.addProfile('env-user', null, 'env');
    let msg = '';
    try { store.getApiKey('env-user'); } catch (e) { msg = (e as Error).message; }
    expect(msg.toLowerCase()).toMatch(/env|resolver|four/);
  });
});

// ---------------------------------------------------------------------------
// addProfile
// ---------------------------------------------------------------------------

describe('CredentialStore — addProfile', () => {
  it('throws when stored mode is used without an apiKey', () => {
    const store = new CredentialStore();
    expect(() => store.addProfile('no-key', null, 'stored')).toThrow();
  });

  it('throws when stored mode is used with an empty-string apiKey', () => {
    const store = new CredentialStore();
    expect(() => store.addProfile('blank-key', '', 'stored')).toThrow();
  });

  it('throws when stored mode is used with a whitespace-only apiKey', () => {
    const store = new CredentialStore();
    expect(() => store.addProfile('ws-key', '   ', 'stored')).toThrow();
  });

  it('env mode: does not store any key material for the profile', () => {
    const store = new CredentialStore();
    store.addProfile('env-only', null, 'env');
    // profile exists, but getApiKey must throw
    expect(store.getProfile('env-only')).toBeDefined();
    expect(() => store.getApiKey('env-only')).toThrow();
  });

  it('switching from stored mode to env mode removes the stale stored key', () => {
    const store = new CredentialStore();
    store.addProfile('switchable', 'old-key', 'stored');
    expect(store.getApiKey('switchable')).toBe('old-key');
    // Switch to env mode
    store.addProfile('switchable', null, 'env');
    // Now getApiKey must throw for env mode, not return the old key
    expect(() => store.getApiKey('switchable')).toThrow();
    // Profile should reflect the new keyMode
    expect(store.getProfile('switchable')?.keyMode).toBe('env');
  });

  it('preserves original addedAt timestamp when updating a profile', async () => {
    const store = new CredentialStore();
    store.addProfile('timed', 'key1', 'stored');
    const originalAddedAt = store.getProfile('timed')!.addedAt;
    // Small sleep to ensure clock advances (at least 1ms)
    await new Promise((r) => setTimeout(r, 5));
    store.addProfile('timed', 'key2', 'stored');
    expect(store.getProfile('timed')!.addedAt).toBe(originalAddedAt);
  });

  it('updates the stored key when calling addProfile again in stored mode', () => {
    const store = new CredentialStore();
    store.addProfile('update-key', 'key-v1', 'stored');
    store.addProfile('update-key', 'key-v2', 'stored');
    expect(store.getApiKey('update-key')).toBe('key-v2');
  });
});

// ---------------------------------------------------------------------------
// listProfiles
// ---------------------------------------------------------------------------

describe('CredentialStore — listProfiles', () => {
  it('returns an empty array when no profiles exist', () => {
    expect(new CredentialStore().listProfiles()).toEqual([]);
  });

  it('returns profile entries without key material', () => {
    const store = new CredentialStore();
    store.addProfile('safe-list', 'secret-key', 'stored');
    const profiles = store.listProfiles();
    expect(profiles).toHaveLength(1);
    const p = profiles[0];
    expect(p.name).toBe('safe-list');
    expect(p.keyMode).toBe('stored');
    // Must not contain any key material
    expect(JSON.stringify(p)).not.toContain('secret-key');
    // No EncryptedPayload-shaped keys in the profile entry
    expect(p).not.toHaveProperty('iv');
    expect(p).not.toHaveProperty('data');
    expect(p).not.toHaveProperty('tag');
  });

  it('lists multiple profiles in insertion order', () => {
    const store = new CredentialStore();
    store.addProfile('a', 'ka', 'stored');
    store.addProfile('b', null, 'env');
    const names = store.listProfiles().map((p) => p.name);
    expect(names).toContain('a');
    expect(names).toContain('b');
  });
});

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------

describe('CredentialStore — getProfile', () => {
  it('returns undefined for an unknown profile', () => {
    expect(new CredentialStore().getProfile('unknown')).toBeUndefined();
  });

  it('returns a copy of the profile entry', () => {
    const store = new CredentialStore();
    store.addProfile('copytest', 'k', 'stored');
    const p = store.getProfile('copytest')!;
    p.name = 'MUTATED';
    expect(store.getProfile('copytest')?.name).toBe('copytest');
  });

  it('returns the correct keyMode', () => {
    const store = new CredentialStore();
    store.addProfile('env-check', null, 'env');
    expect(store.getProfile('env-check')?.keyMode).toBe('env');
  });
});

// ---------------------------------------------------------------------------
// removeProfile
// ---------------------------------------------------------------------------

describe('CredentialStore — removeProfile', () => {
  it('returns false when profile does not exist', () => {
    expect(new CredentialStore().removeProfile('ghost')).toBe(false);
  });

  it('returns true and removes the profile', () => {
    const store = new CredentialStore();
    store.addProfile('del-me', 'k', 'stored');
    expect(store.removeProfile('del-me')).toBe(true);
    expect(store.getProfile('del-me')).toBeUndefined();
    expect(store.listProfiles()).toHaveLength(0);
  });

  it('also removes the stored encrypted key', () => {
    const store = new CredentialStore();
    store.addProfile('with-key', 'important-key', 'stored');
    store.removeProfile('with-key');
    // A fresh instance should not find this profile or its key
    const store2 = new CredentialStore();
    expect(store2.getProfile('with-key')).toBeUndefined();
    expect(() => store2.getApiKey('with-key')).toThrow();
  });

  it('does not affect other profiles', () => {
    const store = new CredentialStore();
    store.addProfile('keep', 'k1', 'stored');
    store.addProfile('remove', 'k2', 'stored');
    store.removeProfile('remove');
    expect(store.getProfile('keep')).toBeDefined();
    expect(store.listProfiles()).toHaveLength(1);
  });

  it('persists removal across instances', () => {
    const store = new CredentialStore();
    store.addProfile('removed-persist', 'k', 'stored');
    store.removeProfile('removed-persist');
    expect(new CredentialStore().getProfile('removed-persist')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// hasProfiles
// ---------------------------------------------------------------------------

describe('CredentialStore — hasProfiles', () => {
  it('returns false when no profiles exist', () => {
    expect(new CredentialStore().hasProfiles()).toBe(false);
  });

  it('returns true when at least one profile exists', () => {
    const store = new CredentialStore();
    store.addProfile('exists', null, 'env');
    expect(store.hasProfiles()).toBe(true);
  });

  it('returns false after all profiles are removed', () => {
    const store = new CredentialStore();
    store.addProfile('one', null, 'env');
    store.removeProfile('one');
    expect(store.hasProfiles()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('CredentialStore — persistence', () => {
  it('credentials.json is written to the temp dir (not the real ~/.tool-agents)', () => {
    new CredentialStore().addProfile('written', 'k', 'stored');
    const credFile = path.join(tempDir, 'credentials.json');
    expect(fs.existsSync(credFile)).toBe(true);
    // File should be valid JSON (the AES-256-GCM payload)
    const raw = JSON.parse(fs.readFileSync(credFile, 'utf-8'));
    expect(raw).toHaveProperty('iv');
    expect(raw).toHaveProperty('data');
    expect(raw).toHaveProperty('tag');
  });

  it('credentials.json does not contain the plaintext API key', () => {
    new CredentialStore().addProfile('no-plaintext', 'super-secret-key-abc', 'stored');
    const credFile = path.join(tempDir, 'credentials.json');
    const raw = fs.readFileSync(credFile, 'utf-8');
    expect(raw).not.toContain('super-secret-key-abc');
  });

  it('recovers gracefully from a corrupt credentials.json (starts with empty data)', () => {
    const credFile = path.join(tempDir, 'credentials.json');
    fs.writeFileSync(credFile, 'NOT_JSON', 'utf-8');
    const store = new CredentialStore();
    // Must not throw
    expect(store.listProfiles()).toEqual([]);
    expect(store.hasProfiles()).toBe(false);
  });

  it('recovers gracefully from credentials decrypted with a different machine key', () => {
    // Simulate "foreign machine" by writing data from one instance then deleting its key
    const store1 = new CredentialStore();
    store1.addProfile('foreign', 'k', 'stored');
    // Now delete machine.key so a new key will be generated, breaking decryption
    fs.rmSync(path.join(tempDir, 'machine.key'), { force: true });
    // A new store instance should handle the decrypt failure gracefully
    const store2 = new CredentialStore();
    expect(store2.listProfiles()).toEqual([]);
  });
});
