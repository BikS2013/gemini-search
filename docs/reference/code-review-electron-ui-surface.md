# Code Review — Electron UI Surface (Remove Agent/TUI, Add Electron Desktop UI)

- **Reviewer:** senior code-reviewer (semantic verification via Serena + cclsp LSP)
- **Date:** 2026-06-22
- **Request:** "remove the TUI/agent part and build an electron ui interface"
- **Artifacts:** refined-request-electron-ui-surface.md, design-002-electron-ui-surface.md,
  plan-002-electron-ui-surface.md, codebase-scan-electron-ui-surface.md
- **Verdict:** **approved**

---

## 1. Files reviewed

### NEW — Electron source (`src/electron/`)
`ipc-contract.ts`, `ipc-payloads.ts`, `ipc-handlers.ts`, `profile-state.ts`,
`registry-service.ts`, `main.ts`, `preload.cjs`, `launch.ts`, `dev.ts`,
`tsconfig.electron.json`, `tsconfig.renderer.json`, `public/index.html`,
`public/styles.css`, `public/app.ts`.

### MODIFIED
`src/cli/index.ts` (agent wiring fully excised), `package.json` (7 LangChain/LangGraph deps
removed; electron/electron-builder/esbuild/tsx devDeps added; `main` → `dist/electron/main.mjs`;
build block + scripts added), `tsconfig.json` (excludes `src/electron/**`).

### DELETED (verified absent, no dangling references)
`src/agent/`, `src/tui/`, `src/cli/commands/agent.ts`, `src/config/agent-config.ts`, `tests/agent/`.

### DOCS (completeness verified)
`docs/tools/gemini-nav.md`, `docs/design/project-design.md`, `docs/design/project-functions.md`,
`CLAUDE.md`.

---

## 2. Diagnostics (cclsp LSP — zero across the board)

| File | Diagnostics |
|---|---|
| `ipc-contract.ts` | none |
| `ipc-payloads.ts` | none |
| `ipc-handlers.ts` | none |
| `profile-state.ts` | none |
| `registry-service.ts` | none |
| `main.ts` | none |
| `launch.ts` | none |
| `public/app.ts` | none |
| `src/cli/index.ts` | none |

`mcp__serena__get_symbols_overview` on `ipc-handlers.ts` confirms the design-specified symbols
(`assertTrustedSender`, `emitUploadProgress`, `registerIpcHandlers`, `run`, `toQueryResultView`,
`OK_VOID`).

---

## 3. IPC channel coverage matrix (contract ↔ handler ↔ preload ↔ renderer)

All 15 invoke channels + the `upload:progress` event are present in every layer. No orphans, no
mismatches. (`contract` = 2 because each name appears in both the `InvokeChannel` union and the
`INVOKE_CHANNEL_LIST` runtime array.)

| Channel | contract | handler | preload | renderer |
|---|---|---|---|---|
| stores:list | ✓✓ | ✓ | ✓ | ✓ |
| stores:get | ✓✓ | ✓ | ✓ | ✓ |
| stores:create | ✓✓ | ✓ | ✓ | ✓ |
| stores:delete | ✓✓ | ✓ | ✓ | ✓ |
| docs:list | ✓✓ | ✓ | ✓ | ✓ |
| docs:get | ✓✓ | ✓ | ✓ | ✓ |
| docs:upload | ✓✓ | ✓ | ✓ | ✓ |
| docs:delete | ✓✓ | ✓ | ✓ | ✓ |
| docs:replace | ✓✓ | ✓ | ✓ | ✓ |
| query:run | ✓✓ | ✓ | ✓ | ✓ |
| registry:list | ✓✓ | ✓ | ✓ | ✓ |
| registry:refresh | ✓✓ | ✓ | ✓ | ✓ |
| registry:prune | ✓✓ | ✓ | ✓ | ✓ |
| profiles:list | ✓✓ | ✓ | ✓ | ✓ |
| profiles:select | ✓✓ | ✓ | ✓ | ✓ |
| upload:progress (event) | ✓✓ | ✓ (send) | ✓ | ✓ (on) |

A startup dev-guard in `registerIpcHandlers` iterates `INVOKE_CHANNEL_LIST` and throws if any
channel is unregistered — runtime protection against future drift.

---

## 4. Security findings (highest priority — encrypted-key Electron app)

**All security requirements satisfied. No findings.**

- **Window flags** (`main.ts:64-74`): `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`, plus defense-in-depth `webSecurity: true`,
  `allowRunningInsecureContent: false`, `experimentalFeatures: false`. All explicit.
- **Preload** (`preload.cjs`): CJS, `require('electron')` limited to `{ contextBridge, ipcRenderer }`;
  exposes ONLY `window.gemini.invoke`/`on`, each allowlist-gated; raw `ipcRenderer` never exposed;
  Electron `event` object stripped before payload reaches the renderer callback.
