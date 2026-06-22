/**
 * Structural IPC payload types — the request/response shapes for every channel
 * declared in `ipc-contract.ts`.
 *
 * Per the project's structural-typing convention (codebase-scan §3; mirrors
 * `citation-render.ts`'s structural interfaces), these are plain, clone-safe
 * shapes. Where a core DTO is already key-free and clone-safe it is re-exported
 * TYPE-ONLY from `../core/types.js` (a type-only import pulls no core runtime
 * into the contract). `ProfileSummary` is declared FRESH and deliberately omits
 * every key-bearing field — NO payload type here may contain `apiKey`/`secret`/
 * `credential` (Design Decision 6, R16).
 *
 * The renderer (U3) imports these type-only via `../ipc-payloads.js`.
 */

import type {
  StoreInfo,
  DocumentInfo,
  QueryResult,
  RegistryEntry,
} from '../core/types.js';
import type { Page } from '../core/backend/backend.js';

// ---------------------------------------------------------------------------
// View (response) types — type-only re-exports of the key-free core DTOs.
// ---------------------------------------------------------------------------

/** Store view — identical to the core `StoreInfo` (no key material). */
export type StoreSummary = StoreInfo;

/** Document view — identical to the core `DocumentInfo`. */
export type DocSummary = DocumentInfo;

/**
 * Query-result view. Identical to core `QueryResult` EXCEPT `raw` MUST NOT cross
 * IPC (it is the raw grounding subtree and could echo internals). The handler
 * strips `raw` before building the `IpcOk` envelope; this type forbids it.
 */
export type QueryResultView = Omit<QueryResult, 'raw'>;

/** Registry entry view — identical to the core `RegistryEntry` (no secrets). */
export type RegistryEntryView = RegistryEntry;

/** Re-exported generic page wrapper (clone-safe). */
export type { Page };

// ---------------------------------------------------------------------------
// Profile summary — declared FRESH, never `ProfileEntry` (which is itself
// key-free, but we restate the minimal safe shape to make the no-key guarantee
// explicit at the contract boundary).
// ---------------------------------------------------------------------------

export interface ProfileSummary {
  name: string;
  keyMode: 'stored' | 'env';
}

// ---------------------------------------------------------------------------
// Explicit success envelopes for void / boolean operations (object reads better
// than a bare undefined/boolean and keeps `data` non-nullable).
// ---------------------------------------------------------------------------

export interface OkVoid {
  done: true;
}

export interface OkBool {
  removed: boolean;
}

// ---------------------------------------------------------------------------
// Request payloads — one interface per invoke channel.
// ---------------------------------------------------------------------------

/** `stores:list` */
export interface StoreListReq {
  pageSize?: number;
  pageToken?: string;
}

/** `stores:get` */
export interface StoreGetReq {
  idOrName: string;
}

/** `stores:create` */
export interface StoreCreateReq {
  displayName: string;
  embeddingModel?: string;
}

/** `stores:delete` */
export interface StoreDeleteReq {
  apiName: string;
  force?: boolean;
}

/** `docs:list` */
export interface DocListReq {
  storeApiName: string;
  pageSize?: number;
  pageToken?: string;
}

/** `docs:get` */
export interface DocGetReq {
  documentApiName: string;
}

/** `docs:upload` */
export interface DocUploadReq {
  /** Correlates this upload with `UploadProgressEvent.requestId`. */
  requestId: string;
  storeApiName: string;
  filePath: string;
  displayName?: string;
  mimeType?: string;
  waitActive?: boolean;
}

/** `docs:delete` */
export interface DocDeleteReq {
  documentApiName: string;
  force?: boolean;
}

/** `docs:replace` */
export interface DocReplaceReq {
  /** Correlates this replace with `UploadProgressEvent.requestId`. */
  requestId: string;
  storeApiName: string;
  documentApiName: string;
  filePath: string;
  displayName?: string;
  waitActive?: boolean;
}

/** `query:run` */
export interface QueryReq {
  storeApiNames: string[];
  prompt: string;
  model?: string;
  metadataFilter?: string;
}

/** `registry:prune` */
export interface RegistryPruneReq {
  apiName: string;
}

/** `profiles:select` */
export interface ProfileSelectReq {
  name: string;
}

// ---------------------------------------------------------------------------
// Event payload — `upload:progress` (main → renderer).
// ---------------------------------------------------------------------------

/**
 * Reflects the `waitActive` lifecycle (R10). `docs:upload`/`docs:replace` with
 * `waitActive: true` emit `STATE_PENDING` on receipt and a terminal
 * `STATE_ACTIVE`/`STATE_FAILED` when the awaited promise settles. The renderer
 * correlates by `requestId`.
 */
export interface UploadProgressEvent {
  requestId: string;
  state: 'STATE_PENDING' | 'STATE_ACTIVE' | 'STATE_FAILED';
  documentApiName?: string;
}
