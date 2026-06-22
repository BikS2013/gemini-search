/**
 * Typed backend errors for the Gemini File Search limits and pitfalls.
 *
 * The `GenAiBackend` maps raw `@google/genai` failures and pre-upload
 * validation violations to these typed errors so every surface (CLI / HTTP API
 * / agent) can render a clear message and pick the right exit code / HTTP status
 * instead of crashing on an opaque API 4xx/5xx.
 *
 * Each error carries a stable `code` string for programmatic mapping
 * (e.g. the API error-middleware maps `RATE_LIMIT` -> HTTP 429).
 *
 * Limits referenced (research §Part 4 / version research §4):
 *   - 100 MB max per file
 *   - audio/video MIME types unsupported
 *   - ~10 stores/project soft cap
 *   - HTTP 429 = canonical rate-limit signal
 *   - upload operation.error set = failed import
 */

/** Base class for all typed backend errors — carries a stable `code`. */
export abstract class BackendError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A document file exceeds the per-file size limit (100 MB). */
export class FileTooLargeError extends BackendError {
  readonly code = 'FILE_TOO_LARGE';
  /** Actual file size in bytes. */
  readonly sizeBytes: number;
  /** The limit that was exceeded, in bytes. */
  readonly limitBytes: number;

  constructor(sizeBytes: number, limitBytes: number, detail?: string) {
    super(
      `File is ${sizeBytes} bytes, exceeding the ${limitBytes}-byte limit.` +
        (detail ? ` ${detail}` : ''),
    );
    this.sizeBytes = sizeBytes;
    this.limitBytes = limitBytes;
  }
}

/** A document's MIME type is not supported by File Search (e.g. audio/video). */
export class UnsupportedMimeTypeError extends BackendError {
  readonly code = 'UNSUPPORTED_MIME_TYPE';
  readonly mimeType: string;

  constructor(mimeType: string, detail?: string) {
    super(
      `MIME type "${mimeType}" is not supported by Gemini File Search.` +
        (detail ? ` ${detail}` : ''),
    );
    this.mimeType = mimeType;
  }
}

/** The store-count soft cap for the project was reached on createStore. */
export class StoreLimitError extends BackendError {
  readonly code = 'STORE_LIMIT';

  constructor(detail?: string) {
    super(
      `Store creation failed: the project store-count limit appears to be reached.` +
        (detail ? ` ${detail}` : ''),
    );
  }
}

/**
 * The API returned HTTP 429 (rate / quota exceeded). Carries `retryAfterMs`
 * when the response surfaced a retry hint, so callers can back off.
 */
export class RateLimitError extends BackendError {
  readonly code = 'RATE_LIMIT';
  readonly retryAfterMs?: number;

  constructor(detail?: string, retryAfterMs?: number) {
    super(
      `Gemini API rate limit exceeded (HTTP 429).` + (detail ? ` ${detail}` : ''),
    );
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * A long-running upload/import operation reported `error` (or otherwise failed
 * to produce a document name). Carries the raw operation error payload.
 */
export class UploadOperationError extends BackendError {
  readonly code = 'UPLOAD_OPERATION_FAILED';
  /** Raw `operation.error` payload, when present. */
  readonly operationError?: unknown;

  constructor(detail?: string, operationError?: unknown) {
    super(`Document upload operation failed.` + (detail ? ` ${detail}` : ''));
    this.operationError = operationError;
  }
}
