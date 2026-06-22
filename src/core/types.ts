/**
 * Core backend data types for the Gemini File Search Store Navigator.
 *
 * These are the normalized return shapes every surface (CLI / HTTP API / agent)
 * consumes — never the raw `@google/genai` SDK objects. They are derived
 * VERBATIM from the SDK-schema research §"Ready-to-drop-in backend TypeScript
 * interfaces" (docs/research/gemini-file-search-sdk-schema.md).
 *
 * Int64-as-string SDK fields (`sizeBytes`, `*DocumentsCount`) are parsed to
 * `number` at the backend boundary (in `genai-backend.ts`). These may exceed
 * 2^53 only for absurd sizes — acceptable for the navigator's reporting needs.
 *
 * The on-disk persistence shapes (`ProfileEntry`/`CredentialData` for the
 * encrypted credential vault, `RegistryEntry`/`RegistryData` for the plaintext
 * metadata cache) also live here so the credential store and registry share a
 * single source of truth.
 */

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

/**
 * Normalized view of a Gemini `FileSearchStore`.
 *
 * There is NO native store-level `state` field in the SDK — a display state is
 * derived from the three document-count fields by the surfaces if needed.
 */
export interface StoreInfo {
  /** FileSearchStore.name — e.g. "fileSearchStores/abc123". */
  apiName: string;
  /** FileSearchStore.displayName. */
  displayName?: string;
  /** RFC 3339 creation timestamp. */
  createTime?: string;
  /** RFC 3339 last-update timestamp. */
  updateTime?: string;
  /** Number(FileSearchStore.sizeBytes) — total raw bytes ingested. */
  sizeBytes?: number;
  /** Number(FileSearchStore.activeDocumentsCount). */
  activeDocumentsCount?: number;
  /** Number(FileSearchStore.pendingDocumentsCount). */
  pendingDocumentsCount?: number;
  /** Number(FileSearchStore.failedDocumentsCount). */
  failedDocumentsCount?: number;
  /** active + pending + failed (computed at the backend boundary). */
  documentCount?: number;
  /** FileSearchStore.embeddingModel — e.g. "models/{model}". */
  embeddingModel?: string;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/**
 * Raw SDK document-state values. The backend stores the raw SDK value to avoid
 * lossy mapping; surfaces strip the `STATE_` prefix only for display. The
 * trailing `string` keeps the type open to forward-compatible SDK additions.
 */
export type DocumentState =
  | 'STATE_UNSPECIFIED'
  | 'STATE_PENDING'
  | 'STATE_ACTIVE'
  | 'STATE_FAILED'
  | (string & {});

/**
 * Document-side custom metadata (richer than the response-side grounding
 * variant — it adds `stringListValue`).
 */
export interface DocCustomMetadata {
  key: string;
  stringValue?: string;
  numericValue?: number;
  /** From StringList.values. */
  stringListValue?: string[];
}

/** Normalized view of a Gemini `Document`. */
export interface DocumentInfo {
  /** Document.name — e.g. "fileSearchStores/abc/documents/doc1". */
  apiName: string;
  displayName?: string;
  /** Raw SDK value, e.g. 'STATE_ACTIVE'. */
  state: DocumentState;
  /** Number(Document.sizeBytes). */
  sizeBytes?: number;
  mimeType?: string;
  createTime?: string;
  updateTime?: string;
  customMetadata?: DocCustomMetadata[];
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** One retrieved source/excerpt backing a query answer (one grounding chunk). */
export interface QuerySource {
  /** retrievedContext.title. */
  title?: string;
  /** retrievedContext.text — the excerpt the renderer prints. */
  excerpt?: string;
  /** retrievedContext.fileSearchStore — multi-store attribution. */
  storeName?: string;
  /** retrievedContext.uri. */
  uri?: string;
  /** retrievedContext.pageNumber. */
  pageNumber?: number;
  /** retrievedContext.mediaId — multimodal blob reference. */
  mediaId?: string;
  customMetadata?: Array<{
    key?: string;
    stringValue?: string;
    numericValue?: number;
  }>;
}

/**
 * One inline-citation span: a slice of the answer text mapped to source indices.
 *
 * NOTE: `startIndex`/`endIndex` are BYTE offsets (not character offsets) — see
 * `renderInlineCitations` for byte-accurate slicing.
 */
export interface CitationSpan {
  /** segment.startIndex (BYTE offset, inclusive). */
  startIndex?: number;
  /** segment.endIndex (BYTE offset, exclusive). */
  endIndex?: number;
  /** segment.text. */
  text?: string;
  /** groundingChunkIndices — indices into sources[]. */
  chunkIndices: number[];
  confidenceScores?: number[];
}

/** Normalized File Search query result. */
export interface QueryResult {
  /** response.text. */
  answer: string;
  /** From candidates[0].groundingMetadata.groundingChunks. */
  sources: QuerySource[];
  /** From candidates[0].groundingMetadata.groundingSupports. */
  citations: CitationSpan[];
  /** candidates[0].finishReason. */
  finishReason?: string;
  /** Full groundingMetadata subtree (for --raw-json passthrough). */
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Credential vault (encrypted at rest)
// ---------------------------------------------------------------------------

/**
 * How a profile's API key is resolved:
 * - 'stored' — encrypted in the credential vault, returned by getApiKey().
 * - 'env'    — not persisted; resolved on demand via the four-tier resolver.
 */
export type ProfileKeyMode = 'stored' | 'env';

/** A registered multi-account profile (no secret material here). */
export interface ProfileEntry {
  name: string;
  keyMode: ProfileKeyMode;
  /** ISO 8601 timestamp the profile was added. */
  addedAt: string;
}

/** AES-256-GCM payload shape (per-record iv + auth tag). */
export interface EncryptedPayload {
  iv: string;
  data: string;
  tag: string;
}

/**
 * Decrypted credential-vault contents. `profiles` is the registry; `keys` holds
 * the encrypted per-profile API key for profiles whose keyMode === 'stored'.
 */
export interface CredentialData {
  profiles: ProfileEntry[];
  /** Map of profile name -> encrypted API key payload (stored-mode only). */
  keys?: Record<string, EncryptedPayload>;
}

// ---------------------------------------------------------------------------
// Plaintext metadata cache (hybrid registry)
// ---------------------------------------------------------------------------

/**
 * Last-seen, non-secret metadata for a known store. NEVER contains secrets.
 * The live Gemini API is the source of truth; this is a refreshable cache so
 * users can "keep track of" stores across sessions without a live call.
 */
export interface RegistryEntry {
  /** "fileSearchStores/abc123". */
  apiName: string;
  displayName?: string;
  /** Profile that owns / last saw this store. */
  profile: string;
  createTime?: string;
  updateTime?: string;
  sizeBytes?: number;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  documentCount?: number;
  /** ISO 8601 timestamp of the last reconcile against the live API. */
  lastRefreshedAt: string;
}

export interface RegistryData {
  entries: RegistryEntry[];
}
