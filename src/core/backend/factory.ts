/**
 * Backend factory — `makeBackend` resolves a profile's API key and returns a
 * `GenAiBackend` (the sole Gemini path).
 *
 * Key resolution order:
 *   - if the profile's keyMode === 'stored', decrypt via
 *     `CredentialStore.getApiKey(profileName)`;
 *   - otherwise (env mode, or no such profile) resolve via the four-tier
 *     resolver `resolveApiKey(profileName, flags)`.
 *
 * The resolved key is passed EXPLICITLY to `makeGenAiClient` — never via SDK env
 * precedence. A missing key throws `ConfigurationError` (no fallback).
 */

import { resolveApiKey } from '../../config/profile-config.js';
import { CredentialStore } from '../credential-store.js';
import type { IGeminiBackend } from './backend.js';
import { makeGenAiClient } from './genai-client.js';
import { GenAiBackend } from './genai-backend.js';

/** CLI overrides; `key` is the highest-precedence source. */
export interface BackendFlags {
  key?: string;
}

/**
 * Build an `IGeminiBackend` for the named profile.
 *
 * @throws ConfigurationError when no API key can be resolved.
 */
export function makeBackend(
  profileName: string,
  flags?: BackendFlags,
): IGeminiBackend {
  let apiKey: string;

  // An explicit --key flag always wins (highest precedence in the chain).
  if (flags?.key !== undefined && flags.key.trim() !== '') {
    apiKey = flags.key;
  } else {
    const store = new CredentialStore();
    const profile = store.getProfile(profileName);
    if (profile?.keyMode === 'stored') {
      apiKey = store.getApiKey(profileName);
    } else {
      // env-mode profile, or no stored profile: four-tier resolver (throws
      // ConfigurationError when nothing resolves — no fallback).
      apiKey = resolveApiKey(profileName, flags);
    }
  }

  const client = makeGenAiClient(apiKey);
  return new GenAiBackend(client);
}
