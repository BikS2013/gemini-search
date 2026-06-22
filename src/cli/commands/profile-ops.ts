/**
 * Profile commands — manage named multi-account profiles whose Gemini API keys
 * are encrypted at rest in the credential store.
 *
 * Commands:
 *   - profile-add    : add (or update) a profile, key stored encrypted, or 'env' mode
 *   - profiles       : list configured profiles (NEVER prints key material)
 *   - profile-remove : remove a profile and its stored key
 *
 * Secret safety (FR-NFR-5): keys are never echoed to stdout. Only the encrypted
 * vault holds key material; nothing here reads it back.
 */

import { CredentialStore } from '../../core/credential-store.js';
import { resolveApiKey } from '../../config/profile-config.js';
import { ConfigurationError } from '../../config/config-error.js';
import { promptInput, handleCliError } from './shared.js';

export interface ProfileAddOpts {
  name: string;
  /** Inline key (stored mode). If omitted, prompts; `--env` switches to env mode. */
  key?: string;
  /** Resolve the key on demand via the four-tier resolver instead of storing it. */
  env?: boolean;
}

/**
 * Add or update a profile.
 *
 * - `--env`            → keyMode 'env' (no secret stored; resolved on demand).
 *   The four-tier resolver is exercised once to fail fast if no key is present
 *   (honoring the no-fallback rule).
 * - otherwise          → keyMode 'stored'; key from `--key` or an interactive
 *   prompt, encrypted into the vault.
 */
export async function profileAdd(opts: ProfileAddOpts): Promise<void> {
  try {
    const store = new CredentialStore();

    if (opts.env) {
      // Validate that a key is resolvable now (no fallback) before persisting
      // an env-mode profile, so the user is told immediately if none exists.
      resolveApiKey(opts.name, {});
      store.addProfile(opts.name, null, 'env');
      console.log(
        `Profile "${opts.name}" added in env mode (key resolved on demand).`,
      );
      return;
    }

    let key = opts.key?.trim();
    if (!key) {
      key = await promptInput(`Enter Gemini API key for profile "${opts.name}": `);
    }
    if (!key) {
      throw new ConfigurationError('GEMINI_API_KEY', ['--key', 'interactive prompt']);
    }

    store.addProfile(opts.name, key, 'stored');
    console.log(`Profile "${opts.name}" added (key stored encrypted).`);
  } catch (err) {
    handleCliError(err);
  }
}

/** List configured profiles. Never prints key material. */
export function profilesList(): void {
  try {
    const store = new CredentialStore();
    const profiles = store.listProfiles();

    if (profiles.length === 0) {
      console.log('No profiles configured.');
      console.log(
        'Add one with: gemini-nav profile-add --name <name> --key <key>',
      );
      return;
    }

    console.log(`Configured profiles (${profiles.length}):\n`);
    for (const p of profiles) {
      console.log(`  ${p.name}`);
      console.log(`    Key mode: ${p.keyMode}`);
      console.log(`    Added:    ${p.addedAt}`);
      console.log();
    }
  } catch (err) {
    handleCliError(err);
  }
}

/** Remove a profile and any stored key. */
export function profileRemove(name: string): void {
  try {
    const store = new CredentialStore();
    const removed = store.removeProfile(name);
    if (removed) {
      console.log(`Profile "${name}" removed.`);
    } else {
      console.log(`Profile "${name}" not found.`);
    }
  } catch (err) {
    handleCliError(err);
  }
}
