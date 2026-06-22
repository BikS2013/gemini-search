/**
 * Encrypted credential store for per-profile Gemini API keys.
 *
 * Ported from the storage-navigator reference `src/core/credential-store.ts`
 * (AES-256-GCM with a persisted machine key) and retargeted to this project:
 *   - file:  ~/.tool-agents/gemini-nav/credentials.json   (mode 0600)
 *   - key:   ~/.tool-agents/gemini-nav/machine.key         (mode 0600)
 *   - dir:   ~/.tool-agents/gemini-nav/                     (mode 0700)
 *
 * The encrypted payload holds the profile registry plus, for profiles whose
 * keyMode === 'stored', the encrypted per-profile API key.
 *
 * Project rule (FR-NFR-5): the API key is the only secret; it is never written
 * unencrypted, never logged, and never returned except via getApiKey().
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getToolAgentDir, ensureToolAgentDir } from '../config/profile-config.js';
import type {
  CredentialData,
  EncryptedPayload,
  ProfileEntry,
  ProfileKeyMode,
} from './types.js';

const ALGORITHM = 'aes-256-gcm';

function getStorePaths() {
  const dir = getToolAgentDir();
  return {
    dir,
    file: path.join(dir, 'credentials.json'),
    key: path.join(dir, 'machine.key'),
  };
}

/**
 * Derive the encryption key from a stable, persisted random machine key.
 * Generated (32 random bytes, mode 0600) on first use, mirroring the reference
 * scheme — avoids the unstable-hostname pitfall.
 */
function deriveKey(): Buffer {
  const { key: keyFile } = getStorePaths();
  ensureToolAgentDir();

  if (fs.existsSync(keyFile)) {
    return Buffer.from(fs.readFileSync(keyFile, 'utf-8').trim(), 'hex');
  }

  const key = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, key.toString('hex'), { mode: 0o600 });
  return key;
}

function encrypt(plaintext: string): EncryptedPayload {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    data: encrypted,
    tag: tag.toString('hex'),
  };
}

function decrypt(payload: EncryptedPayload): string {
  const key = deriveKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));
  let decrypted = decipher.update(payload.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Encrypted store of multi-account Gemini profiles and their API keys.
 * Persists to ~/.tool-agents/gemini-nav/credentials.json encrypted with
 * AES-256-GCM using a persisted machine key.
 */
export class CredentialStore {
  private data: CredentialData = { profiles: [], keys: {} };

  constructor() {
    this.load();
  }

  private load(): void {
    const { file: storeFile } = getStorePaths();
    if (!fs.existsSync(storeFile)) {
      this.data = { profiles: [], keys: {} };
      return;
    }
    try {
      const raw = fs.readFileSync(storeFile, 'utf-8');
      const payload = JSON.parse(raw) as EncryptedPayload;
      const decrypted = decrypt(payload);
      const parsed = JSON.parse(decrypted) as CredentialData;
      this.data = {
        profiles: parsed.profiles ?? [],
        keys: parsed.keys ?? {},
      };
    } catch {
      // A corrupt or foreign-machine file must not crash the surfaces; the
      // user can re-add profiles. We never print key material here.
      console.error(
        'Failed to decrypt credentials. File may be corrupted or from another machine.',
      );
      this.data = { profiles: [], keys: {} };
    }
  }

  private save(): void {
    const { file: storeFile } = getStorePaths();
    ensureToolAgentDir();
    const plaintext = JSON.stringify(this.data, null, 2);
    const payload = encrypt(plaintext);
    fs.writeFileSync(storeFile, JSON.stringify(payload, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  }

  /** List all configured profiles (no key material exposed). */
  listProfiles(): ProfileEntry[] {
    return this.data.profiles.map((p) => ({ ...p }));
  }

  /** Get a profile entry by name (no key material exposed). */
  getProfile(name: string): ProfileEntry | undefined {
    const found = this.data.profiles.find((p) => p.name === name);
    return found ? { ...found } : undefined;
  }

  /**
   * Add or update a profile.
   *
   * @param name     profile name
   * @param apiKey   the API key to encrypt+store when keyMode === 'stored';
   *                 ignored (and any prior stored key removed) for 'env' mode.
   * @param keyMode  'stored' (persist encrypted) or 'env' (resolve on demand)
   * @throws Error when keyMode === 'stored' but no apiKey is supplied (this is a
   *   programmer error, not a config-fallback situation).
   */
  addProfile(
    name: string,
    apiKey: string | null,
    keyMode: ProfileKeyMode,
  ): void {
    if (!this.data.keys) this.data.keys = {};

    if (keyMode === 'stored') {
      if (!apiKey || apiKey.trim() === '') {
        throw new Error(
          `Cannot add profile "${name}" in 'stored' mode without an API key.`,
        );
      }
      this.data.keys[name] = encrypt(apiKey);
    } else {
      // env mode: ensure no stale stored key lingers for this profile.
      delete this.data.keys[name];
    }

    const entry: ProfileEntry = {
      name,
      keyMode,
      addedAt: new Date().toISOString(),
    };
    const existing = this.data.profiles.findIndex((p) => p.name === name);
    if (existing >= 0) {
      // Preserve the original addedAt on update.
      entry.addedAt = this.data.profiles[existing].addedAt;
      this.data.profiles[existing] = entry;
    } else {
      this.data.profiles.push(entry);
    }
    this.save();
  }

  /** Remove a profile and any stored key. Returns true when one was removed. */
  removeProfile(name: string): boolean {
    const before = this.data.profiles.length;
    this.data.profiles = this.data.profiles.filter((p) => p.name !== name);
    if (this.data.keys) delete this.data.keys[name];
    if (this.data.profiles.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Decrypt and return the stored API key for a profile.
   *
   * @throws Error when the profile is unknown, or when its keyMode is 'env'
   *   (the caller must fall back to the four-tier resolver), or when no stored
   *   key payload exists. This is the ONLY method that returns plaintext key
   *   material.
   */
  getApiKey(name: string): string {
    const profile = this.data.profiles.find((p) => p.name === name);
    if (!profile) {
      throw new Error(`Profile "${name}" not found.`);
    }
    if (profile.keyMode === 'env') {
      throw new Error(
        `Profile "${name}" uses env-resolved key mode; use the four-tier resolver, not getApiKey().`,
      );
    }
    const payload = this.data.keys?.[name];
    if (!payload) {
      throw new Error(`No stored API key found for profile "${name}".`);
    }
    return decrypt(payload);
  }

  /** Whether any profiles are configured. */
  hasProfiles(): boolean {
    return this.data.profiles.length > 0;
  }
}
