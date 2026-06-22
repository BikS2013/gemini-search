/**
 * Listener entrypoint for `gemini-nav-api`. Loads config (no fallback for genuine
 * secrets — the backend factory raises ConfigurationError lazily when a profile
 * has no resolvable key), builds the app with the real `makeBackend` factory,
 * and listens on the configured port.
 */

import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { logger } from './observability/logger.js';
import { makeBackend } from '../../src/core/backend/factory.js';

function main(): void {
  const config = loadConfig();
  logger.level = config.logLevel;

  const app = buildApp({
    config,
    // Each request resolves a backend for its profile via the shared core factory.
    backendFactory: (profile: string) => makeBackend(profile),
  });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'gemini-nav-api listening');
  });
  server.on('error', (err) => {
    logger.error({ err, port: config.port }, 'failed to bind port');
    process.exit(1);
  });
}

main();
