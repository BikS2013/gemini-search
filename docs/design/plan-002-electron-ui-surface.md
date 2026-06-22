---
status: complete
plan_number: "002"
slug: electron-ui-surface
request_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-electron-ui-surface.md
investigation_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/investigation-electron-ui-surface.md
research_files:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/electron-security-ipc-preload.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/electron-builder-macos-esbuild-main.md
codebase_scan_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/codebase-scan-electron-ui-surface.md
based_on_commit: null
scan_commit_match: null
steps: 24
open_questions: 0
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
implementation_units:
  - name: U1 — Removal (agent/TUI/deps/CLI excision)
    steps: [1, 2, 3, 4, 5]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/tui/
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/agent.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/agent-config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tests/agent/
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/index.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
  - name: U2 — Electron backend + IPC contract + main process
    steps: [6, 7, 8, 9, 10, 11, 12, 13]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-contract.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-payloads.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/ipc-handlers.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/profile-state.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/registry-service.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/main.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/preload.cjs
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/tsconfig.electron.json
  - name: U3 — Electron renderer (HTML/CSS/TS, no framework)
    steps: [14, 15, 16, 17]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/index.html
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/styles.css
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/public/app.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/tsconfig.renderer.json
  - name: U4 — Packaging, launch, dependency vetting, build wiring
    steps: [18, 19, 20, 21]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/launch.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/electron/dev.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tsconfig.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/Issues - Pending Items.md
  - name: U5 — Documentation (removal + Electron surface)
    steps: [22, 23, 24]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/tools/gemini-nav.md
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-design.md
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-functions.md
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/CLAUDE.md
build_command: "tsc"
test_command: "vitest run"
created_at: 2026-06-21T19:54:51Z
---

# Plan 002 — Remove Agent/TUI Surface and Add an Electron Desktop UI

## Objective
Remove the LangGraph ReAct agent surface, its terminal TUI, the 8 LLM-provider adapters,
agent configuration, and the seven LangChain/LangGraph runtime dependencies; then add a
fourth surface — an Electron desktop UI under `src/electron/` — that consumes the existing
`IGeminiBackend` in-process via `makeBackend(profileName)` through a sandboxed, typed IPC
bridge. The reusable core backend, the 16 surviving CLI commands, and the `API/` sub-project
remain functionally intact. Serves the refined request `refined-request-electron-ui-surface.md`.

## Context
- Refined request: @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-electron-ui-surface.md
- Investigation: @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/investigation-electron-ui-surface.md
- Research (security/IPC/preload): @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/electron-security-ipc-preload.md
- Research (electron-builder/esbuild macOS): @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/electron-builder-macos-esbuild-main.md
- Codebase scan: @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/codebase-scan-electron-ui-surface.md
- Project design: @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-design.md

Chosen approach (resolved, binding): in-process backend via `src/core/backend/factory.ts`;
hand-rolled `tsc`/esbuild + `electron` + `electron-builder` (NOT electron-forge); plain
HTML/CSS/TypeScript renderer with no framework and no renderer bundler; esbuild-bundle
`src/electron/main.ts` (strict ESM, `.js`-extension imports) to a single `dist/electron/main.mjs`
with `preload.cjs` shipped verbatim as `extraResources`; macOS-only UNSIGNED runnable build
(`identity:null`, `hardenedRuntime:false`, `gatekeeperAssess:false`, `mac.target "dir"`,
`arch arm64`); selection-only profiles (no API-key entry / profile creation in the UI). The
Electron surface is a NEW Integration Point; it NEVER imports `@google/genai` directly.

This is NOT a git repository (`last_scanned_commit: "not-a-git-repo"`); no version-control
operations are performed and no verification step relies on git.

## Open Questions
none

## Steps

### Step 1 — Delete the agent vitest specs (must precede/accompany src/agent removal)
- depends_on: []
- files (delete): `tests/agent/tools.confirm.test.ts`, `tests/agent/tools.registry.test.ts`,
  `tests/agent/providers.registry.test.ts`, `tests/agent/tools.truncate.test.ts` (and the now-empty
  `tests/agent/` directory).
- action: Delete the four agent test files that import the to-be-removed `src/agent/*`,
  `src/tui/confirm-bridge.js`, and `src/config/agent-config.js` modules. These MUST go before (or
  in the same change as) the source deletions in Steps 2–3 or `vitest run` would fail immediately
  (scan §5). Remove the empty `tests/agent/` directory afterward.
- verify: `ls tests/agent 2>/dev/null` returns nothing (directory gone); `ls tests` shows only
  `cli`, `config`, `core`.
- done: No `tests/agent/` directory or specs remain.

### Step 2 — Delete the agent and TUI source directories and modules
- depends_on: [1]
- files (delete): entire `src/agent/` directory (graph.ts, run.ts, logging.ts, system-prompt.ts,
  `tools/*.ts` — 6 files, `providers/*.ts` — 11 files); entire `src/tui/` directory
  (`index.ts`, `confirm-bridge.ts`); `src/cli/commands/agent.ts`; `src/config/agent-config.ts`.
- action: Delete the four removal targets in full. Do not touch any other file in this step.
- verify: `ls src/agent src/tui src/cli/commands/agent.ts src/config/agent-config.ts 2>/dev/null`
  prints nothing; `grep -rn "src/agent\|src/tui\|agent-config" src --include=*.ts` returns no
  surviving import (other than the dynamic-specifier block in `src/cli/index.ts`, removed in Step 3).
