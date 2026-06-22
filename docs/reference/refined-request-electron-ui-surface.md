# Refined Request: Replace Agent/TUI Surface with an Electron Desktop UI

## Category
Development

## Objective
Remove the LangGraph ReAct agent surface and its terminal TUI (plus all associated
LangChain/LangGraph dependencies, 8-LLM-provider support, and agent configuration) from the
Gemini File Search Store Navigator, and add a new Electron desktop UI as a fourth surface that
consumes the existing `IGeminiBackend` abstraction to manage stores, manage documents
(upload/list/get/delete/replace), and run File Search RAG queries with byte-accurate citation
rendering — leaving the reusable core backend, the CLI, and the HTTP API surfaces functionally
intact.

## Scope

- **In scope — Part 1 (Removal):**
  - Delete the entire `src/agent/` directory (LangGraph graph, run loop, system prompt, logging,
    8 LLM provider adapters under `src/agent/providers/`, and all agent tools under
    `src/agent/tools/`).
  - Delete the entire `src/tui/` directory (`src/tui/index.ts`, `src/tui/confirm-bridge.ts`).
  - Delete the CLI `agent` subcommand module `src/cli/commands/agent.ts`.
  - Remove the agent-command wiring from `src/cli/index.ts`: the `AgentModule` interface, the
    `tryUpgradeAgentCommand`, `removeAgentCommand`, and `installAgentFallback` functions, the
    `installAgentFallback(program)` call in `registerGeminiNavCli`, and the
    `await tryUpgradeAgentCommand(program)` call in `main()`. After removal `gemini-nav --help`
    MUST NOT list an `agent` command.
  - Delete the agent configuration module `src/config/agent-config.ts`.
  - Remove the now-unused LangChain/LangGraph runtime dependencies from `package.json`:
    `@langchain/anthropic`, `@langchain/core`, `@langchain/google-genai`, `@langchain/langgraph`,
    `@langchain/ollama`, `@langchain/openai`, `langchain`. (Retain `@google/genai`, `commander`,
    `chalk`, `dotenv`, `zod`.) Update the `langgraph`/agent keywords and the package description.
  - Remove agent/TUI-specific tests under `test_scripts/` and any `vitest` specs that target the
    deleted modules.
  - Update all documentation that describes the agent/TUI surface: `docs/tools/gemini-nav.md`
    (remove "Surface 3 — gemini-nav agent" and agent examples), `docs/design/project-design.md`
    (add a dated design section recording the surface removal + Electron addition; never rewrite
    prior sections), `docs/design/project-functions.md`, the project `CLAUDE.md` "Tools" entry and
    the project overview paragraph, and `~/.tool-agents/gemini-nav/` documentation references to
    agent config (`config.json` agent runtime defaults, agent `.env` LLM-provider vars).

