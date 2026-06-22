/**
 * IPC handler registration — one `ipcMain.handle` per invoke channel, each
 * routed through a single `run<T>()` choke point that validates the sender,
 * executes the backend/registry/profile operation, and flattens every outcome
 * into the `IpcResult<T>` envelope with redaction.
 *
 * Security contract (Design 002 "Error contract", research §Serialization):
 *  - `assertTrustedSender` validates `event.senderFrame?.url` against the
 *    expected local `file://` renderer URL on every call.
 *  - typed `BackendError` subclasses → `{ code: err.code, message:
 *    redactString(err.message) }`; `ConfigurationError` → `CONFIGURATION_ERROR`;
 *    anything else → opaque `{ code: 'INTERNAL', message: 'Internal error' }`.
 *  - NEVER serialize `stack`, `cause`, or `UploadOperationError.operationError`.
 *  - `redactString` runs on every outbound message.
 *  - `QueryResult.raw` is stripped before the envelope is built.
 */

import { ipcMain, type IpcMainInvokeEvent, type BrowserWindow } from 'electron';

import { BackendError } from '../core/errors.js';
import { ConfigurationError } from '../config/config-error.js';
import { redactString } from '../util/redact.js';
import { getActiveProfile, getBackend, listProfileSummaries, selectProfile } from './profile-state.js';
import { registryList, registryPrune, registryRefresh } from './registry-service.js';
import { INVOKE_CHANNEL_LIST, type InvokeChannel, type IpcResult } from './ipc-contract.js';
import type {
  DocDeleteReq,
  DocGetReq,
  DocListReq,
  DocReplaceReq,
  DocUploadReq,
  OkBool,
  OkVoid,
  ProfileSelectReq,
  QueryReq,
  QueryResultView,
  RegistryPruneReq,
  StoreCreateReq,
  StoreDeleteReq,
  StoreGetReq,
  StoreListReq,
  UploadProgressEvent,
} from './ipc-payloads.js';

const OK_VOID: OkVoid = { done: true };

/** Validate that an IPC message came from our own local renderer frame. */
function assertTrustedSender(event: IpcMainInvokeEvent, rendererUrl: string): void {
  const senderUrl = event.senderFrame?.url ?? '';
  if (!senderUrl.startsWith(rendererUrl)) {
    throw new Error('Untrusted IPC sender');
  }
}

/**
 * Single choke point: run a handler body, flatten + redact every error into the
 * `IpcResult` envelope. Success `data` must already be clone-safe plain data.
 */
async function run<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof BackendError) {
      return { ok: false, error: { code: err.code, message: redactString(err.message) } };
    }
    if (err instanceof ConfigurationError) {
      return {
        ok: false,
        error: { code: 'CONFIGURATION_ERROR', message: redactString(err.message) },
      };
    }
    // Unknown / unexpected: opaque to the renderer (never reflect internals), but
    // LOG the real cause (redacted) to the main-process stderr — a desktop app
    // is undebuggable if unexpected failures vanish behind an opaque envelope.
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
    console.error('[ipc] unexpected error:', redactString(detail));
    return { ok: false, error: { code: 'INTERNAL', message: 'Internal error' } };
  }
}

/** Safe upload-progress emitter — only sends while the window is alive. */
export function emitUploadProgress(win: BrowserWindow, payload: UploadProgressEvent): void {
  if (!win.isDestroyed()) {
    win.webContents.send('upload:progress', payload);
  }
}

/** Strip the non-clone-safe / internals-bearing `raw` field from a query result. */
function toQueryResultView(result: { raw?: unknown } & QueryResultView): QueryResultView {
  const { answer, sources, citations, finishReason } = result;
  return { answer, sources, citations, finishReason };
}

/**
 * Register all invoke handlers and wire upload-progress emission for the
 * `waitActive` lifecycle.
 *
 * @param rendererUrl expected local `file://` URL prefix of the renderer frame.
 * @param win the main window, used to push `upload:progress` events.
 */
