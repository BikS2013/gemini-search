/**
 * `ApiError` — the typed HTTP error carrier for `gemini-nav-api`. Ported from the
 * reference `API/src/errors/api-error.ts`, extended with the codes the Gemini
 * backend surfaces (rate-limit, payload-too-large, etc.). The error-middleware
 * maps typed core errors (`RateLimitError`, `FileTooLargeError`, …) onto these.
 */

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PRECONDITION_FAILED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNPROCESSABLE_ENTITY'
  | 'BAD_REQUEST'
  | 'RATE_LIMITED'
  | 'CONFIG_MISSING'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL'
  | 'STATIC_AUTH_FAILED';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;
  /** Optional Retry-After value in seconds (set for 429 responses). */
  readonly retryAfterSec?: number;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: unknown,
    retryAfterSec?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSec = retryAfterSec;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static unauthenticated(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }
  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message: string): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string): ApiError {
    return new ApiError(409, 'CONFLICT', message);
  }
  static preconditionFailed(message = 'Precondition failed'): ApiError {
    return new ApiError(412, 'PRECONDITION_FAILED', message);
  }
  static payloadTooLarge(message: string): ApiError {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', message);
  }
  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }
  static rateLimited(message: string, retryAfterSec?: number): ApiError {
    return new ApiError(429, 'RATE_LIMITED', message, undefined, retryAfterSec);
  }
  static configMissing(message: string): ApiError {
    return new ApiError(500, 'CONFIG_MISSING', message);
  }
  static upstream(message: string): ApiError {
    return new ApiError(502, 'UPSTREAM_ERROR', message);
  }
  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, 'INTERNAL', message);
  }
}
