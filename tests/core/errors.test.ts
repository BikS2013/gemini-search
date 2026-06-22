/**
 * Tests for src/core/errors.ts
 *
 * Covers every typed backend error class:
 *  - BackendError abstract base (prototype chain, name, code, instanceof)
 *  - FileTooLargeError
 *  - UnsupportedMimeTypeError
 *  - StoreLimitError
 *  - RateLimitError
 *  - UploadOperationError
 */

import { describe, it, expect } from 'vitest';
import {
  BackendError,
  FileTooLargeError,
  UnsupportedMimeTypeError,
  StoreLimitError,
  RateLimitError,
  UploadOperationError,
} from '../../src/core/errors.js';

// ---------------------------------------------------------------------------
// BackendError (abstract — tested through subclasses)
// ---------------------------------------------------------------------------

describe('BackendError base', () => {
  it('every subclass is instanceof BackendError and instanceof Error', () => {
    const errors = [
      new FileTooLargeError(200, 100),
      new UnsupportedMimeTypeError('audio/mpeg'),
      new StoreLimitError(),
      new RateLimitError(),
      new UploadOperationError(),
    ];
    for (const e of errors) {
      expect(e).toBeInstanceOf(BackendError);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('sets .name to the concrete class name (not "BackendError" or "Error")', () => {
    expect(new FileTooLargeError(1, 2).name).toBe('FileTooLargeError');
    expect(new UnsupportedMimeTypeError('video/mp4').name).toBe('UnsupportedMimeTypeError');
    expect(new StoreLimitError().name).toBe('StoreLimitError');
    expect(new RateLimitError().name).toBe('RateLimitError');
    expect(new UploadOperationError().name).toBe('UploadOperationError');
  });

  it('prototype chain is correct for error type narrowing via instanceof', () => {
    const e = new RateLimitError();
    // This confirms the `Object.setPrototypeOf(this, new.target.prototype)` fix is applied
    expect(e instanceof RateLimitError).toBe(true);
    expect(e instanceof BackendError).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e instanceof FileTooLargeError).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FileTooLargeError
// ---------------------------------------------------------------------------

describe('FileTooLargeError', () => {
  it('has code FILE_TOO_LARGE', () => {
    expect(new FileTooLargeError(1, 2).code).toBe('FILE_TOO_LARGE');
  });

  it('carries sizeBytes and limitBytes', () => {
    const e = new FileTooLargeError(200_000_000, 100_000_000);
    expect(e.sizeBytes).toBe(200_000_000);
    expect(e.limitBytes).toBe(100_000_000);
  });

  it('message contains both sizes', () => {
    const e = new FileTooLargeError(200, 100);
    expect(e.message).toContain('200');
    expect(e.message).toContain('100');
  });

  it('appends detail when provided', () => {
    const e = new FileTooLargeError(200, 100, 'some/path/file.pdf');
    expect(e.message).toContain('some/path/file.pdf');
  });

  it('no detail → message does not contain trailing punctuation from detail', () => {
    const e = new FileTooLargeError(200, 100);
    // should not throw or produce corrupted messages
    expect(e.message).not.toContain('undefined');
  });
});

// ---------------------------------------------------------------------------
// UnsupportedMimeTypeError
// ---------------------------------------------------------------------------

describe('UnsupportedMimeTypeError', () => {
  it('has code UNSUPPORTED_MIME_TYPE', () => {
    expect(new UnsupportedMimeTypeError('audio/mpeg').code).toBe('UNSUPPORTED_MIME_TYPE');
  });

  it('carries the mimeType', () => {
    const e = new UnsupportedMimeTypeError('video/mp4');
    expect(e.mimeType).toBe('video/mp4');
  });

  it('message includes the MIME type', () => {
    const e = new UnsupportedMimeTypeError('audio/wav');
    expect(e.message).toContain('audio/wav');
  });

  it('appends detail when provided', () => {
    const e = new UnsupportedMimeTypeError('video/webm', 'File: clip.webm');
    expect(e.message).toContain('clip.webm');
  });

  it('no detail → message does not contain "undefined"', () => {
    const e = new UnsupportedMimeTypeError('audio/ogg');
    expect(e.message).not.toContain('undefined');
  });
});

// ---------------------------------------------------------------------------
// StoreLimitError
// ---------------------------------------------------------------------------

describe('StoreLimitError', () => {
  it('has code STORE_LIMIT', () => {
    expect(new StoreLimitError().code).toBe('STORE_LIMIT');
  });

  it('message mentions store creation and limit', () => {
    const e = new StoreLimitError();
    expect(e.message.toLowerCase()).toContain('store');
    expect(e.message.toLowerCase()).toContain('limit');
  });

  it('appends detail when provided', () => {
    const e = new StoreLimitError('Only 10 stores allowed per project.');
    expect(e.message).toContain('Only 10 stores allowed');
  });

  it('no detail → message does not contain "undefined"', () => {
    expect(new StoreLimitError().message).not.toContain('undefined');
  });
});

// ---------------------------------------------------------------------------
// RateLimitError
// ---------------------------------------------------------------------------

describe('RateLimitError', () => {
  it('has code RATE_LIMIT', () => {
    expect(new RateLimitError().code).toBe('RATE_LIMIT');
  });

  it('message mentions 429', () => {
    expect(new RateLimitError().message).toContain('429');
  });

  it('retryAfterMs is undefined when not supplied', () => {
    expect(new RateLimitError().retryAfterMs).toBeUndefined();
  });

  it('carries retryAfterMs when provided', () => {
    const e = new RateLimitError('Too many calls', 5000);
    expect(e.retryAfterMs).toBe(5000);
  });

  it('appends detail when provided', () => {
    const e = new RateLimitError('Quota exhausted');
    expect(e.message).toContain('Quota exhausted');
  });

  it('no detail → message does not contain "undefined"', () => {
    expect(new RateLimitError().message).not.toContain('undefined');
  });
});

// ---------------------------------------------------------------------------
// UploadOperationError
// ---------------------------------------------------------------------------

describe('UploadOperationError', () => {
  it('has code UPLOAD_OPERATION_FAILED', () => {
    expect(new UploadOperationError().code).toBe('UPLOAD_OPERATION_FAILED');
  });

  it('operationError is undefined when not supplied', () => {
    expect(new UploadOperationError().operationError).toBeUndefined();
  });

  it('carries operationError when provided', () => {
    const payload = { code: 500, message: 'internal' };
    const e = new UploadOperationError('Import failed', payload);
    expect(e.operationError).toEqual(payload);
  });

  it('accepts any value for operationError (unknown type)', () => {
    const e = new UploadOperationError('bad', 'string error payload');
    expect(e.operationError).toBe('string error payload');
  });

  it('appends detail when provided', () => {
    const e = new UploadOperationError('Did not complete within 300s');
    expect(e.message).toContain('Did not complete within 300s');
  });

  it('no detail → message does not contain "undefined"', () => {
    expect(new UploadOperationError().message).not.toContain('undefined');
  });
});