- **In scope — Part 2 (Electron UI):**
  - A new Electron desktop application surface (a fourth surface alongside CLI and HTTP API) that
    consumes the existing `IGeminiBackend` via the existing factory (`src/core/backend/factory.ts`),
    never importing `@google/genai` directly (preserves acceptance #1 of the original design).
  - UI coverage for the full backend contract: profile selection, store management (list / info /
    create / delete), document management (list / info / upload / delete / replace), File Search RAG
    queries with rendered answer + inline citations + sources + excerpts, and local registry
    operations (list / refresh / prune).
  - Reuse of the existing byte-accurate citation renderer (`src/core/backend/citation-render.ts`)
    so citation offsets render correctly in the UI.
  - Reuse of the existing typed error model (`src/core/errors.ts`) mapped to user-facing UI error
    states (e.g. `ConfigurationError`, `FileTooLargeError`, `UnsupportedMimeTypeError`,
    `RateLimitError`, `StoreLimitError`).
  - Secure Electron architecture: main process owns all `IGeminiBackend` access; the renderer is
    sandboxed (`contextIsolation: true`, `nodeIntegration: false`) and reaches the backend only
    through a typed IPC bridge exposed by a `preload` script.
  - Secret handling parity: Gemini API keys remain AES-256-GCM-encrypted at rest under
    `~/.tool-agents/gemini-nav/` via the existing `CredentialStore`; key material is NEVER sent to
    the renderer or logged; all log/IPC output passes through the existing `redactString`.
  - Packaging configuration to launch the app in development and produce a runnable desktop build.
  - New documentation: an Electron-surface section in `docs/tools/gemini-nav.md`, a dated design
    section in `docs/design/project-design.md`, functional entries in
    `docs/design/project-functions.md`, and a `CLAUDE.md` "Tools" update describing the fourth surface.

- **Out of scope:**
  - Any change to the `IGeminiBackend` contract (`src/core/backend/backend.ts`) or the
    `GenAiBackend` implementation — the Electron UI consumes the contract as-is. (If the UI exposes
    a genuine new backend capability, that is a separate refined request.)
  - Any change to the CLI command behaviour for the surviving commands (profile / store / doc /
    query / registry) beyond removing the `agent` subcommand wiring.
  - Any change to the HTTP API (`API/`) surface behaviour, endpoints, or auth model.
  - Re-introducing LLM-provider/agent functionality in any form inside the Electron UI (no chat
    agent, no ReAct loop, no LangChain). The Electron UI is a direct backend-operations UI, not an
    agent UI.
  - Code-signing, notarization, auto-update infrastructure, and OS-store distribution (a runnable
    local build is sufficient; signed/notarized distribution is a future request).
  - Multi-window / multi-profile-concurrent sessions beyond switching the active profile.

## Requirements

### Functional — Removal (R1–R6)
1. R1: After removal, `npm run build` (`tsc`) and `npm run typecheck` succeed with zero references
   to any deleted `src/agent/`, `src/tui/`, or `src/config/agent-config.ts` symbol.
2. R2: `gemini-nav --help` lists exactly the surviving commands (profile-add, profiles,
   profile-remove, stores, store-info, store-create, store-delete, docs, doc-info, doc-upload,
   doc-delete, doc-replace, query, registry-list, registry-refresh, registry-prune) and NO `agent`
   command.
3. R3: `package.json` contains none of the seven LangChain/LangGraph packages and no other module
   imports them; `npm install` resolves a smaller dependency tree.
4. R4: All surviving CLI commands behave exactly as documented in `docs/tools/gemini-nav.md`
   "Surface 1" before the change (no regression).
5. R5: All documentation referencing the agent/TUI surface is removed or updated; no dangling
   references to "Surface 3", LangGraph, the 8 LLM providers, agent slash commands, or
   `GEMINI_NAV_AGENT_*` env vars remain in active docs (the reference mirror under
   `docs/reference/storage-navigator-ref/` is excluded — it is not part of this project).
6. R6: The HTTP API surface (`API/`) continues to build, start, and pass its existing tests
   unchanged.

### Functional — Electron UI (R7–R16)
7. R7: The UI lets the user select/switch the active named profile and surfaces the configured
   profiles (never displaying key material).
8. R8: The UI lists File Search stores, shows one store's metadata + derived state, creates a
   store, and deletes a store (with an explicit in-UI confirmation for destructive actions),
   mapping each action to the corresponding `IGeminiBackend` method.
9. R9: The UI lists documents in a store, shows one document's metadata, uploads a local file
   (with the existing pre-upload validation: >100 MB rejected as `FileTooLargeError`,
   audio/video MIME rejected as `UnsupportedMimeTypeError`), deletes a document
   (confirmation-gated), and replaces a document (confirmation-gated delete + re-upload).
10. R10: Document upload exposes the `--wait-active` semantics as a UI option, and reflects the
    `STATE_PENDING` → `STATE_ACTIVE`/`STATE_FAILED` lifecycle to the user.
11. R11: The UI runs File Search RAG queries against one or more selected stores, with an optional
    model override (default `gemini-3.1-pro-preview`, fallback `gemini-2.5-pro`) and optional
    metadata-filter expression, and renders the answer with byte-accurate inline citations, the
    source list, and excerpts (reusing `citation-render.ts`).
12. R12: The UI exposes local registry operations: list cached stores, refresh against the live
    API for the active profile, and prune a stale entry (confirmation-gated; does not delete the
    live store).
13. R13: Renderer-side errors map deterministically from the typed backend errors to clear,
    non-secret user-facing messages (no raw stack traces or key material shown).
14. R14: The main process is the sole holder of `IGeminiBackend`; the renderer has no Node
    integration and accesses backend operations only through the typed preload IPC bridge.
15. R15: A documented command launches the Electron app in development against the same
    `~/.tool-agents/gemini-nav/` configuration the CLI uses, and a documented command produces a
    runnable packaged build for the current OS.
16. R16: All IPC payloads and log output pass through `redactString`; API keys never cross the IPC
    boundary into the renderer.

### Non-functional (R17–R20)
17. R17: All new code is TypeScript/ESM (NodeNext, `strict`, `.js` import extensions), Node ≥ 20,
    consistent with the project's existing conventions (the renderer bundle may use the toolchain's
    required module format, but project TS source remains strict ESM).
