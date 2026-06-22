/**
 * Unit tests for profile-config.ts:
 *   resolveApiKey  — four-tier precedence, key-var preference, error naming
 *   getToolAgentDir — path composition
 *   ensureToolAgentDir — directory creation with mode 0700, idempotence
 *
 * Isolation strategy:
 *   - os.homedir() is mocked so NO real ~/.tool-agents/gemini-nav path is ever
 *     accessed.  All filesystem operations go to os.tmpdir() subdirectories.
 *   - process.env mutations are confined within each test via beforeEach/afterEach
 *     snapshots so parallel test runners cannot pollute each other.
 *   - process.cwd() is NOT mocked — instead, the "local .env" tier is exercised
 *     by writing a file into a temp dir that matches what localEnvPath() would
 *     return (a file in process.cwd()).  Because the test runner cwd is NOT the
 *     temp dir, to exercise the local-cwd tier we change process.cwd via a cwd
 *     override.  However, changing process.cwd() is restricted in Node; we instead
 *     test the file-read path by controlling the tool-agent .env (tier 3) and
 *     local .env (tier 4) separately using the temp-HOME override for the former
 *     and a cwd mock for the latter.
 *
 * NOTE on cwd override: `process.chdir()` is the standard API. We call it and
 *   restore in afterEach.  If the test runner disallows chdir, those tests are
 *   marked to skip with a note in "Manual review needed".
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// We mock os so that getToolAgentDir / ensureToolAgentDir never touch the real
// ~/.tool-agents/gemini-nav.  The mock must be set up BEFORE the module is
// imported so that the module-level call to os.homedir() in toolAgentEnvPath()
// sees the mock.
// ---------------------------------------------------------------------------
const FAKE_HOME = path.join(os.tmpdir(), `gemini-nav-test-home-${process.pid}`);

vi.mock('os', async (importOriginal) => {
  const realOs = await importOriginal<typeof os>();
  return {
    ...realOs,
    homedir: () => FAKE_HOME,
  };
});

// Import AFTER mock is registered.
import {
  resolveApiKey,
  getToolAgentDir,
  ensureToolAgentDir,
} from '../../src/config/profile-config.js';
import { ConfigurationError } from '../../src/config/config-error.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TOOL_AGENT_DIR = path.join(FAKE_HOME, '.tool-agents', 'gemini-nav');
const TOOL_AGENT_ENV = path.join(TOOL_AGENT_DIR, '.env');

/** Write content to a file, creating parent dirs as needed. */
function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
}

