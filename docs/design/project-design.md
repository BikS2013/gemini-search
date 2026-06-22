# Project Design — Gemini File Search Store Navigator

This is the living, cumulative design document for the project. Each design adds a dated,
provenance-linked section below; previous sections are never deleted or rewritten.

---

## 2026-06-20 — Design 001: Gemini File Search Store Navigator (initial architecture)

**Per-request design:** `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/design-001-gemini-store-navigator.md`

### Provenance chain
- Original request → study `BikS2013/storage-navigator` and build the equivalent for the Gemini
  Search (File Search) API to track stores, their metadata, and test queries.
- Refined request: `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-gemini-store-navigator.md`
  (scope locked; five Open Questions resolved to defaults: CLI + HTTP API + Agent/TUI; fresh
  standalone project; static-header API auth; hybrid local registry; multi-account profiles).
- Investigation: `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/investigation-gemini-store-navigator.md`
  (recommended approach A1 `@google/genai` + B1 single `IGeminiBackend` + C1 split encrypted-
  secrets/plaintext-metadata + D1 LangGraph 8-provider).
- Research — SDK schema: `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/gemini-file-search-sdk-schema.md`
  (verbatim `FileSearchStore`/`Document`/grounding interfaces; byte-offset citation pitfall;
  upload-operation `documents.get` hydration pitfall; store-level counts/sizeBytes).
- Research — version/auth/availability: `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/google-genai-sdk-version-availability.md`
  (pin `@google/genai@^2.9.0`; explicit `{ apiKey }` init; File-Search models; quotas/429).
- Plan: `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/plan-001-gemini-store-navigator.md`
  (31 steps, units U0–U4; plan Open Questions resolved binding: default model
  `gemini-3.1-pro-preview`; upload returns at `STATE_PENDING` + `--wait-active`; `query --json`
  normalized + `--raw-json`).
- Reference project (mirrored, NOT part of this project):
  `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/storage-navigator-ref/`

