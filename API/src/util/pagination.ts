/**
 * Pagination helpers mapping HTTP query params to the backend's `Page`-based
 * model. The Gemini backend uses opaque page tokens (`pageToken` in /
 * `nextPageToken` out), so the API forwards them unchanged.
 */

import { ApiError } from '../errors/api-error.js';

export type PageInputs = {
  pageSize?: string;
  pageToken?: string;
};

export type PageParams = {
  pageSize: number;
  pageToken?: string;
};

export function parsePage(
  inputs: PageInputs,
  defaults: { defaultPageSize: number; maxPageSize: number },
): PageParams {
  let pageSize = defaults.defaultPageSize;
  if (inputs.pageSize !== undefined && inputs.pageSize !== '') {
    const n = Number(inputs.pageSize);
    if (!Number.isInteger(n) || n <= 0) {
      throw ApiError.badRequest('pageSize must be a positive integer');
    }
    if (n > defaults.maxPageSize) {
      throw ApiError.badRequest(`pageSize exceeds max ${defaults.maxPageSize}`);
    }
    pageSize = n;
  }
  return { pageSize, pageToken: inputs.pageToken };
}

/** Coerce a query-string value (string | string[] | undefined) to a string. */
export function asQueryString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

/**
 * Read a required path parameter as a string. Express 5 types `req.params`
 * values loosely; this narrows to a string or raises a 400 if absent.
 */
export function getParam(
  req: import('express').Request,
  name: string,
): string {
  const v = (req.params as Record<string, unknown>)[name];
  if (typeof v !== 'string' || v === '') {
    throw ApiError.badRequest(`path parameter "${name}" is required`);
  }
  return v;
}
