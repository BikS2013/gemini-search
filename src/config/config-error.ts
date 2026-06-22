/**
 * ConfigurationError — the single no-fallback error type used across all surfaces
 * (CLI, HTTP API, agent). Raised whenever a mandatory configuration setting is
 * absent. Per the project's no-fallback rule, a missing required value is NEVER
 * substituted with a default — it is reported via this error, naming every source
 * that was checked.
 *
 * Ported from the storage-navigator reference `src/config/agent-config.ts` lines
 * 22-37, extracted into its own module so every layer can import it without
 * pulling in the agent-config loader.
 */

export class ConfigurationError extends Error {
  readonly code = 'CONFIG_MISSING';
  readonly missingSetting: string;
  readonly checkedSources: string[];

  constructor(missingSetting: string, checkedSources: string[], detail?: string) {
    const msg =
      `Mandatory setting "${missingSetting}" was not provided. Checked: ${checkedSources.join(', ')}.` +
      (detail ? ` ${detail}` : '');
    super(msg);
    this.name = 'ConfigurationError';
    this.missingSetting = missingSetting;
    this.checkedSources = checkedSources;
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}
