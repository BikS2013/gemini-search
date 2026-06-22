---
status: complete
design_number: "002"
slug: electron-ui-surface
request_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-electron-ui-surface.md
plan_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/plan-002-electron-ui-surface.md
investigation_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/investigation-electron-ui-surface.md
research_files:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/electron-security-ipc-preload.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/electron-builder-macos-esbuild-main.md
codebase_scan_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/codebase-scan-electron-ui-surface.md
based_on_commit: null
units_changed_from_plan: false
implementation_units:
  - name: U1 — Removal (agent/TUI/deps/CLI excision)
    plan_steps: [1, 2, 3, 4, 5]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/tui/
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/agent.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/agent-config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tests/agent/
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/index.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
    exposes:
      - "RemovalBaseline: post-U1 green build/typecheck/test; 16 surviving CLI commands; package.json dependencies/keywords/description free of LangChain/LangGraph; API/ untouched"
    consumes: []
  - name: U2 — Electron backend + IPC contract + main process
    plan_steps: [6, 7, 8, 9, 10, 11, 12, 13]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-contract.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-payloads.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-handlers.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/profile-state.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/registry-service.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/main.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/preload.cjs
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/tsconfig.electron.json
    exposes:
      - "IpcContract: InvokeChannel union, EventChannel union, IpcOk<T>/IpcErr/IpcResult<T> envelopes, INVOKE_CHANNEL_LIST/EVENT_CHANNEL_LIST runtime arrays (src/electron/ipc-contract.ts)"
      - "IpcPayloads: structural request/response payload interfaces per channel + UploadProgressEvent + ProfileSummary (src/electron/ipc-payloads.ts)"
      - "WindowGeminiBridge: window.gemini = { invoke(channel, ...args): Promise<IpcResult<T>>; on(channel, cb): () => void } installed by preload.cjs"
    consumes:
      - "RemovalBaseline (from U1)"
  - name: U3 — Electron renderer (HTML/CSS/TS, no framework)
    plan_steps: [14, 15, 16, 17]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/index.html
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/styles.css
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/app.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/tsconfig.renderer.json
    exposes:
      - "RendererBundle: emitted src/electron/public/app.js + index.html + styles.css shipped via extraResources"
    consumes:
      - "IpcContract (type-only, from U2)"
      - "IpcPayloads (type-only, from U2)"
      - "WindowGeminiBridge (from U2)"
  - name: U4 — Packaging, launch, dependency vetting, build wiring
    plan_steps: [18, 19, 20, 21]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/launch.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/dev.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tsconfig.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/Issues - Pending Items.md
    exposes:
      - "BuildArtifacts: dist/electron/main.mjs (esbuild), release/mac-arm64/Gemini Nav.app (electron-builder), dev:electron launch path, package.json scripts + main + build block"
    consumes:
      - "RemovalBaseline (from U1) — package.json edits sequenced AFTER U1"
      - "main.ts entry (from U2)"
      - "RendererBundle (from U3) — packaged via extraResources"
  - name: U5 — Documentation (removal + Electron surface)
    plan_steps: [22, 23, 24]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/tools/gemini-nav.md
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-design.md
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-functions.md
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/CLAUDE.md
    exposes:
      - "Documentation: tool doc + project-design dated section + project-functions + CLAUDE.md reflecting removal + Electron surface"
    consumes:
      - "RemovalBaseline (from U1) — removal facts"
      - "BuildArtifacts (from U4) — final commands/build block"
files_to_create:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-contract.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-payloads.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-handlers.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/profile-state.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/registry-service.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/main.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/preload.cjs
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/launch.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/dev.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/tsconfig.electron.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/tsconfig.renderer.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/index.html
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/styles.css
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/app.ts
files_to_modify:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/index.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tsconfig.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/tools/gemini-nav.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-design.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-functions.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/CLAUDE.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/Issues - Pending Items.md
decisions: 9
created_at: 2026-06-21T23:30:00Z
---

# Design 002 — Remove Agent/TUI Surface and Add an Electron Desktop UI

## Objective

This design fixes the architecture, interface contracts, and unit boundaries for Plan 002:
remove the LangGraph ReAct agent surface, its terminal TUI, the 8 LLM-provider adapters, the
agent config module, and the seven LangChain/LangGraph runtime dependencies; then add a fourth
surface — an Electron desktop UI under `src/electron/` — that consumes the existing
`IGeminiBackend` **in-process** via `makeBackend(profileName)` through a sandboxed, typed IPC
bridge. The reusable core backend, the 16 surviving CLI commands, and the `API/` sub-project
remain functionally intact. It serves
`docs/reference/refined-request-electron-ui-surface.md` and is the implementation contract for
the five units the orchestrator fans out.

## Architecture

### Component diagram

