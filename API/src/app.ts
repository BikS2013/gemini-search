/**
 * `buildApp` — assembles the `gemini-nav-api` Express 5 application over the
 * `IGeminiBackend` abstraction. Mirrors the reference `app.ts` minus the entire
 * OIDC/RBAC + Azure subsystem: the ONLY auth is the opt-in static-header gate.
 *
 * Middleware order:
 *   json body -> request-id -> pino-http
 *   -> openapi + health routers (BEFORE auth)
 *   -> staticAuthMiddleware (pass-through when no secret configured)
 *   -> stores / documents / query routers
 *   -> errorMiddleware
 */

import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import type { IGeminiBackend } from '../../src/core/backend/backend.js';
import type { ApiConfig } from './config.js';
import { logger } from './observability/logger.js';
import { requestIdMiddleware } from './observability/request-id.js';
import { errorMiddleware } from './errors/error-middleware.js';
import { staticAuthMiddleware } from './auth/static-auth.js';
import { healthRouter, type ReadinessChecks } from './routes/health.js';
import { openapiRouter } from './routes/openapi.js';
import { storesRouter } from './routes/stores.js';
import { documentsRouter } from './routes/documents.js';
import { queryRouter } from './routes/query.js';

export interface BuildAppDeps {
  config: ApiConfig;
  /** Builds an `IGeminiBackend` for the given profile (injected for testing). */
  backendFactory: (profile: string) => IGeminiBackend;
  readinessChecks?: ReadinessChecks;
}

export function buildApp(deps: BuildAppDeps): Express {
  const { config, backendFactory } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware());

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customSuccessMessage: (req, res) =>
        `${req.method} ${(req as express.Request).originalUrl} ${res.statusCode}`,
      customErrorMessage: (req, res) =>
        `${req.method} ${(req as express.Request).originalUrl} ${res.statusCode}`,
    }),
  );

  // Pre-auth: docs + liveness.
  app.use(openapiRouter(config));
  app.use(healthRouter(deps.readinessChecks));

  // Opt-in static-auth gate. Empty allowed-values => pass-through (auth OFF).
  if (config.staticAuth.values.length === 0) {
    logger.warn(
      'static-header auth is DISABLED (no GEMINI_NAV_API_AUTH_SECRET configured); API is running OPEN — intended for local-run only',
    );
  } else {
    logger.info(
      { headerName: config.staticAuth.headerName },
      'static-header auth ENABLED',
    );
  }
  app.use(staticAuthMiddleware(config.staticAuth.values, config.staticAuth.headerName));

  // Data plane (all behind the gate when enabled).
  app.use(storesRouter(backendFactory, config));
  app.use(documentsRouter(backendFactory, config));
  app.use(queryRouter(backendFactory, config));

  app.use(errorMiddleware());
  return app;
}
