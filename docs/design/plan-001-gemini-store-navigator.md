---
status: complete
plan_number: 001
slug: gemini-store-navigator
request_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-gemini-store-navigator.md
investigation_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/investigation-gemini-store-navigator.md
research_files:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/gemini-file-search-sdk-schema.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/google-genai-sdk-version-availability.md
codebase_scan_file: null
based_on_commit: null
scan_commit_match: null
steps: 31
open_questions: 3
files_to_create:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tsconfig.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/vitest.config.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/bin/gemini-nav.mjs
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/config-error.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/profile-config.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/agent-config.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/util/redact.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/types.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/credential-store.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/registry.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/errors.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/backend.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/genai-client.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/genai-backend.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/citation-render.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/factory.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/index.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/shared.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/profile-ops.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/store-ops.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/doc-ops.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/query-ops.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/registry-ops.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/agent.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/render/query-render.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/types.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/util.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/openai.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/anthropic.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/google.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/azure-openai.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/azure-ai-inference.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/azure-anthropic.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/ollama.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/litellm.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/registry.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/confirm.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/truncate.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/types.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/store-tools.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/doc-tools.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/query-tools.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/registry.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/graph.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/run.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/system-prompt.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/logging.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/tui/index.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/tui/confirm-bridge.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/package.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/tsconfig.json
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/vitest.config.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/openapi.yaml
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/index.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/app.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/config.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/auth/static-auth.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/errors/api-error.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/errors/error-middleware.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/observability/logger.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/observability/request-id.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/util/pagination.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/health.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/openapi.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/stores.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/documents.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/query.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/Issues - Pending Items.md
files_to_modify:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/project-functions.md
implementation_units:
  - name: U0-bootstrap
    steps: [1, 2, 3, 4, 5, 6, 7]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tsconfig.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/vitest.config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/bin/gemini-nav.mjs
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/config-error.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/profile-config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/util/redact.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/Issues - Pending Items.md
  - name: U1-core-backend
    steps: [8, 9, 10, 11, 12, 13, 14]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/types.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/errors.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/credential-store.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/registry.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/backend.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/genai-client.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/citation-render.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/genai-backend.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/factory.ts
  - name: U2-cli
    steps: [15, 16, 17, 18, 19, 20, 21]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/index.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/shared.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/profile-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/store-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/doc-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/query-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/registry-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/render/query-render.ts
  - name: U3-http-api
    steps: [22, 23, 24, 25, 26]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/package.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/tsconfig.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/vitest.config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/openapi.yaml
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/index.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/app.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/auth/static-auth.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/errors/api-error.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/errors/error-middleware.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/observability/logger.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/observability/request-id.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/util/pagination.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/health.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/openapi.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/stores.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/documents.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API/src/routes/query.ts
  - name: U4-agent-tui
    steps: [27, 28, 29, 30, 31]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/agent-config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/agent.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/types.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/util.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/openai.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/anthropic.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/google.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/azure-openai.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/azure-ai-inference.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/azure-anthropic.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/ollama.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/litellm.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/providers/registry.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/confirm.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/truncate.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/types.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/store-tools.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/doc-tools.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/query-tools.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/tools/registry.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/graph.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/run.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/system-prompt.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/agent/logging.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/tui/index.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/tui/confirm-bridge.ts
build_command: npx tsc --noEmit
test_command: npx vitest run
created_at: 2026-06-20T08:09:18Z
---

# Plan 001 — Gemini File Search Store Navigator

## Objective
Build a fresh TypeScript/ESM project at `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search` that mirrors the `storage-navigator` topology and exposes three surfaces (CLI `gemini-nav`, HTTP API `gemini-nav-api`, LangGraph ReAct agent + TUI) over a single `IGeminiBackend` abstraction backed by the official `@google/genai` SDK. It lets users register multi-account profiles (encrypted API keys), track Gemini File Search stores and their metadata in a hybrid local registry, manage documents (upload/list/get/delete/replace), and run RAG queries rendering answer + sources + citations + excerpts. This satisfies the refined request whose five Open Questions are locked to defaults (CLI + API + Agent/TUI).

## Context
Inputs (provenance chain — all binding):
- Refined request (scope, FRs, acceptance criteria, locked resolutions): @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-gemini-store-navigator.md
- Investigation (recommended approach A1+B1+C1+D1, module layout, `IGeminiBackend` sketch): @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/investigation-gemini-store-navigator.md
- Research — SDK schema (verbatim `FileSearchStore`/`Document`/grounding interfaces, byte-offset citation pitfall, upload-operation hydration pitfall): @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/gemini-file-search-sdk-schema.md
- Research — version/auth/availability (pin `@google/genai@^2.9.0`, explicit `{ apiKey }` init, File-Search models, quotas): @/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/google-genai-sdk-version-availability.md
- Reference project (structure to MIRROR, NOT part of this project): `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/storage-navigator-ref/`

