/**
 * Gemini Nav — Electron renderer logic (plain TypeScript, no framework).
 *
 * DOM-only. The renderer reaches the backend SOLELY through the sandboxed
 * `window.gemini` bridge installed by `preload.cjs` (U2). It imports the IPC
 * contract and payload TYPES only (erased at compile time) — it never imports
 * the core backend, the Gemini SDK, Node, or ipcRenderer. Every backend result is
 * an `IpcResult<T>` discriminated union that we branch on; typed error codes are
 * mapped to clear, non-secret UI messages (R13). Destructive actions
 * (store-delete, doc-delete, doc-replace, registry-prune) are gated behind an
 * in-UI confirmation dialog (R8/R9/R12). Citations are rendered from the
 * byte-accurate spans the main process produced via `citation-render.ts` (R11);
 * the renderer never recomputes citation offsets.
 */

// The IPC contract (channel unions + result envelope) is consumed type-only from
// U2's single source of truth. These are pure, core-free types.
import type {
  InvokeChannel,
  EventChannel,
  IpcResult,
} from '../ipc-contract.js';

/*
 * Renderer-local mirror of the U2 IPC payload types (`src/electron/ipc-payloads.ts`),
 * which is the authoritative source. They are restated here STRUCTURALLY so the
 * renderer's standalone DOM compile (`tsconfig.renderer.json`) does not transitively
 * pull `src/core/*` into the renderer program — the renderer must remain free of any
 * core/Node/SDK module (R14). The shapes are byte-for-byte structurally compatible
 * with U2's payloads; if U2's contract changes, update both. (See Deviations note.)
 *
 * NOTE: `*View` types intentionally carry only the clone-safe, key-free fields the
 * main process serializes across IPC — `raw` is never present (stripped in U2's
 * handler), and no field ever carries key material (R16).
 */

type DocumentState =
  | 'STATE_UNSPECIFIED'
  | 'STATE_PENDING'
  | 'STATE_ACTIVE'
  | 'STATE_FAILED'
  | (string & {});

interface StoreSummary {
  apiName: string;
  displayName?: string;
  createTime?: string;
  updateTime?: string;
  sizeBytes?: number;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  documentCount?: number;
  embeddingModel?: string;
}

interface DocCustomMetadata {
  key: string;
  stringValue?: string;
  numericValue?: number;
  stringListValue?: string[];
}

interface DocSummary {
  apiName: string;
  displayName?: string;
  state: DocumentState;
  sizeBytes?: number;
  mimeType?: string;
  createTime?: string;
  updateTime?: string;
  customMetadata?: DocCustomMetadata[];
}

interface QuerySource {
  title?: string;
  excerpt?: string;
  storeName?: string;
  uri?: string;
  pageNumber?: number;
  mediaId?: string;
  customMetadata?: Array<{
    key?: string;
    stringValue?: string;
    numericValue?: number;
  }>;
}

interface CitationSpan {
  startIndex?: number;
  endIndex?: number;
  text?: string;
  chunkIndices: number[];
  confidenceScores?: number[];
}

/** Mirrors U2 `QueryResultView` = `Omit<QueryResult, 'raw'>`. */
interface QueryResultView {
  answer: string;
  sources: QuerySource[];
  citations: CitationSpan[];
  finishReason?: string;
}

interface RegistryEntryView {
  apiName: string;
  displayName?: string;
  profile: string;
  createTime?: string;
  updateTime?: string;
  sizeBytes?: number;
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  documentCount?: number;
  lastRefreshedAt: string;
}

interface Page<T> {
  items: T[];
  nextPageToken: string | null;
}

interface ProfileSummary {
  name: string;
  keyMode: 'stored' | 'env';
}

interface OkVoid {
  done: true;
}

interface OkBool {
  removed: boolean;
}

interface StoreListReq {
  pageSize?: number;
  pageToken?: string;
}

interface StoreGetReq {
  idOrName: string;
}

interface StoreCreateReq {
  displayName: string;
  embeddingModel?: string;
}

interface StoreDeleteReq {
  apiName: string;
  force?: boolean;
}

interface DocListReq {
  storeApiName: string;
  pageSize?: number;
  pageToken?: string;
}

interface DocUploadReq {
  requestId: string;
  storeApiName: string;
  filePath: string;
  displayName?: string;
  mimeType?: string;
  waitActive?: boolean;
}

interface DocDeleteReq {
  documentApiName: string;
  force?: boolean;
}

interface DocReplaceReq {
  requestId: string;
  storeApiName: string;
  documentApiName: string;
  filePath: string;
  displayName?: string;
  waitActive?: boolean;
}

