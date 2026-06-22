/**
 * API configuration for `gemini-nav-api`.
 *
 * Collapsed from the reference storage-navigator config: the entire OIDC
 * discriminated union, `authEnabled`, `azure.*`, `uploads`, and `corsOrigins`
 * are DROPPED. The only auth mechanism is the static-header gate, which is
 * OPT-IN: when no secret is configured the gate is a pass-through (the API runs
 * open on localhost — the documented local-run posture, resolved decision #2).
 *
 * Per the project no-fallback rule, genuinely required settings raise instead of
 * defaulting. Here only `port`/`logLevel`/pagination/header-name have sane
 * documented defaults (they are operational, not secrets); the Gemini profile is
 * resolved lazily by the backend factory, so the API never defaults a secret.
 */

import { z } from 'zod';

const ConfigSchema = z.object({
  port: z.number().int().positive().default(3000),
  logLevel: z.string().default('info'),
  swaggerUiEnabled: z.boolean().default(true),
  /** Default profile passed to the backend factory when a request omits one. */
  geminiProfile: z.string().min(1).default('default'),
  pagination: z.object({
    defaultPageSize: z.number().int().positive().default(20),
    maxPageSize: z.number().int().positive().default(100),
  }),
  staticAuth: z.object({
    /**
     * Allowed header values. EMPTY = gate disabled (auth off, pass-through).
     * Populated from `GEMINI_NAV_API_AUTH_SECRET` (comma-separated).
     */
    values: z.array(z.string().min(1)).default([]),
    headerName: z.string().min(1).default('X-Gemini-Nav-Auth'),
  }),
});

export type ApiConfig = z.infer<typeof ConfigSchema>;

const csv = (v: string | undefined): string[] =>
  v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

const positiveIntOrDefault = (name: string, v: string | undefined, d: number): number => {
  if (v === undefined || v === '') return d;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got '${v}'`);
  }
  return n;
};

const parseBool = (name: string, v: string): boolean => {
  const low = v.toLowerCase();
  if (low === 'true') return true;
  if (low === 'false') return false;
  throw new Error(`${name} must be 'true' or 'false', got '${v}'`);
};

/**
 * Build the validated API config from the environment.
 *
 * Static-auth secret precedence: shell env `GEMINI_NAV_API_AUTH_SECRET` (a
 * comma-separated list of accepted values). When absent/empty the gate is OFF
 * (no ConfigurationError — absence means "auth disabled", the local-run posture).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const raw = {
    port: positiveIntOrDefault('GEMINI_NAV_API_PORT', env.GEMINI_NAV_API_PORT ?? env.PORT, 3000),
    logLevel: env.LOG_LEVEL ?? 'info',
    swaggerUiEnabled:
      env.SWAGGER_UI_ENABLED === undefined || env.SWAGGER_UI_ENABLED === ''
        ? true
        : parseBool('SWAGGER_UI_ENABLED', env.SWAGGER_UI_ENABLED),
    geminiProfile: env.GEMINI_NAV_API_PROFILE ?? 'default',
    pagination: {
      defaultPageSize: positiveIntOrDefault('DEFAULT_PAGE_SIZE', env.DEFAULT_PAGE_SIZE, 20),
      maxPageSize: positiveIntOrDefault('MAX_PAGE_SIZE', env.MAX_PAGE_SIZE, 100),
    },
    staticAuth: {
      values: csv(env.GEMINI_NAV_API_AUTH_SECRET),
      headerName: env.GEMINI_NAV_API_AUTH_HEADER ?? 'X-Gemini-Nav-Auth',
    },
  };

  return ConfigSchema.parse(raw);
}