Chosen approach: replicate storage-navigator's module topology ~1:1, substituting `IGeminiBackend` (stores/documents/query) for `IStorageBackend`. The Gemini integration is reached exclusively through `@google/genai`, wrapped behind the backend. Secrets live encrypted (AES-256-GCM, ported from `credential-store.ts`) under `~/.tool-agents/gemini-nav/credentials.json`; non-secret store metadata lives in a plaintext `registry.json` cache (hybrid model). The HTTP API mirrors the reference `API/` package stripped to `staticAuthMiddleware`. The Agent reuses the LangChain+LangGraph provider-registry pattern, expanded to the 8 standard providers. No configuration fallbacks anywhere — missing required config raises `ConfigurationError`.

## Open Questions
1. **Default query model.** The research notes `gemini-2.5-flash` (proven in prior art) may not appear in the current File-Search support table, while `gemini-2.5-pro` is explicitly listed. Why it matters: the `query` default must accept the `fileSearch` tool or every query fails. Recommended default: ship `gemini-2.5-flash` as the configurable default and document `gemini-2.5-pro` as the fallback; confirm with a live smoke test at implementation time. (Affects steps 12, 19.)
2. **`uploadDocument` completion policy.** Block until `STATE_ACTIVE` or return at `STATE_PENDING` after the operation reports `done`? Why it matters: trades upload-command latency against immediate queryability of the new document. Recommended default: return after the operation is `done` + one `documents.get` hydration (typically `STATE_PENDING`), and expose a `--wait-active` flag for callers who want to block. (Affects steps 12, 18.)
3. **`query --json` contract.** Emit the normalized `QueryResult` (sources/citations) or the raw `groundingMetadata` subtree? Why it matters: downstream tooling consumes one or the other. Recommended default: `--json` emits the normalized `QueryResult`; add `--raw-json` for the verbatim `groundingMetadata` passthrough (per research §"Raw --json passthrough"). (Affects steps 19, 26.)

### Resolutions (resolved by user at Phase 4 gate, 2026-06-20) — BINDING
1. **Default query model → `gemini-3.1-pro-preview`** (user override of the recommended `gemini-2.5-flash`). It is a Gemini 3.x model, which per the version research supports the File Search tool (and, uniquely to the 3.x line, File Search + custom function calling). Ship it as the configurable default; smoke-test that it accepts the `fileSearch` tool at implementation, and document `gemini-2.5-pro` as a known-good fallback if the preview id is unavailable in the caller's tier. (Steps 12, 19.)
2. **`uploadDocument` → return at `STATE_PENDING` after the operation reports `done` + one `documents.get` hydration, with an opt-in `--wait-active` flag** to poll until `STATE_ACTIVE`. (Steps 12, 18.)
3. **`query --json` → normalized `QueryResult` by default; add `--raw-json`** for the verbatim `groundingMetadata` passthrough. (Steps 19, 26.)

## Steps

### Step 1 — Project manifest & TypeScript/ESM config
- depends_on: []
- files: `package.json` (create), `tsconfig.json` (create)
- action: Create `package.json` with `"type":"module"`, `"bin": { "gemini-nav": "bin/gemini-nav.mjs" }`, scripts (`build`: `tsc`, `cli`: `npx tsx src/cli/index.ts`, `test`: `vitest run`, `typecheck`: `tsc --noEmit`). Add runtime deps `@google/genai@^2.9.0`, `commander@^14`, `zod@^4`, `chalk@^5`, `dotenv@^17`; LangChain cluster deferred to step 27 manifest edit is forbidden (U4 must NOT touch this file) — instead include the LangChain deps here now: `@langchain/core@^1`, `@langchain/langgraph@^1`, `@langchain/openai@^1`, `@langchain/anthropic@^1`, `@langchain/google-genai@^2`, `langchain@^1`, `@langchain/ollama@^1`. Dev deps: `tsx@^4`, `typescript@^6`, `vitest@^4`, `@types/node@^25`. Re-verify each version per the dependency-validation rule before pinning (see Risks). Create `tsconfig.json` mirroring the reference (ES2022/NodeNext module + moduleResolution, `outDir dist`, `strict: true`, `.js` import extensions).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit -p tsconfig.json` (expect: no config error; zero source files yet is fine).
- done: both files exist; `tsc --noEmit` runs without a config error.

### Step 2 — Install dependencies and run audit (dependency vetting)
- depends_on: [1]
- files: `Issues - Pending Items.md` (create)
- action: Run `npm install`, then `npm audit`. Before pinning, run `npm view @google/genai version` and confirm `2.9.0` (Apache-2.0) and confirm latest stable majors for `commander`, `zod`, `chalk`, `dotenv`, `langchain`/`@langchain/*`, `tsx`, `typescript`, `vitest`. Create `Issues - Pending Items.md` with a "Dependency vetting log" section recording each package, vetted version, advisory status, and the vet date (paste the ready-made `@google/genai@^2.9.0` line from the version research). Treat any HIGH-or-above advisory as a blocker; if a transitive advisory exists, add an `overrides` entry in `package.json` and document its removal condition in the issues file.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npm audit --omit=dev` (expect: zero HIGH-or-above advisories).
- done: `node_modules` populated; `npm audit` reports zero HIGH+ advisories; vetting log written.

### Step 3 — Vitest config
- depends_on: [1]
- files: `vitest.config.ts` (create)
- action: Create a vitest config mirroring the reference root `vitest.config.ts` (node environment, include `tests/**/*.test.ts` and `src/**/*.spec.ts`).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx vitest run --reporter=basic` (expect: "no test files found" exits cleanly).
- done: vitest runs and reports no failures.