interface QueryReq {
  storeApiNames: string[];
  prompt: string;
  model?: string;
  metadataFilter?: string;
}

interface RegistryPruneReq {
  apiName: string;
}

interface ProfileSelectReq {
  name: string;
}

interface UploadProgressEvent {
  requestId: string;
  state: 'STATE_PENDING' | 'STATE_ACTIVE' | 'STATE_FAILED';
  documentApiName?: string;
}

// ---------------------------------------------------------------------------
// Ambient typing for the bridge installed by preload.cjs.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    gemini: {
      invoke<T = unknown>(
        channel: InvokeChannel,
        ...args: unknown[]
      ): Promise<IpcResult<T>>;
      on(
        channel: EventChannel,
        callback: (payload: UploadProgressEvent) => void,
      ): () => void;
    };
  }
}

// ---------------------------------------------------------------------------
// Error-code → user-facing message map (R13). Codes come from the main-process
// error contract (design §"Error contract"); INTERNAL/unknown is the fallback.
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<string, string> = {
  FILE_TOO_LARGE: 'File too large — the maximum upload size is 100 MB.',
  UNSUPPORTED_MIME_TYPE:
    'Unsupported file type — audio and video files cannot be uploaded.',
  STORE_LIMIT: 'Store limit reached for this account.',
  RATE_LIMIT: 'Rate limit hit — please wait a moment and try again.',
  UPLOAD_OPERATION_FAILED: 'The upload operation failed to complete.',
  CONFIGURATION_ERROR:
    'Configuration error — check the active profile and its credentials.',
  INTERNAL: 'An internal error occurred.',
};

function messageForError(code: string, message: string): string {
  const base = ERROR_MESSAGES[code] ?? `Error (${code}).`;
  // Append the (already redacted, non-secret) backend message when it adds info.
  return message && message !== base ? `${base} (${message})` : base;
}

// ---------------------------------------------------------------------------
// Small DOM helpers (no innerHTML with untrusted data — textContent only).
// ---------------------------------------------------------------------------

function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts?: { class?: string; text?: string },
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (opts?.class) node.className = opts.class;
  if (opts?.text !== undefined) node.textContent = opts.text;
  return node;
}

