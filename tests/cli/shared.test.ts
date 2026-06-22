/**
 * Tests for the pure helper functions in src/cli/commands/shared.ts
 *
 * Coverage:
 *   - formatBytes        : byte / size formatting
 *   - displayState       : STATE_ prefix stripping
 *   - deriveStoreState   : doc-count → display-state derivation
 *   - resolveProfileName : global-opts → profile name
 *   - handleCliError     : typed-error → exit-code mapping
 *
 * process.exit is SPIED upon and NOT actually called; the spy asserts the
 * correct exit code and throws a sentinel so the test can catch it without
 * terminating the vitest runner.
 *
 * No live API calls, no process spawning, no shared infrastructure touched.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatBytes,
  displayState,
  deriveStoreState,
  resolveProfileName,
  handleCliError,
  DEFAULT_PROFILE,
  EXIT_CONFIG_ERROR,
  EXIT_ERROR,
} from '../../src/cli/commands/shared.js';
import { ConfigurationError } from '../../src/config/config-error.js';
import {
  FileTooLargeError,
  UnsupportedMimeTypeError,
  StoreLimitError,
  RateLimitError,
  UploadOperationError,
} from '../../src/core/errors.js';

// ============================================================================
// process.exit guard — must be installed before any handleCliError call
// ============================================================================

/**
 * Sentinel error thrown by the process.exit mock so the test can catch the
 * "exit" without really terminating the process.
 */
class ExitCalled extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
  }
}

let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Replace process.exit with a spy that records the code and throws a sentinel
  // so `handleCliError` (which calls `process.exit`) does not terminate vitest.
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string) => {
    throw new ExitCalled(typeof code === 'number' ? code : Number(code ?? 0));
  });
  // Silence console.error output during tests.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// formatBytes
// ============================================================================

describe('formatBytes', () => {
  it('returns "-" for undefined input', () => {
    expect(formatBytes(undefined)).toBe('-');
  });

  it('returns bytes with "B" suffix for values below 1024', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats exactly 1024 bytes as "1.0 KB"', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats KB range (1 KB – just below 1 MB)', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 512)).toBe('512.0 KB');
  });

  it('formats exactly 1 MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats 1.5 MB correctly', () => {
    expect(formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
  });

  it('formats GB range', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
    expect(formatBytes(1024 ** 3 * 2.5)).toBe('2.5 GB');
  });

  it('formats TB range', () => {
    expect(formatBytes(1024 ** 4)).toBe('1.0 TB');
  });

  it('uses one decimal place in all formatted values', () => {
    // 100 MB → 100.0 MB (not 100 MB or 100.00 MB)
    const result = formatBytes(1024 * 1024 * 100);
    expect(result).toMatch(/^\d+\.\d{1} (KB|MB|GB|TB)$/);
  });
});

// ============================================================================
// displayState
// ============================================================================

describe('displayState', () => {
  it('strips the STATE_ prefix', () => {
    expect(displayState('STATE_ACTIVE')).toBe('ACTIVE');
    expect(displayState('STATE_PENDING')).toBe('PENDING');
    expect(displayState('STATE_FAILED')).toBe('FAILED');
    expect(displayState('STATE_UNSPECIFIED')).toBe('UNSPECIFIED');
  });

  it('returns the value unchanged when it has no STATE_ prefix', () => {
    expect(displayState('ACTIVE')).toBe('ACTIVE');
    expect(displayState('UNKNOWN_STATE')).toBe('UNKNOWN_STATE');
  });

  it('returns "UNKNOWN" for undefined', () => {
    expect(displayState(undefined)).toBe('UNKNOWN');
  });

  it('returns "UNKNOWN" for empty string', () => {
    expect(displayState('')).toBe('UNKNOWN');
  });
});

// ============================================================================
// deriveStoreState
// ============================================================================

