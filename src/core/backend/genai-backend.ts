/**
 * `GenAiBackend` — the `@google/genai` implementation of `IGeminiBackend`.
 *
 * This is the SOLE module that talks to the Gemini File Search data plane. It:
 *   - maps SDK `FileSearchStore`/`Document` objects to the normalized
 *     `StoreInfo`/`DocumentInfo` types (parsing int64-as-string fields),
 *   - drives token-based pagination (`pageToken` in / `nextPageToken` out),
 *   - polls the long-running upload operation to `done`, then hydrates the
 *     document via `documents.get` (the operation response only carries
 *     `parent`+`documentName`),
 *   - builds a single-tool `fileSearch` query and maps grounding metadata to a
 *     normalized `QueryResult`,
 *   - maps API failures (HTTP 429, file-size, mime, store-count, operation
 *     error) to the typed errors in `../errors.js`,
 *   - validates file size/mime BEFORE calling the API.
 *
 * Behavioral contract is fixed in the design "API & Interface Contracts" /
 * resolved Open Questions:
 *   - default query model `gemini-3.1-pro-preview` (fallback `gemini-2.5-pro`),
 *   - `uploadDocument` returns at STATE_PENDING unless `waitActive`,
 *   - `replaceDocument` = delete + re-upload (documents are immutable).
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GoogleGenAI } from '@google/genai';
import type {
  IGeminiBackend,
  Page,
  ListOpts,
  UploadOpts,
  QueryOpts,
} from './backend.js';
import type { StoreInfo, DocumentInfo, DocumentState, QueryResult } from '../types.js';
import {
  FileTooLargeError,
  UnsupportedMimeTypeError,
  StoreLimitError,
  RateLimitError,
  UploadOperationError,
} from '../errors.js';
import {
  mapSources,
  mapCitations,
  type GroundingChunkLike,
  type GroundingSupportLike,
} from './citation-render.js';

/** Binding default query model (resolved Open Question 1). */
export const DEFAULT_QUERY_MODEL = 'gemini-3.1-pro-preview';
/** Documented known-good fallback model. */
export const FALLBACK_QUERY_MODEL = 'gemini-2.5-pro';

/** Per-file size limit (100 MB), version research §4. */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

/** Upload-operation poll interval / cap. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // ~5 min at 2s
/** STATE_ACTIVE poll cap (waitActive). */
const MAX_ACTIVE_POLL_ATTEMPTS = 150;
/** 429 retry policy. */
const MAX_429_RETRIES = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toNum(v: string | number | undefined | null): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Best-effort MIME guess from extension; only used to reject the known-
 * unsupported audio/video families before calling the API.
 */
function guessMime(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
  };
  return map[ext];
}

/** Extract an HTTP-ish status code from a thrown SDK/API error, if any. */
function statusOf(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    for (const k of ['status', 'code', 'statusCode']) {
      const v = e[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
    }
  }
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const m = msg.match(/\b(4\d\d|5\d\d)\b/);
  return m ? Number(m[1]) : undefined;
}

function isRateLimit(err: unknown): boolean {
  if (statusOf(err) === 429) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return msg.includes('resource_exhausted') || msg.includes('rate limit') || msg.includes('quota');
}

function isStoreLimit(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('store') &&
    (msg.includes('limit') || msg.includes('quota') || msg.includes('maximum') || msg.includes('exceed'))
  );
}

export class GenAiBackend implements IGeminiBackend {
  constructor(private readonly ai: GoogleGenAI) {}