function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function fmtBytes(n?: number): string {
  if (n === undefined) return '—';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

/**
 * Render one custom-metadata entry's value. A Gemini document metadata field
 * carries exactly one of stringValue / numericValue / stringListValue; this
 * mirrors the CLI's `printDocument` formatting so all three surfaces agree.
 */
function fmtCustomMetadataValue(m: DocCustomMetadata): string {
  if (m.stringValue !== undefined) return m.stringValue;
  if (m.numericValue != null) return String(m.numericValue);
  if (m.stringListValue && m.stringListValue.length > 0)
    return m.stringListValue.join(', ');
  return '—';
}

// ---------------------------------------------------------------------------
// Status banner (errors + success).
// ---------------------------------------------------------------------------

function showError(code: string, message: string): void {
  const banner = $('status-banner');
  banner.classList.remove('banner-ok');
  $('status-banner-text').textContent = messageForError(code, message);
  banner.hidden = false;
}

function showOk(text: string): void {
  const banner = $('status-banner');
  banner.classList.add('banner-ok');
  $('status-banner-text').textContent = text;
  banner.hidden = false;
}

function hideBanner(): void {
  $('status-banner').hidden = true;
}

/**
 * Invoke a channel and branch on the result. On error the banner is shown and
 * `undefined` is returned so callers can early-return; on success the data is
 * returned.
 */
async function call<T>(
  channel: InvokeChannel,
  ...args: unknown[]
): Promise<T | undefined> {
  try {
    const res = await window.gemini.invoke<T>(channel, ...args);
    if (!res.ok) {
      showError(res.error.code, res.error.message);
      return undefined;
    }
    return res.data;
  } catch (err) {
    // The bridge itself rejected (e.g. blocked channel) — should not happen.
    showError('INTERNAL', err instanceof Error ? err.message : String(err));
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Confirmation dialog (R8/R9/R12). Returns a promise resolving to the choice.
// ---------------------------------------------------------------------------

function confirmAction(message: string): Promise<boolean> {
  const overlay = $('confirm-overlay');
  $('confirm-message').textContent = message;
  overlay.hidden = false;

  const okBtn = $<HTMLButtonElement>('confirm-ok');
  const cancelBtn = $<HTMLButtonElement>('confirm-cancel');

  return new Promise<boolean>((resolve) => {
    const cleanup = (choice: boolean) => {
      overlay.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(choice);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// ---------------------------------------------------------------------------
// App state (selected store + pagination tokens).
// ---------------------------------------------------------------------------

interface AppState {
  selectedStore?: StoreSummary;
  storesNextToken: string | null;
  docsNextToken: string | null;
}

const state: AppState = {
  selectedStore: undefined,
  storesNextToken: null,
  docsNextToken: null,
};

// ---------------------------------------------------------------------------
// Profiles (R7) — selection only, never key material.
// ---------------------------------------------------------------------------

async function loadProfiles(): Promise<void> {
  const profiles = await call<ProfileSummary[]>('profiles:list');
  if (!profiles) return;
  const select = $<HTMLSelectElement>('profile-select');
  clear(select);
  const placeholder = el('option', { text: '— select a profile —' });
  placeholder.value = '';
  select.appendChild(placeholder);
  for (const p of profiles) {
    const opt = el('option', { text: p.name });
    opt.value = p.name;
    opt.dataset.keymode = p.keyMode;
    select.appendChild(opt);
  }
}

async function onSelectProfile(): Promise<void> {
  const select = $<HTMLSelectElement>('profile-select');
  const name = select.value;
  $('profile-keymode').textContent = '';
  if (!name) return;
  const req: ProfileSelectReq = { name };
  const res = await call<OkVoid>('profiles:select', req);
  if (!res) return;
  const opt = select.selectedOptions[0];
  $('profile-keymode').textContent = opt?.dataset.keymode
    ? `key: ${opt.dataset.keymode}`
    : '';
  showOk(`Active profile: ${name}`);
  // Reset dependent views.
  state.selectedStore = undefined;
  renderSelectedStore();
  await loadStores(true);
  await loadRegistry();
}

/**
 * Page size for store/document list calls. The Gemini File Search list endpoints
 * (ListFileSearchStores / ListDocuments) reject any `page_size` outside 1–20 with
 * HTTP 400 INVALID_ARGUMENT, so this MUST stay ≤ 20.
 */
const LIST_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Stores (R8).
// ---------------------------------------------------------------------------

async function loadStores(reset: boolean): Promise<void> {
  if (reset) state.storesNextToken = null;
  const req: StoreListReq = {
    pageSize: LIST_PAGE_SIZE,
    ...(state.storesNextToken ? { pageToken: state.storesNextToken } : {}),
  };
  const page = await call<Page<StoreSummary>>('stores:list', req);
  if (!page) return;

  const list = $('stores-list');
  if (reset) clear(list);
  for (const store of page.items) {
    list.appendChild(renderStoreRow(store));
  }
  state.storesNextToken = page.nextPageToken;
  $('stores-more').hidden = !page.nextPageToken;

  // Keep the query multiselect in sync with the current store set.
  refreshQueryStoreOptions(page.items, reset);
}

function renderStoreRow(store: StoreSummary): HTMLLIElement {
  const li = el('li', { class: 'item' });
  li.dataset.apiName = store.apiName;

  const title = el('div', {
    class: 'item-title',
    text: store.displayName || store.apiName,
  });
  const meta = el('div', {
    class: 'item-meta',
    text: `${store.apiName} · docs: ${store.documentCount ?? 0} · ${fmtBytes(
      store.sizeBytes,
    )}`,
  });
  li.appendChild(title);
  li.appendChild(meta);

  const actions = el('div', { class: 'item-actions' });
  const openBtn = el('button', { class: 'btn-secondary', text: 'Open' });
  openBtn.addEventListener('click', () => void openStore(store.apiName));
  const infoBtn = el('button', { class: 'btn-secondary', text: 'Info' });
  const delBtn = el('button', { class: 'btn-danger', text: 'Delete' });
  delBtn.addEventListener('click', () => void deleteStore(store));
  actions.appendChild(openBtn);
  actions.appendChild(infoBtn);
  actions.appendChild(delBtn);
  li.appendChild(actions);

  // Inline store-metadata panel: rendered INSIDE the tile and toggled by the
  // Info button, instead of in the right-side panel (which now hosts only the
  // selected store's documents).
  const infoPanel = el('div', { class: 'store-info' });
  infoPanel.hidden = true;
  li.appendChild(infoPanel);
  infoBtn.addEventListener(
    'click',
    () => void toggleStoreInfo(store.apiName, infoBtn, infoPanel),
  );

  return li;
}

/**
 * Toggle the inline store-info panel inside a tile. On open it fetches the full
 * store metadata (`stores:get`) and renders it as a definition list inside the
 * tile; on close it hides and clears the panel. The Info button doubles as the
 * toggle (Info ↔ Hide).
 */
async function toggleStoreInfo(
  idOrName: string,
  btn: HTMLButtonElement,
  panel: HTMLElement,
): Promise<void> {
  if (!panel.hidden) {
    panel.hidden = true;
    clear(panel);
    btn.textContent = 'Info';
    return;
  }
  const req: StoreGetReq = { idOrName };
  const store = await call<StoreSummary>('stores:get', req);
  if (!store) return;
  renderStoreInfoInto(panel, store);
  panel.hidden = false;
  btn.textContent = 'Hide';
}

/** Render a store's full metadata as a definition list into `panel`. */
function renderStoreInfoInto(panel: HTMLElement, store: StoreSummary): void {
  clear(panel);
  const dl = el('dl');
  const rows: Array<[string, string]> = [
    ['Display name', store.displayName || '—'],
    ['API name', store.apiName],
    ['Embedding model', store.embeddingModel || '—'],
    ['Documents', String(store.documentCount ?? 0)],
    ['Active', String(store.activeDocumentsCount ?? 0)],
    ['Pending', String(store.pendingDocumentsCount ?? 0)],
    ['Failed', String(store.failedDocumentsCount ?? 0)],
    ['Size', fmtBytes(store.sizeBytes)],
    ['Created', store.createTime || '—'],
    ['Updated', store.updateTime || '—'],
  ];
  for (const [k, v] of rows) {
    dl.appendChild(el('dt', { text: k }));
    dl.appendChild(el('dd', { text: v }));
  }
  panel.appendChild(dl);
}

async function onCreateStore(event: Event): Promise<void> {
  event.preventDefault();
  const nameInput = $<HTMLInputElement>('store-create-name');
  const embeddingInput = $<HTMLInputElement>('store-create-embedding');
  const displayName = nameInput.value.trim();
  if (!displayName) return;
  const req: StoreCreateReq = {
    displayName,
    ...(embeddingInput.value.trim()
      ? { embeddingModel: embeddingInput.value.trim() }
      : {}),
  };
  const store = await call<StoreSummary>('stores:create', req);
  if (!store) return;
  showOk(`Created store: ${store.displayName || store.apiName}`);
  nameInput.value = '';
  embeddingInput.value = '';
  await loadStores(true);
}

async function deleteStore(store: StoreSummary): Promise<void> {
  const label = store.displayName || store.apiName;
  const docCount = store.documentCount ?? store.activeDocumentsCount;
  const docNote =
    typeof docCount === 'number' && docCount > 0
      ? ` It contains ${docCount} document${docCount === 1 ? '' : 's'}, which will also be permanently deleted.`
      : '';
  const ok = await confirmAction(
    `Delete store "${label}"?${docNote} This permanently removes the live store and all its documents.`,
  );
  if (!ok) return;
  // force: true is required to delete a non-empty store (the Gemini API rejects a
  // plain delete of a store with documents with 400 FAILED_PRECONDITION); the
  // confirmation above already warns the documents are deleted too. Harmless for
  // empty stores.
  const req: StoreDeleteReq = { apiName: store.apiName, force: true };
  const res = await call<OkVoid>('stores:delete', req);
  if (!res) return;
  showOk(`Deleted store: ${label}`);
  if (state.selectedStore?.apiName === store.apiName) {
    state.selectedStore = undefined;
    renderSelectedStore();
  }
  await loadStores(true);
}

async function openStore(apiName: string): Promise<void> {
  const req: StoreGetReq = { idOrName: apiName };
  const store = await call<StoreSummary>('stores:get', req);
  if (!store) return;
  state.selectedStore = store;
  renderSelectedStore();
  markSelectedStoreRow(apiName);
  await loadDocuments(true);
}

function markSelectedStoreRow(apiName: string): void {
  const list = $('stores-list');
  for (const li of Array.from(list.children) as HTMLElement[]) {
    li.classList.toggle('selected', li.dataset.apiName === apiName);
  }
}

/**
 * Render the right-side panel for the currently selected store. The full
 * metadata now lives inline in each store tile's Info panel; here we render only
 * a compact context header (so the documents below are clearly attributed to a
 * store) and toggle the documents section.
 */
function renderSelectedStore(): void {
  const detail = $('store-detail');
  const docsSection = $('docs-section');
  clear(detail);
  const store = state.selectedStore;
  if (!store) {
    detail.appendChild(
      el('p', {
        class: 'muted',
        text: "Open a store to manage its documents. Use a store's Info button to view its metadata.",
      }),
    );
    docsSection.hidden = true;
    return;
  }
  detail.appendChild(
    el('div', {
      class: 'item-title',
      text: store.displayName || store.apiName,
    }),
  );
  detail.appendChild(el('div', { class: 'item-meta', text: store.apiName }));
  docsSection.hidden = false;
}

// ---------------------------------------------------------------------------
// Documents (R9 / R10).
// ---------------------------------------------------------------------------

async function loadDocuments(reset: boolean): Promise<void> {
  const store = state.selectedStore;
  if (!store) return;
  if (reset) state.docsNextToken = null;
  const req: DocListReq = {
    storeApiName: store.apiName,
    pageSize: LIST_PAGE_SIZE,
    ...(state.docsNextToken ? { pageToken: state.docsNextToken } : {}),
  };
  const page = await call<Page<DocSummary>>('docs:list', req);
  if (!page) return;

  const list = $('docs-list');
  if (reset) clear(list);
  for (const doc of page.items) {
    list.appendChild(renderDocRow(doc));
  }
  state.docsNextToken = page.nextPageToken;
  $('docs-more').hidden = !page.nextPageToken;
}

function renderDocRow(doc: DocSummary): HTMLLIElement {
  const li = el('li', { class: 'item' });
  const title = el('div', {
    class: 'item-title',
    text: doc.displayName || doc.apiName,
  });
  const stateText = String(doc.state).replace(/^STATE_/, '');
  const meta = el('div', {
    class: 'item-meta',
    text: `${stateText} · ${doc.mimeType || 'unknown'} · ${fmtBytes(
      doc.sizeBytes,
    )}`,
  });
  li.appendChild(title);
  li.appendChild(meta);

  const actions = el('div', { class: 'item-actions' });
  const infoBtn = el('button', { class: 'btn-secondary', text: 'Info' });
  const replaceBtn = el('button', { class: 'btn-secondary', text: 'Replace' });
  replaceBtn.addEventListener('click', () => void replaceDocument(doc));
  const delBtn = el('button', { class: 'btn-danger', text: 'Delete' });
  delBtn.addEventListener('click', () => void deleteDocument(doc));
  actions.appendChild(infoBtn);
  actions.appendChild(replaceBtn);
  actions.appendChild(delBtn);
  li.appendChild(actions);

  // Inline info panel: rendered INSIDE the tile and toggled by the Info button,
  // so the metadata stays anchored to its document instead of being pushed into
  // the top status banner.
  const infoPanel = el('div', { class: 'doc-info' });
  infoPanel.hidden = true;
  li.appendChild(infoPanel);
  infoBtn.addEventListener(
    'click',
    () => void toggleDocInfo(doc.apiName, infoBtn, infoPanel),
  );

  return li;
}

/**
 * Toggle the inline document-info panel inside a tile. On open it fetches the
 * full metadata (`docs:get`) and renders it as a definition list inside the
 * tile; on close it hides and clears the panel. The Info button doubles as the
 * toggle (Info ↔ Hide).
 */
async function toggleDocInfo(
  documentApiName: string,
  btn: HTMLButtonElement,
  panel: HTMLElement,
): Promise<void> {
  if (!panel.hidden) {
    panel.hidden = true;
    clear(panel);
    btn.textContent = 'Info';
    return;
  }
  const doc = await call<DocSummary>('docs:get', { documentApiName });
  if (!doc) return;
  renderDocInfoInto(panel, doc);
  panel.hidden = false;
  btn.textContent = 'Hide';
}

/** Render a document's full metadata as a definition list into `panel`. */
function renderDocInfoInto(panel: HTMLElement, doc: DocSummary): void {
  clear(panel);
  const dl = el('dl');
  const rows: Array<[string, string]> = [
    ['Name', doc.displayName || doc.apiName],
    ['API name', doc.apiName],
    ['State', String(doc.state)],
    ['MIME', doc.mimeType || '—'],
    ['Size', fmtBytes(doc.sizeBytes)],
    ['Created', doc.createTime || '—'],
    ['Updated', doc.updateTime || '—'],
  ];
  for (const [k, v] of rows) {
    dl.appendChild(el('dt', { text: k }));
    dl.appendChild(el('dd', { text: v }));
  }
  // Custom metadata: present EVERY key/value pair attached to the document so the
  // Info panel exposes all available metadata (parity with the CLI's doc-info).
  // The heading spans both grid columns (see `.meta-heading` in styles.css).
  const custom = doc.customMetadata ?? [];
  if (custom.length > 0) {
    dl.appendChild(
      el('div', {
        class: 'meta-heading',
        text: `Custom metadata (${custom.length})`,
      }),
    );
    for (const m of custom) {
      dl.appendChild(el('dt', { text: m.key }));
      dl.appendChild(el('dd', { text: fmtCustomMetadataValue(m) }));
    }
  } else {
    dl.appendChild(el('dt', { text: 'Custom metadata' }));
    dl.appendChild(el('dd', { text: '—' }));
  }
  panel.appendChild(dl);
}

let uploadCounter = 0;
function nextRequestId(): string {
  uploadCounter += 1;
  return `upload-${Date.now()}-${uploadCounter}`;
}

async function onUploadDocument(event: Event): Promise<void> {
  event.preventDefault();
  const store = state.selectedStore;
  if (!store) return;
  const pathInput = $<HTMLInputElement>('doc-upload-path');
  const displayInput = $<HTMLInputElement>('doc-upload-display');
  const mimeInput = $<HTMLInputElement>('doc-upload-mime');
  const waitInput = $<HTMLInputElement>('doc-upload-wait');

  const filePath = pathInput.value.trim();
  if (!filePath) return;

  const requestId = nextRequestId();
  const req: DocUploadReq = {
    requestId,
    storeApiName: store.apiName,
    filePath,
    waitActive: waitInput.checked,
    ...(displayInput.value.trim()
      ? { displayName: displayInput.value.trim() }
      : {}),
    ...(mimeInput.value.trim() ? { mimeType: mimeInput.value.trim() } : {}),
  };

  showUploadProgress(requestId, 'STATE_PENDING');
  const doc = await call<DocSummary>('docs:upload', req);
  if (!doc) {
    showUploadProgress(requestId, 'STATE_FAILED');
    return;
  }
  showOk(`Uploaded: ${doc.displayName || doc.apiName}`);
  pathInput.value = '';
  displayInput.value = '';
  mimeInput.value = '';
  await loadDocuments(true);
}

async function replaceDocument(doc: DocSummary): Promise<void> {
  const store = state.selectedStore;
  if (!store) return;
  const label = doc.displayName || doc.apiName;
  const ok = await confirmAction(
    `Replace document "${label}"? The existing document is deleted and a new file is uploaded.`,
  );
  if (!ok) return;

  const filePath = window.prompt(
    `Replacement file path for "${label}" (absolute path):`,
  );
  if (!filePath || !filePath.trim()) return;

  const requestId = nextRequestId();
  const req: DocReplaceReq = {
    requestId,
    storeApiName: store.apiName,
    documentApiName: doc.apiName,
    filePath: filePath.trim(),
    waitActive: true,
  };
  showUploadProgress(requestId, 'STATE_PENDING');
  const replaced = await call<DocSummary>('docs:replace', req);
  if (!replaced) {
    showUploadProgress(requestId, 'STATE_FAILED');
    return;
  }
  showOk(`Replaced: ${replaced.displayName || replaced.apiName}`);
  await loadDocuments(true);
}

async function deleteDocument(doc: DocSummary): Promise<void> {
  const label = doc.displayName || doc.apiName;
  const ok = await confirmAction(`Delete document "${label}"?`);
  if (!ok) return;
  const req: DocDeleteReq = { documentApiName: doc.apiName };
  const res = await call<OkVoid>('docs:delete', req);
  if (!res) return;
  showOk(`Deleted document: ${label}`);
  await loadDocuments(true);
}

// ---------------------------------------------------------------------------
// Upload progress (R10) — reflect STATE_PENDING → STATE_ACTIVE/STATE_FAILED.
// ---------------------------------------------------------------------------

const uploadStates = new Map<string, UploadProgressEvent['state']>();

function showUploadProgress(
  requestId: string,
  st: UploadProgressEvent['state'],
): void {
  uploadStates.set(requestId, st);
  renderUploadProgress();
}

function renderUploadProgress(): void {
  const box = $('upload-progress');
  if (uploadStates.size === 0) {
    box.hidden = true;
    clear(box);
    return;
  }
  clear(box);
  for (const [id, st] of uploadStates) {
    const cls =
      st === 'STATE_ACTIVE'
        ? 'state-active'
        : st === 'STATE_FAILED'
          ? 'state-failed'
          : 'state-pending';
    const line = el('div', { class: cls, text: `${id}: ${st}` });
    box.appendChild(line);
  }
  box.hidden = false;
}

function onUploadProgressEvent(payload: UploadProgressEvent): void {
  uploadStates.set(payload.requestId, payload.state);
  renderUploadProgress();
}

// ---------------------------------------------------------------------------
// Query (R11) — answer + byte-accurate inline citations + sources + excerpts.
// ---------------------------------------------------------------------------

function refreshQueryStoreOptions(
  stores: StoreSummary[],
  reset: boolean,
): void {
  const select = $<HTMLSelectElement>('query-stores');
  if (reset) clear(select);
  const existing = new Set(
    Array.from(select.options).map((o) => o.value),
  );
  for (const store of stores) {
    if (existing.has(store.apiName)) continue;
    const opt = el('option', {
      text: store.displayName || store.apiName,
    });
    opt.value = store.apiName;
    select.appendChild(opt);
  }
}

async function onRunQuery(event: Event): Promise<void> {
  event.preventDefault();
  const select = $<HTMLSelectElement>('query-stores');
  const promptInput = $<HTMLTextAreaElement>('query-prompt');
  const modelInput = $<HTMLInputElement>('query-model');
  const filterInput = $<HTMLInputElement>('query-filter');

  const storeApiNames = Array.from(select.selectedOptions).map((o) => o.value);
  const prompt = promptInput.value.trim();
  if (storeApiNames.length === 0) {
    showError('CONFIGURATION_ERROR', 'Select at least one store to query.');
    return;
  }
  if (!prompt) return;

  const req: QueryReq = {
    storeApiNames,
    prompt,
    ...(modelInput.value.trim() ? { model: modelInput.value.trim() } : {}),
    ...(filterInput.value.trim()
      ? { metadataFilter: filterInput.value.trim() }
      : {}),
  };

  const results = $('query-results');
  clear(results);
  results.appendChild(el('p', { class: 'muted', text: 'Running query…' }));

  const view = await call<QueryResultView>('query:run', req);
  clear(results);
  if (!view) return;
  renderQueryResult(view);
}

/**
 * Render the answer with byte-accurate inline citation markers.
 *
 * `CitationSpan.startIndex`/`endIndex` are BYTE offsets into the UTF-8 encoding
 * of `answer` (produced by the main process via `citation-render.ts`). We encode
 * the answer once, slice by byte offset, and decode each slice back to text so a
 * marker is inserted at the correct boundary even for multi-byte characters. The
 * renderer renders the spans the backend supplied — it does NOT recompute them.
 */
function renderQueryResult(view: QueryResultView): void {
  const results = $('query-results');

  const answerBox = el('div', { class: 'answer' });
  appendAnswerWithCitations(answerBox, view);
  results.appendChild(answerBox);

  if (view.finishReason) {
    results.appendChild(
      el('p', { class: 'muted', text: `finishReason: ${view.finishReason}` }),
    );
  }

  if (view.sources.length > 0) {
    results.appendChild(el('h3', { text: 'Sources' }));
    view.sources.forEach((src, idx) => {
      const box = el('div', { class: 'source' });
      box.appendChild(
        el('div', {
          class: 'source-title',
          text: `[${idx + 1}] ${src.title || src.storeName || 'source'}`,
        }),
      );
      const metaBits: string[] = [];
      if (src.storeName) metaBits.push(src.storeName);
      if (src.uri) metaBits.push(src.uri);
      if (src.pageNumber !== undefined) metaBits.push(`p.${src.pageNumber}`);
      if (metaBits.length > 0) {
        box.appendChild(el('div', { class: 'item-meta', text: metaBits.join(' · ') }));
      }
      if (src.excerpt) {
        box.appendChild(
          el('div', { class: 'source-excerpt', text: src.excerpt }),
        );
      }
      results.appendChild(box);
    });
  }
}

function appendAnswerWithCitations(
  container: HTMLElement,
  view: QueryResultView,
): void {
  const answer = view.answer ?? '';
  const spans = (view.citations ?? []).filter(
    (c) => typeof c.endIndex === 'number',
  );

  if (spans.length === 0) {
    container.textContent = answer;
    return;
  }

  // Byte-accurate insertion of markers at each span's endIndex.
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(answer);

  // Sort by byte end offset so markers are inserted in document order.
  const ordered = [...spans].sort(
    (a, b) => (a.endIndex ?? 0) - (b.endIndex ?? 0),
  );

  let cursor = 0; // byte cursor into `bytes`
  for (const span of ordered) {
    const end = Math.min(Math.max(span.endIndex ?? 0, cursor), bytes.length);
    if (end > cursor) {
      const slice = bytes.subarray(cursor, end);
      container.appendChild(document.createTextNode(decoder.decode(slice)));
      cursor = end;
    }
    const refs = (span.chunkIndices ?? []).map((i) => i + 1).join(',');
    container.appendChild(
      el('sup', {
        class: 'citation-marker',
        text: refs ? `[${refs}]` : '[*]',
      }),
    );
  }
  if (cursor < bytes.length) {
    container.appendChild(
      document.createTextNode(decoder.decode(bytes.subarray(cursor))),
    );
  }
}

// ---------------------------------------------------------------------------
// Registry (R12).
// ---------------------------------------------------------------------------

async function loadRegistry(): Promise<void> {
  const entries = await call<RegistryEntryView[]>('registry:list');
  if (!entries) return;
  renderRegistry(entries);
}

async function refreshRegistry(): Promise<void> {
  const entries = await call<RegistryEntryView[]>('registry:refresh');
  if (!entries) return;
  showOk('Registry refreshed against the live API.');
  renderRegistry(entries);
}

function renderRegistry(entries: RegistryEntryView[]): void {
  const list = $('registry-list');
  clear(list);
  if (entries.length === 0) {
    list.appendChild(el('li', { class: 'muted', text: 'No cached entries.' }));
    return;
  }
  for (const entry of entries) {
    const li = el('li', { class: 'item' });
    li.appendChild(
      el('div', {
        class: 'item-title',
        text: entry.displayName || entry.apiName,
      }),
    );
    li.appendChild(
      el('div', {
        class: 'item-meta',
        text: `${entry.apiName} · profile: ${entry.profile} · docs: ${
          entry.documentCount ?? 0
        } · refreshed: ${entry.lastRefreshedAt}`,
      }),
    );
    const actions = el('div', { class: 'item-actions' });
    const pruneBtn = el('button', { class: 'btn-danger', text: 'Prune' });
    pruneBtn.addEventListener('click', () => void pruneRegistry(entry));
    actions.appendChild(pruneBtn);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

async function pruneRegistry(entry: RegistryEntryView): Promise<void> {
  const label = entry.displayName || entry.apiName;
  const ok = await confirmAction(
    `Prune "${label}" from the local registry? This removes the cached entry only — the live store is NOT deleted.`,
  );
  if (!ok) return;
  const req: RegistryPruneReq = { apiName: entry.apiName };
  const res = await call<OkBool>('registry:prune', req);
  if (!res) return;
  showOk(res.removed ? `Pruned: ${label}` : `Entry not found: ${label}`);
  await loadRegistry();
}

// ---------------------------------------------------------------------------
// Tabs (left pane: Stores | File Search query). Pure DOM toggling — both
// tabpanels stay mounted (so the query store-select keeps syncing with the
// store list); only visibility and ARIA state change.
// ---------------------------------------------------------------------------

const TABS: ReadonlyArray<{ tab: string; panel: string }> = [
  { tab: 'tab-stores', panel: 'tabpanel-stores' },
  { tab: 'tab-query', panel: 'tabpanel-query' },
];

function activateTab(tabId: string): void {
  for (const { tab, panel } of TABS) {
    const isActive = tab === tabId;
    const tabEl = $(tab);
    tabEl.classList.toggle('active', isActive);
    tabEl.setAttribute('aria-selected', String(isActive));
    $(panel).hidden = !isActive;
  }
}

function wireTabs(): void {
  for (const { tab } of TABS) {
    $(tab).addEventListener('click', () => activateTab(tab));
  }
}

// ---------------------------------------------------------------------------
// Wiring (all events via addEventListener — CSP forbids inline handlers).
// ---------------------------------------------------------------------------

function wire(): void {
  wireTabs();

  $('profile-select').addEventListener('change', () => void onSelectProfile());
  $('profile-refresh').addEventListener('click', () => void loadProfiles());

  $('status-banner-close').addEventListener('click', hideBanner);

  $('stores-reload').addEventListener('click', () => void loadStores(true));
  $('store-create-form').addEventListener('submit', (e) =>
    void onCreateStore(e),
  );
  $('stores-more').addEventListener('click', () => void loadStores(false));

  $('docs-reload').addEventListener('click', () => void loadDocuments(true));
  $('doc-upload-form').addEventListener('submit', (e) =>
    void onUploadDocument(e),
  );
  $('docs-more').addEventListener('click', () => void loadDocuments(false));

  $('query-form').addEventListener('submit', (e) => void onRunQuery(e));

  $('registry-reload').addEventListener('click', () => void loadRegistry());
  $('registry-refresh').addEventListener('click', () => void refreshRegistry());

  // Main → renderer upload lifecycle (R10).
  window.gemini.on('upload:progress', onUploadProgressEvent);
}

function init(): void {
  wire();
  void loadProfiles();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