- **Sender validation** (`ipc-handlers.ts:48-53`): `assertTrustedSender` runs inside `run()` on
  every channel; `event.senderFrame?.url` must start with the `file://` renderer URL.
- **API keys never cross IPC**: `profile-state.ts` is the sole holder of `IGeminiBackend`;
  `listProfileSummaries` maps to `{ name, keyMode }` only; `makeBackend` consumes the key
  internally. No payload type declares `apiKey`/`secret`/`credential`.
- **Redaction**: `run<T>()` applies `redactString(err.message)` on every error envelope
  (5 call sites). Typed errors serialized as `{ code, message }` only — never `stack`, `cause`, or
  `UploadOperationError.operationError`. Unknown errors → opaque `{ code: 'INTERNAL', message:
  'Internal error' }`.
- **`QueryResult.raw` stripped** before crossing IPC (`toQueryResultView`, `ipc-handlers.ts:86-89`).
- **CSP** (`index.html:11-14`): `default-src 'none'; script-src 'self'; style-src 'self';
  img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none';
  frame-ancestors 'none';`. No inline scripts/handlers; external `./app.js` module; relative assets.
- **No remote loads / navigation locked** (`main.ts:42-55, 90-95`): `setWindowOpenHandler → deny`,
  `will-navigate` blocked off-origin, `will-attach-webview` denied, defensive
  `web-contents-created` handler strips preload + forces `nodeIntegration:false` on any webview.
- **Resource paths via Electron APIs only** (`main.ts:28-40`): `app.isPackaged`,
  `process.resourcesPath`, `app.getAppPath()`. No `__dirname`/`import.meta` (grep-confirmed: only
  in comments).
- **`styles.css`**: no remote `url(http…)`/`@import` — self-contained.

---

## 5. Correctness vs design / requirements

- **IPC contract matches design** §"API & Interface Contracts" exactly (channel names, request
  payloads, success-data types, backend mapping).
- **R13 — error mapping**: renderer `ERROR_MESSAGES` maps all seven codes (`FILE_TOO_LARGE`,
  `UNSUPPORTED_MIME_TYPE`, `STORE_LIMIT`, `RATE_LIMIT`, `UPLOAD_OPERATION_FAILED`,
  `CONFIGURATION_ERROR`, `INTERNAL`) to clear non-secret messages.
- **R8/R9/R12 — destructive actions confirmation-gated**: store-delete, doc-delete, doc-replace,
  registry-prune each call `confirmAction(...)` before invoking.
- **R10 — upload lifecycle**: `waitActive` checkbox → `STATE_PENDING` on send, terminal
  `STATE_ACTIVE`/`STATE_FAILED` via `upload:progress` correlated by `requestId`.
- **R11 — citations**: renderer renders byte-offset spans (`TextEncoder`/`TextDecoder` byte-slice)
  from the main-produced `QueryResultView.citations`; it does NOT re-implement offset math (the
  authoritative computation stays in core `citation-render.ts`). Sources + excerpts rendered.
- **R14 / no-leak**: `public/app.ts` imports only `../ipc-contract.js` **type-only**; emitted
  `app.js` has zero runtime imports. No `require(`, no `@google/genai`, no `src/core/*` import.
- **R18 — no config fallbacks**: `getBackend()` and `selectProfile()` throw `ConfigurationError`
  on missing/unknown profile; `makeBackend` throws on unresolved key. Only operational knobs
  (window size, page size 25) default.

---

## 6. `app.ts` local-mirror adjudication (specific review flag)

`public/app.ts` restates U2's `ipc-payloads.ts` shapes as a LOCAL structural mirror (rather than
importing them) so `tsc -p tsconfig.renderer.json` does not drag `src/core/*` into the renderer
build (preserving R14). **Verified field-by-field against `src/core/types.ts` and
`ipc-payloads.ts`:**

| Mirror type (app.ts) | Authoritative source | Result |
|---|---|---|
| `StoreSummary` | `StoreInfo` (`types.ts:29-50`) | accurate |
| `DocSummary` + `DocCustomMetadata` + `DocumentState` | `DocumentInfo` (`types.ts:61-93`) | accurate |
| `QuerySource` | `QuerySource` (`types.ts:100-118`) | accurate |
| `CitationSpan` | `CitationSpan` (`types.ts:126-136`) | accurate |
| `QueryResultView` | `Omit<QueryResult,'raw'>` (`types.ts:139-150`) | accurate (no `raw`) |
| `RegistryEntryView` | `RegistryEntry` (`types.ts:197-212`) | accurate |
| `Page<T>` | `backend.ts` `Page` | accurate |
| `ProfileSummary` | `ipc-payloads.ts:53-56` | accurate |
| `OkVoid`/`OkBool` + all `*Req` + `UploadProgressEvent` | `ipc-payloads.ts` | accurate |