  // -------------------------------------------------------------------------
  // 429 backoff wrapper
  // -------------------------------------------------------------------------
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await fn();
      } catch (err) {
        if (isRateLimit(err)) {
          if (attempt >= MAX_429_RETRIES) {
            throw new RateLimitError(
              err instanceof Error ? err.message : String(err),
            );
          }
          const backoff = POLL_INTERVAL_MS * 2 ** attempt + Math.floor(Math.random() * 250);
          attempt += 1;
          await sleep(backoff);
          continue;
        }
        throw err;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Mapping
  // -------------------------------------------------------------------------
  private mapStore(s: {
    name?: string;
    displayName?: string;
    createTime?: string;
    updateTime?: string;
    sizeBytes?: string;
    activeDocumentsCount?: string;
    pendingDocumentsCount?: string;
    failedDocumentsCount?: string;
    embeddingModel?: string;
  }): StoreInfo {
    const active = toNum(s.activeDocumentsCount);
    const pending = toNum(s.pendingDocumentsCount);
    const failed = toNum(s.failedDocumentsCount);
    let documentCount: number | undefined;
    if (active !== undefined || pending !== undefined || failed !== undefined) {
      documentCount = (active ?? 0) + (pending ?? 0) + (failed ?? 0);
    }
    return {
      apiName: s.name ?? '',
      displayName: s.displayName,
      createTime: s.createTime,
      updateTime: s.updateTime,
      sizeBytes: toNum(s.sizeBytes),
      activeDocumentsCount: active,
      pendingDocumentsCount: pending,
      failedDocumentsCount: failed,
      documentCount,
      embeddingModel: s.embeddingModel,
    };
  }

  private mapDocument(d: {
    name?: string;
    displayName?: string;
    state?: string;
    sizeBytes?: string;
    mimeType?: string;
    createTime?: string;
    updateTime?: string;
    customMetadata?: Array<{
      key?: string;
      stringValue?: string;
      numericValue?: number;
      stringListValue?: { values?: string[] };
    }>;
  }): DocumentInfo {
    return {
      apiName: d.name ?? '',
      displayName: d.displayName,
      state: (d.state as DocumentState) ?? 'STATE_UNSPECIFIED',
      sizeBytes: toNum(d.sizeBytes),
      mimeType: d.mimeType,
      createTime: d.createTime,
      updateTime: d.updateTime,
      customMetadata: d.customMetadata?.map((m) => ({
        key: m.key ?? '',
        stringValue: m.stringValue,
        numericValue: m.numericValue,
        stringListValue: m.stringListValue?.values,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Stores
  // -------------------------------------------------------------------------
  async listStores(opts?: ListOpts): Promise<Page<StoreInfo>> {
    const pager = await this.withRetry(() =>
      this.ai.fileSearchStores.list({
        config: { pageSize: opts?.pageSize, pageToken: opts?.pageToken },
      }),
    );
    const items = pager.page.map((s) => this.mapStore(s));
    const nextPageToken = pager.hasNextPage()
      ? pager.params.config?.pageToken ?? null
      : null;
    return { items, nextPageToken };
  }

  async getStore(apiNameOrDisplayName: string): Promise<StoreInfo> {
    // Resolve a display name to an apiName when the caller passed one.
    const name = apiNameOrDisplayName.startsWith('fileSearchStores/')
      ? apiNameOrDisplayName
      : await this.resolveStoreName(apiNameOrDisplayName);
    const store = await this.withRetry(() =>
      this.ai.fileSearchStores.get({ name }),
    );
    return this.mapStore(store);
  }

  /** Find a store's apiName by display name (linear scan over all pages). */
  private async resolveStoreName(displayName: string): Promise<string> {
    const pager = await this.withRetry(() => this.ai.fileSearchStores.list({}));
    for await (const s of pager) {
      if (s.displayName === displayName && s.name) return s.name;
    }
    throw new Error(`No store found with display name "${displayName}".`);
  }

  async createStore(
    displayName: string,
    opts?: { embeddingModel?: string },
  ): Promise<StoreInfo> {
    try {
      const store = await this.withRetry(() =>
        this.ai.fileSearchStores.create({
          config: { displayName, embeddingModel: opts?.embeddingModel },
        }),
      );
      return this.mapStore(store);
    } catch (err) {
      if (isStoreLimit(err)) {
        throw new StoreLimitError(err instanceof Error ? err.message : String(err));
      }
      throw err;
    }
  }

  async deleteStore(apiName: string, force?: boolean): Promise<void> {
    await this.withRetry(() =>
      this.ai.fileSearchStores.delete({ name: apiName, config: { force } }),
    );
  }

  // -------------------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------------------
  async listDocuments(
    storeApiName: string,
    opts?: ListOpts,
  ): Promise<Page<DocumentInfo>> {
    const pager = await this.withRetry(() =>
      this.ai.fileSearchStores.documents.list({
        parent: storeApiName,
        config: { pageSize: opts?.pageSize, pageToken: opts?.pageToken },
      }),
    );
    const items = pager.page.map((d) => this.mapDocument(d));
    const nextPageToken = pager.hasNextPage()
      ? pager.params.config?.pageToken ?? null
      : null;
    return { items, nextPageToken };
  }

  async getDocument(documentApiName: string): Promise<DocumentInfo> {
    const doc = await this.withRetry(() =>
      this.ai.fileSearchStores.documents.get({ name: documentApiName }),
    );
    return this.mapDocument(doc);
  }

  async uploadDocument(
    storeApiName: string,
    filePath: string,
    opts?: UploadOpts,
  ): Promise<DocumentInfo> {
    // Pre-upload validation (typed errors instead of raw API failures).
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      throw new Error(`File not found or unreadable: ${filePath}`);
    }
    if (stat.size > MAX_FILE_BYTES) {
      throw new FileTooLargeError(stat.size, MAX_FILE_BYTES, `File: ${filePath}`);
    }
    const mime = opts?.mimeType ?? guessMime(filePath);
    if (mime && (mime.startsWith('audio/') || mime.startsWith('video/'))) {
      throw new UnsupportedMimeTypeError(mime, `File: ${filePath}`);
    }

    // Start the long-running upload operation.
    let operation = await this.withRetry(() =>
      this.ai.fileSearchStores.uploadToFileSearchStore({
        file: filePath,
        fileSearchStoreName: storeApiName,
        config: { displayName: opts?.displayName, mimeType: mime },
      }),
    );

    // Poll until done.
    let attempts = 0;
    while (!operation.done) {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        throw new UploadOperationError(
          `Upload operation did not complete within ${(MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s.`,
        );
      }
      await sleep(POLL_INTERVAL_MS);
      operation = await this.withRetry(() =>
        this.ai.operations.get({ operation }),
      );
      attempts += 1;
    }

    if (operation.error) {
      throw new UploadOperationError(
        JSON.stringify(operation.error),
        operation.error,
      );
    }

    const documentName = operation.response?.documentName;
    if (!documentName) {
      throw new UploadOperationError(
        'Upload operation completed without a documentName in its response.',
        operation.response,
      );
    }

    // Hydrate the full document (operation response only has parent+documentName).
    let info = await this.getDocument(documentName);

    // Optionally block until the document is ACTIVE (or FAILED).
    if (opts?.waitActive) {
      let active = 0;
      while (info.state === 'STATE_PENDING' || info.state === 'STATE_UNSPECIFIED') {
        if (active >= MAX_ACTIVE_POLL_ATTEMPTS) break;
        await sleep(POLL_INTERVAL_MS);
        info = await this.getDocument(documentName);
        active += 1;
      }
    }

    return info;
  }

  async deleteDocument(documentApiName: string, force?: boolean): Promise<void> {
    await this.withRetry(() =>
      this.ai.fileSearchStores.documents.delete({
        name: documentApiName,
        config: { force },
      }),
    );
  }

  async replaceDocument(
    storeApiName: string,
    documentApiName: string,
    filePath: string,
    opts?: { displayName?: string; waitActive?: boolean },
  ): Promise<DocumentInfo> {
    // Documents are immutable: replace = delete + re-upload.
    await this.deleteDocument(documentApiName, true);
    return this.uploadDocument(storeApiName, filePath, {
      displayName: opts?.displayName,
      waitActive: opts?.waitActive,
    });
  }

  // -------------------------------------------------------------------------
  // Query
  // -------------------------------------------------------------------------
  async query(
    storeApiNames: string[],
    prompt: string,
    opts?: QueryOpts,
  ): Promise<QueryResult> {
    const model = opts?.model ?? DEFAULT_QUERY_MODEL;
    const response = await this.withRetry(() =>
      this.ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          // SINGLE tool only — File Search cannot combine with other tools.
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: storeApiNames,
                metadataFilter: opts?.metadataFilter,
              },
            },
          ],
        },
      }),
    );

    const answer = response.text ?? '';
    const candidate = response.candidates?.[0];
    const gm = candidate?.groundingMetadata;
    const chunks = (gm?.groundingChunks ?? []) as GroundingChunkLike[];
    const supports = (gm?.groundingSupports ?? []) as GroundingSupportLike[];

    return {
      answer,
      sources: mapSources(chunks),
      citations: mapCitations(supports),
      finishReason: candidate?.finishReason as string | undefined,
      raw: gm,
    };
  }
}
