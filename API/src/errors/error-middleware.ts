/**
 * Express error-handling middleware. Maps:
 *   - `ApiError`                  -> its own status/code (verbatim)
 *   - core `ConfigurationError`   -> 500 CONFIG_MISSING (no-fallback rule)
 *   - core `RateLimitError`       -> 429 RATE_LIMITED (+ Retry-After)
 *   - core `FileTooLargeError`    -> 413 PAYLOAD_TOO_LARGE
 *   - core `UnsupportedMimeTypeError` -> 422 UNPROCESSABLE_ENTITY
 *   - core `StoreLimitError`      -> 409 CONFLICT
 *   - core `UploadOperationError` -> 502 UPSTREAM_ERROR
 *   - anything else               -> 500 INTERNAL (message hidden)
 *
 * The design's error table (§"API & Interface Contracts") binds these mappings.
 */

import type { ErrorRequestHandler } from 'express';
import { ApiError } from './api-error.js';
import { logger } from '../observability/logger.js';
import { ConfigurationError } from '../../../src/config/config-error.js';
import {
  RateLimitError,
  FileTooLargeError,
  UnsupportedMimeTypeError,
  StoreLimitError,
  UploadOperationError,
} from '../../../src/core/errors.js';

/** Translate a typed core/backend error into an `ApiError`. */
function toApiError(err: unknown): ApiError | undefined {
  if (err instanceof ApiError) return err;
  if (err instanceof ConfigurationError) {
    return ApiError.configMissing(err.message);
  }
  if (err instanceof RateLimitError) {
    const retryAfterSec =
      typeof err.retryAfterMs === 'number'
        ? Math.max(1, Math.ceil(err.retryAfterMs / 1000))
        : undefined;
    return ApiError.rateLimited(err.message, retryAfterSec);
  }
  if (err instanceof FileTooLargeError) {
    return ApiError.payloadTooLarge(err.message);
  }
  if (err instanceof UnsupportedMimeTypeError) {
    return ApiError.unprocessable(err.message);
  }
  if (err instanceof StoreLimitError) {
    return ApiError.conflict(err.message);
  }
  if (err instanceof UploadOperationError) {
    return ApiError.upstream(err.message);
  }
  return undefined;
}

export function errorMiddleware(): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const correlationId = req.requestId ?? 'unknown';
    const apiErr = toApiError(err);

    if (apiErr) {
      const level = apiErr.status >= 500 ? 'error' : 'warn';
      logger[level](
        { correlationId, code: apiErr.code, status: apiErr.status },
        apiErr.message,
      );
      if (apiErr.retryAfterSec !== undefined) {
        res.setHeader('Retry-After', String(apiErr.retryAfterSec));
      }
      res.status(apiErr.status).json({
        error: { code: apiErr.code, message: apiErr.message, correlationId },
      });
      return;
    }

    logger.error({ correlationId, err }, 'unhandled error');
    res.status(500).json({
      error: { code: 'INTERNAL', message: 'Internal server error', correlationId },
    });
  };
}
