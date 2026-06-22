---
status: completed
mode: write-and-run
scope_slug: electron-ui-surface-electron-main
language: TypeScript
framework: vitest
test_command_full: npx vitest run
test_command_scope: npx vitest run tests/electron
test_dir: tests/electron
target_path: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search
test_files_owned:
  - tests/electron/electron-mock.ts
  - tests/electron/ipc-contract.test.ts
  - tests/electron/ipc-handlers.test.ts
  - tests/electron/profile-state.test.ts
  - tests/electron/registry-service.test.ts
tests_added: 138
tests_updated: 0
tests_run: 138
tests_passed: 138
tests_failed: 0
implementation_gaps: 0
built_at: 2026-06-22T01:08:00Z
last_built_commit: null
---

# Test Build — Electron UI Surface: Main-Process Logic (U2)

## 1. Summary

Status: completed. Framework: vitest v4.1.9. All 138 new tests pass (0 failed). Four test files were created under `tests/electron/`, plus one shared mock helper (`electron-mock.ts`). Tests cover the four in-scope modules: `ipc-contract.ts` (drift-guard for all 15 invoke + 1 event channels and envelope shapes), `ipc-handlers.ts` (error mapping, sender validation, raw-stripping, OkVoid/OkBool envelopes, upload-progress lifecycle), `profile-state.ts` (singleton state machine, ConfigurationError on missing profile, key-free profile summaries), and `registry-service.ts` (list/refresh/prune delegation, multi-page pagination). No production source was modified.

## 2. Scope Resolved

**Scope files and in-scope symbols:**

- `src/electron/ipc-contract.ts`
  - `INVOKE_CHANNEL_LIST` (runtime array of 15 invoke channels)
  - `EVENT_CHANNEL_LIST` (runtime array containing `upload:progress`)
  - `IpcOk<T>`, `IpcErr`, `IpcResult<T>` (envelope type shapes)
  - `InvokeChannel`, `EventChannel` (union types, verified via runtime array membership)

- `src/electron/ipc-handlers.ts`
  - `registerIpcHandlers(rendererUrl, win)` — registers all 15 handlers via mocked `ipcMain`
  - `emitUploadProgress(win, payload)` — exported helper tested directly
  - `run<T>()` — internal choke point exercised indirectly through handlers
  - `assertTrustedSender()` — internal function exercised indirectly through handlers

- `src/electron/profile-state.ts`
  - `getActiveProfile()` — initial state, post-select state
  - `getBackend()` — throws when unset, returns backend after `selectProfile`
  - `selectProfile(name)` — throws on missing profile, sets active, calls `makeBackend`
  - `listProfileSummaries()` — returns key-free `ProfileSummary[]`

- `src/electron/registry-service.ts`
  - `registryList()` — delegates to `Registry().list()`
  - `registryRefresh(profile, backend)` — paginates `listStores` then calls `reconcile`
  - `registryPrune(apiName)` — delegates to `Registry().remove()`

## 3. Existing Coverage

No existing tests covered any symbol in the scope (`tests/electron/` directory did not exist before this build). Coverage map:

| Symbol | Existing test files |
|---|---|
| `INVOKE_CHANNEL_LIST` | None |
| `EVENT_CHANNEL_LIST` | None |
| `registerIpcHandlers` | None |
| `emitUploadProgress` | None |
| `getActiveProfile` | None |
| `getBackend` | None |
| `selectProfile` | None |
| `listProfileSummaries` | None |
| `registryList` | None |
| `registryRefresh` | None |
| `registryPrune` | None |

## 4. Plan

