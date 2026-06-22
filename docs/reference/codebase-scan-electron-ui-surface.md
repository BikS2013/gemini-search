---
language: typescript
framework: none
package_manager: npm
build_command: "tsc"
test_command: "vitest run"
lint_command: null
entry_points:
  - src/cli/index.ts
  - bin/gemini-nav.mjs
last_scanned_commit: "not-a-git-repo"
scanned_for_request: electron-ui-surface
scanned_at: "2026-06-21T22:45:00Z"
---

# Codebase Scan — gemini-nav (Electron UI Surface)

## 1. Project Overview

TypeScript/ESM (NodeNext, strict, `.js` import extensions, Node ≥ 20) project implementing a Gemini File Search Store Navigator across three surfaces — a CLI (`gemini-nav`), an Express 5 HTTP API (`API/`), and a LangGraph ReAct agent + TUI — all over a single `IGeminiBackend` abstraction in `src/core/backend/`. The request targets removal of the agent/TUI surface and addition of a fourth Electron desktop surface. The project uses `npm` (npm-lock.json present), `vitest` for tests, and `tsc` for the build. The `API/` subdirectory is a fully separate sub-project with its own `package.json`/`tsconfig.json`/`vitest.config.ts`; it must remain completely untouched.

---

## 2. Module Map

| Path | Purpose | Representative symbols |
|---|---|---|
| `src/core/backend/backend.ts` | `IGeminiBackend` interface — the sole Gemini access contract for all surfaces | `IGeminiBackend`, `Page<T>`, `ListOpts`, `UploadOpts`, `QueryOpts` |
| `src/core/backend/genai-backend.ts` | Concrete `GenAiBackend` implementation; maps raw SDK calls to typed results | `GenAiBackend` |
| `src/core/backend/factory.ts` | `makeBackend(profileName, flags?)` — resolves key, constructs `GenAiBackend` | `makeBackend`, `BackendFlags` |
| `src/core/backend/citation-render.ts` | Byte-accurate inline-citation rendering for RAG query results | `renderInlineCitations`, `mapSources`, `mapCitations` |
| `src/core/backend/genai-client.ts` | Thin wrapper creating the `@google/genai` client from a resolved key | `makeGenAiClient` |
| `src/core/errors.ts` | Typed backend error hierarchy (5 classes + abstract base) | `BackendError`, `FileTooLargeError`, `UnsupportedMimeTypeError`, `StoreLimitError`, `RateLimitError`, `UploadOperationError` |
| `src/core/credential-store.ts` | AES-256-GCM encrypted multi-profile API-key vault at `~/.tool-agents/gemini-nav/` | `CredentialStore`, `addProfile`, `getApiKey`, `listProfiles`, `removeProfile` |
| `src/core/registry.ts` | Plaintext non-secret store-metadata cache at `~/.tool-agents/gemini-nav/registry.json` | `Registry`, `list`, `get`, `upsert`, `remove`, `reconcile` |
| `src/core/types.ts` | All shared data-transfer types for stores, documents, queries, credentials, and registry | `StoreInfo`, `DocumentInfo`, `QueryResult`, `QuerySource`, `CitationSpan`, `ProfileEntry`, `CredentialData`, `RegistryEntry` |
| `src/util/redact.ts` | `redactString(input)` — scrubs bearer tokens, Google API keys, JWTs, and secret JSON values from log output | `redactString`, `REDACT_PATTERNS` |
| `src/config/profile-config.ts` | Four-tier API-key resolver; `getToolAgentDir()`, `ensureToolAgentDir()` path helpers | `resolveApiKey`, `getToolAgentDir`, `ensureToolAgentDir`, `getToolAgentEnvFile` |
| `src/config/config-error.ts` | Shared `ConfigurationError` thrown by all surfaces when required config is absent | `ConfigurationError` |
| `src/config/agent-config.ts` | **[REMOVAL TARGET]** Agent config loader (`loadAgentConfig`), `ProviderName`, `AgentConfig`, provider-env snapshot | `loadAgentConfig`, `ProviderName`, `AgentConfig`, `PROVIDER_NAMES` |
| `src/cli/index.ts` | CLI entry point — Commander wiring for all commands; also contains agent-wiring code to be excised | `registerGeminiNavCli`, `tryUpgradeAgentCommand`, `removeAgentCommand`, `installAgentFallback`, `AgentModule` (interface) |
| `src/cli/commands/profile-ops.ts` | `profile-add`, `profiles`, `profile-remove` command handlers | `profileAdd`, `profilesList`, `profileRemove` |
| `src/cli/commands/store-ops.ts` | `stores`, `store-info`, `store-create`, `store-delete` command handlers | `storesList`, `storeInfo`, `storeCreate`, `storeDelete` |
| `src/cli/commands/doc-ops.ts` | `docs`, `doc-info`, `doc-upload`, `doc-delete`, `doc-replace` command handlers | `docsList`, `docInfo`, `docUpload`, `docDelete`, `docReplace` |
| `src/cli/commands/query-ops.ts` | `query` command handler | `runQuery` |
| `src/cli/commands/registry-ops.ts` | `registry-list`, `registry-refresh`, `registry-prune` handlers | `registryList`, `registryRefresh`, `registryPrune` |
| `src/cli/commands/shared.ts` | Shared CLI helpers | `GlobalOpts`, shared error handlers |
| `src/cli/render/query-render.ts` | CLI rendering for query results (answer + inline citations + sources + excerpts) | `renderQueryResult` |
| `src/agent/` | **[REMOVAL TARGET]** LangGraph ReAct graph (`graph.ts`, `run.ts`, `logging.ts`, `system-prompt.ts`) | `buildGraph`, `runAgent`, `logAgentEvent` |
| `src/agent/tools/` | **[REMOVAL TARGET]** 6 LangChain tool modules (store, doc, query, registry, confirm, truncate, types) | `confirmDestructive`, `assembleTools` |
| `src/agent/providers/` | **[REMOVAL TARGET]** 8 LLM provider adapters + registry + util | `PROVIDERS`, `getProvider`, `buildModel` |
| `src/tui/` | **[REMOVAL TARGET]** TUI runner (`index.ts`) and confirm bridge (`confirm-bridge.ts`) | `runTui`, `getTuiConfirm` |
| `src/cli/commands/agent.ts` | **[REMOVAL TARGET]** CLI `agent` subcommand registration | `registerAgentCommand` |
| `API/` | Separate sub-project — Express 5 HTTP API surface (`gemini-nav-api`); its own `package.json`, `tsconfig.json`, `vitest.config.ts`, and `test/` tree | `createApp`, auth middleware, route handlers |
| `tests/` | Vitest test tree mirroring `src/` — four subdirs: `agent/`, `cli/`, `config/`, `core/` | see per-dir below |
| `tests/agent/` | **[REMOVAL TARGET]** 4 vitest specs covering agent tools/confirm, tools/registry, providers/registry, tools/truncate | `tools.confirm.test.ts`, `tools.registry.test.ts`, `providers.registry.test.ts`, `tools.truncate.test.ts` |
| `tests/cli/` | CLI tests (surviving): `shared.test.ts`, `query-render.test.ts` | — |
| `tests/core/` | Core backend tests (surviving): citation-render, credential-store, errors, genai-backend, registry | — |
| `tests/config/` | Config tests (surviving): config-error, profile-config, redact | — |