```
                                  ┌─────────────────────────────────────────────┐
                                  │              ELECTRON MAIN PROCESS            │
                                  │            (ESM, bundled → main.mjs)          │
  ┌──────────────┐  file:// load  │  ┌────────────┐   ┌──────────────────────┐   │
  │  RENDERER    │ ◀────────────────┤  main.ts   │──▶│ profile-state.ts     │   │
  │ (sandboxed)  │                 │  │ BrowserWin │   │  - active profile    │   │
  │              │   window.gemini │  │ + hardening│   │  - getBackend()      │   │
  │ index.html   │   .invoke/.on   │  │ + register │   │   ▼                  │   │
  │ styles.css   │ ◀──IPC bridge──▶│  │   IPC      │   │  makeBackend(name) ──┼───┼─▶ src/core/backend/factory.ts
  │ app.js       │                 │  └─────┬──────┘   │   ▶ IGeminiBackend   │   │      (IN-PROCESS, never @google/genai)
  │              │                 │        │          └──────────────────────┘   │
  │ (no Node,    │                 │  ┌─────▼────────────────────────────────┐    │
  │  no SDK,     │                 │  │ ipc-handlers.ts                       │    │
  │  no key)     │                 │  │  - 15 ipcMain.handle channels         │    │
  └──────┬───────┘                 │  │  - assertTrustedSender                │──▶ registry-service.ts ─▶ src/core/registry.ts
         │                         │  │  - run<T>() envelope + redactString   │    │
         │ preload.cjs (CJS,       │  │  - BackendError/ConfigurationError →   │──▶ src/core/errors.ts
         │ extraResources,         │  │     {code,message}                     │──▶ src/util/redact.ts
         └─ allowlist invoke/on)──▶│  │  - emitUploadProgress (event channel) │    │
                                   │  └───────────────────────────────────────┘    │
                                   └─────────────────────────────────────────────┘
   DEV:  dev.ts → launch.ts (esbuild temp .mjs → spawn electron binary)
   DIST: build:electron-main (esbuild → dist/electron/main.mjs) + build:renderer (tsc → public/app.js)
         + electron-builder --mac --arm64 (unsigned dir target; preload.cjs + public/ as extraResources)
```

### Responsibilities & landing locations

All new code lands under a single new directory **`src/electron/`** (greenfield; scan §4.4,
§5 "No `src/electron/` directory exists yet"), mirroring the reference layout
(`docs/reference/storage-navigator-ref/src/electron/`) but **dropping the reference's embedded
Express server** (scan §5; research 2 §4). Conventions adopted from scan §3: NodeNext ESM with
`.js` import extensions, named exports only (preload is the documented CJS exception),
structural-interface payload types (not SDK/CLI types, per `citation-render.ts:22-46`), and no
configuration fallbacks (`ConfigurationError` instead, per `factory.ts:48-51`).

| Component | File | Responsibility |
|---|---|---|
| Main process | `src/electron/main.ts` | App lifecycle, `await app.whenReady()`, secure `BrowserWindow`, resource-path resolution via Electron APIs, window hardening, `registerIpcHandlers(rendererUrl, win)`, `win.loadFile(indexHtml)`. |
| IPC contract | `src/electron/ipc-contract.ts` | **Single source of truth** for channel unions, envelope types, runtime channel lists. No SDK/CLI/Electron imports. |
| IPC payloads | `src/electron/ipc-payloads.ts` | Structural request/response payload interfaces per channel; `UploadProgressEvent`; `ProfileSummary` (never key material). |
| IPC handlers | `src/electron/ipc-handlers.ts` | One `ipcMain.handle` per channel; sender validation; error mapping + redaction; `emitUploadProgress`. |
| Profile state | `src/electron/profile-state.ts` | Main-process singleton: active profile name + current `IGeminiBackend`; `selectProfile` rebuilds via `makeBackend`; throws `ConfigurationError` on missing config. |
| Registry service | `src/electron/registry-service.ts` | Thin wrappers over `Registry` for list/refresh/prune. |
| Preload bridge | `src/electron/preload.cjs` | CJS, sandbox-compatible; exposes `window.gemini.invoke/on` over an allowlist; nothing else. |
| Renderer | `src/electron/public/{index.html,styles.css,app.ts→app.js}` | DOM-only UI; backend access solely via `window.gemini`. |
| Dev launcher | `src/electron/{launch.ts,dev.ts}` | esbuild temp bundle + spawn electron binary + cleanup. |
| Typecheck configs | `src/electron/{tsconfig.electron.json,tsconfig.renderer.json}` | Separate main (node, no DOM) and renderer (DOM, no node) typechecks. |

### Process & trust boundaries (binding, from research 1)

- **Main process** is the sole holder of `IGeminiBackend`, `CredentialStore`, and any API-key
  material. Window flags (all explicit, even when default): `contextIsolation: true`,
  `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`,
  `allowRunningInsecureContent: false`, `experimentalFeatures: false`.
- **Renderer** is untrusted: no Node, no SDK, no key, no network of its own (CSP
  `connect-src 'none'`). Reaches the backend only through `window.gemini`.
