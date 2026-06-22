/**
 * Active-profile state holder for the Electron main process.
 *
 * The main process is the SOLE holder of the `IGeminiBackend` instance and the
 * `CredentialStore`. This module is a small singleton that tracks the active
 * profile name and the backend built for it, rebuilding the backend on profile
 * switch via `makeBackend(name)`.
 *
 * NO configuration fallbacks (R18): `getBackend()` throws `ConfigurationError`
 * when no profile is selected, and `selectProfile()` throws when the named
 * profile does not exist. API keys NEVER leave this module — only `makeBackend`
 * consumes the key internally.
 */

import { makeBackend } from '../core/backend/factory.js';
import type { IGeminiBackend } from '../core/backend/backend.js';
import { CredentialStore } from '../core/credential-store.js';
import { ConfigurationError } from '../config/config-error.js';
import type { ProfileSummary } from './ipc-payloads.js';

let activeProfile: string | null = null;
let backend: IGeminiBackend | null = null;

/** The currently selected profile name, or null if none has been selected. */
export function getActiveProfile(): string | null {
  return activeProfile;
}

/**
 * List registered profiles as key-free summaries. NEVER returns key material —
 * `CredentialStore.listProfiles()` returns `ProfileEntry[]` (no secrets), mapped
 * down to `{ name, keyMode }`.
 */
export function listProfileSummaries(): ProfileSummary[] {
  const store = new CredentialStore();
  return store.listProfiles().map((p) => ({ name: p.name, keyMode: p.keyMode }));
}

/**
 * Select a profile and rebuild the backend for it.
 *
 * @throws ConfigurationError when the profile does not exist (no silent default).
 */
export function selectProfile(name: string): void {
  const store = new CredentialStore();
  const profile = store.getProfile(name);
  if (profile === undefined) {
    throw new ConfigurationError('profile', [`credential store profile "${name}"`]);
  }
  // makeBackend resolves the key internally (stored decrypt or four-tier env);
  // it throws ConfigurationError when no key can be resolved — no fallback here.
  backend = makeBackend(name);
  activeProfile = name;
}

/**
 * The backend for the active profile.
 *
 * @throws ConfigurationError when no profile has been selected yet.
 */
export function getBackend(): IGeminiBackend {
  if (backend === null || activeProfile === null) {
    throw new ConfigurationError('active profile', ['Electron profile selection']);
  }
  return backend;
}