---

## 3. Conventions

- **TypeScript/ESM (NodeNext), `.js` import extensions everywhere** — e.g. `from '../core/backend/factory.js'` despite source being `.ts`. Observed in `src/core/backend/factory.ts:15-18` and every file in `src/`. All new `src/electron/` files must follow this pattern.

- **Named exports only; no default exports** — every module exports named symbols. Observed across `src/core/errors.ts:21`, `src/util/redact.ts:38`, `src/core/backend/backend.ts:45`, `src/core/backend/factory.ts:31`. The Electron main process, preload, and IPC bridge modules must follow the same pattern (preload is a CJS exception — it ships as `.cjs` mirroring the reference).

- **No configuration fallbacks for secrets/required settings; documented defaults for operational knobs only** — `makeBackend` throws `ConfigurationError` when the key resolution chain exhausts (`src/core/backend/factory.ts:48-51`). The agent config loader (`src/config/agent-config.ts:209-239`) follows the same pattern for required values (provider, model), then uses numeric defaults (maxSteps=20, temperature=0) for operational knobs. The Electron surface must maintain this discipline.

- **AES-256-GCM at-rest encryption via `CredentialStore`; `redactString` on every log line involving user data** — `src/core/credential-store.ts:57-78` (encrypt/decrypt), `src/util/redact.ts:38-44` (redact). The Electron main process must call `redactString` before any IPC event payload or log write that could contain resolved key material.