- done: All four removal targets are gone from disk.

### Step 3 — Excise agent-command wiring from the CLI entry point
- depends_on: [2]
- files (modify): `src/cli/index.ts`.
- action: Remove the `AgentModule` interface (lines ~49-52), the `installAgentFallback(program)`
  call inside `registerGeminiNavCli` (line ~305), the `tryUpgradeAgentCommand` /
  `removeAgentCommand` / `installAgentFallback` function bodies (lines ~311-357), and the
  `await tryUpgradeAgentCommand(program)` call in `main()` (line ~365). Also drop the agent
  references in the file's top-of-file doc comment. Leave ALL other command wiring (profile /
  store / doc / query / registry) and the `invokedDirectly` bin runner intact. `main()` becomes
  `const program = registerGeminiNavCli(); await program.parseAsync(process.argv);`. No static
  import needs removing (the agent module was reached via a computed dynamic specifier).
- verify: `npm run typecheck` succeeds; `grep -n "agent\|Agent" src/cli/index.ts` returns no
  matches; `npx tsx src/cli/index.ts --help` lists the 16 commands and NO `agent` command.
- done: `gemini-nav --help` shows exactly profile-add, profiles, profile-remove, stores,
  store-info, store-create, store-delete, docs, doc-info, doc-upload, doc-delete, doc-replace,
  query, registry-list, registry-refresh, registry-prune — and no `agent`.

