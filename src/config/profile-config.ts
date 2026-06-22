/**
 * Four-tier Gemini API-key resolver and tool-agent config directory helpers.
 *
 * Precedence for resolving a profile's Gemini API key (highest wins):
 *   1. CLI flag (flags.key)
 *   2. shell env var (process.env, as exported in the user's shell)
 *   3. ~/.tool-agents/gemini-nav/.env
 *   4. local ./.env
 *
 * Both `GEMINI_API_KEY` and `GOOGLE_API_KEY` are accepted (GEMINI preferred when
 * both are present). The resolved key is always returned to the caller so it can
 * be passed EXPLICITLY to the GenAI client — the SDK's own env precedence
 * (GOOGLE_API_KEY over GEMINI_API_KEY) is never relied upon.
 *
 * NO fallback default is ever applied. A missing key raises ConfigurationError
 * naming every source that was checked, per the project's no-fallback rule.
 *
 * Implementation note on dotenv layering: to honor "shell env > tool-agent .env >
 * local .env" we load the .env files with `override: false`, so any value already
 * present in process.env (a shell export) is preserved. The tool-agent .env is
 * loaded BEFORE the local .env so that, among the file sources, the tool-agent
 * .env wins (the first writer of a given key keeps it under override:false).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { config as loadDotenv } from 'dotenv';
import { ConfigurationError } from './config-error.js';

/** The tool-agent name for this project (used for the config folder). */
const TOOL_AGENT_NAME = 'gemini-nav';

/** Gemini API-key env var names accepted, in preference order. */
const KEY_ENV_VARS = ['GEMINI_API_KEY', 'GOOGLE_API_KEY'] as const;

/** Absolute path to ~/.tool-agents/gemini-nav (not created). */
export function getToolAgentDir(): string {
  return path.join(os.homedir(), '.tool-agents', TOOL_AGENT_NAME);
}

/**
 * Ensure ~/.tool-agents/gemini-nav/ exists with secure permissions (0700) and
 * return its absolute path.
 */
export function ensureToolAgentDir(): string {
  const dir = getToolAgentDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

/** Path to the tool-agent .env file. */
function toolAgentEnvPath(): string {
  return path.join(getToolAgentDir(), '.env');
}

/** Path to the local project .env file. */
function localEnvPath(): string {
  return path.join(process.cwd(), '.env');
}

/**
 * Read a key value from the file-backed env layers (tool-agent .env, then local
 * .env) without mutating process.env. Returns the first matching key found, with
 * the tool-agent .env taking precedence over the local .env.
 */
function readKeyFromEnvFiles(): { value: string; source: string } | undefined {
  const fileLayers: string[] = [toolAgentEnvPath(), localEnvPath()];
  for (const file of fileLayers) {
    if (!fs.existsSync(file)) continue;
    const parsed = loadDotenv({ path: file, processEnv: {} }).parsed ?? {};
    for (const name of KEY_ENV_VARS) {
      const val = parsed[name];
      if (val !== undefined && val.trim() !== '') {
        return { value: val, source: file };
      }
    }
  }
  return undefined;
}

/**
 * Read a key value from the shell environment (process.env), preferring
 * GEMINI_API_KEY then GOOGLE_API_KEY.
 */
function readKeyFromShellEnv(): { value: string; source: string } | undefined {
  for (const name of KEY_ENV_VARS) {
    const val = process.env[name];
    if (val !== undefined && val.trim() !== '') {
      return { value: val, source: `env:${name}` };
    }
  }
  return undefined;
}

/**
 * Resolve the Gemini API key for a profile through the four-tier chain.
 *
 * @param profileName name of the profile the key is being resolved for (used for
 *   diagnostics in the raised error).
 * @param flags optional CLI overrides; `flags.key` is the highest-precedence source.
 * @returns the resolved API key (never empty).
 * @throws ConfigurationError when no key can be resolved from any source.
 */
export function resolveApiKey(profileName: string, flags?: { key?: string }): string {
  // 1. CLI flag (highest precedence)
  if (flags?.key !== undefined && flags.key.trim() !== '') {
    return flags.key;
  }

  // 2. shell env var
  const fromShell = readKeyFromShellEnv();
  if (fromShell) return fromShell.value;

  // 3 & 4. tool-agent .env, then local .env
  const fromFiles = readKeyFromEnvFiles();
  if (fromFiles) return fromFiles.value;

  // No fallback default — raise, naming every checked source.
  const checkedSources = [
    '--key',
    `env:${KEY_ENV_VARS.join('/')}`,
    toolAgentEnvPath(),
    localEnvPath(),
  ];
  throw new ConfigurationError(
    KEY_ENV_VARS.join('/'),
    checkedSources,
    `No Gemini API key resolved for profile "${profileName}".`,
  );
}