- **Strict structural typing over SDK types** — `src/core/backend/citation-render.ts:22-46` defines `RetrievedContextLike`, `GroundingChunkLike`, `GroundingSupportLike` as structural interfaces (not SDK imports) so helpers stay testable without constructing SDK objects. New Electron IPC payload types should follow this same structural-interface pattern, not depend on SDK or CLI types directly.

- **Dynamic import for the agent subcommand in `src/cli/index.ts:319-333`** — uses a computed specifier to avoid static `tsc` resolution of a possibly-absent module. Post-removal, this entire `tryUpgradeAgentCommand` / `removeAgentCommand` / `installAgentFallback` / `AgentModule` block (lines 49-52, 305-357) and the two call sites (lines 305, 365) are deleted from `src/cli/index.ts`.

---

## 4. Integration Points

### 4.1 In-Scope — REMOVAL targets (delete entirely)

| File / Directory | Lines / Symbols | Removal action |
|---|---|---|
| `src/agent/` (entire directory) | `graph.ts`, `run.ts`, `logging.ts`, `system-prompt.ts`, `tools/*.ts` (6 files), `providers/*.ts` (11 files) | Delete directory and all contents |
| `src/tui/index.ts` | `runTui` | Delete file |
| `src/tui/confirm-bridge.ts` | `getTuiConfirm`, `TuiConfirmFn` | Delete file |
| `src/cli/commands/agent.ts` | `registerAgentCommand` | Delete file |
| `src/config/agent-config.ts` | `loadAgentConfig`, `AgentConfig`, `ProviderName`, `PROVIDER_NAMES`, `AgentConfigFlags`, `ensureAgentConfigDir` | Delete file |
| `src/cli/index.ts` — partial excision | Lines 49-52 (`AgentModule` interface), 305-306 (`installAgentFallback(program)` call), 311-357 (`tryUpgradeAgentCommand`, `removeAgentCommand`, `installAgentFallback` function bodies), 365 (`await tryUpgradeAgentCommand(program)` call) | Surgical edit; leave all other command wiring intact |
| `tests/agent/tools.confirm.test.ts` | Imports `src/agent/tools/confirm.js` and `src/tui/confirm-bridge.js` | Delete file |
| `tests/agent/tools.registry.test.ts` | Imports `src/agent/tools/registry.js` and `src/config/agent-config.js` | Delete file |
| `tests/agent/providers.registry.test.ts` | Imports `src/agent/providers/registry.js` and `src/config/agent-config.js` | Delete file |
| `tests/agent/tools.truncate.test.ts` | Imports `src/agent/tools/truncate.js` | Delete file |
| `package.json` — dependency removal | `@langchain/anthropic`, `@langchain/core`, `@langchain/google-genai`, `@langchain/langgraph`, `@langchain/ollama`, `@langchain/openai`, `langchain` (7 packages); also remove `"langgraph"` from `keywords[]` and update `"description"` | Edit `package.json` |

### 4.2 In-Scope — Documentation updates (must not be skipped, per R5/R9/Acceptance 9)

| File | Sections requiring update |
|---|---|
| `docs/tools/gemini-nav.md` | Remove "Surface 3 — gemini-nav agent" section (around line 237+), agent examples (lines 376-395), agent config-folder references (`config.json`, `.env` LLM-provider vars) |
| `docs/design/project-design.md` | Add a **dated design section** recording surface removal + Electron addition; do NOT rewrite existing sections (lines 38-52 mention agent/TUI in the current summary — the dated note is the authoritative record) |
| `docs/design/project-functions.md` | Remove FR-AGENT section (lines 51-63); add Electron UI functional requirements |
| `CLAUDE.md` (project root) | Update "Tools" description paragraph (lines 113-115, 139-143) from "LangGraph ReAct agent + TUI … 8 LLM providers" to Electron surface; update the project overview paragraph at lines 113-115 |
| `~/.tool-agents/gemini-nav/config.json` | Remove agent runtime defaults (maxSteps, temperature, perToolBudgetBytes, allowMutations, tools, systemPromptFile, verbose entries) |
| `~/.tool-agents/gemini-nav/.env` (docs reference) | Remove agent LLM-provider env-var documentation from `docs/tools/gemini-nav.md` |

### 4.3 Out-of-Scope — Must remain completely untouched