### Step 4 — Remove LangChain/LangGraph runtime dependencies from package.json
- depends_on: [3]
- files (modify): `package.json`.
- action: Delete the seven dependencies `@langchain/anthropic`, `@langchain/core`,
  `@langchain/google-genai`, `@langchain/langgraph`, `@langchain/ollama`, `@langchain/openai`,
  `langchain` from `dependencies` (retain `@google/genai`, `chalk`, `commander`, `dotenv`, `zod`).
  Remove `"langgraph"` from `keywords[]`. Update `"description"` to drop the LangGraph/agent
  phrasing (e.g. "Gemini File Search Store Navigator — CLI, HTTP API, and Electron desktop UI for
  managing Gemini File Search stores, documents, and RAG queries"). Do NOT add Electron deps here
  (that is Step 18). Do not edit `scripts`/`main` here (Step 19/21).
- verify: `grep -ri "langgraph\|langchain\|@langchain" package.json src` returns no matches;
  `npm install` resolves; `npm run typecheck` and `npm test` pass.
- done: No LangChain/LangGraph packages or keywords remain; dependency tree reinstalls cleanly.

### Step 5 — Verify the removal baseline is fully green
- depends_on: [4]
- files: none (verification only).
- action: Confirm the removal leaves the build, typecheck, and tests green, the surviving CLI
  smoke-runs, and the `API/` sub-project is unaffected.
- verify: `npm run build` (tsc) succeeds; `npm run typecheck` succeeds; `npm test` (`vitest run`)
  passes with no agent specs; `npx tsx src/cli/index.ts profiles` runs (read-only smoke);
  `cd API && npm run build && npm test` still succeeds unchanged.
- done: All four commands pass; removal acceptance criteria (R1–R6, Acceptance 1–4) are met.

### Step 6 — Define the IPC channel contract (single source of truth)
- depends_on: [5]
- files (create): `src/electron/ipc-contract.ts`.
- action: Author named-export TypeScript types (`.js` import discipline where applicable):
  `InvokeChannel` union covering all 9 `IGeminiBackend` methods plus registry ops and profile
  selection — `stores:list`, `stores:get`, `stores:create`, `stores:delete`, `docs:list`,
  `docs:get`, `docs:upload`, `docs:delete`, `docs:replace`, `query:run`, `registry:list`,
  `registry:refresh`, `registry:prune`, `profiles:list`, `profiles:select`; an `EventChannel`
  union with `upload:progress`; the envelope types `IpcOk<T>`, `IpcErr` (`{ ok:false; error:{ code:
  string; message: string } }`), `IpcResult<T>`; and exported runtime arrays `INVOKE_CHANNEL_LIST`
  / `EVENT_CHANNEL_LIST` to keep the preload allowlist in sync. This is the single source of truth
  the preload's literal `Set` mirrors (research §IPC). No SDK/CLI/Electron imports here.
- verify: `npx tsc --noEmit -p src/electron/tsconfig.electron.json` (after Step 12) — for this step
  alone, `grep -c "stores:list\|profiles:select\|upload:progress" src/electron/ipc-contract.ts`
  returns ≥ 3; file has no `import` from `@google/genai` or `electron`.
- done: `ipc-contract.ts` exports the channel unions, the envelope types, and the runtime channel
  lists.

### Step 7 — Define structural IPC payload types
- depends_on: [6]
- files (create): `src/electron/ipc-payloads.ts`.
- action: Define structural request/response interfaces for each channel using the project's
  structural-typing convention (mirror `src/core/types.ts` shapes — `StoreInfo`, `DocumentInfo`,
  `QueryResult`, `Page<T>`, `RegistryEntry`, `ProfileEntry` minus key material — without depending
  on SDK or CLI types). Include: store create input `{ displayName: string; embeddingModel?: string }`;
  upload input `{ storeApiName: string; filePath: string; displayName?: string; mimeType?: string;
  waitActive?: boolean }`; replace input; query input `{ storeApiNames: string[]; prompt: string;
  model?: string; metadataFilter?: string }`; the `upload:progress` event payload
  `{ requestId: string; state: 'STATE_PENDING' | 'STATE_ACTIVE' | 'STATE_FAILED'; documentApiName?:
  string }`; and a `ProfileSummary` `{ name: string; keyMode: string }` (NEVER any key field). Import
  type-only from `src/core/types.js` where reuse is exact; otherwise declare structural interfaces.
- verify: `npx tsc --noEmit -p src/electron/tsconfig.electron.json` (after Step 12) compiles;
  `grep -n "apiKey\|secret\|credential" src/electron/ipc-payloads.ts` returns no field exposing a key.
- done: All channels have typed request/response payloads; no key material is representable in any
  payload type.

### Step 8 — Implement the active-profile state holder
- depends_on: [7]
- files (create): `src/electron/profile-state.ts`.
- action: Named-export a small main-process singleton that holds the active profile name and the
  current `IGeminiBackend` instance. Provide `getActiveProfile(): string`,
  `listProfileSummaries(): ProfileSummary[]` (via `new CredentialStore().listProfiles()`, mapping to
  `{ name, keyMode }` only — never key material), `selectProfile(name: string): void` (validates the
  profile exists via `CredentialStore.getProfile`, else throws `ConfigurationError`; rebuilds the
  backend via `makeBackend(name)`), and `getBackend(): IGeminiBackend` (throws `ConfigurationError`
  if no profile selected — no fallback). Initialize lazily; do not pick a default key silently.
  Imports use `.js` extensions (`../core/backend/factory.js`, `../core/credential-store.js`,
  `../config/config-error.js`).
- verify: `npx tsc --noEmit -p src/electron/tsconfig.electron.json` (after Step 12) compiles;
  `grep -n "getApiKey\|apiKey" src/electron/profile-state.ts` shows no key value crossing out of the
  module (only `makeBackend` consumes it internally).
- done: A typed profile-state module exposes selection + backend access and throws
  `ConfigurationError` on missing config.

### Step 9 — Implement the registry IPC service
- depends_on: [7]
- files (create): `src/electron/registry-service.ts`.
- action: Named-export thin functions wrapping the existing `Registry` (constructed with no args)
  and the active backend for the three registry channels: `registryList(): RegistryEntry[]` (→
  `new Registry().list()`), `registryRefresh(profile, backend): Promise<RegistryEntry[]>` (list live
  stores via `backend.listStores()` paginating fully, then `registry.reconcile(profile, liveStores)`,
  return `registry.list()`), and `registryPrune(apiName): boolean` (→ `registry.remove(apiName)`;
  never deletes the live store). `Registry.reconcile(profile, liveStores)` is the existing signature
  (registry.ts:95). Imports use `.js` extensions (`../core/registry.js`, `../core/backend/backend.js`).
- verify: `npx tsc --noEmit -p src/electron/tsconfig.electron.json` (after Step 12) compiles;
  `grep -n "reconcile\|remove\|list" src/electron/registry-service.ts` shows the three operations.
- done: Registry list/refresh/prune are available as typed functions for the IPC layer.

### Step 10 — Implement the IPC handler registration with error mapping + redaction
- depends_on: [7, 8, 9]
- files (create): `src/electron/ipc-handlers.ts`.
- action: Named-export `registerIpcHandlers(rendererUrl: string)`. Register one `ipcMain.handle` per
  `InvokeChannel`, each routing through a `run<T>()` wrapper that: (a) calls `assertTrustedSender`
  validating `event.senderFrame?.url` starts with the expected `file://` renderer URL; (b) executes
  the backend/registry/profile operation via `profile-state.getBackend()` and the registry service;
  (c) on success returns `{ ok:true, data }` with clone-safe plain data; (d) on `instanceof
  BackendError` returns `{ ok:false, error:{ code: err.code, message: redactString(err.message) } }`;
  on `instanceof ConfigurationError` maps to `{ code:'CONFIGURATION_ERROR', message: redactString(
  err.message) }`; on any other error returns opaque `{ code:'INTERNAL', message:'Internal error' }`.
  NEVER serialize stacks, `cause`, or `operationError`. Map the 5 typed BackendError classes
  (FileTooLargeError, UnsupportedMimeTypeError, StoreLimitError, RateLimitError,
  UploadOperationError) by their `.code`. Provide an `emitUploadProgress(win, payload)` helper that
  `win.webContents.send('upload:progress', payload)` only when `!win.isDestroyed()`. Imports use
  `.js` (`../core/errors.js`, `../config/config-error.js`, `../util/redact.js`, `./profile-state.js`,
  `./registry-service.js`, `./ipc-contract.js`, `./ipc-payloads.js`).
- verify: `npx tsc --noEmit -p src/electron/tsconfig.electron.json` (after Step 12) compiles;
  `grep -n "redactString" src/electron/ipc-handlers.ts` appears in the error path; `grep -n
  "assertTrustedSender" src/electron/ipc-handlers.ts` present; `grep -n "operationError\|\.stack"
  src/electron/ipc-handlers.ts` returns no serialization of those fields.
- done: All 15 channels are handled with sender validation, typed-error → `{code,message}` mapping,
  redaction on every outbound message, and a safe upload-progress emitter.

### Step 11 — Implement the Electron main process
- depends_on: [10]
- files (create): `src/electron/main.ts`.
- action: ESM entry, named/side-effect `main`. `app.name = 'Gemini Nav'`. `await app.whenReady()`
  before any window/backend setup (ESM-main async caveat, research Topic 1). Resolve resources via
  `app.getAppPath()` / `process.resourcesPath` / `app.isPackaged` — NEVER `__dirname` (esbuild does
  not shim it). Compute `RES_BASE = app.isPackaged ? process.resourcesPath : path.join(
  app.getAppPath(), 'src', 'electron')`; `preloadPath = path.join(RES_BASE, 'preload.cjs')`;
  `indexHtml = path.join(RES_BASE, 'public', 'index.html')`. Create a `BrowserWindow` with
  `webPreferences: { contextIsolation:true, sandbox:true, nodeIntegration:false, webSecurity:true,
  allowRunningInsecureContent:false, experimentalFeatures:false, preload: preloadPath }`. Compute the
  renderer `file://` URL from `indexHtml` and pass it to `registerIpcHandlers(rendererUrl)`. Call
  `win.loadFile(indexHtml)` (NO embedded Express server). Harden: `setWindowOpenHandler(() =>
  ({action:'deny'}))`, prevent `will-navigate` away from the local index, prevent
  `will-attach-webview`. Handle `window-all-closed` / `activate` conventionally. Wire upload-progress
  emission from the `docs:upload`/`docs:replace` flow when `waitActive` lifecycle is observed.
  Imports use `.js` extensions; `electron` import stays external (bundler marks it external).
- verify: `npx tsc --noEmit -p src/electron/tsconfig.electron.json` (after Step 12) compiles;
  `grep -n "__dirname" src/electron/main.ts` returns nothing; `grep -n "loadFile" src/electron/main.ts`
  present; `grep -n "sandbox: true\|contextIsolation: true\|nodeIntegration: false" src/electron/main.ts`
  all present; `grep -n "whenReady" src/electron/main.ts` present.
- done: `main.ts` opens a secure, sandboxed, file://-loaded window, registers IPC, and resolves
  resources via Electron path APIs only.

### Step 12 — Add the Electron main typecheck tsconfig
- depends_on: [6]
- files (create): `src/electron/tsconfig.electron.json`.
- action: Create a tsconfig extending the project base for typechecking the Electron MAIN-side TS
  (`main.ts`, `ipc-*.ts`, `profile-state.ts`, `registry-service.ts`, `launch.ts`, `dev.ts`) with
  `module`/`moduleResolution` `NodeNext`, `noEmit: true`, `types: ["node"]`, and `lib` including
  `ES2022` (no DOM). Exclude `public/`. This is the typecheck used by `npm run typecheck:electron`
  (added in Step 19). It exists because these files import `electron` and must be typechecked
  separately from the renderer (DOM) and excluded from the main `tsc` build (Step 21).
- verify: `npx tsc --noEmit -p src/electron/tsconfig.electron.json` runs (it will fully pass only
  after Steps 6–11 land); the config parses without error.
- done: A dedicated Electron-main tsconfig exists and is wired for typechecking.

### Step 13 — Implement the CJS preload bridge
- depends_on: [6]
- files (create): `src/electron/preload.cjs`.
- action: Author plain CommonJS (`'use strict';`), `const { contextBridge, ipcRenderer } =
  require('electron')` — ONLY those two (research Topic 1 #47413 footgun). Define literal
  `INVOKE_CHANNELS` and `EVENT_CHANNELS` `Set`s mirroring `ipc-contract.ts` (single-source-of-truth
  comment pointing at it). `contextBridge.exposeInMainWorld('gemini', { invoke(channel, ...args),
  on(channel, callback) })` where `invoke` rejects channels not in the allowlist before any IPC, and
  `on` validates the event channel, wraps the listener to DROP the Electron `event` (forward payload
  only), and returns an unsubscribe function. Never expose raw `ipcRenderer`. Ships verbatim as
  `extraResources` — NOT bundled.
- verify: `node --check src/electron/preload.cjs` passes; `grep -n "exposeInMainWorld" src/electron/
  preload.cjs` present; `grep -n "INVOKE_CHANNELS.has\|EVENT_CHANNELS.has" src/electron/preload.cjs`
  both present; `grep -n "require('electron')" src/electron/preload.cjs` shows only contextBridge +
  ipcRenderer destructured.
- done: A sandbox-compatible CJS preload exposes a typed allowlisted `invoke`/`on` bridge and nothing
  else.

### Step 14 — Renderer markup + strict CSP
- depends_on: [7]
- files (create): `src/electron/public/index.html`.
- action: Author `index.html` with a strict `<meta http-equiv="Content-Security-Policy">`:
  `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self';
  connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';`. Reference
  assets RELATIVELY (`./styles.css`, `./app.js`). No inline scripts, no inline event handlers, no
  remote `<script src=…>`. Provide the DOM skeleton: a profile picker, a stores panel, a store-detail
  + documents panel, an upload form (with a `wait-active` checkbox), a query panel (stores
  multiselect, prompt, model override, metadata-filter), a results area (answer / citations / sources
  / excerpts), a registry panel, and a confirmation-dialog element for destructive actions.
- verify: `grep -n "Content-Security-Policy" src/electron/public/index.html` present;
  `grep -n "connect-src 'none'" src/electron/public/index.html` present;
  `grep -n "onclick=\|<script>[^<]" src/electron/public/index.html` returns no inline scripts/handlers;
  `grep -n 'src="\./app.js"\|href="\./styles.css"' src/electron/public/index.html` present.
- done: A CSP-locked, relative-asset, inline-handler-free HTML shell with all required UI regions.

### Step 15 — Renderer styles
- depends_on: [14]
- files (create): `src/electron/public/styles.css`.
- action: Author plain CSS for the panels/lists/forms/results/confirmation-dialog defined in Step 14.
  No remote `@import`/font URLs (CSP forbids them). Keep it self-contained and legible.
- verify: `grep -n "@import url(http\|https://" src/electron/public/styles.css` returns nothing;
  file exists and is non-empty.
- done: A self-contained stylesheet covering all UI regions, no remote resources.

### Step 16 — Renderer application logic (typed, IPC-only)
- depends_on: [14]
- files (create): `src/electron/public/app.ts`.
- action: Author renderer logic in TypeScript, DOM-only, accessing the backend solely via
  `window.gemini.invoke(channel, …)` and `window.gemini.on('upload:progress', …)` (ambient
  `Window.gemini` typing referencing `InvokeChannel`/`EventChannel`/`IpcResult` from
  `../ipc-contract.js`). Wire: profile list/select; stores list/info/create/delete; documents
  list/info/upload (with `waitActive` option + STATE_PENDING→ACTIVE/FAILED progress reflected from
  the event channel)/delete/replace; query run rendering answer + inline citations + sources +
  excerpts (consume the structured `QueryResult` the main process produced via
  `citation-render.ts`; render byte-accurate citation markers from the returned spans — do NOT
  re-import core into the renderer); registry list/refresh/prune. Map every `IpcErr.error.code` to a
  clear non-secret UI message (FILE_TOO_LARGE, UNSUPPORTED_MIME_TYPE, STORE_LIMIT, RATE_LIMIT,
  UPLOAD_OPERATION_FAILED, CONFIGURATION_ERROR, INTERNAL). Gate every destructive action
  (store-delete, doc-delete, doc-replace, registry-prune) behind the in-UI confirmation dialog. Wire
  all events with `addEventListener` (CSP forbids inline handlers).
- verify: `npx tsc --noEmit -p src/electron/tsconfig.renderer.json` (after Step 17) compiles;
  `grep -n "window.gemini.invoke" src/electron/public/app.ts` present; `grep -n "require(\|@google/genai\|ipcRenderer"
  src/electron/public/app.ts` returns nothing; `grep -n "confirm" src/electron/public/app.ts` shows
  destructive-action gating.
- done: A typed renderer that performs all R7–R13 operations exclusively through the IPC bridge with
  per-error UI mapping and confirmation-gated mutations.

### Step 17 — Renderer tsconfig (DOM, emits to public/)
- depends_on: [14]
- files (create): `src/electron/tsconfig.renderer.json`.
- action: Create a renderer tsconfig with `"lib": ["DOM","ES2022"]`, `"module": "ES2022"`,
  `"moduleResolution": "Bundler"` (or `NodeNext`), `"types": []` (no node), `"outDir":
  "src/electron/public"`, including `src/electron/public/app.ts` and the type-only contract imports.
  It compiles `app.ts` → `src/electron/public/app.js` so the compiled module sits beside `index.html`
  for `extraResources`. The emitted `app.js` is a build artifact (add to ignore conventions, not a
  source).
- verify: `npx tsc -p src/electron/tsconfig.renderer.json` emits `src/electron/public/app.js`;
  `grep -n '"lib"' src/electron/tsconfig.renderer.json` shows DOM.
- done: A DOM-targeted renderer tsconfig emits `app.js` next to `index.html`.

### Step 18 — Vet, pin, and install the Electron toolchain dependencies
- depends_on: [5]
- files (modify): `package.json`.
- action: Per the dependency-vetting rule (R19) and research §5: pull the latest stable MAJOR of each
  fast-mover, confirm it is a supported (latest-three) Electron major and advisory-clean before
  pinning. Baseline at research time: `electron` ^42.x (42.4.1), `electron-builder` ^26.x (26.15.3),
  `esbuild` ^0.28.x (0.28.1); also add `tsx` (already present) for the dev launcher. Re-verify the
  latest at implementation time (`npm view electron version`, advisory check) — the reference's
  electron@^41 is informational only. Add them as `devDependencies` with caret pins against the
  verified-clean versions. Add an `overrides` block as needed for electron-builder's transitive tree
  (candidates to re-vet, not copy blindly: `@electron/asar`, `global-agent`, `rimraf`, `cacache`,
  `brace-expansion`; add `ejs` only if `npm ls ejs` shows a vulnerable version). Run `npm install`.
- verify: `npm install` succeeds; `npm audit` reports ZERO HIGH-or-above advisories (refresh
  `overrides` until zero); `node -e "console.log(require('electron'))"` prints the binary path.
- done: `electron`, `electron-builder`, `esbuild` are installed at vetted caret pins with zero HIGH+
  advisories.

### Step 19 — Add Electron build/dev/dist scripts and the `main` field
- depends_on: [11, 16, 18]
- files (modify): `package.json`.
- action: Set `"main": "dist/electron/main.mjs"` (the esbuild output). Add scripts:
  `"build:electron-main": "esbuild src/electron/main.ts --bundle --platform=node --format=esm
  --target=node20 --outfile=dist/electron/main.mjs --packages=external --sourcemap"`;
  `"build:renderer": "tsc -p src/electron/tsconfig.renderer.json"`;
  `"build:electron": "npm run build && npm run build:electron-main && npm run build:renderer"`;
  `"typecheck:electron": "tsc --noEmit -p src/electron/tsconfig.electron.json"`;
  `"dev:electron": "tsx src/electron/dev.ts"`;
  `"dist:mac": "npm run build:electron && electron-builder --mac --arm64"`. Add the electron-builder
  `"build"` block: `appId` `com.giorgosmarinos.gemini-nav`, `productName` `Gemini Nav`,
  `directories.output` `release`, `files: ["dist/**/*", "package.json"]`, `extraResources` mapping
  `src/electron/public`→`public` and `src/electron/preload.cjs`→`preload.cjs` (and `assets`→`assets`
  only if an `assets/` dir is added), `mac: { target:[{target:"dir",arch:["arm64"]}], category:
  "public.app-category.developer-tools", identity:null, hardenedRuntime:false, gatekeeperAssess:
  false }`. Do NOT include an `icon` key unless an icon file is actually added.
- verify: `npm run typecheck:electron` passes; `npm run build:electron-main` produces
  `dist/electron/main.mjs`; `npm run build:renderer` produces `src/electron/public/app.js`;
  `node -e "const p=require('./package.json'); if(p.main!=='dist/electron/main.mjs') process.exit(1)"`
  exits 0.
- done: `package.json` has the `main` field, the six scripts, and the macOS-unsigned `build` block.

### Step 20 — Implement the dev launcher and dev entry
- depends_on: [11, 18]
- files (create): `src/electron/launch.ts`, `src/electron/dev.ts`.
- action: `launch.ts` (named export `launchElectronApp()`): esbuild-bundle `src/electron/main.ts` to
  a temp `.electron-main.mjs` at the project root (`--bundle --platform=node --format=esm
  --packages=external --sourcemap`), resolve the electron binary via `require('electron')` (use
  `createRequire(import.meta.url)`), `spawn(electronBin, [outFile], { stdio:'inherit', cwd:
  projectRoot })`, and clean up the temp bundle (+`.map`) on `exit`/`error`/`SIGINT`/`SIGTERM`. NO
  esbuild auto-install fallback (esbuild is a vetted devDependency; fail loudly if missing —
  no-silent-fallback convention). Drop the reference's embedded-Express/port logic and the cosmetic
  macOS app-bundle rename. `dev.ts` is a one-line entry that imports and calls `launchElectronApp()`,
  run via `tsx` from `dev:electron`.
- verify: `node --check` is not applicable to TS; instead `npm run typecheck:electron` passes (it
  includes launch.ts/dev.ts); `grep -n "require('electron')\|createRequire" src/electron/launch.ts`
  present; `grep -n "npm install\|auto-install" src/electron/launch.ts` returns nothing.
- done: `npm run dev:electron` bundles main, spawns Electron against the source-tree resources, and
  cleans up the temp bundle on exit.

### Step 21 — Exclude the Electron surface from the main `tsc` build
- depends_on: [11]
- files (modify): `tsconfig.json`.
- action: The root `tsc` build (`npm run build`) must NOT compile `src/electron/**` — `main.ts` is
  esbuild-bundled and the renderer/launch files use DOM/Node-spawn types incompatible with the core
  emit. Add `"src/electron/**"` to the root `tsconfig.json` `exclude` array (keeping `node_modules`,
  `dist`, `src/**/__tests__/**`). The Electron TS is typechecked via `tsconfig.electron.json`
  (Step 12) and `tsconfig.renderer.json` (Step 17), and built via esbuild + the renderer tsc.
- verify: `npm run build` (tsc) succeeds and emits `dist/` WITHOUT `dist/electron/` from the core
  build; `npm run typecheck` (root `tsc --noEmit`) succeeds and does not error on `src/electron/`.
- done: The root build/typecheck ignore `src/electron/**`; Electron has its own typecheck/build path.

### Step 22 — Remove agent/TUI documentation and add the Electron surface to gemini-nav.md
- depends_on: [5, 19]
- files (modify): `docs/tools/gemini-nav.md`.
- action: Remove the "Surface 3 — gemini-nav agent" section, the agent examples, and the agent
  config-folder references (`config.json` agent runtime defaults; agent `.env` LLM-provider vars).
  Add a new "Surface — Electron desktop UI" section documenting: the `npm run dev:electron` dev
  command (runs against the same `~/.tool-agents/gemini-nav/` config the CLI uses), the
  `npm run dist:mac` packaging command (produces `release/mac-arm64/Gemini Nav.app`, unsigned —
  note the macOS Gatekeeper "Open Anyway" caveat), the secure architecture (in-process backend via
  the factory, sandboxed renderer, typed IPC allowlist, redaction, keys never crossing IPC), and the
  selection-only profile behavior. Exclude `docs/reference/storage-navigator-ref/` from all cleanup.
- verify: `grep -ni "surface 3\|langgraph\|GEMINI_NAV_AGENT" docs/tools/gemini-nav.md` returns no
  matches; `grep -ni "dev:electron\|dist:mac\|electron" docs/tools/gemini-nav.md` present.
- done: The tool doc has no agent/TUI references and a complete Electron-surface section.

### Step 23 — Add a dated design section to project-design.md
- depends_on: [22]
- files (modify): `docs/design/project-design.md`.
- action: APPEND a new dated section (2026-06-21) recording the surface removal (agent/TUI, 8 LLM
  providers, LangChain/LangGraph deps, agent config) and the Electron addition (in-process backend
  via `src/core/backend/factory.ts`, sandboxed window `contextIsolation/sandbox/nodeIntegration`,
  CJS preload allowlist, typed IPC contract over the 9 backend methods + registry + profile-select,
  esbuild `.mjs` main bundle, electron-builder unsigned macOS `dir` build, selection-only profiles).
  Cite the provenance chain (refined-request → investigation → research ×2 → scan → this plan). Do
  NOT rewrite prior sections — the dated note is the authoritative record of the change.
- verify: `grep -n "2026-06-21\|Electron" docs/design/project-design.md` present in the new section;
  the file's earlier sections are unchanged (only appended content).
- done: A dated design addendum records the removal + Electron addition with full provenance.

### Step 24 — Update project-functions.md and CLAUDE.md
- depends_on: [23]
- files (modify): `docs/design/project-functions.md`, `CLAUDE.md`.
- action: In `project-functions.md`: remove the FR-AGENT section (lines ~51-55), drop `agent` from
  the FR-CLI-1 command list, soften/remove the 8-provider language in FR-NFR-3 (no LLM-provider
  surface remains), and add a new "Electron UI surface (FR-UI)" section with the new functional
  requirements (see project-functions update below). In `CLAUDE.md`: update the project overview
  paragraph and the "Tools" `gemini-nav` entry to describe four surfaces with the Electron desktop UI
  replacing the LangGraph ReAct agent + TUI, and remove the "8 standard LLM providers" line from the
  key-conventions section.
- verify: `grep -ni "langgraph\|ReAct\|8 standard LLM\|FR-AGENT\|TUI" docs/design/project-functions.md
  CLAUDE.md` returns no matches; `grep -ni "electron\|FR-UI" docs/design/project-functions.md` present;
  `grep -ni "electron" CLAUDE.md` present.
- done: `project-functions.md` and `CLAUDE.md` reflect the removal and the Electron surface; no
  agent/TUI/LLM-provider language remains.

## Implementation Units

### U1 — Removal (agent/TUI/deps/CLI excision)
- Steps: 1, 2, 3, 4, 5.
- Files: `src/agent/`, `src/tui/`, `src/cli/commands/agent.ts`, `src/config/agent-config.ts`,
  `tests/agent/`, `src/cli/index.ts`, `package.json` (dependency/keyword/description edits only).
- Interface contract for downstream units: after U1, `npm run build`/`typecheck`/`test` are green,
  the 16 CLI commands survive, `package.json` has no LangChain/LangGraph deps, and `API/` is
  unaffected. U2–U5 build on this clean baseline.
- Note: U1 and U4 both touch `package.json`. U1 edits ONLY `dependencies`/`keywords`/`description`
  (removal). U4 edits ONLY `devDependencies`/`overrides`/`scripts`/`main`/`build` (additions). They
  are sequenced (U4 step 18/19 depend on U1 step 5) and touch disjoint JSON regions; run U1's
  package.json edit to completion before U4's to avoid a literal file conflict.

### U2 — Electron backend + IPC contract + main process
- Steps: 6, 7, 8, 9, 10, 11, 12, 13.
- Files: `src/electron/ipc-contract.ts`, `ipc-payloads.ts`, `ipc-handlers.ts`, `profile-state.ts`,
  `registry-service.ts`, `main.ts`, `preload.cjs`, `tsconfig.electron.json`.
- Interface contract: exports the `InvokeChannel`/`EventChannel` unions, `IpcResult<T>` envelope,
  the structural payload types, and the `window.gemini.invoke/on` bridge shape that U3 consumes. The
  preload's allowlist literals MUST mirror `ipc-contract.ts` exactly.

### U3 — Electron renderer (HTML/CSS/TS, no framework)
- Steps: 14, 15, 16, 17.
- Files: `src/electron/public/index.html`, `styles.css`, `app.ts`, `tsconfig.renderer.json`.
- Interface contract: consumes only `window.gemini` (from U2's preload) and the type-only
  `ipc-contract.ts`; emits `app.js` into `public/` for packaging. Never imports core or the SDK.

### U4 — Packaging, launch, dependency vetting, build wiring
- Steps: 18, 19, 20, 21.
- Files: `src/electron/launch.ts`, `dev.ts`, `package.json` (devDeps/overrides/scripts/main/build),
  `tsconfig.json` (exclude), `Issues - Pending Items.md` (vetting log).
- Interface contract: produces `dist/electron/main.mjs` (esbuild) and `release/mac-arm64/Gemini
  Nav.app` (electron-builder), and the `dev:electron` launch path. Depends on U2's `main.ts`.

### U5 — Documentation (removal + Electron surface)
- Steps: 22, 23, 24.
- Files: `docs/tools/gemini-nav.md`, `docs/design/project-design.md`, `docs/design/project-functions.md`,
  `CLAUDE.md`.
- Interface contract: documents the final shipped state; depends on U1 (removal facts) and U4 (final
  commands/build block) being settled.

## Risks & Mitigations
- **Stale-scan / non-git repo:** the scan's `last_scanned_commit` is `"not-a-git-repo"`, so the
  usual commit-diff staleness check cannot run. Mitigation: every file/symbol named here was
  re-verified live during planning (factory `makeBackend`, `IGeminiBackend` 9 methods, `Registry`
  constructor + `reconcile(profile, liveStores)`, `CredentialStore.listProfiles/getProfile/getApiKey`,
  `redactString` signature, `citation-render` exports, `src/cli/index.ts` agent blocks). No git
  operations are performed.
- **Dependency advisories on fast-movers:** electron/electron-builder/esbuild accrue CVEs. Mitigation:
  Step 18 mandates latest-stable-major + advisory check + caret pin + `overrides` refresh + `npm
  audit` to zero HIGH+ + vetted-on log (R19, Acceptance 10).
- **ESM-main footguns:** esbuild does not shim `__dirname`/`import.meta`; main-only Electron APIs are
  `undefined` in a sandboxed preload (#47413). Mitigation: Step 11 forbids `__dirname` (Electron path
  APIs only) and Step 13 restricts the preload to `{contextBridge, ipcRenderer}`; both are
  grep-verified.
- **package.json double-touch (U1 + U4):** literal file-merge risk if run in parallel. Mitigation:
  U4's package.json steps depend on U1 step 5; edits are disjoint JSON regions; sequence them.
- **`tsc` picking up `src/electron/**`:** the root build globs `src/**/*.ts` and would fail on
  DOM/electron types. Mitigation: Step 21 excludes `src/electron/**` from the root tsconfig before
  the final green-build verification.
- **Renderer citation accuracy:** byte-accurate citations are produced in main via `citation-render.ts`
  and serialized as structured `QueryResult`; the renderer must render the returned spans, not
  recompute them. Mitigation: Step 16 explicitly forbids importing core into the renderer and renders
  from the IPC payload.

## Acceptance Criteria Mapping
| Criterion (refined request) | Step(s) |
|---|---|
| Acc 1 / R1 / R3 — agent dirs+files gone; no langchain refs | 1, 2, 3, 4 |
| Acc 2 — typecheck/build/test pass (agent specs removed) | 5, 12, 17, 21 |
| Acc 3 / R2 — `--help` shows 16 commands, no `agent`; CLI smoke | 3, 5 |
| Acc 4 / R6 — `cd API && build && test` unchanged | 5 |
| Acc 5 / R7,R8,R9,R10,R11,R12 — dev app does all UI ops | 11, 14, 16, 20 |
| Acc 6 / R9,R13 — typed-error UI messages; confirmation-gated destructive ops | 10, 16 |
| Acc 7 / R14,R16 — no Node integration / no key material in renderer; redacted IPC | 10, 11, 13 |
| Acc 8 / R15 — packaging command produces runnable build | 19 |
| Acc 9 / R5,R20 — docs (tool/design/functions/CLAUDE) updated | 22, 23, 24 |
| Acc 10 / R19 — zero HIGH+ advisories; vetted-on log | 18 |
| R17 — TS/ESM strict, `.js` extensions, Node ≥ 20 | 6–13, 16, 17, 19, 20 |
| R18 — no config fallbacks; ConfigurationError | 8, 10 |

## Deviation Rules for Executors
1. **Auto-fix bugs and blockers** discovered mid-step (compile errors, wrong import paths, a missing
   re-export) and document what you changed in your step notes.
2. **Add missing security/correctness essentials** (e.g. a missed `redactString` call, an
   unvalidated IPC sender, a missing confirmation gate) and document them.
3. **STOP and surface anything architectural** — any change to `IGeminiBackend`, `GenAiBackend`, the
   credential store, the registry contract, or the `API/` sub-project, or any need to reintroduce an
   LLM-provider/agent capability — rather than implementing it.
4. **Log nice-to-haves instead of doing them** — when running solo, append them directly to
   `Issues - Pending Items.md`; when running as one of several parallel agents, return them in your
   final report (parallel executors must NEVER edit the shared `Issues - Pending Items.md` directly —
   the orchestrator appends them after the phase).
5. **No configuration fallbacks** — any missing required configuration raises `ConfigurationError`;
   only documented operational knobs (page size, window size, API port) may carry defaults.

## Verification
Run from the project root (NOT a git repo — no VCS steps):
1. `npm install` — resolves the post-removal + Electron-toolchain tree.
2. `npm audit` — ZERO HIGH-or-above advisories.
3. `npm run build` — root `tsc` succeeds (excludes `src/electron/**`).
4. `npm run typecheck` — root `tsc --noEmit` succeeds.
5. `npm run typecheck:electron` — Electron-main TS typechecks.
6. `npm test` (`vitest run`) — passes with no agent specs.
7. `npx tsx src/cli/index.ts --help` — 16 commands, no `agent`; `npx tsx src/cli/index.ts profiles` runs.
8. `cd API && npm run build && npm test` — unchanged green.
9. `npm run build:electron` — emits `dist/electron/main.mjs` and `src/electron/public/app.js`.
10. `npm run dev:electron` — opens the window; manually exercise stores/docs/query/registry against a
    real profile.
11. `npm run dist:mac` — produces `release/mac-arm64/Gemini Nav.app` (runnable, unsigned).
12. Greps: `grep -ri "langgraph\|langchain\|@langchain" src package.json` (empty);
    `grep -n "__dirname" src/electron/main.ts` (empty);
    `grep -n "sandbox: true" src/electron/main.ts` (present).