| # | target_symbol | category | test_file | test_name (summary) | intent |
|---|---|---|---|---|---|
| 1 | `INVOKE_CHANNEL_LIST` | unit | ipc-contract.test.ts | contains exactly 15 invoke channels | Drift-guard: count must stay 15 |
| 2 | `INVOKE_CHANNEL_LIST` | unit | ipc-contract.test.ts | contains "stores:list" … "profiles:select" (15 tests) | Each channel present, no missing |
| 3 | `INVOKE_CHANNEL_LIST` | unit | ipc-contract.test.ts | has no channels beyond the 15 expected ones | No extras added silently |
| 4 | `INVOKE_CHANNEL_LIST` | unit | ipc-contract.test.ts | contains no duplicate channel names | No duplicates |
| 5 | `EVENT_CHANNEL_LIST` | unit | ipc-contract.test.ts | contains exactly 1 event channel | Single event channel `upload:progress` |
| 6 | `EVENT_CHANNEL_LIST` | unit | ipc-contract.test.ts | contains "upload:progress"; no extras; no duplicates | Event channel drift-guard |
| 7 | `IpcOk/IpcErr/IpcResult` | unit | ipc-contract.test.ts | envelope shape verification | Runtime shape matches the contract |
| 8 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | registers exactly 15 invoke channels | All channels wired at startup |
| 9 | `registerIpcHandlers` | error_path | ipc-handlers.test.ts | BackendError subclass → { code, message } (5 tests) | Typed errors map to their codes |
| 10 | `registerIpcHandlers` | error_path | ipc-handlers.test.ts | does NOT leak operationError | UploadOperationError internals stripped |
| 11 | `registerIpcHandlers` | error_path | ipc-handlers.test.ts | error envelope has no stack/cause | Never serialize error internals |
| 12 | `registerIpcHandlers` | error_path | ipc-handlers.test.ts | ConfigurationError → CONFIGURATION_ERROR | Typed config errors surfaced correctly |
| 13 | `registerIpcHandlers` | error_path | ipc-handlers.test.ts | unknown error → INTERNAL / "Internal error" (4 tests) | Opaque fallback for unexpected throws |
| 14 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | assertTrustedSender: trusted/untrusted/null/undefined frame | Sender validation gate |
| 15 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | query:run strips raw field | QueryResult.raw never crosses IPC |
| 16 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | OkVoid / OkBool success envelopes | Correct shape for void/boolean operations |
| 17 | `emitUploadProgress` | unit | ipc-handlers.test.ts | sends to alive window; guards destroyed window | Window destroyed check |
| 18 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | docs:upload waitActive → STATE_PENDING+STATE_ACTIVE | Upload lifecycle events emitted |
| 19 | `registerIpcHandlers` | error_path | ipc-handlers.test.ts | docs:upload waitActive failure → STATE_PENDING+STATE_FAILED | Failed upload lifecycle events |
| 20 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | docs:replace waitActive lifecycle | Replace lifecycle events |
| 21 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | profiles:list key-free summaries | No key material in response |
| 22 | `registerIpcHandlers` | config_validation | ipc-handlers.test.ts | registry:refresh with no active profile → CONFIGURATION_ERROR | No-fallback rule enforced |
| 23 | `registerIpcHandlers` | unit | ipc-handlers.test.ts | redactString applied to BackendError/ConfigurationError messages | API keys never cross IPC |
| 24 | `getActiveProfile` | unit | profile-state.test.ts | returns null before any profile is selected | Initial singleton state |
| 25 | `getBackend` | config_validation | profile-state.test.ts | throws ConfigurationError (by name) when no profile selected | No-fallback: always throw |
| 26 | `selectProfile` | config_validation | profile-state.test.ts | throws ConfigurationError when profile not found | No silent default profile |
| 27 | `selectProfile` | unit | profile-state.test.ts | sets active profile, calls makeBackend, getBackend returns new backend | Normal selection flow |
| 28 | `selectProfile` | unit | profile-state.test.ts | switching profile rebuilds backend | Backend replaced on re-select |
| 29 | `listProfileSummaries` | unit | profile-state.test.ts | returns key-free { name, keyMode } only | No apiKey/secret/credential in output |
| 30 | `registryList` | unit | registry-service.test.ts | delegates to Registry().list() | Thin wrapper semantics |
| 31 | `registryRefresh` | unit | registry-service.test.ts | single-page: calls listStores once, reconcile, returns list | Basic refresh flow |
| 32 | `registryRefresh` | unit | registry-service.test.ts | multi-page: follows nextPageToken until null | Full pagination |
| 33 | `registryRefresh` | unit | registry-service.test.ts | accumulates all pages before reconcile | No premature reconcile |
| 34 | `registryPrune` | unit | registry-service.test.ts | returns true/false from Registry().remove() | Remove result forwarded |

## 5. Files Owned

| File | Reason |
|---|---|
| `tests/electron/electron-mock.ts` | New — shared in-process Electron mock (ipcMain + BrowserWindow stubs) used only within tests/electron/ |
| `tests/electron/ipc-contract.test.ts` | New — drift-guard tests for channel lists and envelope types |
| `tests/electron/ipc-handlers.test.ts` | New — error mapping, sender validation, envelope shaping, progress emission tests |
| `tests/electron/profile-state.test.ts` | New — singleton state machine, ConfigurationError, key-free summaries |
| `tests/electron/registry-service.test.ts` | New — registry wrapper delegation and pagination tests |

No shared test infrastructure was modified (no changes to `vitest.config.ts`, `tsconfig.json`, `package.json`, or any existing test file).

## 6. Test Run Results

Command: `npx vitest run tests/electron`