| Module | Reason |
|---|---|
| `src/core/backend/backend.ts` | `IGeminiBackend` contract is sacrosanct; Electron consumes it as-is |
| `src/core/backend/genai-backend.ts` | Concrete implementation — no changes |
| `src/core/backend/genai-client.ts` | Thin SDK wrapper — no changes |
| `src/core/backend/citation-render.ts` | Reused as-is by Electron query UI; no changes |
| `src/core/errors.ts` | Reused as-is for Electron IPC error mapping; no changes |
| `src/core/credential-store.ts` | Reused as-is; Electron reads via `makeBackend` / `CredentialStore` |
| `src/core/registry.ts` | Reused as-is; Electron exposes registry operations via IPC |
| `src/core/types.ts` | Shared DTOs; no changes |
| `src/util/redact.ts` | Reused in Electron IPC output; no changes |
| `src/config/profile-config.ts` | Consumed by `makeBackend`; no changes |
| `src/config/config-error.ts` | Used by all surfaces; no changes |
| `src/cli/commands/profile-ops.ts` | Surviving CLI command — no changes |
| `src/cli/commands/store-ops.ts` | Surviving CLI command — no changes |
| `src/cli/commands/doc-ops.ts` | Surviving CLI command — no changes |
| `src/cli/commands/query-ops.ts` | Surviving CLI command — no changes |
| `src/cli/commands/registry-ops.ts` | Surviving CLI command — no changes |
| `src/cli/commands/shared.ts` | Surviving shared helpers — no changes |
| `src/cli/render/query-render.ts` | Surviving CLI render — no changes |
| `tests/cli/` | Surviving CLI tests — no changes |
| `tests/core/` | Surviving core tests — no changes |
| `tests/config/` | Surviving config tests — no changes |
| `API/` (entire sub-project) | Separate Express 5 HTTP API sub-project; build/test must continue unchanged (`cd API && npm run build && npm test`). Has its own `package.json`, `tsconfig.json`, `vitest.config.ts`, `test/` tree (4 test files under `API/test/`). No dependency on agent/TUI modules confirmed — only on `@google/genai`, `express`, `pino`, etc. |
| `docs/reference/storage-navigator-ref/` | Reference mirror only; excluded from all documentation cleanup (per R5) |

### 4.4 New Integration Point — `src/electron/`

A new `src/electron/` directory to be created with the following surface:

| New file (proposed) | Role | Key constraint |
|---|---|---|
| `src/electron/main.ts` | Electron main process — owns `IGeminiBackend` instance via `makeBackend(profileName)` from `src/core/backend/factory.ts`; registers all `ipcMain.handle` channels; opens `BrowserWindow` with `nodeIntegration: false`, `contextIsolation: true` | Must never send API key material across IPC; call `redactString` on any IPC payload touching key-derived output |
| `src/electron/preload.cjs` | CJS preload — exposes typed `window.electron` bridge via `contextBridge` with an explicit allowlist of invoke/event channels | Same allowlist pattern as reference `docs/reference/storage-navigator-ref/src/electron/preload.cjs` |
| `src/electron/launch.ts` | Dev launcher — esbuild-bundles `main.ts` to a temp `.mjs`, resolves the `electron` binary via `require('electron')`, spawns it; cleans up on exit | Reference implementation at `docs/reference/storage-navigator-ref/src/electron/launch.ts` (informational) |
| `src/electron/public/` | Static renderer assets (`index.html`, `app.js`, `styles.css`) — no Node integration, no `@google/genai` imports; all backend access through `window.electron.invoke(channel, …)` | Bundler toolchain TBD by investigation/design phase |

**Landing rule:** the Electron main process entry point is `src/electron/main.ts`. The `package.json` `"main"` field will be updated to `dist/electron/main.js` (matching the reference project). A new `"electron"` devDependency and `"electron-builder"` (or alternative vetted toolchain) will be added after dependency vetting. The `tsconfig.json` already targets `ES2022`/`NodeNext` and outputs to `dist/` — compatible without modification for the `main.ts` compilation.

---

### 4.5 Specific Answers to Scan Directives

**1. IGeminiBackend public contract (from `src/core/backend/backend.ts:45-80`)**

```typescript
interface IGeminiBackend {
  // stores
  listStores(opts?: ListOpts): Promise<Page<StoreInfo>>;
  getStore(apiNameOrDisplayName: string): Promise<StoreInfo>;
  createStore(displayName: string, opts?: { embeddingModel?: string }): Promise<StoreInfo>;
  deleteStore(apiName: string, force?: boolean): Promise<void>;
  // documents
  listDocuments(storeApiName: string, opts?: ListOpts): Promise<Page<DocumentInfo>>;
  getDocument(documentApiName: string): Promise<DocumentInfo>;
  uploadDocument(storeApiName: string, filePath: string, opts?: UploadOpts): Promise<DocumentInfo>;
  deleteDocument(documentApiName: string, force?: boolean): Promise<void>;
  replaceDocument(storeApiName: string, documentApiName: string, filePath: string,
    opts?: { displayName?: string; waitActive?: boolean }): Promise<DocumentInfo>;
  // query
  query(storeApiNames: string[], prompt: string, opts?: QueryOpts): Promise<QueryResult>;
}
```

