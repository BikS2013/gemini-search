/**
 * Store routes — map 1:1 to `IGeminiBackend` store ops (design endpoint table):
 *   GET    /stores                 -> listStores   (paginated)
 *   GET    /stores/:name           -> getStore
 *   POST   /stores                 -> createStore
 *   DELETE /stores/:name?force=    -> deleteStore   (204)
 *
 * The Gemini profile is selected per-request from the `X-Gemini-Nav-Profile`
 * header or `?profile=` query, falling back to the configured default.
 */

import { Router } from 'express';
import type { IGeminiBackend } from '../../../src/core/backend/backend.js';
import type { ApiConfig } from '../config.js';
import { ApiError } from '../errors/api-error.js';
import { parsePage, asQueryString, getParam } from '../util/pagination.js';

export type BackendFactory = (profile: string) => IGeminiBackend;

/** Resolve the profile for a request: header > query > config default. */
export function resolveProfile(
  req: import('express').Request,
  config: ApiConfig,
): string {
  const header = req.header('X-Gemini-Nav-Profile');
  if (header && header.trim() !== '') return header.trim();
  const q = asQueryString(req.query.profile);
  if (q && q.trim() !== '') return q.trim();
  return config.geminiProfile;
}

/** Async route wrapper — forwards rejections to the error middleware. */
export function wrap(
  fn: (
    req: import('express').Request,
    res: import('express').Response,
  ) => Promise<void>,
): import('express').RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export function storesRouter(backendFactory: BackendFactory, config: ApiConfig): Router {
  const r = Router();

  r.get(
    '/stores',
    wrap(async (req, res) => {
      const backend = backendFactory(resolveProfile(req, config));
      const { pageSize, pageToken } = parsePage(
        {
          pageSize: asQueryString(req.query.pageSize),
          pageToken: asQueryString(req.query.pageToken),
        },
        config.pagination,
      );
      const page = await backend.listStores({ pageSize, pageToken });
      res.json({ items: page.items, nextPageToken: page.nextPageToken });
    }),
  );

  r.post(
    '/stores',
    wrap(async (req, res) => {
      const body = (req.body ?? {}) as {
        displayName?: unknown;
        embeddingModel?: unknown;
      };
      if (typeof body.displayName !== 'string' || body.displayName.trim() === '') {
        throw ApiError.badRequest('body.displayName (non-empty string) is required');
      }
      const embeddingModel =
        typeof body.embeddingModel === 'string' ? body.embeddingModel : undefined;
      const backend = backendFactory(resolveProfile(req, config));
      const store = await backend.createStore(body.displayName, { embeddingModel });
      res.status(201).json(store);
    }),
  );

  r.get(
    '/stores/:name',
    wrap(async (req, res) => {
      const name = decodeURIComponent(getParam(req, 'name'));
      const backend = backendFactory(resolveProfile(req, config));
      const store = await backend.getStore(name);
      res.json(store);
    }),
  );

  r.delete(
    '/stores/:name',
    wrap(async (req, res) => {
      const name = decodeURIComponent(getParam(req, 'name'));
      const force = asQueryString(req.query.force) === 'true';
      const backend = backendFactory(resolveProfile(req, config));
      await backend.deleteStore(name, force);
      res.status(204).end();
    }),
  );

  return r;
}