- **Preload** is the only bridge; CJS, `require('electron')` limited to `{ contextBridge,
  ipcRenderer }` (research 1 §47413 footgun). Raw `ipcRenderer` is never exposed.
- **Design rule (write into the tool doc):** route ALL main-only Electron APIs
  (`shell`/`dialog`/`app`) through IPC — never call them from the preload (research 1
  best-practice 9; avoids #47413).

## Data Models

No database and no new persisted schema. The Electron surface reuses the existing on-disk
stores untouched (scan §4.3): the AES-256-GCM credential vault
(`~/.tool-agents/gemini-nav/credentials.json` via `CredentialStore`) and the plaintext registry
(`~/.tool-agents/gemini-nav/registry.json` via `Registry`). All cross-IPC data uses the
structural payload types in §"API & Interface Contracts" — clone-safe plain objects only
(research 1: class instances lose their prototype across the bridge; never send a
`BackendError` instance).

## API & Interface Contracts

This section is the **single source of truth** for every between-unit and outward-facing
surface. U2 implements these; U3 consumes the type-only versions and the `window.gemini`
bridge. The preload's runtime allowlist literals MUST mirror `INVOKE_CHANNEL_LIST` /
`EVENT_CHANNEL_LIST` exactly.

### Envelope types (`src/electron/ipc-contract.ts`)

```ts
export type IpcOk<T>  = { ok: true;  data: T };
export type IpcErr    = { ok: false; error: { code: string; message: string } };
export type IpcResult<T> = IpcOk<T> | IpcErr;

export type InvokeChannel =
  | 'stores:list' | 'stores:get' | 'stores:create' | 'stores:delete'
  | 'docs:list'   | 'docs:get'   | 'docs:upload'   | 'docs:delete' | 'docs:replace'
  | 'query:run'
  | 'registry:list' | 'registry:refresh' | 'registry:prune'
  | 'profiles:list' | 'profiles:select';

export type EventChannel = 'upload:progress';

// Runtime mirrors — the preload.cjs literal Sets MUST equal these exactly.
export const INVOKE_CHANNEL_LIST: readonly InvokeChannel[] = [ /* all 15, in order above */ ];
export const EVENT_CHANNEL_LIST: readonly EventChannel[]   = [ 'upload:progress' ];
```

### Channel contract table

Every channel's request payload, response data (wrapped in `IpcOk<T>` on success), and error
contract (`IpcErr` always `{ code, message }`). Request/response interfaces live in
`src/electron/ipc-payloads.ts`; the renderer imports them type-only via `../ipc-payloads.js`.

| Channel | Request payload | Success data `T` (in `IpcOk<T>`) | Backend / service call |
|---|---|---|---|
| `stores:list` | `StoreListReq { pageSize?: number; pageToken?: string }` | `Page<StoreSummary>` | `backend.listStores(opts)` |
| `stores:get` | `StoreGetReq { idOrName: string }` | `StoreSummary` | `backend.getStore(idOrName)` |
| `stores:create` | `StoreCreateReq { displayName: string; embeddingModel?: string }` | `StoreSummary` | `backend.createStore(displayName, { embeddingModel })` |
| `stores:delete` | `StoreDeleteReq { apiName: string; force?: boolean }` | `OkVoid { done: true }` | `backend.deleteStore(apiName, force)` |
| `docs:list` | `DocListReq { storeApiName: string; pageSize?: number; pageToken?: string }` | `Page<DocSummary>` | `backend.listDocuments(storeApiName, opts)` |
| `docs:get` | `DocGetReq { documentApiName: string }` | `DocSummary` | `backend.getDocument(documentApiName)` |
| `docs:upload` | `DocUploadReq { requestId: string; storeApiName: string; filePath: string; displayName?: string; mimeType?: string; waitActive?: boolean }` | `DocSummary` | `backend.uploadDocument(storeApiName, filePath, { displayName, mimeType, waitActive })` |
| `docs:delete` | `DocDeleteReq { documentApiName: string; force?: boolean }` | `OkVoid { done: true }` | `backend.deleteDocument(documentApiName, force)` |
| `docs:replace` | `DocReplaceReq { requestId: string; storeApiName: string; documentApiName: string; filePath: string; displayName?: string; waitActive?: boolean }` | `DocSummary` | `backend.replaceDocument(storeApiName, documentApiName, filePath, { displayName, waitActive })` |
| `query:run` | `QueryReq { storeApiNames: string[]; prompt: string; model?: string; metadataFilter?: string }` | `QueryResultView` | `backend.query(storeApiNames, prompt, { model, metadataFilter })` |
| `registry:list` | `void` | `RegistryEntryView[]` | `registryList()` |
| `registry:refresh` | `void` | `RegistryEntryView[]` | `registryRefresh(activeProfile, getBackend())` |
| `registry:prune` | `RegistryPruneReq { apiName: string }` | `OkBool { removed: boolean }` | `registryPrune(apiName)` |
| `profiles:list` | `void` | `ProfileSummary[]` | `listProfileSummaries()` |
| `profiles:select` | `ProfileSelectReq { name: string }` | `OkVoid { done: true }` | `selectProfile(name)` |

`force` is exposed on the request types for contract completeness but the renderer always
sends `false`/omits it (the UI's own confirmation dialog is the gate; the backend `force` flag
is a separate concern and stays `false` for v1).

### Event channel (`upload:progress`)

```ts
export interface UploadProgressEvent {
  requestId: string;                                  // correlates to DocUploadReq/DocReplaceReq
  state: 'STATE_PENDING' | 'STATE_ACTIVE' | 'STATE_FAILED';
  documentApiName?: string;
}
```

Pushed main → renderer via `win.webContents.send('upload:progress', payload)` (guarded by
`!win.isDestroyed()`). The renderer subscribes with
`window.gemini.on('upload:progress', cb)` and correlates by `requestId`. Used to reflect the
`waitActive` lifecycle (R10): `docs:upload`/`docs:replace` with `waitActive: true` emit
`STATE_PENDING` on receipt and a terminal `STATE_ACTIVE`/`STATE_FAILED` when the awaited
`uploadDocument`/`replaceDocument` promise settles. (The backend itself does not stream
intermediate progress; the event channel reflects the pending→terminal transition the main
process observes.)

### Structural payload (`view`) types (`src/electron/ipc-payloads.ts`)

These mirror the core DTO shapes but are declared structurally for the bridge. Where the core
shape is already key-free and clone-safe, the design reuses it via a **type-only** import from
`../core/types.js` (allowed by scan §3 structural convention; the import is type-only so it
does not pull core runtime into the contract). Concretely:

- `StoreSummary = StoreInfo` (type-only re-export; `src/core/types.ts:29-50` — no key material).
- `DocSummary = DocumentInfo` (type-only re-export; `src/core/types.ts:81-93`).
- `QueryResultView = QueryResult` (type-only re-export; `src/core/types.ts:139-150`) — carries
  `answer`, `sources: QuerySource[]`, `citations: CitationSpan[]` (byte offsets), `finishReason`.
  The main process serializes the full `QueryResult` (built via `citation-render.ts` helpers
  inside `GenAiBackend`/`query`); the renderer renders the returned spans and does NOT recompute
  or re-import core (Design Decision 7).
- `Page<T> = { items: T[]; nextPageToken: string | null }` (mirrors `backend.ts:13`).
- `RegistryEntryView = RegistryEntry` (type-only re-export; `src/core/types.ts:196-211`).
- `ProfileSummary { name: string; keyMode: 'stored' | 'env' }` — **declared fresh, NOT** the
  full `ProfileEntry`; it deliberately omits any key-bearing field. No payload type in this file
  may contain `apiKey`/`secret`/`credential` (Design Decision 6).
- `OkVoid { done: true }`, `OkBool { removed: boolean }` — explicit success envelopes for
  void/boolean operations (a bare `undefined`/`boolean` is clone-safe but an object reads better
  and keeps `data` non-nullable).

`raw?: unknown` on `QueryResult` MUST NOT be forwarded across IPC (it is the raw grounding
subtree and could echo internals); the handler strips `raw` before building `IpcOk`
(Design Decision 6).

### Error contract (`src/electron/ipc-handlers.ts`)

The `run<T>()` wrapper is the single choke point. Mapping (research 1 §"Typed-error
serialization", scan §4.5 #2):

| Caught error | `code` | `message` |
|---|---|---|
| `FileTooLargeError` | `'FILE_TOO_LARGE'` | `redactString(err.message)` |
| `UnsupportedMimeTypeError` | `'UNSUPPORTED_MIME_TYPE'` | `redactString(err.message)` |
| `StoreLimitError` | `'STORE_LIMIT'` | `redactString(err.message)` |
| `RateLimitError` | `'RATE_LIMIT'` | `redactString(err.message)` |
| `UploadOperationError` | `'UPLOAD_OPERATION_FAILED'` | `redactString(err.message)` |
| `ConfigurationError` | `'CONFIGURATION_ERROR'` | `redactString(err.message)` |
| any other / unknown | `'INTERNAL'` | `'Internal error'` (opaque, never reflected) |

The 5 typed `BackendError` subclasses are matched by `instanceof BackendError` and keyed by
`err.code` (verified `src/core/errors.ts:20-104`; `code` strings confirmed). NEVER serialize
`stack`, `cause`, or `operationError`.

### `window.gemini` bridge shape (preload → renderer, ambient typing)

```ts
interface Window {
  gemini: {
    invoke<T = unknown>(channel: InvokeChannel, ...args: unknown[]): Promise<IpcResult<T>>;
    on(channel: EventChannel, cb: (payload: UploadProgressEvent) => void): () => void;
  };
}
```

`invoke` rejects any channel not in the allowlist before any IPC is sent; `on` validates the
event channel, strips the Electron `event` object (forwards payload only), and returns an
unsubscribe function (research 1 §preload).

### Reused existing symbols (verified; consumed by U2, never modified — scan §4.3)

- `makeBackend(profileName: string, flags?: BackendFlags): IGeminiBackend` — `factory.ts:30`.
- `IGeminiBackend` 10 methods — `backend.ts:45-79` (signatures verified above).
- `Registry` — `new Registry()`, `.list()`, `.reconcile(profile: string, liveStores: StoreInfo[]): void`
  (`registry.ts:94`, verified), `.remove(apiName): boolean` (`registry.ts:75`).
- `CredentialStore` — `new CredentialStore()`, `.listProfiles(): ProfileEntry[]`,
  `.getProfile(name): ProfileEntry | undefined`, `.getApiKey(name): string` (sole key-returning
  method, used only inside `makeBackend`) — `credential-store.ts:129/134/204`.
- `redactString(input: string): string` — `redact.ts:37`.
- `ConfigurationError` — `src/config/config-error.ts`.
- Citation helpers `renderInlineCitations`, `mapSources`, `mapCitations` —
  `citation-render.ts` (used inside core's `query`; the renderer never imports them).

## Module Organization

```
src/electron/
  ipc-contract.ts        [U2] channel unions, envelopes, runtime channel lists  (no SDK/CLI/electron imports)
  ipc-payloads.ts        [U2] structural request/response payload interfaces + UploadProgressEvent + ProfileSummary
  ipc-handlers.ts        [U2] registerIpcHandlers(rendererUrl, win); run<T>(); assertTrustedSender; emitUploadProgress
  profile-state.ts       [U2] getActiveProfile/listProfileSummaries/selectProfile/getBackend (singleton)
  registry-service.ts    [U2] registryList/registryRefresh/registryPrune
  main.ts                [U2] ESM main entry — bundled to dist/electron/main.mjs by esbuild
  preload.cjs            [U2] CJS allowlist bridge — shipped verbatim via extraResources
  tsconfig.electron.json [U2] main-side typecheck (node, no DOM, noEmit)
  tsconfig.renderer.json [U3] renderer typecheck/build (DOM, no node) → emits public/app.js
  public/
    index.html           [U3] CSP-locked shell, relative assets, all UI regions
    styles.css           [U3] self-contained styles, no remote resources
    app.ts               [U3] DOM-only renderer logic; window.gemini-only; → public/app.js (build artifact)

Modified (existing):
  src/cli/index.ts       [U1] excise agent wiring (scan §4.1 lines 49-52, 305-306, 311-357, 365)
  package.json           [U1 dep/keyword/desc removal] + [U4 devDeps/overrides/scripts/main/build] — DISJOINT REGIONS
  tsconfig.json          [U4] add "src/electron/**" to exclude
  docs/tools/gemini-nav.md, docs/design/project-design.md, docs/design/project-functions.md, CLAUDE.md  [U5]
  Issues - Pending Items.md  [U4] dependency vetted-on log line
```

### Build path (research 2 §6)

- Root `npm run build` = `tsc` — emits `dist/` for core/CLI, **excludes `src/electron/**`**
  (U4 adds the exclude so DOM/electron types don't break the core build).
- `build:electron-main` = `esbuild src/electron/main.ts --bundle --platform=node --format=esm
  --target=node20 --outfile=dist/electron/main.mjs --packages=external --sourcemap`.
- `build:renderer` = `tsc -p src/electron/tsconfig.renderer.json` → `src/electron/public/app.js`.
- `typecheck:electron` = `tsc --noEmit -p src/electron/tsconfig.electron.json`.
- `dist:mac` = `npm run build:electron && electron-builder --mac --arm64` (unsigned `dir`).
- `package.json` `"main"` = `dist/electron/main.mjs`.

## Error Handling Strategy

- **Backend/typed errors** → flattened to `{ code, message }` by `run<T>()`, redacted, per the
  error-contract table. Renderer maps each `code` to a fixed, non-secret UI message
  (R13/Acceptance 6): `FILE_TOO_LARGE`, `UNSUPPORTED_MIME_TYPE`, `STORE_LIMIT`, `RATE_LIMIT`,
  `UPLOAD_OPERATION_FAILED`, `CONFIGURATION_ERROR`, `INTERNAL`.
- **No configuration fallbacks (binding, scan §3, R18).** `getBackend()` throws
  `ConfigurationError` when no profile is selected — no silent default profile.
  `selectProfile(name)` throws `ConfigurationError` if the profile does not exist
  (`CredentialStore.getProfile` returns undefined). `makeBackend` already throws
  `ConfigurationError` when key resolution exhausts (`factory.ts:48-51`). These propagate to the
  renderer as `{ code: 'CONFIGURATION_ERROR', message }`. Operational knobs (window size, page
  size) may carry documented defaults — the only sanctioned exception.
- **Unknown errors** → opaque `{ code: 'INTERNAL', message: 'Internal error' }`; never reflect
  the raw error, stack, or cause.
- **Secret handling (R16, Design Decision 6):** API keys never cross IPC. `redactString` runs on
  every outbound `message`. `profiles:list` returns names + `keyMode` only. `raw` is stripped
  from query results. The renderer cannot exfiltrate even a leaked secret (`connect-src 'none'`),
  but redaction at the source is the primary control.
- **Sender validation:** every `ipcMain.handle` runs `assertTrustedSender(event, rendererUrl)` —
  `event.senderFrame?.url` must start with the expected `file://` renderer URL, else throw.

## Implementation Units

### U1 — Removal (agent/TUI/deps/CLI excision)
- **Plan steps:** 1, 2, 3, 4, 5.
- **Files:** `src/agent/`, `src/tui/`, `src/cli/commands/agent.ts`, `src/config/agent-config.ts`,
  `tests/agent/`, `src/cli/index.ts`, `package.json` (dependencies/keywords/description **only**).
- **Exposes — `RemovalBaseline`:** after U1, `npm run build`/`typecheck`/`test` are green; the 16
  CLI commands survive and `gemini-nav --help` shows no `agent`; `package.json`
  `dependencies`/`keywords`/`description` contain no LangChain/LangGraph; `API/` unaffected.
- **Consumes:** nothing.
- **package.json region:** edits ONLY the `dependencies` object (remove 7 `@langchain/*` +
  `langchain`), `keywords[]` (remove `"langgraph"`), and `"description"`. Does NOT touch
  `devDependencies`, `overrides`, `scripts`, `main`, or `build` (those are U4). Run U1's
  package.json edit to completion before U4's (sequencing constraint).

### U2 — Electron backend + IPC contract + main process
- **Plan steps:** 6, 7, 8, 9, 10, 11, 12, 13.
- **Files:** `src/electron/ipc-contract.ts`, `ipc-payloads.ts`, `ipc-handlers.ts`,
  `profile-state.ts`, `registry-service.ts`, `main.ts`, `preload.cjs`, `tsconfig.electron.json`.
- **Exposes:** `IpcContract` (channel unions, `IpcResult<T>` envelope, runtime channel lists),
  `IpcPayloads` (the structural request/response types + `UploadProgressEvent` + `ProfileSummary`
  in §"API & Interface Contracts"), `WindowGeminiBridge` (`window.gemini.invoke/on` shape). The
  preload's allowlist literals MUST equal `INVOKE_CHANNEL_LIST`/`EVENT_CHANNEL_LIST`.
- **Consumes:** `RemovalBaseline` (clean build/typecheck baseline).
- **Key behaviors:** `main.ts` resolves resources via `app.getAppPath()`/`process.resourcesPath`/
  `app.isPackaged` — never `__dirname`/`import.meta` (research 2 §1); `await app.whenReady()`
  before window/backend setup (research 1 async caveat); secure window flags + hardening;
  `win.loadFile(indexHtml)` (no server). `profile-state.ts` and `registry-service.ts` wrap the
  verified existing core symbols. `preload.cjs` requires only `{ contextBridge, ipcRenderer }`.

### U3 — Electron renderer (HTML/CSS/TS, no framework)
- **Plan steps:** 14, 15, 16, 17.
- **Files:** `src/electron/public/index.html`, `styles.css`, `app.ts`, `tsconfig.renderer.json`.
- **Exposes:** `RendererBundle` (emitted `public/app.js` + `index.html` + `styles.css` for
  `extraResources`).
- **Consumes:** `IpcContract` + `IpcPayloads` (type-only, via `../ipc-contract.js` /
  `../ipc-payloads.js`) and `WindowGeminiBridge` — all from U2. Never imports core or the SDK;
  renders byte-accurate citations from the `QueryResultView.citations` spans the main process
  produced (Design Decision 7).
- **Key behaviors:** strict `<meta>` CSP (value in Design Decision 5); relative assets
  (`./styles.css`, `./app.js`); no inline scripts/handlers (events via `addEventListener`); every
  destructive action (store-delete, doc-delete, doc-replace, registry-prune) gated behind an
  in-UI confirmation dialog (R8/R9/R12, Acceptance 6); per-`code` error UI mapping; `waitActive`
  checkbox + `upload:progress` correlation by `requestId`.

### U4 — Packaging, launch, dependency vetting, build wiring
- **Plan steps:** 18, 19, 20, 21.
- **Files:** `src/electron/launch.ts`, `dev.ts`, `package.json`
  (devDeps/overrides/scripts/main/build **only**), `tsconfig.json` (exclude),
  `Issues - Pending Items.md` (vetting log).
- **Exposes:** `BuildArtifacts` (`dist/electron/main.mjs`, `release/mac-arm64/Gemini Nav.app`,
  `dev:electron` path, package.json scripts/main/build block).
- **Consumes:** `RemovalBaseline` (package.json edits sequenced AFTER U1's), `main.ts` (from U2),
  `RendererBundle` (from U3; packaged via `extraResources`).
- **package.json region:** edits ONLY `devDependencies`, `overrides`, `scripts`, `main`, and the
  `build` block — disjoint from U1's `dependencies`/`keywords`/`description`. Vetting per research
  2 §5 / R19: latest stable major, advisory-clean, caret-pin, `overrides` refresh, `npm audit` to
  zero HIGH+, vetted-on log line. Baselines (re-verify at impl time): `electron` ^42.x,
  `electron-builder` ^26.x, `esbuild` ^0.28.x. `launch.ts` has NO esbuild auto-install fallback
  (no-silent-fallback convention, research 2 §2).

### U5 — Documentation (removal + Electron surface)
- **Plan steps:** 22, 23, 24.
- **Files:** `docs/tools/gemini-nav.md`, `docs/design/project-design.md`,
  `docs/design/project-functions.md`, `CLAUDE.md`.
- **Exposes:** `Documentation` reflecting the final shipped state.
- **Consumes:** `RemovalBaseline` (removal facts) and `BuildArtifacts` (final commands/build
  block). Excludes `docs/reference/storage-navigator-ref/` from all cleanup (R5).
- **Must document the design rule** "route ALL main-only Electron APIs through IPC" in the tool
  doc, and the unsigned-app Gatekeeper "Open Anyway" caveat (research 2 §Gatekeeper).

### Pairwise file-disjointness check

`src/electron/public/*` (U3) is disjoint from U2's `src/electron/*.ts`/`*.cjs`/
`tsconfig.electron.json`. `tsconfig.renderer.json` is U3; `tsconfig.electron.json` is U2. `main.ts`
is U2; `launch.ts`/`dev.ts` are U4. **The only shared file is `package.json` (U1 + U4)** — kept in
separate units with **disjoint JSON regions** (U1: `dependencies`/`keywords`/`description`; U4:
`devDependencies`/`overrides`/`scripts`/`main`/`build`) and a **hard sequencing constraint: U4's
package.json edits run only after U1's complete** (U4 plan steps 18/19 depend on U1 step 5). The
orchestrator must serialize U1 → U4 on `package.json`; all other units are pairwise file-disjoint
and parallelizable subject to the consumes-edges (U2 after U1; U3 after U2; U4 after U1+U2+U3; U5
after U1+U4).

## Design Decisions

1. **In-process backend via `makeBackend(profileName)`, IPC-only renderer access.** Resolved
   Open Question Q1. The main process owns `IGeminiBackend`; the renderer reaches it only through
   the typed bridge. Rationale: matches the project's "surfaces over one backend abstraction"
   topology and the reference; no extra process to manage; key stays in main.
   *Alternative rejected:* Electron as an HTTP client of `gemini-nav-api` — adds a process
   lifecycle, a second error-mapping path, and a network hop.

2. **Hand-rolled `tsc`/esbuild + electron + electron-builder (NOT electron-forge).** From the
   investigation (Decision 1). Preserves the authoritative `tsc → dist/` ESM build; declarative
   macOS packaging; three vettable dev-deps; proven reference template.
   *Alternative rejected:* electron-forge (second build system, documented ESM friction, larger
   footprint for a single target); esbuild-only (re-implements packaging by hand).

3. **Plain HTML/CSS/TypeScript renderer, no framework, no renderer bundler.** Investigation
   Decision 2. Modest UI; zero extra CVE-prone deps; renderer TS compiled by a dedicated DOM
   tsconfig to `public/app.js`. *Alternative rejected:* framework + Vite (second build system,
   two fast-moving deps, unneeded at v1 scope).

4. **esbuild-bundle `main.ts` → single `dist/electron/main.mjs`; `preload.cjs` shipped verbatim
   via `extraResources`.** Investigation Decision 3 + research 2. Robust packaged-app module
   resolution for the strict-ESM core graph; preload MUST be CJS under `sandbox: true` (research 1
   — required, not optional). `package.json` `"main"` = the esbuild `.mjs`.
   *Alternative rejected:* `tsc`-emitted multi-file main (runtime module-graph fragility inside
   the `.app`).

5. **Generic allowlisted `invoke` bridge + strict `file://` CSP.** Investigation Decision 4 +
   research 1. One typed `invoke(channel, ...args)` over an allowlist `Set`; a typed channel union
   gives end-to-end safety without per-method boilerplate. Renderer loaded with
   `loadFile(index.html)` over `file://` (no embedded Express — deliberate divergence from the
   reference, scan §5). CSP (`<meta>` tag, since `file://` has no response headers):
   `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';
   connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';`.
   *Alternative rejected:* one named bridge method per operation (more preload boilerplate, same
   security).

6. **API keys never cross IPC; redaction at the source; `raw` and key-bearing fields stripped.**
   R16. `redactString` on every outbound message; `profiles:list` → names + `keyMode` only
   (`ProfileSummary`, never `ProfileEntry`'s key path); `QueryResult.raw` stripped before
   `IpcOk`; no payload type may declare `apiKey`/`secret`/`credential`. *Alternative rejected:*
   relying solely on CSP `connect-src 'none'` — defense in depth, not the primary control.

7. **Citations rendered from main-produced spans; renderer never imports core.** The main process
   serializes the full `QueryResult` (built via `citation-render.ts` inside core's `query`); the
   renderer renders `citations[]` byte-offset spans against `answer` and never recomputes or
   imports `citation-render.ts`/the SDK. Rationale: keeps byte-accuracy authoritative in one place
   (core) and the renderer dependency-free. *Alternative rejected:* re-importing core into the
   renderer (breaks the no-Node/no-core renderer boundary; risks divergent rendering).

8. **Separate main and renderer typecheck configs; `src/electron/**` excluded from root `tsc`.**
   `tsconfig.electron.json` (node libs, no DOM, `noEmit`) typechecks main-side TS;
   `tsconfig.renderer.json` (DOM libs, no node) typechecks+emits the renderer; the root build
   excludes `src/electron/**` so `npm run build`/`typecheck` stay green. Rationale: main imports
   `electron`, renderer needs DOM, neither belongs in the core emit. *Alternative rejected:* one
   tsconfig for everything (DOM/electron type clashes break the core build).

9. **Unit partition unchanged from the plan; `package.json` double-touch handled by disjoint
   regions + sequencing (integration-directive option a).** Kept U1–U5 exactly as the plan
   defined them rather than merging U1+U4's `package.json` edits, because U1 (removal) and U4
   (toolchain) are otherwise file-disjoint and conceptually distinct, and the edits hit
   non-overlapping JSON regions with a natural U1→U4 dependency already in the plan. `decisions: 9`,
   `units_changed_from_plan: false`. *Alternative rejected:* merging all package.json edits into one
   unit (would couple unrelated removal and packaging work and inflate that unit's blast radius).

## Decisions Requiring User Review

1. **Electron major to pin.** Design baselines `electron` ^42.x (latest stable at research time,
   2026-06-21; 40/41/42 all supported). The implementer re-verifies the latest supported major +
   advisory-clean status at implementation time (per R19). Confirm pinning the then-latest stable
   major is acceptable (vs. matching the reference's older ^41).

2. **macOS packaging target = `dir` (unpacked `.app`), arm64-only, unsigned.** Produces
   `release/mac-arm64/Gemini Nav.app` with no `.dmg`/`.zip` and no signature (`identity: null`,
   `hardenedRuntime: false`, `gatekeeperAssess: false`). This satisfies "runnable build" but the
   app shows a Gatekeeper "Open Anyway" prompt and runs on Apple Silicon only. Confirm a
   distributable `.dmg`/`.zip`, Intel/universal arch, or signing are not needed for v1 (they are
   marked out of scope by the refined request, restated here for the review gate).

## Risks

- **Not a git repository** (confirmed: `git rev-parse HEAD` → "not a git repository"; scan
  `last_scanned_commit: "not-a-git-repo"`). The commit-diff staleness check cannot run. Mitigation:
  every existing symbol named in this design was re-verified live via Serena during design
  (`IGeminiBackend` 10 methods, `makeBackend`, `Registry`/`reconcile(profile, liveStores)`,
  `CredentialStore` methods, `redactString`, `citation-render` exports, the 5 error `code`s,
  `QueryResult`/`StoreInfo`/`DocumentInfo`/`ProfileEntry`/`RegistryEntry` shapes). No VCS
  operations are assumed or performed.
- **`package.json` double-touch (U1 + U4).** Literal file-merge risk if run in parallel.
  Mitigation: disjoint JSON regions + hard U1→U4 sequencing (Design Decision 9); the orchestrator
  must serialize these two units on `package.json`.
- **Fast-moving dependency advisories** (electron/electron-builder/esbuild). Mitigation: U4's
  mandatory vet → caret-pin → `overrides` refresh → `npm audit` to zero HIGH+ → vetted-on log
  (R19, Acceptance 10).
- **ESM-main footguns.** esbuild does not shim `__dirname`/`import.meta`; main-only Electron APIs
  are `undefined` in a sandboxed preload (#47413). Mitigation: main.ts uses Electron path APIs
  only (Design Decision, research 2 §1); preload restricted to `{ contextBridge, ipcRenderer }`
  (research 1); both grep-verified by the plan's step checks.
- **Renderer citation accuracy.** Mitigation: spans produced in core, rendered (not recomputed)
  in the renderer; renderer forbidden from importing core (Design Decision 7).
- **Contract drift between U2 (preload allowlist) and `ipc-contract.ts`.** Mitigation: the
  contract file exports runtime channel lists the preload mirrors; the channel table in this
  design is the single source of truth both units reference.

## Provenance

refined-request → investigation → research (security/IPC/preload + electron-builder/esbuild) →
codebase scan → plan-002 → this design. All input paths are recorded in the frontmatter.