`factory.ts` entry point: `makeBackend(profileName: string, flags?: BackendFlags): IGeminiBackend` — resolves the API key (stored AES-256-GCM decrypt or four-tier env resolver), constructs `makeGenAiClient(apiKey)`, returns `new GenAiBackend(client)`. The Electron main process calls this exactly as: `const backend = makeBackend(activeProfile);`.

**2. Typed error model (`src/core/errors.ts:20-104`)**

| Class | `code` string | Extra fields | Trigger |
|---|---|---|---|
| `BackendError` (abstract) | — | `name` set to subclass name | Base — never thrown directly |
| `FileTooLargeError` | `'FILE_TOO_LARGE'` | `sizeBytes: number`, `limitBytes: number` | Pre-upload: file > 100 MB |
| `UnsupportedMimeTypeError` | `'UNSUPPORTED_MIME_TYPE'` | `mimeType: string` | Pre-upload: audio/video MIME |
| `StoreLimitError` | `'STORE_LIMIT'` | — | `createStore` when project cap reached |
| `RateLimitError` | `'RATE_LIMIT'` | `retryAfterMs?: number` | HTTP 429 from Gemini API |
| `UploadOperationError` | `'UPLOAD_OPERATION_FAILED'` | `operationError?: unknown` | Long-running import op reported error |

Electron IPC error mapping: the main process catches typed errors by `instanceof BackendError`, serializes only `{ code, message }` (never `operationError` raw payload, never stack traces) to the renderer.

**3. `redactString` location and signature**

- File: `src/util/redact.ts` (line 38)
- Signature: `export function redactString(input: string): string`
- Patterns scrubbed: `Authorization: Bearer/Basic`, Google API keys (`AIza...`), OpenAI keys (`sk-...`), JWTs, long base64 runs (≥ 64 chars), `"key"/"token"/"secret"/"apiKey"` JSON values.
- Usage: wrap any string that has passed through key-resolution code before writing to stderr, log files, or IPC.

`CredentialStore` public API (all in `src/core/credential-store.ts`):
- `new CredentialStore()` — loads and decrypts `~/.tool-agents/gemini-nav/credentials.json`
- `listProfiles(): ProfileEntry[]` — no key material
- `getProfile(name: string): ProfileEntry | undefined` — no key material
- `addProfile(name: string, apiKey: string | null, keyMode: ProfileKeyMode): void`
- `removeProfile(name: string): boolean`
- `getApiKey(name: string): string` — sole method returning plaintext key; throws if unknown profile or env-mode profile
- `hasProfiles(): boolean`

**4. API/ subdirectory**

Confirmed present at `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/`. It is a fully independent sub-project with its own `package.json` (name: `gemini-nav-api`, Express 5 surface), `tsconfig.json`, `vitest.config.ts`, and `test/` directory containing 4 test files (`app.test.ts`, `auth.test.ts`, `error-mapping.test.ts`, `pagination.test.ts`). Source lives under `API/src/` (`app.ts`, `config.ts`, `index.ts`, subdirs: `auth/`, `errors/`, `observability/`, `routes/`, `util/`). Build command: `cd API && npm run build` (`tsc -p tsconfig.json`). Test command: `cd API && npm test` (`vitest run`). It has no imports from the parent `src/` tree (confirmed by `API/package.json` having its own `@google/genai`, `express`, etc.); it must remain completely untouched.

**5. Reference Electron pattern (`docs/reference/storage-navigator-ref/src/electron/`)**

Files confirmed present: `main.ts`, `preload.cjs`, `launch.ts`, `site-routes.ts`, `oidc-loopback.ts`, `zip-download.ts`, `server.ts`, `public/index.html`, `public/app.js`, `public/styles.css`, `public/favicon.png`, `public/html-view.js`, `public/zip-download-ui.js`.