### Architectural summary
Fresh TypeScript/ESM project mirroring `storage-navigator`'s "multiple surfaces over one backend
abstraction" topology. A single `IGeminiBackend` (stores/documents/query) backed by
`@google/genai@^2.9.0` is the sole path to Gemini (acceptance #1). Three surfaces consume it:
the `gemini-nav` CLI (commander), the `gemini-nav-api` Express 5 HTTP API (static-header auth
only), and a LangGraph ReAct agent + TUI (8 LLM providers). Secrets live AES-256-GCM-encrypted
under `~/.tool-agents/gemini-nav/credentials.json`; non-secret store metadata lives in a
plaintext `registry.json` cache reconciled against the live API on refresh (hybrid model). No
configuration fallbacks anywhere — missing required config raises `ConfigurationError`.

### Implementation units (parallelizable after U0+U1)
- **U0-bootstrap** (steps 1–7): manifest/config, `ConfigurationError`, four-tier key resolver,
  redaction, bin shim. Exposes the config/redaction surface; depends on nothing.
- **U1-core-backend** (steps 8–14): types, typed errors, credential store, hybrid registry,
  `IGeminiBackend` + `GenAiBackend` + factory, byte-accurate citation renderer. Exposes the
  backend contract; depends on U0.
- **U2-cli** (steps 15–21): commander program + command groups + query renderer.
- **U3-http-api** (steps 22–26): Express 5 package, static-auth only, endpoint→backend mapping.
- **U4-agent-tui** (steps 27–31): 8-provider agent config/registry, tools, graph/run, TUI,
  `src/cli/commands/agent.ts`.
- U2/U3/U4 run in parallel after U0+U1; file sets are pairwise disjoint.

### Key decisions (rationale in the per-request design)
1. Single `IGeminiBackend` (vs. per-noun split).
2. `@google/genai@^2.9.0` sole data-plane SDK (vs. raw REST / LangChain Google for data plane).
3. Split encrypted-secrets + plaintext-metadata store (vs. single encrypted / remote-only).
4. Explicit `{ apiKey }` client construction (bypasses env-precedence quirk; no fallback).
5. Byte-accurate citation rendering on a UTF-8 Buffer (byte-offset pitfall).
6. Upload returns at `STATE_PENDING` + opt-in `--wait-active` (binding resolution).
7. `query --json` normalized `QueryResult`; `--raw-json` raw `groundingMetadata` (binding).
8. Static-header auth only for the HTTP API (drops OIDC/RBAC + `azure.*`).
9. 8 LLM providers via the reference registry pattern (additive 6→8).

### Open items for the design-review gate
- Confirm the default query model `gemini-3.1-pro-preview` (preview id; `gemini-2.5-pro` fallback).
- Confirm the static-auth header name `X-Gemini-Nav-Auth` and whether the gate is enabled by
  default for local runs.
- External prerequisite (not an executor step): scaffold the `~/.tool-agents/gemini-nav/` config
  folder and `docs/tools/*.md` via `/tool-conventions scaffold`.

### Contract reconciliations (2026-06-20, code-review phase)
- **`assembleTools` signature** — design-001 originally specified
  `assembleTools(backend, allow: string[])`; the implementation uses
  `assembleTools(backend, cfg: AgentConfig)`. Reconciled in favour of the implementation:
  the catalog build needs `cfg.toolsAllowlist` + `cfg.allowMutations` + `cfg.perToolBudgetBytes`
  together, which a bare `string[]` cannot carry. design-001 "Agent surface" updated to match.
- **HTTP error mapping** — design-001 originally mapped `FileTooLargeError`→422; the
  implementation maps it to **413 PAYLOAD_TOO_LARGE** (the canonical over-size-payload status).
  Reconciled in favour of the implementation; design-001 "API & Interface Contracts" error table
  updated. `UnsupportedMimeTypeError`→422 is unchanged.
- **Config precedence (clarification, no code change)** — the two config surfaces deliberately use
  different chains and both match their design statements: profile API-key resolution
  (`resolveApiKey`) is **CLI flag > shell env > `~/.tool-agents/gemini-nav/.env` > local `.env`**
  (design §config line 575); the agent loader (`loadAgentConfig`) is Policy B file-wins
  **CLI flag > tool-agent `.env` > shell env > `config.json`**. These differ from the generic
  parent-CLAUDE.md four-tier ordering but are the orders the design explicitly fixed; left as-is.

---

## 2026-06-21 — design-002: Remove Agent/TUI Surface, Add Electron Desktop UI

**Status:** Designed (implementation pending). Authoritative per-request design:
`docs/design/design-002-electron-ui-surface.md`. This dated note is appended, not a rewrite —
the prior design-001 sections above remain the record for the CLI/HTTP API/agent surfaces as
originally shipped.

**Provenance chain:** original request "remove the TUI/agent part and build an electron ui
interface" → refined request `docs/reference/refined-request-electron-ui-surface.md` →
investigation `docs/reference/investigation-electron-ui-surface.md` → research
`docs/research/electron-security-ipc-preload.md` and
`docs/research/electron-builder-macos-esbuild-main.md` → codebase scan
`docs/reference/codebase-scan-electron-ui-surface.md` → plan
`docs/design/plan-002-electron-ui-surface.md` → design
`docs/design/design-002-electron-ui-surface.md`.

**What changes.**
- **Removal:** delete `src/agent/`, `src/tui/`, `src/cli/commands/agent.ts`,
  `src/config/agent-config.ts`, `tests/agent/`; excise the agent-command wiring from
  `src/cli/index.ts`; remove the 7 LangChain/LangGraph runtime deps + `langgraph` keyword from
  `package.json`. The agent surface and its 8 LLM-provider adapters are retired; the 16 surviving
  CLI commands and the `API/` sub-project are untouched.
- **Addition:** a fourth surface under a new `src/electron/` directory (greenfield New Integration
  Point), consuming `IGeminiBackend` IN-PROCESS via `src/core/backend/factory.ts`
  `makeBackend(profileName)` — never `@google/genai` directly.

**Architectural decisions (rationale + alternatives in design-002 §Design Decisions):**
1. **In-process backend, IPC-only renderer** (resolved Open Question Q1). Main process owns the
   backend and all key material; renderer reaches it only through a typed bridge. Rejected:
   Electron-as-HTTP-client of `gemini-nav-api`.
2. **Toolchain:** hand-rolled `tsc`/esbuild + `electron` + `electron-builder` (NOT electron-forge)
   — preserves the authoritative `tsc → dist/` ESM build; three vettable dev-deps.
3. **Renderer:** plain HTML/CSS/TypeScript, no framework, no renderer bundler.
4. **Main bundling:** esbuild → single `dist/electron/main.mjs`; `preload.cjs` shipped verbatim as
   `extraResources` (CJS required under `sandbox: true`). `package.json` `"main"` = the `.mjs`.
5. **IPC:** generic allowlisted `window.gemini.invoke(channel, ...args)` + `on(channel, cb)` over a
   typed channel union (15 invoke channels covering the 10 `IGeminiBackend` methods + registry
   list/refresh/prune + profile list/select, plus the `upload:progress` event channel). Renderer
   loaded with `loadFile(index.html)` over `file://` (no embedded Express — divergence from the
   reference). Strict `<meta>` CSP (`default-src 'none'; … connect-src 'none'; …`).
6. **Security posture:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`,
   `webSecurity: true`; sender validation on every handler; typed errors flattened to
   `{ code, message }` and `redactString`-scrubbed; API keys NEVER cross IPC; `profiles:list`
   returns names + `keyMode` only; design rule "route ALL main-only Electron APIs through IPC"
   (avoids Electron #47413). main.ts resolves resources via `app.getAppPath()`/
   `process.resourcesPath`/`app.isPackaged` — never `__dirname` (esbuild does not shim it for ESM).
7. **Citations:** byte-accurate spans produced once in core (`citation-render.ts` inside `query`)
   and rendered (not recomputed) by the renderer, which never imports core or the SDK.
8. **Packaging:** macOS-only, arm64, UNSIGNED `dir` target (`identity: null`,
   `hardenedRuntime: false`, `gatekeeperAssess: false`) → `release/mac-arm64/Gemini Nav.app`.
   Profiles are selection-only (no API-key entry in the UI) for v1.

**Build & run commands (as shipped, U4/U5):** `npm run dev:electron` launches the app in
development against the same `~/.tool-agents/gemini-nav/` config the CLI uses; `npm run dist:mac`
produces the runnable UNSIGNED build at `release/mac-arm64/Gemini Nav.app` (first launch needs
right-click → Open / "Open Anyway" per the Gatekeeper caveat). Supporting scripts:
`npm run build:electron` (emits `dist/electron/main.mjs` + `src/electron/public/app.js`) and
`npm run typecheck:electron`. Toolchain: `electron` ^42, `electron-builder` ^26, `esbuild` ^0.28
(devDependencies); `package.json` `"main"` = `dist/electron/main.mjs`.

**Out of scope (unchanged contracts):** `IGeminiBackend`/`GenAiBackend`, `CredentialStore`,
`Registry`, `citation-render.ts`, `src/util/redact.ts`, the surviving CLI commands, and the
`API/` Express sub-project remain functionally intact.

**Open items for the design-review gate (design-002 §Decisions Requiring User Review):**
(a) confirm pinning the then-latest supported Electron major (~^42 baseline); (b) confirm the
unsigned arm64 `dir` build with the Gatekeeper "Open Anyway" caveat is sufficient for v1.

**Note:** this project is NOT a git repository; design-002's symbol references were verified live
via the language server rather than against a commit. No VCS operations are assumed.

**Post-delivery fix (2026-06-22, manual runtime smoke):** the IPC startup drift-guard in
`registerIpcHandlers` originally verified channel registration with `ipcMain.eventNames()`. On real
Electron, `ipcMain.handle` invoke handlers live in a separate internal map not reflected by
`eventNames()`, so the guard threw `IPC channel not registered: stores:list` at launch. Fixed by
having the guard consult a locally-tracked `Set<InvokeChannel>` populated as each handler is
registered; the test `electron` mock was made faithful (`eventNames()` no longer lists `handle`
channels; new `invokeHandlerNames()` introspects them) and a regression test was added. This is an
implementation-level correction; the IPC contract and security architecture are unchanged. See
`Issues - Pending Items.md` (Completed, 2026-06-22).
