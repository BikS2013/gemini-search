/**
 * Document routes — map 1:1 to `IGeminiBackend` document ops:
 *   GET    /stores/:name/documents               -> listDocuments (paginated)
 *   GET    /stores/:name/documents/:doc          -> getDocument
 *   POST   /stores/:name/documents               -> uploadDocument  ({ filePath })
 *   DELETE /stores/:name/documents/:doc?force=   -> deleteDocument  (204)
 *
 * Upload accepts a JSON body `{ filePath, displayName?, waitActive? }`. The
 * server reads the file from a path it can access (local-run posture); multipart
 * upload is deferred (see report). `?waitActive=true` blocks until STATE_ACTIVE.
 */

import { Router } from 'express';
import type { ApiConfig } from '../config.js';
import { ApiError } from '../errors/api-error.js';
import { parsePage, asQueryString, getParam } from '../util/pagination.js';
import { type BackendFactory, resolveProfile, wrap } from './stores.js';

export function documentsRouter(
  backendFactory: BackendFactory,
  config: ApiConfig,
): Router {
  const r = Router();

  r.get(
    '/stores/:name/documents',
    wrap(async (req, res) => {
      const storeName = decodeURIComponent(getParam(req, 'name'));
      const { pageSize, pageToken } = parsePage(
        {
          pageSize: asQueryString(req.query.pageSize),
          pageToken: asQueryString(req.query.pageToken),
        },
        config.pagination,
      );
      const backend = backendFactory(resolveProfile(req, config));
      const page = await backend.listDocuments(storeName, { pageSize, pageToken });
      res.json({ items: page.items, nextPageToken: page.nextPageToken });
    }),
  );

  r.get(
    '/stores/:name/documents/:doc',
    wrap(async (req, res) => {
      const docName = decodeURIComponent(getParam(req, 'doc'));
      const backend = backendFactory(resolveProfile(req, config));
      const doc = await backend.getDocument(docName);
      res.json(doc);
    }),
  );

  r.post(
    '/stores/:name/documents',
    wrap(async (req, res) => {
      const storeName = decodeURIComponent(getParam(req, 'name'));
      const body = (req.body ?? {}) as {
        filePath?: unknown;
        displayName?: unknown;
        mimeType?: unknown;
        waitActive?: unknown;
      };
      if (typeof body.filePath !== 'string' || body.filePath.trim() === '') {
        throw ApiError.badRequest('body.filePath (non-empty string) is required');
      }
      const displayName =
        typeof body.displayName === 'string' ? body.displayName : undefined;
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType : undefined;
      const waitActive =
        body.waitActive === true || asQueryString(req.query.waitActive) === 'true';
      const backend = backendFactory(resolveProfile(req, config));
      const doc = await backend.uploadDocument(storeName, body.filePath, {
        displayName,
        mimeType,
        waitActive,
      });
      res.status(201).json(doc);
    }),
  );

  r.delete(
    '/stores/:name/documents/:doc',
    wrap(async (req, res) => {
      const docName = decodeURIComponent(getParam(req, 'doc'));
      const force = asQueryString(req.query.force) === 'true';
      const backend = backendFactory(resolveProfile(req, config));
      await backend.deleteDocument(docName, force);
      res.status(204).end();
    }),
  );

  return r;
}