**Adjudication: accepted trade-off.** The mirror is structurally faithful — no drift today.
Documented drift risk: if U2's payloads change, the mirror must be hand-updated. Remediation
(switch `build:renderer` to esbuild so type-only imports erase and the real types can be imported)
is already logged in `Issues - Pending Items.md`. No change required.

---

## 7. Build / test results

| Command | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | PASS |
| `npm run build` (`tsc`) | PASS |
| `npm run typecheck:electron` | PASS |
| `npm run build:renderer` | PASS (emits `public/app.js`) |
| `npm run build:electron-main` (esbuild) | PASS → `dist/electron/main.mjs` (33.8 kb) present |
| `npm test` (`vitest run`) | PASS — 358 tests, 10 files |
| `cd API && npm run build && npm test` | PASS — 92 tests, 4 files (unchanged, R6/Acceptance 4) |
| `npm audit` | **0 vulnerabilities** (Acceptance 10) |

`gemini-nav --help` lists exactly the 16 surviving commands; no `agent` command (R2/Acceptance 3).

---

## 8. Removal completeness

- `grep -rIn "langchain|langgraph|@langchain" src package.json` → **empty** (Acceptance 1).
- `src/agent/`, `src/tui/`, `src/cli/commands/agent.ts`, `src/config/agent-config.ts`,
  `tests/agent/` → all absent.
- No dangling imports of deleted modules. Remaining "agent" string matches are: `~/.tool-agents/`
  config-dir paths, "every surface (CLI/HTTP API/agent)" historical doc-comments, and
  `config-error.ts` provenance comments — none are code references to deleted symbols. (The
  `config-error.ts` comment cleanup is already logged as a minor deferred item.)
- `package.json` `description`/`keywords` free of LangChain/LangGraph; `keywords` updated to
  `[gemini, file-search, rag, navigator, cli]`.

---

## 9. Docs / tools

- `docs/tools/gemini-nav.md`: describes the Electron surface (16 mentions); zero
  Surface-3/agent/LangGraph/`GEMINI_NAV_AGENT` residue.
- `CLAUDE.md`: Tools entry still points to `docs/tools/gemini-nav.md` (R20 — Electron is part of
  the existing tool, no new tool scaffolded); mentions Electron (8×); zero agent residue.
- `docs/design/project-functions.md`: zero agent residue.
- `docs/design/project-design.md`: 5 "agent/LangChain" matches are CORRECT — 4 live in the dated
  **2026-06-20 Design 001** historical section (must not be rewritten per the living-doc rule) and
  1 is in the **2026-06-21 design-002** section describing the removal action itself. Properly
  preserved history, not stale claims.
- `Issues - Pending Items.md`: dependency vetted-on log present (electron ^42.4.1,
  electron-builder ^26.15.3, esbuild ^0.28.1, vetted 2026-06-22, `npm audit` 0) — Acceptance 9.

---

## 10. Issues fixed during review

- Removed a stray emitted `src/electron/ipc-contract.js`. **Note:** `build:renderer`
  (`tsc -p tsconfig.renderer.json`) regenerates it because `tsc` emits the type-only-imported
  module into `outDir: "."`. It is harmless (excluded from the root `tsc` build via
  `src/electron/**`, and NOT shipped by packaging — `extraResources` copies only `public/`, and the
  stray sits at the `src/electron/` root). This is already logged in `Issues - Pending Items.md`
  with the esbuild-renderer remediation. No code change made (regeneration is expected and benign).

No code-quality or security defects required fixing. No design changes were necessary.

---

## 11. Remaining concerns (all non-blocking, already logged by the implementer)

1. `build:renderer` emits an incidental `src/electron/ipc-contract.js` (harmless; not packaged).
2. `extraResources` copies the whole `public/` dir, so the packaged `.app` ships `app.ts`
   alongside `app.js` (harmless; CSP loads only `./app.js`).
3. `app.ts` payload-type mirror carries a hand-maintenance drift risk (mitigated: verified
   accurate today; esbuild-renderer remediation noted).
4. `config-error.ts` retains two doc-comments naming the deleted `agent-config.ts` as port origin
   (comment-only; nothing dangles).
5. No app icon set (default Electron icon) — intentional, no `assets/` dir.

The recommended structural remediation for items 1–3 is the same single change (switch the renderer
build to esbuild), and is appropriately deferred.

---

## Overall verdict: **approved**

The removal is complete and clean; the Electron surface is correct, secure, and faithful to the
design and refined request. All build, typecheck, and test gates pass (root 358 + API 92), `npm
audit` is clean, the IPC contract has full four-layer coverage with a runtime drift-guard, the
security posture (context isolation, sandbox, allowlisted preload, sender validation, redaction, no
key over IPC, strict CSP, locked navigation) is fully satisfied, and the `app.ts` type mirror is
structurally accurate. The remaining concerns are cosmetic/build-hygiene items already tracked as
non-blocking deferred work.