18. R18: No configuration fallbacks — missing required configuration raises `ConfigurationError`;
    only the project's documented operational-knob exceptions (page size, etc.) may carry defaults.
19. R19: Any new runtime dependency (Electron and its build/packaging toolchain) is version-vetted
    per the project's dependency-vetting rules: pull the latest stable major for fast-moving
    packages (`electron`, `vite`/bundler), confirm zero HIGH+ advisories before pinning, pin a
    caret range, run the audit command to zero advisories, and record the vetted-on date in
    `Issues - Pending Items.md`.
20. R20: The Electron surface is created/registered following the project's tool conventions — it
    is part of the existing `gemini-nav` tool's surfaces, so the `gemini-nav` tool documentation
    and `CLAUDE.md` "Tools" entry are updated rather than a new tool being hand-scaffolded.

## Constraints
- **Backend abstraction is sacrosanct:** every surface (CLI, HTTP API, Electron) reaches Gemini
  ONLY through `IGeminiBackend`; the Electron main process must use `src/core/backend/factory.ts`,
  not `@google/genai` directly.
- **Reference pattern available, not authoritative:** the mirrored reference project at
  `docs/reference/storage-navigator-ref/src/electron/` (`main.ts`, `preload.cjs`, `launch.ts`,
  `public/app.js`) demonstrates a working CLI+backend → Electron topology and may be studied for
  the IPC/preload/launch pattern, but its versions and exact structure are informational only.