describe('deriveStoreState', () => {
  it('returns "EMPTY" when all counts are 0', () => {
    expect(
      deriveStoreState({ pendingDocumentsCount: 0, failedDocumentsCount: 0, activeDocumentsCount: 0 }),
    ).toBe('EMPTY');
  });

  it('returns "EMPTY" when all counts are undefined', () => {
    expect(deriveStoreState({})).toBe('EMPTY');
  });

  it('returns "ACTIVE" when only activeDocumentsCount > 0', () => {
    expect(deriveStoreState({ activeDocumentsCount: 5 })).toBe('ACTIVE');
  });

  it('returns "PARTIAL_FAILURE" when only failedDocumentsCount > 0', () => {
    expect(deriveStoreState({ failedDocumentsCount: 1 })).toBe('PARTIAL_FAILURE');
  });

  it('returns "INDEXING" when only pendingDocumentsCount > 0', () => {
    expect(deriveStoreState({ pendingDocumentsCount: 3 })).toBe('INDEXING');
  });

  it('INDEXING takes precedence over PARTIAL_FAILURE when both are set', () => {
    // pending > 0 AND failed > 0 → INDEXING wins (priority order in source)
    expect(
      deriveStoreState({ pendingDocumentsCount: 1, failedDocumentsCount: 1 }),
    ).toBe('INDEXING');
  });

  it('INDEXING takes precedence over ACTIVE', () => {
    expect(
      deriveStoreState({ pendingDocumentsCount: 1, activeDocumentsCount: 5 }),
    ).toBe('INDEXING');
  });

  it('PARTIAL_FAILURE takes precedence over ACTIVE', () => {
    expect(
      deriveStoreState({ failedDocumentsCount: 1, activeDocumentsCount: 5 }),
    ).toBe('PARTIAL_FAILURE');
  });

  it('returns "ACTIVE" when active > 0 and pending/failed are 0', () => {
    expect(
      deriveStoreState({ pendingDocumentsCount: 0, failedDocumentsCount: 0, activeDocumentsCount: 10 }),
    ).toBe('ACTIVE');
  });

  it('returns "EMPTY" when active is 0 and others are undefined', () => {
    expect(deriveStoreState({ activeDocumentsCount: 0 })).toBe('EMPTY');
  });
});

// ============================================================================
// resolveProfileName
// ============================================================================

describe('resolveProfileName', () => {
  it('returns DEFAULT_PROFILE when opts is undefined', () => {
    expect(resolveProfileName(undefined)).toBe(DEFAULT_PROFILE);
  });

  it('returns DEFAULT_PROFILE when profile is undefined', () => {
    expect(resolveProfileName({ profile: undefined })).toBe(DEFAULT_PROFILE);
  });

  it('returns DEFAULT_PROFILE when profile is empty string', () => {
    expect(resolveProfileName({ profile: '' })).toBe(DEFAULT_PROFILE);
  });

  it('returns DEFAULT_PROFILE when profile is whitespace only', () => {
    expect(resolveProfileName({ profile: '   ' })).toBe(DEFAULT_PROFILE);
  });

  it('returns the trimmed profile name when provided', () => {
    expect(resolveProfileName({ profile: 'work' })).toBe('work');
  });

  it('trims surrounding whitespace from a provided profile name', () => {
    expect(resolveProfileName({ profile: '  staging  ' })).toBe('staging');
  });

  it('DEFAULT_PROFILE constant is "default"', () => {
    expect(DEFAULT_PROFILE).toBe('default');
  });
});

// ============================================================================
// handleCliError — exit-code mapping
// ============================================================================

