import { Router } from 'express';

/**
 * Liveness/readiness endpoints, mounted BEFORE auth. `/health` and `/healthz`
 * are simple liveness checks; `/readyz` runs any registered readiness checks.
 */
export type ReadinessChecks = {
  [name: string]: () => Promise<boolean>;
};

export function healthRouter(checks: ReadinessChecks = {}): Router {
  const r = Router();

  const liveness = (_req: unknown, res: import('express').Response): void => {
    res.json({ status: 'ok' });
  };
  r.get('/health', liveness);
  r.get('/healthz', liveness);

  r.get('/readyz', async (_req, res) => {
    const results: Record<string, boolean> = {};
    for (const [name, fn] of Object.entries(checks)) {
      try {
        results[name] = await fn();
      } catch {
        results[name] = false;
      }
    }
    const allPass = Object.values(results).every(Boolean);
    res.status(allPass ? 200 : 503).json({
      status: allPass ? 'ready' : 'not_ready',
      checks: results,
    });
  });

  return r;
}