### Step 4 — ConfigurationError type
- depends_on: [1]
- files: `src/config/config-error.ts` (create)
- action: Port the reference `ConfigurationError` class (from `src/config/agent-config.ts` lines 22-37) into its own module: constructor `(missingSetting, checkedSources, detail?)`, fields `code='CONFIG_MISSING'`, `missingSetting`, `checkedSources`. This is the single no-fallback error type re-used across all surfaces.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit` (expect: clean).
- done: module exports `ConfigurationError`; typecheck clean.

### Step 5 — Four-tier profile/key config resolver
- depends_on: [4]
- files: `src/config/profile-config.ts` (create)
- action: Implement the four-tier config chain for resolving a profile's Gemini API key and the `~/.tool-agents/gemini-nav/` directory, precedence shell env > `~/.tool-agents/gemini-nav/.env` > local `.env` > CLI flag (use dotenv with the documented file-wins loading and explicit flag override). Export `resolveApiKey(profileName, flags)` that returns the key or throws `ConfigurationError('GEMINI_API_KEY'/'GOOGLE_API_KEY', [checked sources])` — NO fallback default. Export `getToolAgentDir()` returning `~/.tool-agents/gemini-nav` and `ensureToolAgentDir()` (mode 0700) mirroring `ensureAgentConfigDir`. Accept both `GOOGLE_API_KEY` and `GEMINI_API_KEY` names but always pass the resolved key explicitly downstream (never rely on SDK env precedence).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: resolver exports present; missing-key path constructs a `ConfigurationError`; typecheck clean.

### Step 6 — Redaction utility
- depends_on: [1]
- files: `src/util/redact.ts` (create)
- action: Port the reference `src/util/redact.ts` `redactString` with Gemini-relevant patterns: keep the generic `"key"/"token"/"secret"/"apiKey"` JSON patterns and add a pattern for Google API keys (`AIza[0-9A-Za-z_\-]{35}`). Used by agent logging and anywhere secrets could reach a log line.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: `redactString` exported; typecheck clean.

### Step 7 — Bin shim
- depends_on: [1]
- files: `bin/gemini-nav.mjs` (create)
- action: Create the executable shim mirroring `bin/storage-nav.mjs` that resolves and runs `src/cli/index.ts` via tsx (dev) or `dist/cli/index.js` (built). Shebang `#!/usr/bin/env node`.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && node -c bin/gemini-nav.mjs` (expect: no syntax error).
- done: shim parses; references the CLI entry path.

### Step 8 — Core types (StoreInfo / DocumentInfo / QueryResult / ProfileEntry)
- depends_on: [4]
- files: `src/core/types.ts` (create)
- action: Define the backend return types VERBATIM from the research's "Ready-to-drop-in backend TypeScript interfaces" (SDK schema research §"Ready-to-drop-in"): `StoreInfo` (apiName, displayName, createTime, updateTime, sizeBytes:number, activeDocumentsCount, pendingDocumentsCount, failedDocumentsCount, documentCount, embeddingModel), `DocumentState` union, `DocCustomMetadata`, `DocumentInfo` (apiName, displayName, state, sizeBytes:number, mimeType, createTime, updateTime, customMetadata), `QuerySource` (title, excerpt, storeName, uri, pageNumber, mediaId, customMetadata), `CitationSpan` (startIndex/endIndex BYTE offsets, text, chunkIndices, confidenceScores), `QueryResult` (answer, sources, citations, finishReason, raw). Also define `ProfileEntry` (name, keyMode:'stored'|'env', addedAt) and `CredentialData` ({ profiles: ProfileEntry[] }) and `RegistryEntry`/`RegistryData` for the metadata cache (apiName, displayName, profile, createTime, last-seen counts/sizeBytes, lastRefreshedAt). Parse all int64-as-string SDK fields to `number` at this boundary (documented).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: all types exported matching the research field names; typecheck clean.

### Step 9 — Typed backend errors
- depends_on: [8]
- files: `src/core/errors.ts` (create)
- action: Define typed error classes for the Gemini limits/pitfalls the research lists: `FileTooLargeError` (>100 MB), `UnsupportedMimeTypeError` (audio/video), `StoreLimitError` (store-count soft cap), `RateLimitError` (HTTP 429), `UploadOperationError` (operation.error set). These wrap API failures so surfaces render them instead of crashing.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: error classes exported; typecheck clean.

