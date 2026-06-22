# Issues - Pending Items

This file tracks issues, pending items, inconsistencies, and discrepancies for the
Gemini File Search Store Navigator project. Pending items come first (most critical on
top); completed items follow.

## Pending Items

### plan-002 (Electron UI surface) — deferred items & review flags (2026-06-22)
These are non-blocking; the integrated build/typecheck/tests and the unsigned macOS build all pass.
- **(U3 — review flag)** `src/electron/public/app.ts` restates the IPC payload **types** as a local
  structural mirror of U2's `src/electron/ipc-payloads.ts` (to stop `tsc -p tsconfig.renderer.json`
  from dragging `src/core/*` into the renderer build, preserving R14). Drift risk: if U2's payload
  shapes change, the renderer mirror must be updated by hand. Consider switching `build:renderer` to
  esbuild (erases type-only imports → single clean file, allows importing the real types).
- **(U3)** `tsc -p tsconfig.renderer.json` emits an incidental `src/electron/ipc-contract.js` next to
  the sources (harmless — excluded from the root build and from packaging `files`). Cleanup: add to
  ignore conventions or switch the renderer build to esbuild.
- **(U4-finish)** The packaged app ships `src/electron/public/app.ts` (renderer source) alongside the
  compiled `app.js`, because `extraResources` copies the whole `public/` dir. Harmless (CSP-locked
  index.html loads only `./app.js`). Cleanup: a dedicated renderer outDir or an `extraResources`
  `*.ts` filter.
- **(U4-finish)** No app `icon` set (default Electron icon) — intentional, no `assets/` dir exists.
- **(U1 — minor)** `src/config/config-error.ts` retains two descriptive doc-comments referencing the
  now-deleted `agent-config.ts` (its historical port origin). Not code, nothing dangles; scrub the
  comment wording in a future docs pass.
- **(Stale record)** The "Runtime dependencies (root package.json)" vetting table below still lists
  the 7 LangChain/LangGraph packages (`langchain`, `@langchain/core`, `@langchain/langgraph`,
  `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai`, `@langchain/ollama`) — these
  were **REMOVED** in plan-002 U1 (2026-06-22). The dated table is a historical record; this note
  supersedes it.

### Nice-to-haves / deferred (logged from U0-bootstrap)
- (Deferred to later units) `bin/gemini-nav.mjs` references `src/cli/index.ts`, which is
  created by U2-cli. The shim is a runtime tsx loader (not type-checked); it will fail at
  runtime only until U2 lands. No action needed in U0.
- (Informational) `commander` latest stable is **15.0.0** at vet time (2026-06-20); the
  binding U0 constraint pins `^14` (installed 14.0.3). Revisit if a v15 feature is needed.
- (Informational) `@types/node` latest is **26.0.0** at vet time; pinned `^25` per the
  binding constraint to track the Node 25 runtime / reference (`^25.5.0`). Installed 25.9.4.

## Dependency vetting log

All packages vetted on **2026-06-20**. `npm install` + `npm audit --omit=dev` reported
**0 vulnerabilities** (zero HIGH-or-above advisories). No `overrides` required.

### Runtime dependencies (root package.json)
| Package | Pinned range | Installed | License | Advisory status (2026-06-20) |
|---|---|---|---|---|
| @google/genai | ^2.9.0 | 2.9.0 | Apache-2.0 | none known |
| commander | ^14.0.3 | 14.0.3 | MIT | none known (latest stable 15.0.0; ^14 per binding constraint) |
| zod | ^4.4.3 | 4.4.3 | MIT | none known |
| chalk | ^5.6.2 | 5.6.2 | MIT | none known |
| dotenv | ^17.4.2 | 17.4.2 | BSD-2-Clause | none known |
| langchain | ^1.5.0 | 1.5.0 | MIT | none known |
| @langchain/core | ^1.2.0 | 1.2.0 | MIT | none known |
| @langchain/langgraph | ^1.4.4 | 1.4.4 | MIT | none known |
| @langchain/openai | ^1.5.1 | 1.5.1 | MIT | none known |
| @langchain/anthropic | ^1.5.0 | 1.5.0 | MIT | none known |
| @langchain/google-genai | ^2.2.0 | 2.2.0 | MIT | none known |
| @langchain/ollama | ^1.3.0 | 1.3.0 | MIT | none known (available; no OpenAI-wire substitution needed) |