- **Security posture:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox` where
  feasible, a narrow typed IPC surface, and strict redaction; no remote content loading of
  untrusted origins in the main window.
- **Encryption parity:** continue using the existing `CredentialStore` (AES-256-GCM) and the
  `~/.tool-agents/gemini-nav/` config folder; do not introduce a second secret store.
- **Dependency hygiene:** Electron and bundler/packager are fast-moving, CVE-prone packages — the
  dependency-vetting rule is mandatory before pinning.
- **No silent scope creep:** if the UI needs a backend capability not on `IGeminiBackend`, stop and
  raise a new refined request rather than widening the contract here.

## Acceptance Criteria
1. `src/agent/`, `src/tui/`, `src/cli/commands/agent.ts`, and `src/config/agent-config.ts` no
   longer exist; `grep -ri "langgraph\|langchain\|@langchain" src package.json` returns no matches
   in active project source.
2. `npm run typecheck` and `npm run build` succeed; `npm test` passes (with agent/TUI specs removed
   and new Electron-surface tests, where added, passing).
3. `gemini-nav --help` shows the 16 surviving commands and no `agent` command; a smoke run of one
   read-only CLI command (e.g. `gemini-nav profiles`) still works.
4. `cd API && npm run build && npm test` still succeeds unchanged.
5. Launching the Electron app via the documented dev command opens a window that can: list stores,
   open a store, list/upload/delete/replace documents, run a RAG query that renders answer +
   inline citations + sources + excerpts, and perform registry refresh/prune — all against a real
   profile resolved from `~/.tool-agents/gemini-nav/`.
6. Attempting to upload a >100 MB file or an audio/video file in the UI surfaces the corresponding
   typed-error message without crashing; a destructive action (store-delete / doc-delete /
   doc-replace / registry-prune) requires explicit in-UI confirmation.
7. Inspecting the renderer (devtools) shows no Node integration and no API-key material; IPC
   messages contain no unredacted secrets.
8. The documented packaging command produces a runnable desktop build for the current OS.
9. `docs/tools/gemini-nav.md`, `docs/design/project-design.md` (new dated section),
   `docs/design/project-functions.md`, and `CLAUDE.md` reflect both the removal and the new
   Electron surface; `Issues - Pending Items.md` contains the dependency vetted-on log line.
10. `npm audit` (or the project's audit command) reports zero HIGH-or-above advisories after the
    Electron toolchain is installed.

## Assumptions
- **A1 (Electron over Web UI):** "Electron ui interface" is taken literally — a packaged desktop
  app, not a browser SPA served by the HTTP API. Basis: the request explicitly says "electron",
  and the reference project ships an Electron surface under `src/electron/`.
- **A2 (Backend-direct, not API-client):** the Electron main process consumes `IGeminiBackend`
  directly via the factory (in-process), not by calling the `gemini-nav-api` HTTP surface over the
  network. Basis: the project's defining topology is "multiple surfaces over one backend
  abstraction"; the reference Electron surface embeds the backend. (See Open Question Q1.)
- **A3 (Full removal of LLM-provider support):** removing the agent surface includes removing all
  8 LLM-provider adapters and LangChain deps, because they exist solely to power the agent. The
  Electron UI does NOT reintroduce any LLM-provider/chat functionality. Basis: the request says
  "remove the TUI/agent part" and the providers are agent-only.
- **A4 (Core/CLI/API untouched):** `IGeminiBackend`, `GenAiBackend`, the credential store, the
  registry, the citation renderer, the surviving CLI commands, and the HTTP API are left
  functionally intact. Basis: the request targets only the agent/TUI removal and the UI addition.
- **A5 (Single packaging target):** a runnable build for the developer's current OS (macOS, per
  environment) is sufficient; cross-platform matrices, signing, and notarization are out of scope.
- **A6 (Source location):** the Electron surface lives under a new `src/electron/` directory
  mirroring the reference project's layout; the renderer assets live under `src/electron/public/`
  (final layout to be fixed in design). Basis: project convention + reference parity.
- **A7 (Reuse existing config folder):** the Electron app reads the same encrypted
  `~/.tool-agents/gemini-nav/credentials.json` and `registry.json`; no new config surface is
  introduced beyond non-secret UI/window operational knobs.
- **A8 (Bundler choice deferred):** the renderer build toolchain (e.g. Vite + electron-builder vs.
  electron-forge vs. plain esbuild) is an implementation decision for the investigation/design
  phase, subject to dependency vetting; this spec does not mandate one.

## Open Questions
- **Q1 — Backend integration mode for the Electron UI.**
  - **Question:** Should the Electron main process consume `IGeminiBackend` in-process via the
    factory, or act as a client of the running `gemini-nav-api` HTTP surface?
  - **Why it matters:** it changes the architecture (in-process backend, IPC-only) versus
    (HTTP client + API process lifecycle management), the dependency set, the error mapping path,
    and whether the API must be running for the UI to work.
  - **Recommended default:** In-process via `src/core/backend/factory.ts` (matches the project's
    "surfaces over one backend abstraction" topology and the reference Electron pattern; no extra
    process to manage).
- **Q2 — Packaging/build toolchain.**
  - **Question:** Which Electron build toolchain should be adopted — electron-forge,
    electron-builder, or a hand-rolled Vite + electron setup?
  - **Why it matters:** it drives the dependency set, the dev/launch commands, the packaging output,
    and long-term maintenance; all options are fast-moving and must be vetted.
  - **Recommended default:** Decide in the investigation phase; default to the toolchain the
    reference project uses (study `docs/reference/storage-navigator-ref/package.json`) if it is on a
    currently-supported, advisory-clean version, otherwise the simplest vetted option.
- **Q3 — Packaging targets.**
  - **Question:** Is a single macOS build sufficient, or are Windows/Linux builds required now?
  - **Why it matters:** affects packaging configuration, testing surface, and effort.
  - **Recommended default:** macOS-only runnable build for now (current dev OS); other targets are a
    future request.
- **Q4 — Registry/profile management depth in the UI.**
  - **Question:** Should the UI also support profile creation/removal and API-key entry (mirroring
    `profile-add`/`profile-remove`), or only selection of pre-existing profiles created via the CLI?
  - **Why it matters:** profile creation means handling API-key entry and encryption in the desktop
    app (more secret-handling surface and UX), versus a read-only profile picker.
  - **Recommended default:** Selection-only of pre-existing profiles for the first version; profile
    creation/key entry in the UI is a follow-up (keeps secret-entry surface minimal). Note: R7 is
    written to the selection-only default.

## Open Questions — Resolutions (resolved by user at the Phase 1 gate, 2026-06-21)
- **Q1 — Backend integration mode:** RESOLVED → **In-process via `src/core/backend/factory.ts`** (recommended default). The Electron main process owns `IGeminiBackend` directly; renderer reaches it only via typed IPC. No dependency on the HTTP API process.
- **Q2 — Packaging/build toolchain:** RESOLVED → **Decide in the investigation phase** (recommended default). Default toward the reference project's toolchain if advisory-clean and on a supported version; otherwise the simplest vetted option.
- **Q3 — Packaging targets:** RESOLVED → **macOS-only runnable build** (recommended default). Windows/Linux, signing, notarization are out of scope (future request).
- **Q4 — Profile management depth:** RESOLVED → **Selection-only of pre-existing profiles** (recommended default). No API-key entry / profile creation in the UI for v1; R7 already reflects this.

## Original Request
> I want you to remove the TUI/agent part
> and build an electron ui interface