### Step 10 — Credential store (encrypted, ported)
- depends_on: [8]
- files: `src/core/credential-store.ts` (create)
- action: Port the reference `credential-store.ts` AES-256-GCM machine-key store, retargeted to `~/.tool-agents/gemini-nav/credentials.json` + `machine.key` (dir 0700, key file 0600). Replace the storage-specific data shape with `CredentialData = { profiles: ProfileEntry[] }` plus per-profile encrypted API keys. Expose `CredentialStore` methods: `listProfiles()`, `getProfile(name)`, `addProfile(name, apiKey, keyMode)`, `removeProfile(name)`, `getApiKey(name)` (decrypts; throws if `keyMode==='env'` so the caller falls back to the four-tier resolver). Never log or return plaintext keys except via `getApiKey`.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: `CredentialStore` exported; encrypt/decrypt round-trips; typecheck clean.

### Step 11 — Hybrid metadata registry (plaintext cache)
- depends_on: [8]
- files: `src/core/registry.ts` (create)
- action: Implement the plaintext non-secret metadata cache at `~/.tool-agents/gemini-nav/registry.json`. Expose `Registry` with `list()`, `get(apiName)`, `upsert(entry)`, `remove(apiName)`, and `reconcile(profile, liveStores)` that updates cached `StoreInfo` counters/sizeBytes/timestamps + `lastRefreshedAt` from live API results. The registry NEVER stores secrets (acceptance #6). Source of truth is the live API; cache is refreshable on demand.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: `Registry` exported; reconcile updates entries; typecheck clean.

### Step 12 — IGeminiBackend interface
- depends_on: [8]
- files: `src/core/backend/backend.ts` (create)
- action: Define `Page<T>` and the `IGeminiBackend` interface VERBATIM from the investigation's sketch (stores: `listStores`/`getStore`/`createStore`/`deleteStore`; documents: `listDocuments`/`getDocument`/`uploadDocument`/`deleteDocument`/`replaceDocument`; query: `query`). Methods return the `src/core/types.ts` types. `query(storeApiNames: string[], prompt, opts?: { model?; metadataFilter? })`. This is the SOLE path to Gemini (acceptance #1).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && grep -c "uploadDocument\|listStores\|query" src/core/backend/backend.ts` then `npx tsc --noEmit`.
- done: interface exported with all 11 methods; typecheck clean.

### Step 13 — GenAI client constructor + citation renderer
- depends_on: [9, 12]
- files: `src/core/backend/genai-client.ts` (create), `src/core/backend/citation-render.ts` (create)
- action: In `genai-client.ts` implement `makeGenAiClient(apiKey: string): GoogleGenAI` exactly per the version research §2 — throw `ConfigurationError` on empty key, construct `new GoogleGenAI({ apiKey })` with the EXPLICIT key so `GOOGLE_API_KEY`/`GEMINI_API_KEY` env ordering is bypassed (NO env fallback). In `citation-render.ts` implement the BYTE-accurate inline-citation splicer from the SDK-schema research §"Worked example" (`renderInlineCitations(text, supports)` operating on a UTF-8 `Buffer`, descending `endIndex` order, 1-based `[n]` markers) and a `mapSources(groundingChunks)` helper. These two pitfalls (byte offsets; explicit key) are load-bearing.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: both modules exported; byte-buffer slicing used (not `string.slice`); typecheck clean.

### Step 14 — GenAiBackend implementation + factory
- depends_on: [10, 11, 13]
- files: `src/core/backend/genai-backend.ts` (create), `src/core/backend/factory.ts` (create)
- action: Implement `GenAiBackend implements IGeminiBackend` over `@google/genai` per the SDK-schema research. Map `FileSearchStore` (parse `sizeBytes`/`*DocumentsCount` strings to numbers; derive `documentCount = active+pending+failed`; no native store `state`). Implement pagination via `config.pageToken` in / `nextPageToken` out. `uploadDocument`: call `uploadToFileSearchStore`, poll `ai.operations.get` until `done`, check `operation.error`, then `documents.get(operation.response.documentName)` to hydrate the full `DocumentInfo` (upload-operation hydration pitfall); honor the completion policy from Open Question 2. `replaceDocument` = delete + re-upload (documents are immutable). `query`: build a single-tool `tools:[{ fileSearch:{ fileSearchStoreNames } }]` request (no other tools — model constraint), optional `metadataFilter`, map `candidates[0].groundingMetadata` to `QueryResult` via the citation renderer, optional-chain every level, set `raw` to the `groundingMetadata` subtree. Throw the typed errors from step 9 for size/mime/429/store-count failures. Implement `factory.ts` `makeBackend(profileName, flags)` that resolves the key (credential store, else four-tier resolver) and returns a `GenAiBackend`.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: `GenAiBackend` satisfies `IGeminiBackend`; `makeBackend` exported; typecheck clean.

### Step 15 — CLI shared helpers
- depends_on: [14]
- files: `src/cli/commands/shared.ts` (create)
- action: Implement shared CLI helpers mirroring the reference `shared.ts`: `--profile <name>` resolution (analog of `--storage`), a `promptYesNo` confirmation helper for destructive commands, a top-level error handler that maps `ConfigurationError` to exit code 3 and other errors to exit 2, and a backend accessor wrapping `makeBackend`.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: helpers exported; typecheck clean.

### Step 16 — Profile commands
- depends_on: [15]
- files: `src/cli/commands/profile-ops.ts` (create)
- action: Implement `profile-add` (name + key via four-tier chain or `--key`, stored encrypted via `CredentialStore.addProfile`), `profiles` (list — never print keys), `profile-remove`. Keys never echoed to stdout.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: three exported command functions; typecheck clean.

### Step 17 — Store commands
- depends_on: [15]
- files: `src/cli/commands/store-ops.ts` (create)
- action: Implement `stores` (list, also upserts registry cache), `store-info` (get one store's metadata), `store-create`, `store-delete` (gated on `--force`/confirmation). Renders counts/sizeBytes/timestamps and a derived display state from the counts.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: command functions exported; delete is confirmation-gated; typecheck clean.

### Step 18 — Document commands
- depends_on: [15]
- files: `src/cli/commands/doc-ops.ts` (create)
- action: Implement `docs` (list in a store), `doc-info`, `doc-upload` (path + optional `--display-name`, async polling handled by backend, `--wait-active` flag per Open Question 2), `doc-delete` (confirmation-gated), `doc-replace` (delete+re-upload). Pre-validate file size/mime and surface the typed errors from step 9.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: command functions exported; destructive ops gated; typecheck clean.

### Step 19 — Query command + renderer
- depends_on: [15]
- files: `src/cli/commands/query-ops.ts` (create), `src/cli/render/query-render.ts` (create)
- action: Implement `query` (one or more `--store`, prompt, optional `--model` default per Open Question 1, optional `--metadata-filter`). `query-render.ts` renders ANSWER (with inline `[n]` citations from the byte-accurate renderer), SOURCES (`title` + `storeName` for multi-store attribution), and EXCERPTS (`excerpt`), mirroring the skill's output shape (acceptance #3). Support `--json` (normalized `QueryResult`) and `--raw-json` (raw `groundingMetadata`) per Open Question 3. Handle the no-grounding case gracefully (answer only) and check `finishReason`.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: query command + renderer exported; both json modes present; typecheck clean.

### Step 20 — Registry commands
- depends_on: [15]
- files: `src/cli/commands/registry-ops.ts` (create)
- action: Implement `registry-list` (show cached known stores + lastRefreshedAt), `registry-refresh` (live `listStores` per profile → `Registry.reconcile`), `registry-prune` (remove stale/orphaned entries, confirmation-gated). Realizes FR-REG-2 and acceptance #4.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: three registry command functions exported; typecheck clean.

### Step 21 — CLI program wiring
- depends_on: [16, 17, 18, 19, 20]
- files: `src/cli/index.ts` (create)
- action: Build the commander program (`name('gemini-nav')`, version, shared `--profile` option) wiring every command from steps 16-20 plus a stub `agent` subcommand registration that lazy-imports `src/cli/commands/agent.ts` (the file is created in U4; use a dynamic import so this file typechecks independently and degrades gracefully if the agent module is absent during partial builds). Mirror the reference `src/cli/index.ts` structure and the error-handler/exit-code wiring from step 15.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsx src/cli/index.ts --help` (expect: usage listing all subcommands).
- done: `--help` lists profile/store/doc/query/registry/agent commands; exits 0.

### Step 22 — API manifest, tsconfig, vitest
- depends_on: [14]
- files: `API/package.json` (create), `API/tsconfig.json` (create), `API/vitest.config.ts` (create)
- action: Create the API sub-package mirroring the reference `API/package.json` but stripped: deps `express@^5`, `pino@^10`, `pino-http@^11`, `swagger-ui-express@^5`, `yaml@^2`, `uuid@^11`, `zod@^4`, plus `@google/genai@^2.9.0` (the API calls the same backend). Bin `gemini-nav-api`. DROP `jose`, all `@azure/*`, `prom-client`, `@redocly/cli`. Dev deps `tsx`, `typescript`, `vitest`, `supertest`, `@types/*`. Re-vet versions (Risks). The API imports the core backend from `../src/core/...` via tsconfig path/relative import — point `tsconfig.json` `rootDir`/`include` accordingly. Mirror reference `API/vitest.config.ts`.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npm install && npm audit --omit=dev` (expect: zero HIGH+ advisories) then `npx tsc --noEmit` (expect: config valid).
- done: API package installs clean; audit clean; tsc config valid.

### Step 23 — API config (static-auth only) + errors + observability
- depends_on: [22]
- files: `API/src/config.ts` (create), `API/src/errors/api-error.ts` (create), `API/src/errors/error-middleware.ts` (create), `API/src/observability/logger.ts` (create), `API/src/observability/request-id.ts` (create), `API/src/util/pagination.ts` (create)
- action: Port the reference config but COLLAPSE to `{ port, logLevel, staticAuth: { values, headerName }, pagination, gemini: { profile/key resolution } }` — DROP the entire `oidc` discriminated union, `authEnabled`, `azure.*`, `uploads`, `corsOrigins`. Missing required settings throw (no fallback). Port `ApiError`, `errorMiddleware`, pino `logger`, `requestIdMiddleware`, and the `pagination` util verbatim from the reference.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npx tsc --noEmit`.
- done: config has no OIDC/Azure keys; support modules exported; typecheck clean.

### Step 24 — Static-auth middleware
- depends_on: [23]
- files: `API/src/auth/static-auth.ts` (create)
- action: Port `staticAuthMiddleware(allowedValues, headerName)` VERBATIM from the reference (pass-through when empty; else 401 `STATIC_AUTH_FAILED` on missing/mismatched header). Default header `X-Gemini-Nav-Auth`. This is the ONLY auth (no OIDC/RBAC).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npx tsc --noEmit`.
- done: middleware exported; typecheck clean.

### Step 25 — API routes + OpenAPI
- depends_on: [24]
- files: `API/src/routes/health.ts` (create), `API/src/routes/openapi.ts` (create), `API/src/routes/stores.ts` (create), `API/src/routes/documents.ts` (create), `API/src/routes/query.ts` (create), `API/openapi.yaml` (create)
- action: Implement routes calling the SAME `IGeminiBackend`: `GET /health`, `GET /openapi` + swagger-ui, `GET /stores` (paginated) & `GET /stores/:name`, `GET /stores/:name/documents` (paginated) & document get/upload/delete, `POST /stores/:name/query`. Pagination on list endpoints (`pageToken` in / `nextPageToken` out) per the SDK-schema research §"Backend note". Author `openapi.yaml` describing all endpoints + the static-auth header.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npx tsc --noEmit`.
- done: route factories exported; openapi.yaml parses as valid YAML; typecheck clean.

### Step 26 — API app + entrypoint
- depends_on: [25]
- files: `API/src/app.ts` (create), `API/src/index.ts` (create)
- action: Implement `buildApp({ config, backendFactory })` mirroring the reference `app.ts` minus OIDC/RBAC: json body, request-id, pino-http, well-known/openapi/health routers, then `staticAuthMiddleware`, then the stores/documents/query routers, then `errorMiddleware`. `index.ts` loads config (no fallback), builds the app, listens on `config.port`.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npx tsc --noEmit`.
- done: `buildApp` + entrypoint exported; typecheck clean.

### Step 27 — Agent config (8-provider) + provider scaffolding
- depends_on: [14]
- files: `src/config/agent-config.ts` (create), `src/agent/providers/types.ts` (create), `src/agent/providers/util.ts` (create)
- action: Port the reference `agent-config.ts` four-tier loader + `AgentConfig`/`ProviderName` types, expanding `ProviderName` to the 8 standard providers: `openai`, `anthropic`, `google`, `azure-openai`, `azure-ai-inference`, `azure-anthropic`, `ollama`, `litellm`. Re-use the `ConfigurationError` from step 4. Port `providers/types.ts` (`ProviderFactory`) and `providers/util.ts` env-reading helpers. The AUTHORITATIVE env-var matrix and the `~/.tool-agents/gemini-nav/` config folder are owned by the `tool-doc-config-architect` subagent — this step consumes the canonical names (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `AZURE_OPENAI_*`, `AZURE_AI_INFERENCE_*`, `OLLAMA_HOST`, `LITELLM_*`) but MUST NOT hand-scaffold the config folder or tool doc (see Risks / Verification).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: 8 providers in `ProviderName`; config loader + factory types exported; typecheck clean.

### Step 28 — 8 provider factories + registry
- depends_on: [27]
- files: `src/agent/providers/openai.ts`, `anthropic.ts`, `google.ts`, `azure-openai.ts`, `azure-ai-inference.ts`, `azure-anthropic.ts`, `ollama.ts`, `litellm.ts`, `registry.ts` (all create)
- action: Port the reference provider factories (openai/anthropic/gemini→google/azure-openai/azure-anthropic/local-openai) and ADD the two missing standard providers: `ollama` (via `@langchain/ollama`, `OLLAMA_HOST`) and `litellm` (OpenAI-wire via `@langchain/openai` baseURL, `LITELLM_*`); add `azure-ai-inference` (`AZURE_AI_INFERENCE_*`). Each factory raises `ConfigurationError` on missing required provider config (no fallback). `registry.ts` freezes the 8-entry `PROVIDERS` map and exports `getProvider`/`buildModel` mirroring the reference.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && grep -c "createOpenaiModel\|createOllamaModel\|createLitellmModel\|createAzureAiInferenceModel" src/agent/providers/registry.ts` (expect: registry references all 8) then `npx tsc --noEmit`.
- done: registry maps 8 providers; each factory throws on missing config; typecheck clean.

### Step 29 — Agent tools (backend ops as LLM tools)
- depends_on: [27]
- files: `src/agent/tools/confirm.ts`, `truncate.ts`, `types.ts`, `store-tools.ts`, `doc-tools.ts`, `query-tools.ts`, `registry.ts` (all create)
- action: Port `confirm.ts` (`confirmDestructive` with TUI bridge lazy-import), `truncate.ts` (`truncateToolResult`), `types.ts` (`handleToolError`). Wrap each `IGeminiBackend` op as a LangChain `tool(...)` with a zod schema: store tools (list/get/create/delete), doc tools (list/get/upload/delete/replace), query tool. Mutations (store-delete, doc-upload/delete/replace) are gated through `confirmDestructive`. `tools/registry.ts` assembles the toolset honoring the config allowlist.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: all tool factories exported; mutating tools call `confirmDestructive`; typecheck clean.

### Step 30 — Agent graph, run, system prompt, logging
- depends_on: [28, 29]
- files: `src/agent/graph.ts`, `src/agent/run.ts`, `src/agent/system-prompt.ts`, `src/agent/logging.ts` (all create)
- action: Port the reference LangGraph ReAct `createAgentGraph`, the one-shot + interactive `run` (`AgentResult`/`AgentStep`/`AgentUsage`/`AgentMeta`), a Gemini-Navigator-specific `system-prompt.ts`, and `logging.ts` that routes log lines through `redactString` (step 6). One-shot and interactive modes both supported (FR-AGENT-1).
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit`.
- done: graph + run exported; logging redacts; typecheck clean.

### Step 31 — TUI + agent subcommand entry
- depends_on: [30]
- files: `src/tui/index.ts` (create), `src/tui/confirm-bridge.ts` (create), `src/cli/commands/agent.ts` (create)
- action: Port a minimal interactive TUI REPL (`src/tui/index.ts`) and the `confirm-bridge.ts` that lets `confirmDestructive` prompt inside the TUI session. Implement `src/cli/commands/agent.ts` exporting the `agent` command action (resolves `AgentConfig`, builds model + tools + graph, dispatches one-shot vs interactive TUI) consumed by the dynamic import wired in step 21.
- verify: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsx src/cli/index.ts agent --help` (expect: agent usage prints).
- done: `agent --help` works; TUI + bridge exported; typecheck clean.

## Implementation Units

### U0-bootstrap (steps 1-7) — SEQUENCE FIRST
Project manifest, tsconfig, vitest, dependency install/vetting, `ConfigurationError`, four-tier resolver, redaction, bin shim, issues file. Interface contracts other units rely on: `ConfigurationError` (src/config/config-error.ts), `resolveApiKey`/`getToolAgentDir` (src/config/profile-config.ts), `redactString` (src/util/redact.ts), the installed dependency set. **Must land before U1/U2/U3/U4.**

### U1-core-backend (steps 8-14) — depends on U0
Types, typed errors, credential store, registry, `IGeminiBackend`, GenAI client/citation renderer, `GenAiBackend`, factory. Interface contracts others rely on: `IGeminiBackend` + `makeBackend(profileName, flags)` (the sole Gemini path), the `src/core/types.ts` types, `CredentialStore`, `Registry`. **Must land before U2/U3/U4.**

### U2-cli (steps 15-21) — depends on U0, U1
The `gemini-nav` commander program and all command groups + query renderer. Consumes `makeBackend`, `CredentialStore`, `Registry`. Owns `src/cli/**` EXCEPT `src/cli/commands/agent.ts` (owned by U4) — wired via dynamic import so the units stay file-disjoint.

### U3-http-api (steps 22-26) — depends on U0, U1
The `gemini-nav-api` express-5 package (static-auth only). Consumes the same `IGeminiBackend`/`makeBackend` from U1 via relative import. Entirely under `API/` — disjoint from all other units.

### U4-agent-tui (steps 27-31) — depends on U0, U1
Agent config (8 providers), provider factories + registry, agent tools, graph/run/system-prompt/logging, TUI, and `src/cli/commands/agent.ts`. Consumes `makeBackend`/`IGeminiBackend`, `ConfigurationError`, `redactString`. U2 references `agent.ts` only via dynamic import, so no shared file with U2.

Parallelism: U2, U3, U4 may run in parallel after U0+U1 land. Their file sets are pairwise-disjoint (U4 owns the single `src/cli/commands/agent.ts` that U2 only dynamic-imports). The LangChain deps live in the root `package.json` written in U0 step 1, so U4 never edits a U0/U2 file.

## Risks & Mitigations
- **No git / greenfield, no codebase scan** → no staleness risk; but file paths were verified against the reference topology, not an existing project tree. Mitigation: all `files_to_create` are new; the only modified file is `project-functions.md` (created by this plan).
- **Dependency versions move weekly** (`@google/genai`, `vitest`, `langchain`, `@langchain/*`) → reference pins are informational. Mitigation: steps 2 and 22 re-vet every version with `npm view` + `npm audit` before pinning and log results in `Issues - Pending Items.md` (dependency-validation rule). Treat any HIGH+ advisory as a blocker.
- **`@langchain/ollama` availability/version** is assumed but not in the reference. Mitigation: vet in step 2; if unavailable, implement `ollama` via the OpenAI-wire client (`@langchain/openai` + `OLLAMA_HOST/v1`) and note the substitution in the issues file.
- **File-Search model id drift** (Open Question 1) → `gemini-2.5-flash` may not accept the `fileSearch` tool. Mitigation: make the model configurable; smoke-test at impl; fall back to `gemini-2.5-pro`.
- **Byte-offset citation slicing** is a correctness trap → mitigated by step 13 mandating UTF-8 `Buffer` slicing (never `string.slice`), per the SDK-schema research.
- **Upload returns an operation, not a Document** → mitigated by step 14 mandating poll-then-`documents.get` hydration.
- **Tool-conventions mandate**: the `~/.tool-agents/gemini-nav/` config folder and `docs/tools/*.md` MUST be produced via `/tool-conventions scaffold` / the `tool-doc-config-architect` subagent, NEVER hand-authored. Mitigation: no step writes those artifacts; they are an external prerequisite (see Verification).
- **Cross-unit import direction**: `API/` and `src/agent` both import `src/core`. Mitigation: U1 lands first; tsconfig `include`/`rootDir` in step 22 must encompass the shared core.

## Acceptance Criteria Mapping
| Criterion (refined request) | Step(s) |
|---|---|
| 1. Backend abstraction is the sole Gemini path | 12, 14 |
| 2. CLI: register key, list/view/create/delete store, upload/list/delete/replace doc, query | 5, 10, 16, 17, 18, 19 |
| 3. `query` prints answer + sources + citations + excerpts | 13, 19 |
| 4. Local registry persists/lists/refreshes/prunes stores | 11, 20 |
| 5. Missing config → `ConfigurationError` naming sources, no default | 4, 5, 13 (+ unit test in Verification) |
| 6. Secrets never logged/printed/plaintext-on-disk | 6, 10, 11, 16, 30 (+ redaction unit test) |
| 7. vitest passes & `tsc --noEmit` clean | all steps + Verification |
| 8. `npm audit` zero HIGH+, vetting logged | 2, 22 |
| 9. Tool docs + `~/.tool-agents/<name>/` via scaffolding path | external prerequisite (Verification) |
| 10. Selected higher-tier surfaces (API + Agent) met | 22-26 (API), 27-31 (Agent) |

## Deviation Rules for Executors
1. **Auto-fix bugs and blockers** discovered mid-step (compile errors, wrong imports, off-by-one) and document what you changed in your step report.
2. **Add missing security/correctness essentials** (input validation, secret redaction, no-fallback config guards) even if a step did not enumerate them, and document the addition.
3. **STOP and surface anything architectural** — a change to `IGeminiBackend`, the unit partition, the auth model, or the encryption scheme is not an executor decision; raise it.
4. **Log nice-to-haves instead of doing them.** When running SOLO, append them directly to `Issues - Pending Items.md`. When running as ONE OF SEVERAL PARALLEL agents, put them in your final report instead — parallel executors must NEVER edit `Issues - Pending Items.md` directly; the orchestrator appends them after the phase.
5. **Honor the no-fallback config rule absolutely** — never substitute a default for a missing required setting; raise `ConfigurationError`. Any sanctioned exception must be written to the project memory file before implementing.

## Verification
Overall checks proving the whole plan landed:
- Root typecheck: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx tsc --noEmit` → clean.
- API typecheck: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/API && npx tsc --noEmit` → clean.
- Unit tests: `cd /Users/giorgosmarinos/aiwork/agent-platform/gemini-search && npx vitest run` and `cd .../API && npx vitest run` → green. Required tests: a `ConfigurationError`-on-missing-config test (acceptance #5), a `redactString` secret-redaction test (acceptance #6), a `GenAiBackend` mapping test against a mocked `@google/genai` client, and a `static-auth` 401 test.
- CLI smoke: `npx tsx src/cli/index.ts --help` and `... agent --help` exit 0 and list all commands.
- Audit: `npm audit --omit=dev` (root and API) → zero HIGH-or-above advisories; vetting log present in `Issues - Pending Items.md`.
- External prerequisite (NOT an executor step): run `/tool-conventions scaffold gemini-nav` (and `gemini-nav-api`, `gemini-nav-agent`) to produce `docs/tools/<name>.md`, the concise CLAUDE.md "Tools" entries, and the `~/.tool-agents/gemini-nav/` config folder (dir 0700, `.env` 0600) with the authoritative 8-provider env-var matrix — satisfying acceptance #9.