```
 Test Files  4 passed (4)
      Tests  138 passed (138)
   Start at  01:07:31
   Duration  151ms
```

All 138 tests passed on first run after fixing two issues:
- `ipc-handlers.test.ts`: The initial attempt used `await import(...)` inside a synchronous `vi.mock` factory, which is invalid. Fixed by using `vi.mock('electron', async () => { ... })` (async factory) which vitest supports.
- `profile-state.test.ts`: `vi.resetModules()` + dynamic `import()` creates a fresh module graph per test, meaning the `ConfigurationError` class object in the test file differs from the one in the re-loaded `profile-state.ts`. Fixed by checking error type via `err.name === 'ConfigurationError'` rather than `instanceof`.

No test failures remain.

## 7. Implementation Gaps

None. All assertions matched the implementation. The production code satisfies the design contract as written.

## 8. Manual Review Needed

### 1. `src/electron/main.ts` — not testable without Electron runtime

`main.ts` contains the Electron app lifecycle (`app.whenReady()`, `BrowserWindow` construction, resource path resolution via `app.getAppPath()`/`process.resourcesPath`/`app.isPackaged`, and window hardening flags). These require the actual Electron runtime environment and cannot be exercised via vitest in a Node.js process. To test this:
- **Option A**: Use `electron-mocha` or `spectron`/`playwright-electron` for integration testing in a real Electron process.
- **Option B**: Extract the window-flag defaults and resource-path logic into a pure helper function in a separate module, which can then be unit-tested without Electron.
The window security flags (`contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, etc.) are especially important to verify in a real Electron session.

### 2. `src/electron/preload.cjs` — CJS, no ESM test runner support

`preload.cjs` is a CommonJS file that uses `require('electron')` (`contextBridge` and `ipcRenderer`). It cannot be directly imported by vitest (ESM). Additionally, it accesses the real Electron bridge APIs at runtime. To test the allowlist enforcement:
- **Option A**: Use `electron-playwright` or Spectron in an end-to-end test that launches the full app and verifies that `window.gemini.invoke` with an unlisted channel is rejected before any IPC is sent.
- **Option B**: Extract the allowlist validation logic into a pure function in a `.ts` file and test that function.

### 3. `profile-state.ts` — `instanceof ConfigurationError` across module boundaries

When `vi.resetModules()` is used for per-test module isolation, the `ConfigurationError` class imported in the test file and the one in the freshly-imported `profile-state.ts` are different objects. Tests in this build work around this by checking `err.name === 'ConfigurationError'` instead of `instanceof`. If stronger type checking is needed, either (a) avoid `vi.resetModules()` and use explicit state-reset functions exported from `profile-state.ts`, or (b) export a `isConfigurationError` type guard from `src/config/config-error.ts`.

### 4. `src/electron/public/app.ts` (renderer) — requires DOM + `window.gemini` bridge

The renderer logic in `app.ts` depends on the DOM, `window.gemini.invoke/on`, and browser-side event listeners. Testing it in vitest requires `environment: 'jsdom'` or `environment: 'happy-dom'` plus a full stub of `window.gemini`. Since this is pure DOM logic with no backend imports, a dedicated `tests/electron/renderer/app.test.ts` using jsdom is feasible — but it was out of this scope (the scope only listed main-process symbols) and would need the global vitest config to allow per-file environment overrides (`@vitest-environment jsdom` docblock or `environmentMatchGlobs` in vitest.config.ts). That config change belongs in the shared infrastructure owned by the integration-verifier or a future test-builder scoped to the renderer.

### 5. `registry:refresh` handler — `getBackend()` called inside the handler

The `registry:refresh` IPC handler calls both `getActiveProfile()` and `getBackend()`. The test for the "no active profile" path mocks only `getActiveProfile()` to return `null`, which causes the handler to throw a `ConfigurationError` before reaching `getBackend()`. If `getActiveProfile()` returns a non-null value but `getBackend()` throws a `ConfigurationError` (e.g., backend was cleared after profile selection), that path is exercised by the existing `ConfigurationError` mapping tests. No additional test infrastructure is needed, but this is called out for traceability.

## 9. Commands Run

| # | Command | Exit code |
|---|---|---|
| 1 | `npx vitest run tests/electron` | 1 (initial: parse error + 6 failures) |
| 2 | `npx vitest run tests/electron` | 1 (55 failures in ipc-handlers after mock fix attempt) |
| 3 | `npx vitest run tests/electron` | 0 (138/138 passed) |
| 4 | `npx vitest run tests/electron --reporter=verbose` | 0 (138/138 passed, verbose confirmation) |
