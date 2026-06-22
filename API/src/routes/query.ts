/**
 * Query route — maps to `IGeminiBackend.query`:
 *   POST /stores/:name/query
 *     body { prompt, model?, metadataFilter?, storeNames? }
 *     ?raw=true -> returns the raw groundingMetadata subtree instead of the
 *                  normalized QueryResult.
 *
 * `storeNames` (optional) supports multi-store queries; when omitted the path
 * `:name` is the single target store.
 */

import { Router } from 'express';
import type { ApiConfig } from '../config.js';
import { ApiError } from '../errors/api-error.js';
import { asQueryString, getParam } from '../util/pagination.js';
import { type BackendFactory, resolveProfile, wrap } from './stores.js';

export function queryRouter(backendFactory: BackendFactory, config: ApiConfig): Router {
  const r = Router();

  r.post(
    '/stores/:name/query',
    wrap(async (req, res) => {
      const storeName = decodeURIComponent(getParam(req, 'name'));
      const body = (req.body ?? {}) as {
        prompt?: unknown;
        model?: unknown;
        metadataFilter?: unknown;
        storeNames?: unknown;
      };
      if (typeof body.prompt !== 'string' || body.prompt.trim() === '') {
        throw ApiError.badRequest('body.prompt (non-empty string) is required');
      }
      const model = typeof body.model === 'string' ? body.model : undefined;
      const metadataFilter =
        typeof body.metadataFilter === 'string' ? body.metadataFilter : undefined;

      let storeNames: string[] = [storeName];
      if (Array.isArray(body.storeNames) && body.storeNames.length > 0) {
        const all = body.storeNames.filter((s): s is string => typeof s === 'string');
        if (all.length !== body.storeNames.length) {
          throw ApiError.badRequest('body.storeNames must be an array of strings');
        }
        storeNames = all;
      }

      const backend = backendFactory(resolveProfile(req, config));
      const result = await backend.query(storeNames, body.prompt, {
        model,
        metadataFilter,
      });

      const raw = asQueryString(req.query.raw) === 'true';
      if (raw) {
        res.json({ raw: result.raw ?? null });
        return;
      }
      res.json(result);
    }),
  );

  return r;
}