### Dev dependencies (root package.json)
| Package | Pinned range | Installed | License | Advisory status (2026-06-20) |
|---|---|---|---|---|
| @types/node | ^25.5.0 | 25.9.4 | MIT | none known (latest 26.0.0; ^25 per binding constraint) |
| tsx | ^4.22.4 | 4.22.4 | MIT | none known |
| typescript | ^6.0.3 | 6.0.3 | Apache-2.0 | none known |
| vitest | ^4.1.9 | 4.1.9 | MIT | none known |

#### Notes
- `@google/genai@^2.9.0` — latest stable 2.9.0 (2026-06-19), Apache-2.0, no known advisory
  at vet time; NEW runtime dependency for the Gemini data plane. Live `npm audit` confirmed
  zero advisories on 2026-06-20.
- `@langchain/ollama` IS available on the registry (1.3.0); the OpenAI-wire fallback noted in
  the plan's Risks section is NOT needed.

### Runtime dependencies (API/package.json — added by U3-http-api)
All vetted **2026-06-20**; `npm install` + `npm audit --omit=dev` in `API/` reported **0 vulnerabilities**.

| Package | Pinned range | Latest stable | Advisory status |
|---|---|---|---|
| express | ^5.2.1 | 5.2.1 | none known |
| pino | ^10.3.1 | 10.3.1 | none known |
| pino-http | ^11.0.0 | 11.0.0 | none known |
| swagger-ui-express | ^5.0.1 | 5.0.1 | none known |
| uuid | ^14.0.1 | 14.0.1 | none known (bumped from reference's ^11) |
| yaml | ^2.9.0 | 2.9.0 | none known |
| zod | ^4.4.3 | 4.4.3 | none known (matches root) |
| @google/genai | ^2.9.0 | 2.9.0 | none known (matches root) |

Dev (API): @types/express ^5.0.6, @types/node ^25.5.0, @types/supertest ^7.2.0, @types/swagger-ui-express ^4.1.8, supertest ^7.2.2, tsx ^4.22.4, typescript ^6.0.3, vitest ^4.1.9 — all latest stable, 0 advisories.

### Electron toolchain dev dependencies (root package.json — added by U4-prep, plan-002 step 18)
All vetted **2026-06-22**. Latest stable majors re-verified live via `npm view <pkg> version`
(matched the research-time baseline). `npm install` + full `npm audit` reported
**0 vulnerabilities** (zero HIGH-or-above advisories). No `overrides` required.

| Package | Pinned range | Resolved | License | Vetted-on | Advisory status |
|---|---|---|---|---|---|
| electron | ^42.4.1 | 42.4.1 | MIT | 2026-06-22 | none known (latest stable major; one of latest-3 supported majors; `npm audit` 0 advisories) |
| electron-builder | ^26.15.3 | 26.15.3 | MIT | 2026-06-22 | none known (latest 26.x; `npm audit` 0 advisories) |
| esbuild | ^0.28.1 | 0.28.1 | MIT | 2026-06-22 | none known (latest 0.28.x; `npm audit` 0 advisories) |

#### Notes (Electron toolchain)
- `tsx` (already a devDependency, `^4.22.4`) is reused for the dev launcher — NOT duplicated.
- No `overrides` added: the research watch-items resolved to already-patched, non-vulnerable
  versions — `ejs@3.1.10` (RCE fixed in 3.1.10), `brace-expansion@1.1.15` (ReDoS fixed in
  1.1.12). Full `npm audit` reports 0 advisories, so per the project rule no speculative
  override was introduced. Revisit only if a future `npm audit` flags a HIGH+ transitive.
- Deprecation warnings during install (`inflight`, `glob@7.2.3`, `rimraf@2.6.3`, `boolean@3.2.0`)
  are transitive-dep deprecation notices in the electron-builder tree, NOT security advisories
  (`npm audit` = 0). No action required for U4-prep.

## Deviations & Deferred Items (consolidated from Phase 6 coders + post-coding check)

### Resolved during Phase 9 test aggregation (2026-06-20)
- **(FALSE POSITIVE — production code is CORRECT)** The core test-builder flagged
  `listStores`/`listDocuments` returning `pager.params.config?.pageToken` as `nextPageToken`
  as an "infinite-loop" bug. Investigated against the REAL installed SDK source
  (`node_modules/@google/genai/dist/node/index.cjs`, `Pager.init()` ~line 5269): the SDK
  OVERWRITES `params.config.pageToken` with `response.nextPageToken` on every page init, and
  `hasNextPage()` is true iff that token is present. Therefore `pager.params.config.pageToken`
  IS the server's forward/next token — the implementation is correct (matches the Phase 7
  reviewer's verification). **No production change.** Follow-up (non-blocking): the mock in
  `tests/core/genai-backend.test.ts` should be made faithful (set `params.config.pageToken =
  response.nextPageToken`) so the test encodes real SDK semantics rather than the original
  mistaken assumption; tracked for the integration phase.

### Resolved during code review (Phase 7, 2026-06-20)
- **(RECONCILED)** `assembleTools(backend, cfg: AgentConfig)` vs design's
  `assembleTools(backend, allow: string[])`. Reconciled in favour of the implementation
  (cfg carries `toolsAllowlist` + `allowMutations` + `perToolBudgetBytes`, which a bare
  `string[]` cannot). design-001 "Agent surface" and project-design.md updated.
- **(RECONCILED)** HTTP error map: `FileTooLargeError`→**413** (impl) vs 422 (design).
  413 PAYLOAD_TOO_LARGE is canonical; design-001 error table + project-design.md updated to 413.
- **(VERIFIED, not a bug)** `GenAiBackend.listStores/listDocuments` return
  `pager.params.config?.pageToken` as `nextPageToken`. Confirmed against the `@google/genai`
  `Pager` typedef: `params` returns the *next* page's request config, so `.pageToken` is the
  forward token — correct.

### Resolved during post-coding integration
- **(FIXED 2026-06-20)** `src/cli/index.ts:338` — `removeAgentCommand` used `.splice()` on commander 14's `readonly Command[]`. Fixed by casting to mutable `Command[]` (the underlying array is mutable at runtime; commander mutates it internally). Both root and `API/` `tsc --noEmit` now pass clean.

### Pending / deferred (nice-to-haves, non-blocking)
- **(U3)** Document upload over HTTP accepts only JSON `{ filePath }` (server-accessible path), not multipart/streaming upload. Sufficient for the local-run posture; multipart streaming deferred.
- **(U3)** `API/tsconfig.json` drops `noUncheckedIndexedAccess` (the reference enables it) to match the root project's compiler strictness, because the read-only root `src/core/*` was authored without it. Revisit if root strictness is raised.
- **(U3)** Express `Request.requestId` module augmentation is inlined into `observability/request-id.ts` rather than a separate `src/types/express.d.ts` (file-ownership constraint). Harmless; consider relocating.
- **(U3)** No dedicated `replaceDocument` HTTP route (replace = delete+upload, exposed via CLI/agent), matching the design's endpoint table. Health route adds harmless `/healthz` + `/readyz` aliases.
- ~~**(U4)** TUI is a self-contained readline-based session...~~ **OBSOLETE (2026-06-22):** the TUI and the entire agent surface were removed in plan-002 (replaced by the Electron UI). This deferred item no longer applies.
- **(Manual / live-API only)** Two checks require a real Gemini API key and cannot be verified offline: (1) smoke-test that the default query model `gemini-3.1-pro-preview` accepts the `fileSearch` tool on the caller's tier (fall back to `gemini-2.5-pro` if not); (2) an end-to-end live store create → upload → query round-trip.

## Completed Items

- (2026-06-22) **FIXED — Electron store-delete fails for non-empty stores ("Cannot delete non-empty FileSearchStore").**
  **Issue:** clicking Delete on a store with documents produced `ApiError 400 FAILED_PRECONDITION: Cannot delete non-empty FileSearchStore` (shown as opaque "Internal error"; real cause from the new main-process log). The renderer's `deleteStore` (`src/electron/public/app.ts`) sent `StoreDeleteReq = { apiName }` with no `force`, but the Gemini API requires `force: true` to delete a store that still has documents (`IGeminiBackend.deleteStore(apiName, force?)` → SDK `config: { force }`). The CLI avoids this via its `--force` flag.
  **Solution:** the renderer now sends `force: true` for store deletion (the destructive action is already in-UI-confirmation-gated, and the dialog explicitly warns the documents are deleted too). The confirmation message was also made count-aware ("It contains N documents, which will also be permanently deleted."). `force: true` is harmless for empty stores. `typecheck:electron` PASS, `build:renderer` PASS, full suite 497 passed. (Not executed against live stores — destructive — verified by the documented API `force` contract and the CLI's identical usage.)
  **Note:** document delete/replace (`docs:delete`/`docs:replace`) do not need this — documents have no non-empty precondition.

- (2026-06-22) **FIXED — Electron "Internal error" on stores/docs listing: page_size exceeds API cap.**
  **Issue:** After selecting a profile, the UI showed "An internal error occurred. (Internal error)" and the Stores panel stayed empty (the local registry, which needs no API call, loaded fine). Real cause (revealed by the new main-process logging — see next item): `ApiError 400 INVALID_ARGUMENT: ListFileSearchStoresRequest.page_size: page_size must be between 1 and 20`. The renderer (`src/electron/public/app.ts`) hardcoded `pageSize: 25` for both `loadStores` (`stores:list`) and `loadDocuments` (`docs:list`); the Gemini File Search list endpoints reject any `page_size` outside 1–20. The CLI never hit this because it passes `pageSize: undefined` (no `--page-size` flag) and lets the API apply its own ≤20 default; the headless integration phase couldn't exercise the live API; the Phase-9 unit tests drive the handlers with explicit request payloads and never go through the renderer's hardcoded value.
  **Solution:** introduced a documented `const LIST_PAGE_SIZE = 20` in `app.ts` (with a comment citing the 1–20 API limit) and used it at both call sites. Verified in a real Electron runtime: `stores:list` (6 stores) and `docs:list` (10 docs) both succeed with `pageSize: 20`. `typecheck:electron` PASS, `build:renderer` PASS, full suite 497 passed.
  **Follow-up (deferred):** the renderer (`app.ts`) has no unit tests (DOM, needs jsdom — already a logged deferred item); a renderer test asserting `LIST_PAGE_SIZE <= 20` would have caught this. Tracked with the existing renderer-test gap.

- (2026-06-22) **FIXED — Electron main process masked all unexpected errors as opaque "Internal error" with no log.**
  **Issue:** the `run()` IPC choke point in `src/electron/ipc-handlers.ts` correctly returns an opaque `{ code: 'INTERNAL', message: 'Internal error' }` to the renderer for non-typed errors (security: never leak internals/stack/keys), but it logged NOTHING server-side, making any unexpected runtime failure (e.g. the page_size 400 above) undebuggable in a desktop app.
  **Solution:** the unknown-error branch now logs the real cause to the main-process stderr via `console.error('[ipc] unexpected error:', redactString(detail))` — redacted per the security contract — while still sending the opaque envelope to the renderer. This is what surfaced the page_size root cause. `typecheck:electron` + electron tests (139) green.

- (2026-06-22) **FIXED — Electron startup crash: "IPC channel not registered: stores:list".**
  **Issue:** `npm run dev:electron` threw at startup from `registerIpcHandlers` (`src/electron/ipc-handlers.ts`). The dev drift-guard verified channel registration via `ipcMain.eventNames().includes(channel)`. On **real** Electron, `ipcMain.handle()` stores invoke handlers in a separate internal map (`_invokeHandlers`) that is NOT surfaced by `eventNames()` (which only lists `.on`/`.addListener` emitter events) — so every channel looked "unregistered" and the guard threw on the first (`stores:list`). **Why it escaped the 9-phase workflow:** (a) the headless integration phase could not launch the Electron GUI (Acceptance 5/7 were explicitly deferred to manual runtime), and (b) the Phase-9 unit tests passed because `tests/electron/electron-mock.ts` implemented `eventNames()` as `Array.from(handlers.keys())` — i.e. the mock conflated `handle` with emitter events, masking the real-Electron behavior (a mock-vs-real divergence).
  **Solution:**
  1. Production (`src/electron/ipc-handlers.ts`): the guard now consults a locally-tracked `const registered = new Set<InvokeChannel>()` populated inside the `handle()` wrapper, instead of `ipcMain.eventNames()`. Works identically on real Electron and under test.
  2. Test fidelity (`tests/electron/electron-mock.ts`): `eventNames()` now returns `[]` (faithful — `handle` channels are not emitter events) and a new `invokeHandlerNames()` exposes the invoke-handler map for introspection.
  3. Tests (`tests/electron/ipc-handlers.test.ts`): the 15-channel registration assertions now use `invokeHandlerNames()`, and a new regression test asserts `eventNames()` is empty so production can never again depend on it.
  Verification: `typecheck:electron` PASS; `vitest run tests/electron` 139 passed; full suite 497 passed; `build:electron-main` rebuilds `dist/electron/main.mjs`. Runtime re-launch of `npm run dev:electron` to be confirmed by the user.


- (2026-06-20) **Deferred U1 unit tests — DONE (Phase 9).** `renderInlineCitations` byte-slicing (CJK/emoji), `mapSources`/`mapCitations`, error classification, and a mocked-`@google/genai` `GenAiBackend` mapping suite were all built and pass (core 161/161).
- (2026-06-20) **`gemini-nav` tool docs + config — DONE (Phase 6 step 6).** `docs/tools/gemini-nav.md` (with the `<gemini-nav>` block) and `~/.tool-agents/gemini-nav/.env` (0600) scaffolded via the `tool-doc-config-architect`; concise "Tools" entry added to the new project `CLAUDE.md`.

- (2026-06-20) **Integration verification (Phase 10) — PASS / READY.** Both packages
  `tsc --noEmit` clean; **593/593 tests pass** (501 root + 92 API). No linter configured
  (not invented). All 10 acceptance criteria met (offline-verifiable); the only manual items
  are the two inherent live-API-only checks (`gemini-3.1-pro-preview` model smoke test and an
  end-to-end live store/query call). Report:
  `docs/reference/integration-verification-gemini-store-navigator.md`.
- (2026-06-20) **(RESOLVED — test-mock fidelity)** The follow-up flagged in the Phase 9
  pagination note is done. `tests/core/genai-backend.test.ts` `makePager` helper + the
  pagination assertion were corrected to be faithful to the real `@google/genai` `Pager`
  (`index.cjs` line 5269 overwrites `params.config.pageToken` with the server `nextPageToken`;
  line 5403 `hasNextPage()` is true iff that token is present). The mock now sets
  `config.pageToken` only when `hasNext` is true and asserts the backend returns the server's
  forward token. **Production source `src/core/backend/genai-backend.ts` unchanged** (it was
  already correct). Core 161/161 + full root 501/501 green after the fix.
- (2026-06-20) U0-bootstrap landed: project manifest, tsconfig (NodeNext/ES2022/strict),
  vitest config, bin shim, `ConfigurationError`, four-tier `resolveApiKey` resolver
  (`getToolAgentDir`/`ensureToolAgentDir`), `redactString` with Google-key pattern.
  `npx tsc --noEmit` clean; `npm audit --omit=dev` reported 0 vulnerabilities.
