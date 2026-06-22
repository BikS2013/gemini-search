/**
 * Shared CLI helpers for the `gemini-nav` commander program.
 *
 * Mirrors the storage-navigator reference `src/cli/commands/shared.ts`:
 *   - a `--profile <name>` resolution (analog of the reference `--storage`),
 *   - secret / yes-no prompt helpers,
 *   - a backend accessor that wraps `makeBackend`,
 *   - a single top-level error handler that maps `ConfigurationError` to exit
 *     code 3 and every other error to exit 2 (mirroring the reference exit-code
 *     convention; design "Error Handling Strategy").
 *
 * No configuration fallbacks: a missing API key surfaces as a `ConfigurationError`
 * (raised inside `makeBackend`) and is rendered with an actionable message.
 */

import * as readline from 'readline';
import { makeBackend, type BackendFlags } from '../../core/backend/factory.js';
import type { IGeminiBackend } from '../../core/backend/backend.js';
import { ConfigurationError } from '../../config/config-error.js';
import {
  FileTooLargeError,
  UnsupportedMimeTypeError,
  StoreLimitError,
  RateLimitError,
  UploadOperationError,
} from '../../core/errors.js';

/** Default profile used when `--profile` is omitted. */
export const DEFAULT_PROFILE = 'default';

/** Global options every command inherits from the program. */
export interface GlobalOpts {
  /** Named profile to resolve the backend with (default: 'default'). */
  profile?: string;
  /** Highest-precedence inline API key override. */
  key?: string;
}

/** Resolve the effective profile name from global options. */
export function resolveProfileName(opts: GlobalOpts | undefined): string {
  const name = opts?.profile?.trim();
  return name && name !== '' ? name : DEFAULT_PROFILE;
}

/**
 * Build an `IGeminiBackend` for the resolved profile. Pulls the global
 * `--profile` / `--key` flags (commander stores program-level options on the
 * command's parent / via `optsWithGlobals`). The caller passes the merged opts.
 *
 * @throws ConfigurationError when no API key can be resolved (no fallback).
 */
export function getBackend(opts: GlobalOpts | undefined): IGeminiBackend {
  const profile = resolveProfileName(opts);
  const flags: BackendFlags = {};
  if (opts?.key !== undefined && opts.key.trim() !== '') {
    flags.key = opts.key;
  }
  return makeBackend(profile, flags);
}

/** Prompt the user for a free-text value (input is visible — terminal limit). */
export function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Prompt for a yes/no confirmation. Returns true only on an explicit `y`. */
export function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

/**
 * Confirmation gate for destructive commands. When `force` is true the prompt is
 * skipped. Returns true when the action should proceed.
 */
export async function confirmDestructive(
  message: string,
  force: boolean | undefined,
): Promise<boolean> {
  if (force) return true;
  return promptYesNo(message);
}

/** Exit codes — mirror the reference convention. */
export const EXIT_CONFIG_ERROR = 3;
export const EXIT_ERROR = 2;

/**
 * Map a thrown error to a clean stderr message + process exit code.
 *
 * - `ConfigurationError`     → exit 3, actionable "set your API key" guidance.
 * - `RateLimitError`         → exit 2, suggest retry (with retry-after hint).
 * - `FileTooLargeError`,
 *   `UnsupportedMimeTypeError`,
 *   `StoreLimitError`,
 *   `UploadOperationError`   → exit 2, render the typed message.
 * - anything else            → exit 2.
 *
 * Secrets are never printed here — only the error's own (secret-free) message.
 */
export function handleCliError(err: unknown): never {
  if (err instanceof ConfigurationError) {
    console.error(`[config error] ${err.message}`);
    console.error(
      'Set your Gemini API key via --key, the GEMINI_API_KEY / GOOGLE_API_KEY ' +
        'environment variable, or add a profile with: ' +
        'gemini-nav profile-add --name <name> --key <key>',
    );
    process.exit(EXIT_CONFIG_ERROR);
  }

  if (err instanceof RateLimitError) {
    const hint =
      err.retryAfterMs != null
        ? ` Retry after ~${Math.ceil(err.retryAfterMs / 1000)}s.`
        : ' Please retry after a short delay.';
    console.error(`[rate limit] ${err.message}${hint}`);
    process.exit(EXIT_ERROR);
  }

  if (
    err instanceof FileTooLargeError ||
    err instanceof UnsupportedMimeTypeError ||
    err instanceof StoreLimitError ||
    err instanceof UploadOperationError
  ) {
    console.error(`[error] ${err.message}`);
    process.exit(EXIT_ERROR);
  }

  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[error] ${msg}`);
  process.exit(EXIT_ERROR);
}

/** Format a byte count as a short human-readable string (e.g. "1.2 MB"). */
export function formatBytes(bytes: number | undefined): string {
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

/** Strip the `STATE_` prefix for display (e.g. `STATE_ACTIVE` → `ACTIVE`). */
export function displayState(state: string | undefined): string {
  if (!state) return 'UNKNOWN';
  return state.startsWith('STATE_') ? state.slice('STATE_'.length) : state;
}

/**
 * Derive a coarse display state for a store from its document counts (the SDK
 * has no native store-level state field — design Data Models note).
 */
export function deriveStoreState(opts: {
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  activeDocumentsCount?: number;
}): string {
  if ((opts.pendingDocumentsCount ?? 0) > 0) return 'INDEXING';
  if ((opts.failedDocumentsCount ?? 0) > 0) return 'PARTIAL_FAILURE';
  if ((opts.activeDocumentsCount ?? 0) > 0) return 'ACTIVE';
  return 'EMPTY';
}
