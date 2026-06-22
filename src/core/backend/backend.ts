/**
 * `IGeminiBackend` — the SOLE path through which every surface (CLI / HTTP API /
 * agent) reaches Gemini File Search (acceptance #1; mirrors the reference
 * `IStorageBackend`). No surface imports `@google/genai` directly.
 *
 * Method shapes are the single source of truth fixed in the design's
 * "API & Interface Contracts" section. Return types come from `../types.js`.
 */

import type { StoreInfo, DocumentInfo, QueryResult } from '../types.js';

/** A single page of results with an opaque forward cursor (null = last page). */
export type Page<T> = { items: T[]; nextPageToken: string | null };

/** Pagination options for list calls. */
export interface ListOpts {
  pageSize?: number;
  pageToken?: string;
}

/** Options for uploadDocument. */
export interface UploadOpts {
  displayName?: string;
  mimeType?: string;
  /**
   * When true, poll documents.get until STATE_ACTIVE/STATE_FAILED before
   * returning. When false/omitted, return at STATE_PENDING after the upload
   * operation reports `done` + one documents.get hydration (binding default,
   * resolved Open Question 2).
   */
  waitActive?: boolean;
}

/** Options for query. */
export interface QueryOpts {
  /**
   * Model id. Default `gemini-3.1-pro-preview` (configurable); documented
   * known-good fallback `gemini-2.5-pro`.
   */
  model?: string;
  /** File Search metadata filter expression. */
  metadataFilter?: string;
}

export interface IGeminiBackend {
  // ---- stores ----
  listStores(opts?: ListOpts): Promise<Page<StoreInfo>>;
  getStore(apiNameOrDisplayName: string): Promise<StoreInfo>;
  createStore(
    displayName: string,
    opts?: { embeddingModel?: string },
  ): Promise<StoreInfo>;
  deleteStore(apiName: string, force?: boolean): Promise<void>;

  // ---- documents ----
  listDocuments(
    storeApiName: string,
    opts?: ListOpts,
  ): Promise<Page<DocumentInfo>>;
  getDocument(documentApiName: string): Promise<DocumentInfo>;
  uploadDocument(
    storeApiName: string,
    filePath: string,
    opts?: UploadOpts,
  ): Promise<DocumentInfo>;
  deleteDocument(documentApiName: string, force?: boolean): Promise<void>;
  replaceDocument(
    storeApiName: string,
    documentApiName: string,
    filePath: string,
    opts?: { displayName?: string; waitActive?: boolean },
  ): Promise<DocumentInfo>;

  // ---- query ----
  query(
    storeApiNames: string[],
    prompt: string,
    opts?: QueryOpts,
  ): Promise<QueryResult>;
}