/** Remove a path recursively if it exists. */
function rmrf(p: string): void {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// process.env snapshot / restore
// ---------------------------------------------------------------------------
let envSnapshot: NodeJS.ProcessEnv;

beforeEach(() => {
  envSnapshot = { ...process.env };
  // Remove any real key vars that might be set in the developer's shell so
  // tests are hermetic.
  delete process.env['GEMINI_API_KEY'];
  delete process.env['GOOGLE_API_KEY'];
  // Ensure the fake home dir exists for tool-agent path tests.
  fs.mkdirSync(FAKE_HOME, { recursive: true });
  // Remove any leftover tool-agent env from previous tests.
  rmrf(TOOL_AGENT_DIR);
});

afterEach(() => {
  // Restore process.env precisely.
  // Remove keys added during the test.
  for (const key of Object.keys(process.env)) {
    if (!(key in envSnapshot)) delete process.env[key];
  }
  // Restore keys removed/changed during the test.
  for (const [key, val] of Object.entries(envSnapshot)) {
    process.env[key] = val;
  }
  // Clean up fake home artefacts.
  rmrf(FAKE_HOME);
});

// ---------------------------------------------------------------------------
// getToolAgentDir
// ---------------------------------------------------------------------------
describe('getToolAgentDir', () => {
  it('returns path ending with .tool-agents/gemini-nav under the mocked home', () => {
    const dir = getToolAgentDir();
    expect(dir).toBe(path.join(FAKE_HOME, '.tool-agents', 'gemini-nav'));
  });

  it('does not create the directory', () => {
    getToolAgentDir();
    expect(fs.existsSync(TOOL_AGENT_DIR)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ensureToolAgentDir
// ---------------------------------------------------------------------------
describe('ensureToolAgentDir', () => {
  it('creates the directory when it does not exist', () => {
    expect(fs.existsSync(TOOL_AGENT_DIR)).toBe(false);
    ensureToolAgentDir();
    expect(fs.existsSync(TOOL_AGENT_DIR)).toBe(true);
  });

  it('returns the correct absolute path', () => {
    const result = ensureToolAgentDir();
    expect(result).toBe(TOOL_AGENT_DIR);
  });

  it('creates with restrictive permissions (0700)', () => {
    ensureToolAgentDir();
    const stat = fs.statSync(TOOL_AGENT_DIR);
    // On POSIX: mode & 0o777 should be 0o700.
    // On Windows this check is not meaningful; guard accordingly.
    if (process.platform !== 'win32') {
      // eslint-disable-next-line no-bitwise
      expect(stat.mode & 0o777).toBe(0o700);
    }
  });

  it('is idempotent — does not throw when directory already exists', () => {
    ensureToolAgentDir();
    expect(() => ensureToolAgentDir()).not.toThrow();
  });

  it('returns the same path on repeated calls', () => {
    const first = ensureToolAgentDir();
    const second = ensureToolAgentDir();
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — Tier 1: CLI flag (highest precedence)
// ---------------------------------------------------------------------------
describe('resolveApiKey — Tier 1: CLI flag', () => {
  it('returns the CLI key when all other sources are also set', () => {
    // Set shell env (Tier 2) to a different value.
    process.env['GEMINI_API_KEY'] = 'env-key';
    // Write tool-agent .env (Tier 3) with yet another value.
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tool-agent-key\n');

    const result = resolveApiKey('test-profile', { key: 'cli-flag-key' });
    expect(result).toBe('cli-flag-key');
  });

  it('returns the CLI key even when shell env is set', () => {
    process.env['GOOGLE_API_KEY'] = 'env-google-key';
    const result = resolveApiKey('test-profile', { key: 'cli-key' });
    expect(result).toBe('cli-key');
  });

  it('ignores a whitespace-only CLI key and falls through to Tier 2', () => {
    process.env['GEMINI_API_KEY'] = 'env-gemini-key';
    const result = resolveApiKey('test-profile', { key: '   ' });
    expect(result).toBe('env-gemini-key');
  });

  it('treats empty string CLI key as absent and falls through to Tier 2', () => {
    process.env['GEMINI_API_KEY'] = 'env-fallthrough';
    const result = resolveApiKey('test-profile', { key: '' });
    expect(result).toBe('env-fallthrough');
  });

  it('returns CLI key when flags object is provided with a valid key', () => {
    const result = resolveApiKey('p', { key: 'explicit-key' });
    expect(result).toBe('explicit-key');
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — Tier 2: Shell environment variables
// ---------------------------------------------------------------------------
describe('resolveApiKey — Tier 2: shell environment', () => {
  it('returns GEMINI_API_KEY from process.env when no CLI flag', () => {
    process.env['GEMINI_API_KEY'] = 'gemini-env-value';
    const result = resolveApiKey('test-profile');
    expect(result).toBe('gemini-env-value');
  });

  it('returns GOOGLE_API_KEY from process.env when GEMINI_API_KEY is absent', () => {
    process.env['GOOGLE_API_KEY'] = 'google-env-value';
    const result = resolveApiKey('test-profile');
    expect(result).toBe('google-env-value');
  });

  it('prefers GEMINI_API_KEY over GOOGLE_API_KEY when both are set in env', () => {
    process.env['GEMINI_API_KEY'] = 'gemini-wins';
    process.env['GOOGLE_API_KEY'] = 'google-loses';
    const result = resolveApiKey('test-profile');
    expect(result).toBe('gemini-wins');
  });

  it('shell env (Tier 2) beats tool-agent .env (Tier 3)', () => {
    process.env['GEMINI_API_KEY'] = 'shell-tier2';
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tool-agent-tier3\n');
    const result = resolveApiKey('test-profile');
    expect(result).toBe('shell-tier2');
  });

  it('ignores whitespace-only GEMINI_API_KEY in env and falls to GOOGLE_API_KEY', () => {
    process.env['GEMINI_API_KEY'] = '   ';
    process.env['GOOGLE_API_KEY'] = 'google-fallback';
    const result = resolveApiKey('test-profile');
    expect(result).toBe('google-fallback');
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — Tier 3: Tool-agent .env file
// ---------------------------------------------------------------------------
describe('resolveApiKey — Tier 3: ~/.tool-agents/gemini-nav/.env', () => {
  it('reads GEMINI_API_KEY from the tool-agent .env when no CLI flag or shell env', () => {
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tool-agent-gemini\n');
    const result = resolveApiKey('test-profile');
    expect(result).toBe('tool-agent-gemini');
  });

  it('reads GOOGLE_API_KEY from the tool-agent .env when GEMINI_API_KEY absent', () => {
    writeFile(TOOL_AGENT_ENV, 'GOOGLE_API_KEY=tool-agent-google\n');
    const result = resolveApiKey('test-profile');
    expect(result).toBe('tool-agent-google');
  });

  it('prefers GEMINI_API_KEY over GOOGLE_API_KEY within the tool-agent .env', () => {
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=gemini-wins\nGOOGLE_API_KEY=google-loses\n');
    const result = resolveApiKey('test-profile');
    expect(result).toBe('gemini-wins');
  });

  it('does NOT mutate process.env when reading tool-agent .env (isolation)', () => {
    const before = process.env['GEMINI_API_KEY'];
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tool-agent-key\n');
    resolveApiKey('test-profile');
    expect(process.env['GEMINI_API_KEY']).toBe(before);
  });

  it('tool-agent .env (Tier 3) beats local .env (Tier 4)', () => {
    // We set a local .env in process.cwd() — but we need to intercept localEnvPath().
    // Since profile-config uses process.cwd() directly, we write to a temp cwd
    // and use process.chdir().
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-cwd-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    const localEnv = path.join(tmpCwd, '.env');
    writeFile(localEnv, 'GEMINI_API_KEY=local-tier4\n');
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tool-agent-tier3\n');

    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      const result = resolveApiKey('test-profile');
      expect(result).toBe('tool-agent-tier3');
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — Tier 4: Local .env file (cwd)
// ---------------------------------------------------------------------------
describe('resolveApiKey — Tier 4: local .env (cwd)', () => {
  it('reads GEMINI_API_KEY from local .env when no higher-tier source found', () => {
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-localenv-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    writeFile(path.join(tmpCwd, '.env'), 'GEMINI_API_KEY=local-gemini\n');

    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      const result = resolveApiKey('test-profile');
      expect(result).toBe('local-gemini');
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });

  it('reads GOOGLE_API_KEY from local .env when GEMINI_API_KEY absent in file', () => {
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-localenv2-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    writeFile(path.join(tmpCwd, '.env'), 'GOOGLE_API_KEY=local-google\n');

    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      const result = resolveApiKey('test-profile');
      expect(result).toBe('local-google');
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });

  it('does NOT mutate process.env when reading local .env (isolation)', () => {
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-localenv3-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    writeFile(path.join(tmpCwd, '.env'), 'GEMINI_API_KEY=local-key\n');

    const origCwd = process.cwd();
    const envBefore = process.env['GEMINI_API_KEY'];
    try {
      process.chdir(tmpCwd);
      resolveApiKey('test-profile');
      expect(process.env['GEMINI_API_KEY']).toBe(envBefore);
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — No-fallback rule: ConfigurationError when no key found
// ---------------------------------------------------------------------------
describe('resolveApiKey — no-fallback: ConfigurationError when no source has a key', () => {
  it('throws ConfigurationError when no key exists in any tier', () => {
    // All tiers empty: no CLI, no env, no tool-agent .env, no local .env (cwd has no .env).
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-nokey-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });

    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      expect(() => resolveApiKey('my-profile')).toThrow(ConfigurationError);
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });

  it('throws when flags is undefined and no sources populated', () => {
    expect(() => resolveApiKey('p')).toThrow(ConfigurationError);
  });

  it('throws when flags is empty object and no sources populated', () => {
    expect(() => resolveApiKey('p', {})).toThrow(ConfigurationError);
  });

  it('error code is CONFIG_MISSING', () => {
    try {
      resolveApiKey('profile-x');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      expect((err as ConfigurationError).code).toBe('CONFIG_MISSING');
    }
  });

  it('error missingSetting names the key variable(s)', () => {
    try {
      resolveApiKey('profile-x');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const ce = err as ConfigurationError;
      // The implementation joins KEY_ENV_VARS with '/' → "GEMINI_API_KEY/GOOGLE_API_KEY"
      expect(ce.missingSetting).toMatch(/GEMINI_API_KEY/);
    }
  });

  it('error checkedSources includes "--key" (the CLI flag source)', () => {
    try {
      resolveApiKey('profile-x');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const ce = err as ConfigurationError;
      expect(ce.checkedSources).toContain('--key');
    }
  });

  it('error checkedSources includes an env: entry naming the env-var(s)', () => {
    try {
      resolveApiKey('profile-x');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const ce = err as ConfigurationError;
      const envEntry = ce.checkedSources.find((s) => s.startsWith('env:'));
      expect(envEntry).toBeDefined();
      expect(envEntry).toMatch(/GEMINI_API_KEY/);
    }
  });

  it('error checkedSources includes the tool-agent .env path', () => {
    try {
      resolveApiKey('profile-x');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const ce = err as ConfigurationError;
      const hasToolAgentEnv = ce.checkedSources.some(
        (s) => s.includes('.tool-agents') && s.includes('gemini-nav') && s.endsWith('.env'),
      );
      expect(hasToolAgentEnv).toBe(true);
    }
  });

  it('error checkedSources includes the local .env path', () => {
    try {
      resolveApiKey('profile-x');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const ce = err as ConfigurationError;
      const hasLocalEnv = ce.checkedSources.some((s) => s.endsWith('.env') && !s.includes('.tool-agents'));
      expect(hasLocalEnv).toBe(true);
    }
  });

  it('error message contains all four checked sources', () => {
    try {
      resolveApiKey('profile-x');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const ce = err as ConfigurationError;
      expect(ce.checkedSources.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('never applies a silent default — no result returned for all-empty sources', () => {
    // This test asserts that the function ALWAYS throws when no key is found.
    // Any non-throwing return would be a regression of the no-fallback rule.
    let didReturn = false;
    try {
      resolveApiKey('profile-x');
      didReturn = true;
    } catch {
      // expected
    }
    expect(didReturn).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — precedence verification (exact order as implemented)
// ---------------------------------------------------------------------------
describe('resolveApiKey — four-tier precedence ORDER verification', () => {
  /**
   * Observed implementation order (from source):
   *   1. flags.key
   *   2. process.env (GEMINI_API_KEY then GOOGLE_API_KEY)
   *   3. ~/.tool-agents/gemini-nav/.env (GEMINI_API_KEY then GOOGLE_API_KEY)
   *   4. ./process.cwd()/.env (GEMINI_API_KEY then GOOGLE_API_KEY)
   *
   * The design doc states: CLI flag > shell env > tool-agent .env > local .env
   * The implementation MATCHES this design.
   */

  it('Tier 1 > Tier 2: CLI key wins over shell env GEMINI_API_KEY', () => {
    process.env['GEMINI_API_KEY'] = 'tier2-gemini';
    expect(resolveApiKey('p', { key: 'tier1-cli' })).toBe('tier1-cli');
  });

  it('Tier 1 > Tier 3: CLI key wins over tool-agent .env', () => {
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tier3-tool-agent\n');
    expect(resolveApiKey('p', { key: 'tier1-cli' })).toBe('tier1-cli');
  });

  it('Tier 2 > Tier 3: shell env wins over tool-agent .env', () => {
    process.env['GEMINI_API_KEY'] = 'tier2-shell';
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tier3-tool-agent\n');
    expect(resolveApiKey('p')).toBe('tier2-shell');
  });

  it('Tier 3 > Tier 4: tool-agent .env wins over local .env', () => {
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-order-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    writeFile(path.join(tmpCwd, '.env'), 'GEMINI_API_KEY=tier4-local\n');
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=tier3-tool-agent\n');

    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      expect(resolveApiKey('p')).toBe('tier3-tool-agent');
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });

  it('Tier 4 is reached when all higher tiers are absent', () => {
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-tier4-only-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    writeFile(path.join(tmpCwd, '.env'), 'GEMINI_API_KEY=tier4-only\n');

    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      expect(resolveApiKey('p')).toBe('tier4-only');
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — accepting both GEMINI_API_KEY and GOOGLE_API_KEY
// ---------------------------------------------------------------------------
describe('resolveApiKey — accepts both GEMINI_API_KEY and GOOGLE_API_KEY', () => {
  it('accepts GEMINI_API_KEY from shell env', () => {
    process.env['GEMINI_API_KEY'] = 'gemini-key';
    expect(resolveApiKey('p')).toBe('gemini-key');
  });

  it('accepts GOOGLE_API_KEY from shell env when GEMINI_API_KEY not set', () => {
    process.env['GOOGLE_API_KEY'] = 'google-key';
    expect(resolveApiKey('p')).toBe('google-key');
  });

  it('prefers GEMINI_API_KEY over GOOGLE_API_KEY in shell env', () => {
    process.env['GEMINI_API_KEY'] = 'gemini-preferred';
    process.env['GOOGLE_API_KEY'] = 'google-secondary';
    expect(resolveApiKey('p')).toBe('gemini-preferred');
  });

  it('accepts GEMINI_API_KEY from tool-agent .env', () => {
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=ta-gemini\n');
    expect(resolveApiKey('p')).toBe('ta-gemini');
  });

  it('accepts GOOGLE_API_KEY from tool-agent .env when GEMINI_API_KEY absent', () => {
    writeFile(TOOL_AGENT_ENV, 'GOOGLE_API_KEY=ta-google\n');
    expect(resolveApiKey('p')).toBe('ta-google');
  });

  it('prefers GEMINI_API_KEY over GOOGLE_API_KEY in tool-agent .env', () => {
    writeFile(TOOL_AGENT_ENV, 'GEMINI_API_KEY=ta-gemini-pref\nGOOGLE_API_KEY=ta-google-sec\n');
    expect(resolveApiKey('p')).toBe('ta-gemini-pref');
  });

  it('accepts GEMINI_API_KEY from local .env', () => {
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-gak1-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    writeFile(path.join(tmpCwd, '.env'), 'GEMINI_API_KEY=local-gemini-key\n');
    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      expect(resolveApiKey('p')).toBe('local-gemini-key');
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });

  it('accepts GOOGLE_API_KEY from local .env when GEMINI_API_KEY absent', () => {
    const tmpCwd = path.join(os.tmpdir(), `gemini-nav-gak2-${process.pid}`);
    fs.mkdirSync(tmpCwd, { recursive: true });
    writeFile(path.join(tmpCwd, '.env'), 'GOOGLE_API_KEY=local-google-key\n');
    const origCwd = process.cwd();
    try {
      process.chdir(tmpCwd);
      expect(resolveApiKey('p')).toBe('local-google-key');
    } finally {
      process.chdir(origCwd);
      rmrf(tmpCwd);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveApiKey — profile name is passed through to error message
// ---------------------------------------------------------------------------
describe('resolveApiKey — profile name in error context', () => {
  it('error message includes the profile name when no key found', () => {
    try {
      resolveApiKey('my-special-profile');
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      expect((err as ConfigurationError).message).toContain('my-special-profile');
    }
  });
});