export function registerIpcHandlers(rendererUrl: string, win: BrowserWindow): void {
  // Track what we actually register. NOTE: `ipcMain.handle` stores invoke
  // handlers in an internal map that is NOT reflected by `ipcMain.eventNames()`
  // (that only lists `.on`/`.addListener` emitter events), so the drift guard
  // below must consult this set — never `eventNames()` — to work on real Electron.
  const registered = new Set<InvokeChannel>();
  const handle = <T>(
    channel: InvokeChannel,
    fn: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<T>,
  ): void => {
    ipcMain.handle(channel, (event, ...args) => {
      // Sender validation runs inside run() so a rogue sender yields a redacted
      // INTERNAL envelope rather than an unhandled rejection.
      return run(() => {
        assertTrustedSender(event, rendererUrl);
        return fn(event, ...args);
      });
    });
    registered.add(channel);
  };

  // ---- stores ----
  handle('stores:list', async (_e, req?: unknown) => {
    const r = (req ?? {}) as StoreListReq;
    return getBackend().listStores({ pageSize: r.pageSize, pageToken: r.pageToken });
  });
  handle('stores:get', async (_e, req: unknown) => {
    const r = req as StoreGetReq;
    return getBackend().getStore(r.idOrName);
  });
  handle('stores:create', async (_e, req: unknown) => {
    const r = req as StoreCreateReq;
    return getBackend().createStore(r.displayName, { embeddingModel: r.embeddingModel });
  });
  handle('stores:delete', async (_e, req: unknown): Promise<OkVoid> => {
    const r = req as StoreDeleteReq;
    await getBackend().deleteStore(r.apiName, r.force ?? false);
    return OK_VOID;
  });

  // ---- documents ----
  handle('docs:list', async (_e, req: unknown) => {
    const r = req as DocListReq;
    return getBackend().listDocuments(r.storeApiName, {
      pageSize: r.pageSize,
      pageToken: r.pageToken,
    });
  });
  handle('docs:get', async (_e, req: unknown) => {
    const r = req as DocGetReq;
    return getBackend().getDocument(r.documentApiName);
  });
  handle('docs:upload', async (_e, req: unknown) => {
    const r = req as DocUploadReq;
    if (r.waitActive) {
      emitUploadProgress(win, { requestId: r.requestId, state: 'STATE_PENDING' });
    }
    try {
      const doc = await getBackend().uploadDocument(r.storeApiName, r.filePath, {
        displayName: r.displayName,
        mimeType: r.mimeType,
        waitActive: r.waitActive,
      });
      if (r.waitActive) {
        emitUploadProgress(win, {
          requestId: r.requestId,
          state: 'STATE_ACTIVE',
          documentApiName: doc.apiName,
        });
      }
      return doc;
    } catch (err) {
      if (r.waitActive) {
        emitUploadProgress(win, { requestId: r.requestId, state: 'STATE_FAILED' });
      }
      throw err;
    }
  });
  handle('docs:delete', async (_e, req: unknown): Promise<OkVoid> => {
    const r = req as DocDeleteReq;
    await getBackend().deleteDocument(r.documentApiName, r.force ?? false);
    return OK_VOID;
  });
  handle('docs:replace', async (_e, req: unknown) => {
    const r = req as DocReplaceReq;
    if (r.waitActive) {
      emitUploadProgress(win, { requestId: r.requestId, state: 'STATE_PENDING' });
    }
    try {
      const doc = await getBackend().replaceDocument(
        r.storeApiName,
        r.documentApiName,
        r.filePath,
        { displayName: r.displayName, waitActive: r.waitActive },
      );
      if (r.waitActive) {
        emitUploadProgress(win, {
          requestId: r.requestId,
          state: 'STATE_ACTIVE',
          documentApiName: doc.apiName,
        });
      }
      return doc;
    } catch (err) {
      if (r.waitActive) {
        emitUploadProgress(win, { requestId: r.requestId, state: 'STATE_FAILED' });
      }
      throw err;
    }
  });

  // ---- query ----
  handle('query:run', async (_e, req: unknown): Promise<QueryResultView> => {
    const r = req as QueryReq;
    const result = await getBackend().query(r.storeApiNames, r.prompt, {
      model: r.model,
      metadataFilter: r.metadataFilter,
    });
    // Strip `raw` before it crosses the bridge (could echo internals).
    return toQueryResultView(result);
  });

  // ---- registry ----
  handle('registry:list', async () => registryList());
  handle('registry:refresh', async () => {
    const profile = getActiveProfile();
    if (profile === null) {
      throw new ConfigurationError('active profile', ['Electron profile selection']);
    }
    return registryRefresh(profile, getBackend());
  });
  handle('registry:prune', async (_e, req: unknown): Promise<OkBool> => {
    const r = req as RegistryPruneReq;
    return { removed: registryPrune(r.apiName) };
  });

  // ---- profiles ----
  handle('profiles:list', async () => listProfileSummaries());
  handle('profiles:select', async (_e, req: unknown): Promise<OkVoid> => {
    const r = req as ProfileSelectReq;
    selectProfile(r.name);
    return OK_VOID;
  });

  // Sanity: ensure every declared channel is handled (dev guard, no runtime cost
  // beyond startup). Catches drift between the contract list and the handlers.
  // Consults the locally-tracked `registered` set (not `ipcMain.eventNames()`,
  // which does not list `handle` invoke channels on real Electron).
  for (const channel of INVOKE_CHANNEL_LIST) {
    if (!registered.has(channel)) {
      throw new Error(`IPC channel not registered: ${channel}`);
    }
  }
}