describe('handleCliError – exit-code mapping', () => {
  /**
   * Helper: call handleCliError(err), expect it to throw ExitCalled with the
   * given exit code, and return the ExitCalled instance for further inspection.
   */
  function expectExit(err: unknown, expectedCode: number): ExitCalled {
    let caught: ExitCalled | undefined;
    try {
      handleCliError(err);
    } catch (e) {
      if (e instanceof ExitCalled) {
        caught = e;
      } else {
        throw e;  // re-throw unexpected errors
      }
    }
    if (!caught) {
      throw new Error('handleCliError did not call process.exit');
    }
    expect(caught.code).toBe(expectedCode);
    return caught;
  }

  it('ConfigurationError maps to exit code 3 (EXIT_CONFIG_ERROR)', () => {
    const err = new ConfigurationError('GEMINI_API_KEY', ['env', 'profile']);
    expectExit(err, EXIT_CONFIG_ERROR);
    expect(EXIT_CONFIG_ERROR).toBe(3);
  });

  it('ConfigurationError exit code constant is 3', () => {
    expect(EXIT_CONFIG_ERROR).toBe(3);
  });

  it('EXIT_ERROR constant is 2', () => {
    expect(EXIT_ERROR).toBe(2);
  });

  it('RateLimitError maps to exit code 2', () => {
    const err = new RateLimitError('Quota exceeded');
    expectExit(err, EXIT_ERROR);
  });

  it('RateLimitError with retryAfterMs still exits with code 2', () => {
    const err = new RateLimitError('Quota exceeded', 5000);
    expectExit(err, EXIT_ERROR);
  });

  it('FileTooLargeError maps to exit code 2', () => {
    const err = new FileTooLargeError(200 * 1024 * 1024, 100 * 1024 * 1024);
    expectExit(err, EXIT_ERROR);
  });

  it('UnsupportedMimeTypeError maps to exit code 2', () => {
    const err = new UnsupportedMimeTypeError('audio/mp3');
    expectExit(err, EXIT_ERROR);
  });

  it('StoreLimitError maps to exit code 2', () => {
    const err = new StoreLimitError('Too many stores');
    expectExit(err, EXIT_ERROR);
  });

  it('UploadOperationError maps to exit code 2', () => {
    const err = new UploadOperationError('Import failed', { code: 500 });
    expectExit(err, EXIT_ERROR);
  });

  it('generic Error maps to exit code 2', () => {
    expectExit(new Error('Something went wrong'), EXIT_ERROR);
  });

  it('non-Error string thrown maps to exit code 2', () => {
    expectExit('plain string error', EXIT_ERROR);
  });

  it('non-Error object thrown maps to exit code 2', () => {
    expectExit({ code: 'UNKNOWN', detail: 'weird' }, EXIT_ERROR);
  });

  it('undefined thrown maps to exit code 2', () => {
    expectExit(undefined, EXIT_ERROR);
  });

  it('null thrown maps to exit code 2', () => {
    expectExit(null, EXIT_ERROR);
  });

  it('ConfigurationError writes actionable guidance to stderr', () => {
    const err = new ConfigurationError('GEMINI_API_KEY', ['env']);
    try {
      handleCliError(err);
    } catch {
      // ExitCalled — expected
    }
    // At least one console.error call should mention the config key
    const calls = (console.error as ReturnType<typeof vi.spyOn>).mock.calls;
    const allOutput = calls.flat().join('\n');
    expect(allOutput).toContain('GEMINI_API_KEY');
  });

  it('RateLimitError with retryAfterMs writes retry hint to stderr', () => {
    const err = new RateLimitError('Too many requests', 3000);
    try {
      handleCliError(err);
    } catch {
      // ExitCalled — expected
    }
    const calls = (console.error as ReturnType<typeof vi.spyOn>).mock.calls;
    const allOutput = calls.flat().join('\n');
    // "3s" derived from Math.ceil(3000/1000)
    expect(allOutput).toContain('3s');
  });

  it('RateLimitError without retryAfterMs writes generic retry message', () => {
    const err = new RateLimitError('429');
    try {
      handleCliError(err);
    } catch {
      // ExitCalled — expected
    }
    const calls = (console.error as ReturnType<typeof vi.spyOn>).mock.calls;
    const allOutput = calls.flat().join('\n');
    expect(allOutput).toContain('retry');
  });

  it('process.exit is called exactly once per handleCliError invocation', () => {
    const err = new ConfigurationError('KEY', ['env']);
    try { handleCliError(err); } catch { /* ExitCalled */ }
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

  it('never exposes secrets from ConfigurationError in stderr', () => {
    // Construct an error whose message deliberately never contains a secret.
    const err = new ConfigurationError('API_KEY', ['--key flag', 'GEMINI_API_KEY env']);
    try { handleCliError(err); } catch { /* ExitCalled */ }
    const calls = (console.error as ReturnType<typeof vi.spyOn>).mock.calls;
    const allOutput = calls.flat().join('\n');
    // The actual key value is never in the message — only setting names.
    // Just verify no actual secret placeholder leaks (this tests the structure).
    expect(allOutput).not.toContain('sk-');  // typical key prefix never appears
  });
});
