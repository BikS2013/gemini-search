/**
 * Tests for src/electron/ipc-handlers.ts
 *
 * Strategy:
 *  1. Mock `electron` using vi.mock with the globalIpcMain singleton from
 *     electron-mock.ts. The mock factory imports the singleton synchronously.
 *  2. Mock profile-state and registry-service so handlers run without real I/O.
 *  3. Call registerIpcHandlers, then drive each handler through globalIpcMain
 *     to test the run<T>() error-mapping, envelope shaping, and sender validation.
 *
 * Covers:
 *  - BackendError subclasses → { code: err.code, message: redacted }
 *  - ConfigurationError → { code: 'CONFIGURATION_ERROR', message: redacted }
 *  - Unknown error → { code: 'INTERNAL', message: 'Internal error' } (opaque)
 *  - No stack / cause / operationError leaked in any error envelope
 *  - assertTrustedSender: untrusted URL → INTERNAL (sender validation)
 *  - Success envelopes: OkVoid { done: true }, OkBool { removed: boolean }
 *  - query:run strips raw from result (QueryResult.raw not forwarded)
 *  - emitUploadProgress guards against destroyed window
 *  - docs:upload / docs:replace waitActive lifecycle events
 *  - All 15 channels are registered
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Electron mock — must be the FIRST vi.mock so the electron import resolves
// before ipc-handlers.ts is loaded.
// The vi.mock factory imports electron-mock.ts synchronously; vitest hoists
// vi.mock calls before any other code, so the factory runs first.
// ---------------------------------------------------------------------------

vi.mock('electron', async () => {
  const { globalIpcMain } = await import('./electron-mock.js');
  return { ipcMain: globalIpcMain };
});

// Mock profile-state and registry-service before importing ipc-handlers
vi.mock('../../src/electron/profile-state.js', () => ({
  getActiveProfile: vi.fn(() => 'default'),
  getBackend: vi.fn(),
  listProfileSummaries: vi.fn(() => [{ name: 'default', keyMode: 'stored' }]),
  selectProfile: vi.fn(),
}));

vi.mock('../../src/electron/registry-service.js', () => ({
  registryList: vi.fn(() => []),
  registryRefresh: vi.fn(async () => []),
  registryPrune: vi.fn(() => true),
}));

// ---------------------------------------------------------------------------
// Imports after vi.mock declarations
// ---------------------------------------------------------------------------

import {
  globalIpcMain,
  createMockBrowserWindow,
  type MockIpcMain,
  type MockBrowserWindow,
} from './electron-mock.js';
import {
  FileTooLargeError,
  UnsupportedMimeTypeError,
  StoreLimitError,
  RateLimitError,
  UploadOperationError,
} from '../../src/core/errors.js';
import { ConfigurationError } from '../../src/config/config-error.js';
import * as profileState from '../../src/electron/profile-state.js';
import * as registryService from '../../src/electron/registry-service.js';
import { registerIpcHandlers, emitUploadProgress } from '../../src/electron/ipc-handlers.js';

// ---------------------------------------------------------------------------
// Backend stub
// ---------------------------------------------------------------------------

const mockBackend = {
  listStores: vi.fn(),
  getStore: vi.fn(),
  createStore: vi.fn(),
  deleteStore: vi.fn(),
  listDocuments: vi.fn(),
  getDocument: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  replaceDocument: vi.fn(),
  query: vi.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RENDERER_URL = 'file:///app/public/index.html';

function makeTrustedEvent(): { senderFrame: { url: string } } {
  return { senderFrame: { url: RENDERER_URL } };
}

function makeUntrustedEvent(): { senderFrame: { url: string } } {
  return { senderFrame: { url: 'https://evil.example.com/malicious' } };
}

async function invokeChannel(
  ipcMain: MockIpcMain,
  channel: string,
  event: unknown,
  ...args: unknown[]
): Promise<{ ok: boolean; data?: unknown; error?: { code: string; message: string } }> {
  return ipcMain.invoke(channel, event, ...args) as Promise<{
    ok: boolean;
    data?: unknown;
    error?: { code: string; message: string };
  }>;
}

// ---------------------------------------------------------------------------
// Per-test setup
// ---------------------------------------------------------------------------

let mockWin: MockBrowserWindow;

beforeEach(() => {
  vi.clearAllMocks();
  globalIpcMain.reset();
  mockWin = createMockBrowserWindow();

  // Default success responses
  mockBackend.listStores.mockResolvedValue({ items: [], nextPageToken: null });
  mockBackend.getStore.mockResolvedValue({ apiName: 'fileSearchStores/s1', displayName: 'S1' });
  mockBackend.createStore.mockResolvedValue({ apiName: 'fileSearchStores/new', displayName: 'New' });
  mockBackend.deleteStore.mockResolvedValue(undefined);
  mockBackend.listDocuments.mockResolvedValue({ items: [], nextPageToken: null });
  mockBackend.getDocument.mockResolvedValue({ apiName: 'docs/d1', displayName: 'D1' });
  mockBackend.uploadDocument.mockResolvedValue({ apiName: 'docs/uploaded', displayName: 'Up' });
  mockBackend.deleteDocument.mockResolvedValue(undefined);
  mockBackend.replaceDocument.mockResolvedValue({ apiName: 'docs/replaced', displayName: 'Re' });
  mockBackend.query.mockResolvedValue({
    answer: 'The answer.',
    sources: [],
    citations: [],
    finishReason: 'STOP',
    raw: { grounding: 'internal-only' },
  });

  vi.mocked(profileState.getBackend).mockReturnValue(mockBackend as never);
  vi.mocked(profileState.getActiveProfile).mockReturnValue('default');
  vi.mocked(profileState.listProfileSummaries).mockReturnValue([
    { name: 'default', keyMode: 'stored' },
  ]);
  vi.mocked(profileState.selectProfile).mockReturnValue(undefined);
  vi.mocked(registryService.registryList).mockReturnValue([]);
  vi.mocked(registryService.registryRefresh).mockResolvedValue([]);
  vi.mocked(registryService.registryPrune).mockReturnValue(true);

  // Register all handlers
  registerIpcHandlers(RENDERER_URL, mockWin as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// All 15 channels are registered
// ---------------------------------------------------------------------------

describe('registerIpcHandlers — channel registration', () => {
  it('registers exactly 15 invoke channels', () => {
    expect(globalIpcMain.invokeHandlerNames()).toHaveLength(15);
  });

  it('does not register invoke channels as emitter events (real-Electron fidelity)', () => {
    // Regression guard: real Electron's ipcMain.handle does NOT populate
    // eventNames(); the startup drift-guard must not depend on it.
    expect(globalIpcMain.eventNames()).toHaveLength(0);
  });

  const expectedChannels = [
    'stores:list', 'stores:get', 'stores:create', 'stores:delete',
    'docs:list', 'docs:get', 'docs:upload', 'docs:delete', 'docs:replace',
    'query:run',
    'registry:list', 'registry:refresh', 'registry:prune',
    'profiles:list', 'profiles:select',
  ];

  for (const ch of expectedChannels) {
    it(`registers channel "${ch}"`, () => {
      expect(globalIpcMain.invokeHandlerNames()).toContain(ch);
    });
  }
});

// ---------------------------------------------------------------------------
// Error mapping: BackendError subclasses
// ---------------------------------------------------------------------------

describe('run<T>() — BackendError mapping', () => {
  it('maps FileTooLargeError to { code: FILE_TOO_LARGE }', async () => {
    mockBackend.uploadDocument.mockRejectedValue(new FileTooLargeError(200_000_000, 100_000_000));
    const result = await invokeChannel(
      globalIpcMain, 'docs:upload', makeTrustedEvent(),
      { requestId: 'r1', storeApiName: 'stores/s', filePath: '/tmp/f.pdf', waitActive: false },
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('FILE_TOO_LARGE');
    expect((result.error?.message ?? '').length).toBeGreaterThan(0);
  });

  it('maps UnsupportedMimeTypeError to { code: UNSUPPORTED_MIME_TYPE }', async () => {
    mockBackend.uploadDocument.mockRejectedValue(new UnsupportedMimeTypeError('video/mp4'));
    const result = await invokeChannel(
      globalIpcMain, 'docs:upload', makeTrustedEvent(),
      { requestId: 'r2', storeApiName: 'stores/s', filePath: '/tmp/f.mp4', waitActive: false },
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UNSUPPORTED_MIME_TYPE');
  });

  it('maps StoreLimitError to { code: STORE_LIMIT }', async () => {
    mockBackend.createStore.mockRejectedValue(new StoreLimitError());
    const result = await invokeChannel(
      globalIpcMain, 'stores:create', makeTrustedEvent(), { displayName: 'New Store' },
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('STORE_LIMIT');
  });

  it('maps RateLimitError to { code: RATE_LIMIT }', async () => {
    mockBackend.listStores.mockRejectedValue(new RateLimitError('quota exceeded'));
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('RATE_LIMIT');
  });

  it('maps UploadOperationError to { code: UPLOAD_OPERATION_FAILED }', async () => {
    mockBackend.uploadDocument.mockRejectedValue(
      new UploadOperationError('operation timed out', { code: 500 }),
    );
    const result = await invokeChannel(
      globalIpcMain, 'docs:upload', makeTrustedEvent(),
      { requestId: 'r3', storeApiName: 'stores/s', filePath: '/tmp/f.pdf', waitActive: false },
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('UPLOAD_OPERATION_FAILED');
  });

  it('does NOT leak operationError in UploadOperationError envelope', async () => {
    const opError = { code: 500, message: 'internal-detail', secret: 'key-material' };
    mockBackend.uploadDocument.mockRejectedValue(new UploadOperationError('failed', opError));
    const result = await invokeChannel(
      globalIpcMain, 'docs:upload', makeTrustedEvent(),
      { requestId: 'r4', storeApiName: 'stores/s', filePath: '/tmp/f.pdf', waitActive: false },
    );
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('operationError');
    expect(serialized).not.toContain('internal-detail');
    expect(serialized).not.toContain('key-material');
  });

  it('error envelope has no stack field for BackendError', async () => {
    mockBackend.listStores.mockRejectedValue(new StoreLimitError('test'));
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect('stack' in (result.error ?? {})).toBe(false);
  });

  it('error envelope has no cause field for BackendError', async () => {
    mockBackend.listStores.mockRejectedValue(new RateLimitError());
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect('cause' in (result.error ?? {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Error mapping: ConfigurationError
// ---------------------------------------------------------------------------

describe('run<T>() — ConfigurationError mapping', () => {
  it('maps ConfigurationError to { code: CONFIGURATION_ERROR }', async () => {
    vi.mocked(profileState.getBackend).mockImplementation(() => {
      throw new ConfigurationError('active profile', ['Electron profile selection']);
    });
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('CONFIGURATION_ERROR');
  });

  it('ConfigurationError message is included in the envelope', async () => {
    vi.mocked(profileState.getBackend).mockImplementation(() => {
      throw new ConfigurationError('active profile', ['Electron profile selection']);
    });
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect((result.error?.message ?? '').length).toBeGreaterThan(0);
  });

  it('ConfigurationError envelope has no stack field', async () => {
    vi.mocked(profileState.getBackend).mockImplementation(() => {
      throw new ConfigurationError('setting', ['source']);
    });
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect('stack' in (result.error ?? {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Error mapping: unknown / unexpected errors
// ---------------------------------------------------------------------------

describe('run<T>() — unknown error mapping', () => {
  it('maps any unknown error to { code: INTERNAL, message: "Internal error" }', async () => {
    mockBackend.listStores.mockRejectedValue(new Error('unexpected db timeout'));
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INTERNAL');
    expect(result.error?.message).toBe('Internal error');
  });

  it('does NOT reflect the raw error message for unknown errors', async () => {
    mockBackend.listStores.mockRejectedValue(new Error('SECRET_KEY=AIzaABCDEFGH internals'));
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.message).toBe('Internal error');
    expect(JSON.stringify(result)).not.toContain('SECRET_KEY');
  });

  it('does NOT include a stack in the unknown error envelope', async () => {
    mockBackend.createStore.mockRejectedValue(new Error('crash'));
    const result = await invokeChannel(
      globalIpcMain, 'stores:create', makeTrustedEvent(), { displayName: 'X' },
    );
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('.test.ts');
  });

  it('maps a thrown string to INTERNAL', async () => {
    mockBackend.listStores.mockRejectedValue('something went wrong');
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INTERNAL');
    expect(result.error?.message).toBe('Internal error');
  });

  it('maps a thrown null to INTERNAL', async () => {
    mockBackend.listStores.mockRejectedValue(null);
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INTERNAL');
  });
});

// ---------------------------------------------------------------------------
// Sender validation
// ---------------------------------------------------------------------------

describe('assertTrustedSender', () => {
  it('trusted sender yields ok:true on success', async () => {
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(true);
  });

  it('untrusted sender yields ok:false with code INTERNAL', async () => {
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeUntrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INTERNAL');
  });

  it('untrusted sender does NOT echo the sender URL in the error', async () => {
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeUntrustedEvent(), {});
    expect(JSON.stringify(result)).not.toContain('evil.example.com');
  });

  it('null senderFrame yields INTERNAL', async () => {
    const result = await invokeChannel(
      globalIpcMain, 'stores:list', { senderFrame: null }, {},
    );
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INTERNAL');
  });

  it('undefined senderFrame yields INTERNAL', async () => {
    const result = await invokeChannel(globalIpcMain, 'stores:list', {}, {});
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('INTERNAL');
  });
});

// ---------------------------------------------------------------------------
// query:run — raw field stripping
// ---------------------------------------------------------------------------

describe('query:run — QueryResult.raw stripping', () => {
  it('returns ok:true with answer, sources, citations, finishReason', async () => {
    mockBackend.query.mockResolvedValue({
      answer: 'The answer is 42.',
      sources: [{ title: 'Source 1' }],
      citations: [{ startIndex: 0, endIndex: 3 }],
      finishReason: 'STOP',
      raw: { grounding: 'should-be-stripped', secret: 'hidden' },
    });
    const result = await invokeChannel(
      globalIpcMain, 'query:run', makeTrustedEvent(),
      { storeApiNames: ['stores/s1'], prompt: 'What is the answer?' },
    );
    expect(result.ok).toBe(true);
    const data = result.data as {
      answer: string;
      sources: unknown[];
      citations: unknown[];
      finishReason: string;
      raw?: unknown;
    };
    expect(data.answer).toBe('The answer is 42.');
    expect(data.sources).toHaveLength(1);
    expect(data.citations).toHaveLength(1);
    expect(data.finishReason).toBe('STOP');
  });

  it('strips raw field from query:run response', async () => {
    mockBackend.query.mockResolvedValue({
      answer: 'answer',
      sources: [],
      citations: [],
      finishReason: 'STOP',
      raw: { grounding: 'internal', secret: 'key-material' },
    });
    const result = await invokeChannel(
      globalIpcMain, 'query:run', makeTrustedEvent(),
      { storeApiNames: ['stores/s1'], prompt: 'q' },
    );
    expect(result.ok).toBe(true);
    const serialized = JSON.stringify(result.data);
    expect(serialized).not.toContain('grounding');
    expect(serialized).not.toContain('key-material');
    expect('raw' in (result.data as object)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Success envelopes: OkVoid and OkBool
// ---------------------------------------------------------------------------

describe('stores:delete — OkVoid envelope', () => {
  it('returns { ok: true, data: { done: true } }', async () => {
    mockBackend.deleteStore.mockResolvedValue(undefined);
    const result = await invokeChannel(
      globalIpcMain, 'stores:delete', makeTrustedEvent(),
      { apiName: 'fileSearchStores/s1', force: false },
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ done: true });
  });
});

describe('docs:delete — OkVoid envelope', () => {
  it('returns { ok: true, data: { done: true } }', async () => {
    mockBackend.deleteDocument.mockResolvedValue(undefined);
    const result = await invokeChannel(
      globalIpcMain, 'docs:delete', makeTrustedEvent(),
      { documentApiName: 'fileSearchStores/s1/documents/d1', force: false },
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ done: true });
  });
});

describe('profiles:select — OkVoid envelope', () => {
  it('returns { ok: true, data: { done: true } }', async () => {
    vi.mocked(profileState.selectProfile).mockReturnValue(undefined);
    const result = await invokeChannel(
      globalIpcMain, 'profiles:select', makeTrustedEvent(), { name: 'prod' },
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ done: true });
  });
});

describe('registry:prune — OkBool envelope', () => {
  it('returns { ok: true, data: { removed: true } } when entry exists', async () => {
    vi.mocked(registryService.registryPrune).mockReturnValue(true);
    const result = await invokeChannel(
      globalIpcMain, 'registry:prune', makeTrustedEvent(),
      { apiName: 'fileSearchStores/stale' },
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ removed: true });
  });

  it('returns { ok: true, data: { removed: false } } when entry not found', async () => {
    vi.mocked(registryService.registryPrune).mockReturnValue(false);
    const result = await invokeChannel(
      globalIpcMain, 'registry:prune', makeTrustedEvent(),
      { apiName: 'fileSearchStores/nonexistent' },
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ removed: false });
  });
});

// ---------------------------------------------------------------------------
// emitUploadProgress — destroyed window guard
// ---------------------------------------------------------------------------

describe('emitUploadProgress — destroyed window guard', () => {
  it('sends upload:progress event to alive window', () => {
    const payload = { requestId: 'r1', state: 'STATE_PENDING' as const };
    emitUploadProgress(mockWin as never, payload);
    expect(mockWin.webContents.sent).toHaveLength(1);
    expect(mockWin.webContents.sent[0].channel).toBe('upload:progress');
    expect(mockWin.webContents.sent[0].payload).toEqual(payload);
  });

  it('does NOT send to a destroyed window', () => {
    mockWin.destroy();
    emitUploadProgress(mockWin as never, { requestId: 'r2', state: 'STATE_FAILED' as const });
    expect(mockWin.webContents.sent).toHaveLength(0);
  });

  it('sends STATE_ACTIVE payload with documentApiName', () => {
    const payload = {
      requestId: 'r3',
      state: 'STATE_ACTIVE' as const,
      documentApiName: 'fileSearchStores/s1/documents/d1',
    };
    emitUploadProgress(mockWin as never, payload);
    expect(mockWin.webContents.sent[0].payload).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// docs:upload — waitActive progress emission
// ---------------------------------------------------------------------------

describe('docs:upload — waitActive progress emission', () => {
  it('emits STATE_PENDING then STATE_ACTIVE on successful upload with waitActive:true', async () => {
    mockBackend.uploadDocument.mockResolvedValue({
      apiName: 'fileSearchStores/s1/documents/new-doc',
      displayName: 'New Doc',
    });
    await invokeChannel(
      globalIpcMain, 'docs:upload', makeTrustedEvent(),
      { requestId: 'req-001', storeApiName: 'fileSearchStores/s1', filePath: '/tmp/doc.pdf', waitActive: true },
    );
    const sent = mockWin.webContents.sent;
    expect(sent).toHaveLength(2);
    expect(sent[0].payload).toMatchObject({ requestId: 'req-001', state: 'STATE_PENDING' });
    expect(sent[1].payload).toMatchObject({
      requestId: 'req-001',
      state: 'STATE_ACTIVE',
      documentApiName: 'fileSearchStores/s1/documents/new-doc',
    });
  });

  it('emits STATE_PENDING then STATE_FAILED when upload throws', async () => {
    mockBackend.uploadDocument.mockRejectedValue(new FileTooLargeError(200_000_000, 100_000_000));
    const result = await invokeChannel(
      globalIpcMain, 'docs:upload', makeTrustedEvent(),
      { requestId: 'req-002', storeApiName: 'fileSearchStores/s1', filePath: '/tmp/large.pdf', waitActive: true },
    );
    expect(result.ok).toBe(false);
    const sent = mockWin.webContents.sent;
    expect(sent).toHaveLength(2);
    expect(sent[0].payload).toMatchObject({ requestId: 'req-002', state: 'STATE_PENDING' });
    expect(sent[1].payload).toMatchObject({ requestId: 'req-002', state: 'STATE_FAILED' });
  });

  it('emits NO progress events when waitActive is false', async () => {
    mockBackend.uploadDocument.mockResolvedValue({ apiName: 'docs/d', displayName: 'D' });
    await invokeChannel(
      globalIpcMain, 'docs:upload', makeTrustedEvent(),
      { requestId: 'req-003', storeApiName: 'fileSearchStores/s1', filePath: '/tmp/doc.pdf', waitActive: false },
    );
    expect(mockWin.webContents.sent).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// docs:replace — waitActive progress emission
// ---------------------------------------------------------------------------

describe('docs:replace — waitActive progress emission', () => {
  it('emits STATE_PENDING then STATE_ACTIVE on successful replace with waitActive:true', async () => {
    mockBackend.replaceDocument.mockResolvedValue({
      apiName: 'fileSearchStores/s1/documents/d1',
      displayName: 'Replaced',
    });
    await invokeChannel(
      globalIpcMain, 'docs:replace', makeTrustedEvent(),
      {
        requestId: 'req-004',
        storeApiName: 'fileSearchStores/s1',
        documentApiName: 'fileSearchStores/s1/documents/d1',
        filePath: '/tmp/replacement.pdf',
        waitActive: true,
      },
    );
    const sent = mockWin.webContents.sent;
    expect(sent).toHaveLength(2);
    expect(sent[0].payload).toMatchObject({ requestId: 'req-004', state: 'STATE_PENDING' });
    expect(sent[1].payload).toMatchObject({
      requestId: 'req-004',
      state: 'STATE_ACTIVE',
      documentApiName: 'fileSearchStores/s1/documents/d1',
    });
  });

  it('emits STATE_FAILED when replace throws with waitActive:true', async () => {
    mockBackend.replaceDocument.mockRejectedValue(new RateLimitError());
    const result = await invokeChannel(
      globalIpcMain, 'docs:replace', makeTrustedEvent(),
      {
        requestId: 'req-005',
        storeApiName: 'fileSearchStores/s1',
        documentApiName: 'fileSearchStores/s1/documents/d1',
        filePath: '/tmp/replacement.pdf',
        waitActive: true,
      },
    );
    expect(result.ok).toBe(false);
    const sent = mockWin.webContents.sent;
    expect(sent).toHaveLength(2);
    expect(sent[1].payload).toMatchObject({ requestId: 'req-005', state: 'STATE_FAILED' });
  });
});

// ---------------------------------------------------------------------------
// profiles:list — key-free summaries
// ---------------------------------------------------------------------------

describe('profiles:list — key-free summaries', () => {
  it('returns ProfileSummary[] with name and keyMode only', async () => {
    vi.mocked(profileState.listProfileSummaries).mockReturnValue([
      { name: 'default', keyMode: 'stored' },
      { name: 'prod', keyMode: 'env' },
    ]);
    const result = await invokeChannel(globalIpcMain, 'profiles:list', makeTrustedEvent());
    expect(result.ok).toBe(true);
    const summaries = result.data as Array<{ name: string; keyMode: string }>;
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toEqual({ name: 'default', keyMode: 'stored' });
    expect(summaries[1]).toEqual({ name: 'prod', keyMode: 'env' });
    for (const s of summaries) {
      expect('apiKey' in s).toBe(false);
      expect('secret' in s).toBe(false);
      expect('credential' in s).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// registry:refresh — no active profile → CONFIGURATION_ERROR
// ---------------------------------------------------------------------------

describe('registry:refresh — no active profile', () => {
  it('returns CONFIGURATION_ERROR when getActiveProfile() returns null', async () => {
    vi.mocked(profileState.getActiveProfile).mockReturnValue(null);
    const result = await invokeChannel(globalIpcMain, 'registry:refresh', makeTrustedEvent());
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('CONFIGURATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// Redaction on error messages
// ---------------------------------------------------------------------------

describe('error message redaction', () => {
  it('redacts a Google API key embedded in a BackendError message', async () => {
    const apiKey = 'AIza' + 'A'.repeat(35);
    mockBackend.listStores.mockRejectedValue(
      new RateLimitError(`rate limited for key ${apiKey}`),
    );
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('AIza');
    expect(JSON.stringify(result)).toContain('[REDACTED-KEY]');
  });

  it('redacts a ConfigurationError message that mentions a key', async () => {
    const apiKey = 'AIza' + 'B'.repeat(35);
    vi.mocked(profileState.getBackend).mockImplementation(() => {
      throw new ConfigurationError(
        'active profile',
        ['env', 'credential store'],
        `resolved key: ${apiKey}`,
      );
    });
    const result = await invokeChannel(globalIpcMain, 'stores:list', makeTrustedEvent(), {});
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('AIza');
  });
});