Reference project's Electron toolchain (`docs/reference/storage-navigator-ref/package.json`):
- `"electron": "^41.1.1"` (devDependency)
- `"electron-builder": "^26.8.2"` (devDependency)
- `"esbuild": "^0.27.7"` (devDependency)
- `"main": "dist/electron/main.js"` in `package.json`
- `dist:mac` script: `npm run build:electron && electron-builder --mac --arm64`
- Packaging config via `"build"` key in `package.json` (electron-builder config inline): `appId`, `extraResources` for `src/electron/public/`, `preload.cjs`, `assets/`; output dir `release/`
- `launch.ts` pattern: uses `esbuild` to bundle `main.ts` to a temp `.mjs`, resolves `electron` binary via `require('electron')`, spawns it with `--port` arg.
- **IMPORTANT:** Reference uses `electron@^41.1.1`. Per dependency-vetting rules, the investigation/design phase MUST check the latest stable major (currently 36.x released as stable at knowledge cutoff — verify actual latest at time of implementation) and confirm zero HIGH+ advisories before pinning. The reference version is informational only.
- Key architectural difference from reference: reference `main.ts` starts an internal Express server (`createServer`) and the `BrowserWindow` loads `http://localhost:<port>`. The gemini-nav Electron surface should use direct IPC to `IGeminiBackend` (no embedded Express server needed — IPC is the bridge), simplifying the architecture vs. the reference.

**6. Agent/TUI import graph — dangling references after deletion**

All references to the to-be-deleted modules outside of the agent/TUI directories themselves:

| File with reference | Nature of reference | Action required |
|---|---|---|
| `src/cli/index.ts` lines 49-52, 305-306, 311-357, 365 | `AgentModule` interface, `installAgentFallback(program)` call, `tryUpgradeAgentCommand`, `removeAgentCommand`, `installAgentFallback` function bodies, `await tryUpgradeAgentCommand(program)` call | Surgical excision; no static import to remove (uses dynamic import with computed specifier) |
| `tests/agent/tools.confirm.test.ts` | Imports `../../src/agent/tools/confirm.js` and `../../src/tui/confirm-bridge.js` | Delete test file |
| `tests/agent/tools.registry.test.ts` | Imports `../../src/agent/tools/registry.js`, `../../src/config/agent-config.js` | Delete test file |
| `tests/agent/providers.registry.test.ts` | Imports `../../src/agent/providers/registry.js`, `../../src/config/agent-config.js` | Delete test file |
| `tests/agent/tools.truncate.test.ts` | Imports `../../src/agent/tools/truncate.js` | Delete test file |
| `docs/tools/gemini-nav.md` | "Surface 3 — gemini-nav agent" section, agent config files, 8 LLM provider list, agent examples | Documentation update |
| `docs/design/project-design.md` lines 38-52 | References to U4-agent-tui, LangGraph, TUI | Dated addendum section (do not rewrite) |
| `docs/design/project-functions.md` lines 38, 51-63 | `agent` in CLI command list; `FR-AGENT` section | Update/remove |
| `CLAUDE.md` lines 113-115, 131, 139-143 | "LangGraph ReAct agent + TUI", "8 standard LLM providers for the agent surface" | Update Tools section |

No other surviving source file has a static import of any `src/agent/`, `src/tui/`, or `src/config/agent-config.ts` module. The surviving test files (`tests/cli/`, `tests/core/`, `tests/config/`) contain no such imports. The `src/cli/index.ts` dynamic import uses a computed specifier that `tsc` does not statically resolve — after removing the agent-wiring code blocks, no orphan import remains.

---

## 5. Notes

- **`test_scripts/` is empty.** The `test_scripts/` directory exists but contains no files. This is consistent with the project using `tests/` (vitest) as the primary test mechanism. Agent/TUI test scripts under this directory exist in the reference project only.

- **`vitest.config.ts` includes all of `tests/**/*.test.ts`** — this means the four `tests/agent/` test files will fail immediately after `src/agent/` is deleted unless those test files are deleted first (or in the same step). The removal order matters: delete test files before (or simultaneously with) source directories.

- **Reference Electron pattern uses an embedded Express server** (`createServer` in `main.ts` + `BrowserWindow` loading `http://localhost:port`). The gemini-nav Electron surface resolves this differently (direct IPC via `ipcMain.handle` → `IGeminiBackend` method calls), avoiding the need for an embedded HTTP server. The launch/packaging configuration from the reference (esbuild bundle + electron-builder + `extraResources`) is directly applicable; the IPC channel architecture is not.

- **No `src/electron/` directory exists yet** — this is a pure greenfield addition. The module map above correctly identifies it as the sole new integration point. There is no risk of duplicating an existing implementation.
