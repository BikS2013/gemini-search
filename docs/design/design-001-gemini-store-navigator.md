---
status: complete
design_number: 001
slug: gemini-store-navigator
request_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-gemini-store-navigator.md
plan_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/design/plan-001-gemini-store-navigator.md
investigation_file: /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/investigation-gemini-store-navigator.md
research_files:
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/gemini-file-search-sdk-schema.md
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/research/google-genai-sdk-version-availability.md
codebase_scan_file: null
based_on_commit: null
units_changed_from_plan: false
implementation_units:
  - name: U0-bootstrap
    plan_steps: [1, 2, 3, 4, 5, 6, 7]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/package.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/tsconfig.json
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/vitest.config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/bin/gemini-nav.mjs
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/config-error.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/config/profile-config.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/util/redact.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/Issues - Pending Items.md
    exposes:
      - ConfigurationError
      - resolveApiKey
      - getToolAgentDir
      - ensureToolAgentDir
      - redactString
    consumes: []
  - name: U1-core-backend
    plan_steps: [8, 9, 10, 11, 12, 13, 14]
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
    exposes:
      - IGeminiBackend
      - Page
      - StoreInfo
      - DocumentInfo
      - DocumentState
      - DocCustomMetadata
      - QuerySource
      - CitationSpan
      - QueryResult
      - ProfileEntry
      - CredentialData
      - RegistryEntry
      - RegistryData
      - CredentialStore
      - Registry
      - makeBackend
      - makeGenAiClient
      - renderInlineCitations
      - mapSources
      - FileTooLargeError
      - UnsupportedMimeTypeError
      - StoreLimitError
      - RateLimitError
      - UploadOperationError
    consumes:
      - ConfigurationError
      - getToolAgentDir
      - ensureToolAgentDir
      - resolveApiKey
  - name: U2-cli
    plan_steps: [15, 16, 17, 18, 19, 20, 21]
    files:
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/index.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/shared.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/profile-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/store-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/doc-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/query-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/commands/registry-ops.ts
      - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/cli/render/query-render.ts
    exposes:
      - registerGeminiNavCli
    consumes:
      - IGeminiBackend
      - makeBackend
      - CredentialStore
      - Registry
      - StoreInfo
      - DocumentInfo
      - QueryResult
      - renderInlineCitations
      - ConfigurationError
      - FileTooLargeError
      - UnsupportedMimeTypeError
      - StoreLimitError
      - RateLimitError
      - UploadOperationError
  - name: U3-http-api
    plan_steps: [22, 23, 24, 25, 26]
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
    exposes:
      - buildApp
      - staticAuthMiddleware
    consumes:
      - IGeminiBackend
      - makeBackend
      - StoreInfo
      - DocumentInfo
      - QueryResult
      - Page
      - ConfigurationError
  - name: U4-agent-tui
    plan_steps: [27, 28, 29, 30, 31]
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
    exposes:
      - registerAgentCommand
      - AgentConfig
      - ProviderName
      - buildModel
      - assembleTools
      - createAgentGraph
      - runAgent
    consumes:
      - IGeminiBackend
      - makeBackend
      - ConfigurationError
      - redactString
      - StoreInfo
      - DocumentInfo
      - QueryResult
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
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/errors.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/credential-store.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/registry.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/backend.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/genai-client.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/citation-render.ts
  - /Users/giorgosmarinos/aiwork/agent-platform/gemini-search/src/core/backend/genai-backend.ts
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
decisions: 9
created_at: 2026-06-20T00:00:00Z
---

# Design 001 — Gemini File Search Store Navigator

## Objective
This design is the implementation contract for `plan-001-gemini-store-navigator.md`: a fresh
standalone TypeScript/ESM project at `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search`
that mirrors the `storage-navigator` topology and exposes three surfaces — a `gemini-nav` CLI,
a `gemini-nav-api` Express 5 HTTP API (static-header auth only), and a LangGraph ReAct agent +
TUI — over a single `IGeminiBackend` abstraction backed by `@google/genai@^2.9.0`. It fixes the
shared interface surfaces (`IGeminiBackend`, the `src/core/types.ts` data shapes, `makeBackend`,
the credential store and registry) precisely enough that units U0–U4 can be built in parallel
after U0+U1 land. All five refined-request Open Questions and all three plan Open Questions are
resolved to binding answers and designed exactly as resolved.

## Architecture

### Component diagram (text)

```
                         ┌──────────────────────────────────────────────┐
   gemini-nav CLI (U2)   │  src/cli/  (commander program)               │
   ───────────────────►  │  profile / store / doc / query / registry    │
                         │  + render/query-render.ts                    │
                         └───────────────┬──────────────────────────────┘
                                         │  imports makeBackend / types
   gemini-nav-api (U3)   ┌───────────────▼──────────────────────────────┐
   ───────────────────►  │  API/  (express 5)                           │       ┌───────────────┐
   static-auth header    │  app.ts → staticAuth → routes/{stores,       │──────►│  src/core (U1)│
                         │  documents,query,health,openapi}             │       │               │
                         └───────────────┬──────────────────────────────┘       │ IGeminiBackend│
                                         │                                       │ GenAiBackend  │
   gemini-nav agent (U4) ┌───────────────▼──────────────────────────────┐       │ factory       │
   ───────────────────►  │  src/agent/ (LangGraph ReAct)                │──────►│ types         │
   one-shot / TUI REPL   │  providers(8) + tools(store/doc/query) +     │       │ credential-   │
                         │  graph/run + src/tui + cli/commands/agent.ts │       │  store        │
                         └───────────────┬──────────────────────────────┘       │ registry      │
                                         │                                       └───────┬───────┘
                                         │  all three surfaces reach Gemini ONLY through │
                                         │  IGeminiBackend (acceptance #1)               │
                                         ▼                                               ▼
                         ┌──────────────────────────────────┐         ┌────────────────────────────┐
                         │  @google/genai (GoogleGenAI)     │         │ ~/.tool-agents/gemini-nav/ │
                         │  fileSearchStores / documents /  │         │  credentials.json (AES-GCM)│
                         │  operations / models.generate    │         │  machine.key (0600)        │
                         └──────────────────────────────────┘         │  registry.json (plaintext) │
                                                                      │  .env (0600, agent providers)│
   config (U0): src/config/config-error.ts (ConfigurationError),     └────────────────────────────┘
   src/config/profile-config.ts (4-tier key resolver, NO fallback),
   src/config/agent-config.ts (U4: 8-provider loader), src/util/redact.ts
```

### Responsibilities and landing locations
The module topology mirrors `storage-navigator` 1:1 (investigation Recommendation §"Concrete
recommended module layout"), substituting `IGeminiBackend` for `IStorageBackend`:

- `src/config/` — `ConfigurationError` and the four-tier key resolver (port of the reference
  `src/config/agent-config.ts:22-37` error class and the file-wins dotenv precedence at
  `agent-config.ts:1-13`). No greenfield style is introduced; it is the reference's style.
- `src/util/redact.ts` — port of reference `src/util/redact.ts` with a Google-key pattern added.
- `src/core/` — types, typed errors, credential store (port of reference
  `src/core/credential-store.ts`, AES-256-GCM machine key at `credential-store.ts:38-62`),
  hybrid registry, and `src/core/backend/` (interface + `@google/genai` implementation +
  factory, mirroring reference `src/core/backend/factory.ts:6-14`).
- `src/cli/` + `src/cli/commands/` + `src/cli/render/` — commander program (mirrors reference
  `src/cli/index.ts` and `src/cli/commands/shared.ts`).
- `API/` — separate Express 5 sub-package mirroring the reference `API/` but stripped to
  `staticAuthMiddleware` (port of reference `API/src/auth/static-auth.ts`, verified verbatim).
- `src/agent/` + `src/tui/` — LangGraph ReAct providers/tools/graph and the interactive REPL
  (mirrors reference `src/agent/providers/registry.ts:12-19` and `src/tui/`).

There is no existing module to integrate with (greenfield, no codebase scan, no
`integration_directive`); all files are new.

## Data Models

No SQL database. Two on-disk JSON stores under `~/.tool-agents/gemini-nav/` (directory mode
`0700`), plus the agent provider `.env` (mode `0600`). Per the hybrid decision (refined-request
Open Question 4 → option a), the **live Gemini API is the source of truth**; local files are a
secrets vault and a refreshable metadata cache.

### `credentials.json` — encrypted secrets vault (AES-256-GCM, machine key)
Encrypted at rest with the ported `credential-store.ts` scheme (random 32-byte `machine.key`,
mode `0600`; `aes-256-gcm` with per-record `iv`+`tag`). Holds the profile registry and, for
profiles whose `keyMode === 'stored'`, the encrypted per-profile Gemini API key.

```
CredentialData {
  profiles: ProfileEntry[]                 // see types
  // per-profile encrypted key material stored alongside each entry (EncryptedPayload)
}
```

Project rule (no plaintext secrets, FR-NFR-5): the API key is the only secret; it is never
written unencrypted, never logged, never returned except via `CredentialStore.getApiKey(name)`.

### `registry.json` — plaintext non-secret metadata cache (hybrid)
Holds last-seen store metadata so users can "keep track of" stores across sessions without a
live call. Never contains secrets.

```
RegistryData { entries: RegistryEntry[] }
RegistryEntry {
  apiName: string                  // "fileSearchStores/abc123"
  displayName?: string
  profile: string                  // which profile owns/saw this store
  createTime?: string
  updateTime?: string
  sizeBytes?: number               // last-seen
  activeDocumentsCount?: number
  pendingDocumentsCount?: number
  failedDocumentsCount?: number
  documentCount?: number
  lastRefreshedAt: string          // ISO 8601 of last reconcile
}
```

### Reconciliation policy (refresh)
`Registry.reconcile(profile, liveStores)` (called by `registry-refresh` and as a side effect of
`stores`) is the single reconciliation point:
1. For each live `StoreInfo` returned by `backend.listStores`, `upsert` a `RegistryEntry`
   keyed by `apiName`, copying counters/`sizeBytes`/timestamps and setting
   `lastRefreshedAt = now`.
2. Entries for the profile that are **absent** from the live list are left in place but are
   reported as stale by `registry-list` and are removable via `registry-prune` (confirmation-
   gated). Pruning never deletes the live store, only the cache row.
3. Counters are taken straight from the `FileSearchStore` object (research §Part 4: counts and
   `sizeBytes` are store-level, no documents-list pass needed for the summary numbers).

These are singular entity names at the data-model level; no relational link tables apply.

## API & Interface Contracts

This section is the **single source of truth** for every shared signature. Units restate names
only by reference, never re-declare signatures. All paths are TypeScript/ESM with `.js` import
specifiers (NodeNext), matching the reference tsconfig.

### Core data types — `src/core/types.ts` (U1 exposes)
Verbatim from the SDK-schema research §"Ready-to-drop-in backend TypeScript interfaces".
Int64-as-string SDK fields (`sizeBytes`, `*DocumentsCount`) are parsed to `number` at the
backend boundary.

```typescript
export interface StoreInfo {
  apiName: string;                 // FileSearchStore.name
  displayName?: string;
  createTime?: string;
  updateTime?: string;
  sizeBytes?: number;              // Number(FileSearchStore.sizeBytes)
  activeDocumentsCount?: number;
  pendingDocumentsCount?: number;
  failedDocumentsCount?: number;
  documentCount?: number;          // active + pending + failed (computed)
  embeddingModel?: string;
}

export type DocumentState =
  | 'STATE_UNSPECIFIED' | 'STATE_PENDING' | 'STATE_ACTIVE' | 'STATE_FAILED' | string;

export interface DocCustomMetadata {
  key: string; stringValue?: string; numericValue?: number; stringListValue?: string[];
}

export interface DocumentInfo {
  apiName: string;                 // Document.name
  displayName?: string;
  state: DocumentState;            // raw SDK value (e.g. 'STATE_ACTIVE')
  sizeBytes?: number;
  mimeType?: string;
  createTime?: string;
  updateTime?: string;
  customMetadata?: DocCustomMetadata[];
}

export interface QuerySource {
  title?: string;                  // retrievedContext.title
  excerpt?: string;                // retrievedContext.text
  storeName?: string;              // retrievedContext.fileSearchStore (multi-store attribution)
  uri?: string;
  pageNumber?: number;
  mediaId?: string;
  customMetadata?: Array<{ key?: string; stringValue?: string; numericValue?: number }>;
}

export interface CitationSpan {
  startIndex?: number;             // segment.startIndex (BYTE offset)
  endIndex?: number;               // segment.endIndex (BYTE offset)
  text?: string;
  chunkIndices: number[];          // groundingChunkIndices -> indices into sources[]
  confidenceScores?: number[];
}

export interface QueryResult {
  answer: string;                  // response.text
  sources: QuerySource[];
  citations: CitationSpan[];
  finishReason?: string;
  raw?: unknown;                   // full groundingMetadata subtree (for --raw-json)
}

export type ProfileKeyMode = 'stored' | 'env';
export interface ProfileEntry { name: string; keyMode: ProfileKeyMode; addedAt: string; }
export interface CredentialData { profiles: ProfileEntry[]; }

export interface RegistryEntry {
  apiName: string; displayName?: string; profile: string;
  createTime?: string; updateTime?: string; sizeBytes?: number;
  activeDocumentsCount?: number; pendingDocumentsCount?: number;
  failedDocumentsCount?: number; documentCount?: number; lastRefreshedAt: string;
}
export interface RegistryData { entries: RegistryEntry[]; }
```

### Backend interface — `src/core/backend/backend.ts` (U1 exposes, U2/U3/U4 consume)
The sole path to Gemini (acceptance #1). Verbatim from the investigation sketch, typed against
`src/core/types.ts`.

```typescript
export type Page<T> = { items: T[]; nextPageToken: string | null };

export interface ListOpts { pageSize?: number; pageToken?: string; }
export interface UploadOpts { displayName?: string; mimeType?: string; waitActive?: boolean; }
export interface QueryOpts { model?: string; metadataFilter?: string; }

export interface IGeminiBackend {
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

Binding behavioral contract (resolved Open Questions, BINDING):
- `query` default model = **`gemini-3.1-pro-preview`** (configurable via `opts.model`; CLI
  `--model`). Documented known-good fallback: `gemini-2.5-pro`. The backend builds a
  **single-tool** request `tools: [{ fileSearch: { fileSearchStoreNames, metadataFilter? } }]`
  (no other tools — model constraint, version research §3).
- `uploadDocument` returns after the upload operation reports `done` + exactly one
  `documents.get(operation.response.documentName)` hydration (typically `STATE_PENDING`).
  When `opts.waitActive === true`, it additionally polls `documents.get` until
  `STATE_ACTIVE`/`STATE_FAILED`.
- `replaceDocument` = `deleteDocument` then `uploadDocument` (documents are immutable).

### Backend factory — `src/core/backend/factory.ts` (U1 exposes; U2/U3/U4 consume)
```typescript
export interface BackendFlags { key?: string; }   // CLI --key override (highest precedence)
export function makeBackend(profileName: string, flags?: BackendFlags): IGeminiBackend;
```
Resolution order inside `makeBackend`: if the profile's `keyMode === 'stored'`, decrypt via
`CredentialStore.getApiKey(profileName)`; otherwise resolve via `resolveApiKey(profileName, flags)`
(four-tier chain). The resolved key is passed explicitly to `makeGenAiClient(apiKey)` — never via
SDK env precedence. Missing key throws `ConfigurationError`.

### GenAI client + citation renderer — `src/core/backend/genai-client.ts`, `citation-render.ts` (U1)
```typescript
// genai-client.ts
export function makeGenAiClient(apiKey: string): GoogleGenAI;   // throws ConfigurationError on empty

// citation-render.ts — BYTE-accurate (research §"Worked example"); operates on a UTF-8 Buffer
export function renderInlineCitations(text: string, supports: GroundingSupportLike[]): string;
export function mapSources(chunks: GroundingChunkLike[]): QuerySource[];
export function mapCitations(supports: GroundingSupportLike[]): CitationSpan[];
```
`renderInlineCitations` MUST slice on `Buffer.from(text,'utf-8')` in descending `endIndex`
order with 1-based `[n]` markers — never `string.slice` (byte-offset pitfall).

### Credential store — `src/core/credential-store.ts` (U1 exposes; U2/U4 consume)
```typescript
export class CredentialStore {
  listProfiles(): ProfileEntry[];
  getProfile(name: string): ProfileEntry | undefined;
  addProfile(name: string, apiKey: string | null, keyMode: ProfileKeyMode): void;
  removeProfile(name: string): void;
  getApiKey(name: string): string;   // decrypts; throws if keyMode==='env' (caller uses resolver)
}
```

### Registry — `src/core/registry.ts` (U1 exposes; U2 consumes)
```typescript
export class Registry {
  list(): RegistryEntry[];
  get(apiName: string): RegistryEntry | undefined;
  upsert(entry: RegistryEntry): void;
  remove(apiName: string): void;
  reconcile(profile: string, liveStores: StoreInfo[]): void;
}
```

### Typed backend errors — `src/core/errors.ts` (U1 exposes; U2/U3/U4 consume)
`FileTooLargeError` (>100 MB), `UnsupportedMimeTypeError` (audio/video), `StoreLimitError`
(store-count soft cap), `RateLimitError` (HTTP 429; carries `retryAfterMs?`), `UploadOperationError`
(operation.error set). Each extends `Error` with a stable `code` string for surface rendering.

### Config — `src/config/` (U0 exposes; all consume)
```typescript
// config-error.ts
export class ConfigurationError extends Error {
  readonly code = 'CONFIG_MISSING';
  readonly missingSetting: string;
  readonly checkedSources: string[];
  constructor(missingSetting: string, checkedSources: string[], detail?: string);
}
// profile-config.ts
export function resolveApiKey(profileName: string, flags?: { key?: string }): string; // throws ConfigurationError
export function getToolAgentDir(): string;     // ~/.tool-agents/gemini-nav
export function ensureToolAgentDir(): string;  // mkdir mode 0700, returns path
// util/redact.ts
export function redactString(input: string): string;
```
`resolveApiKey` precedence (refined-request §config): **CLI flag > shell env > `~/.tool-agents/gemini-nav/.env` > local `.env`** as loaded file-wins via dotenv, accepting both `GOOGLE_API_KEY`
and `GEMINI_API_KEY`; missing → `ConfigurationError('GEMINI_API_KEY'|'GOOGLE_API_KEY', [checked sources])`.
No fallback default ever.

### CLI program — `src/cli/index.ts` (U2 exposes)
```typescript
export function registerGeminiNavCli(): Command;   // commander program 'gemini-nav'
```
Registers all command groups (steps 16–20) and a lazy `agent` subcommand via dynamic
`import('./commands/agent.js')` so U2 never statically depends on the U4-owned file.

### Agent command entry — `src/cli/commands/agent.ts` (U4 exposes; U2 dynamic-imports)
```typescript
export function registerAgentCommand(program: Command): void;
```
This is the one file U4 owns under `src/cli/`; U2 only reaches it by dynamic import, keeping the
unit file sets disjoint.

### HTTP API ↔ backend mapping — `API/` (U3 exposes `buildApp`; consumes `makeBackend`/types)
```typescript
export interface BuildAppDeps { config: ApiConfig; backendFactory: (profile: string) => IGeminiBackend; }
export function buildApp(deps: BuildAppDeps): import('express').Express;
export function staticAuthMiddleware(allowedValues: string[], headerName: string): RequestHandler;
```
Endpoint → backend-op map (all behind `staticAuthMiddleware`, default header `X-Gemini-Nav-Auth`):

| Method & path | Backend op | Notes |
|---|---|---|
| `GET /health` | — | liveness; before auth |
| `GET /openapi` (+ swagger-ui) | — | served from `openapi.yaml`; before auth |
| `GET /stores?pageSize&pageToken` | `listStores` | `{ items, nextPageToken }` |
| `GET /stores/:name` | `getStore` | `:name` is url-encoded apiName or displayName |
| `POST /stores` | `createStore` | body `{ displayName, embeddingModel? }` |
| `DELETE /stores/:name?force=` | `deleteStore` | 204 |
| `GET /stores/:name/documents?pageSize&pageToken` | `listDocuments` | paginated |
| `GET /stores/:name/documents/:doc` | `getDocument` | |
| `POST /stores/:name/documents` | `uploadDocument` | multipart or `{ filePath }`; `?waitActive=` |
| `DELETE /stores/:name/documents/:doc?force=` | `deleteDocument` | 204 |
| `POST /stores/:name/query` | `query` | body `{ prompt, model?, metadataFilter?, storeNames? }`; `?raw=` returns `groundingMetadata` |

Errors are mapped by `errorMiddleware`: `ConfigurationError`→500 `CONFIG_MISSING`,
`RateLimitError`→429, `FileTooLargeError`→413 `PAYLOAD_TOO_LARGE` (RECONCILED 2026-06-20
code review: 413 is the canonical HTTP status for an over-size payload; the original 422
was imprecise), `UnsupportedMimeTypeError`→422 `UNPROCESSABLE_ENTITY`, `StoreLimitError`→409
`CONFLICT`, `UploadOperationError`→502 `UPSTREAM_ERROR`, `STATIC_AUTH_FAILED`→401.

### Agent surface — `src/agent/` (U4 exposes)
```typescript
// providers/registry.ts
export const PROVIDERS: Readonly<Record<ProviderName, ProviderFactory>>;  // exactly 8 entries
export function getProvider(name: string): ProviderFactory;
export function buildModel(cfg: AgentConfig): BaseChatModel;
// tools/registry.ts
// RECONCILED 2026-06-20 (code review): the implemented signature takes the full
// AgentConfig instead of a bare `allow: string[]`, because the catalog build needs
// three cfg fields together — `cfg.toolsAllowlist` (the allow list), `cfg.allowMutations`
// (the mutation gate), and `cfg.perToolBudgetBytes` (per-tool truncation). Passing the
// whole cfg is strictly more capable than a string[] and keeps the call site honest.
export function assembleTools(backend: IGeminiBackend, cfg: AgentConfig): StructuredTool[];
// graph.ts / run.ts
export function createAgentGraph(model: BaseChatModel, tools: StructuredTool[], systemPrompt: string): CompiledGraph;
export function runAgent(opts: RunAgentOpts): Promise<AgentResult>;   // one-shot + interactive
```
`ProviderName` (config/agent-config.ts) = the 8 mandated providers: `openai`, `anthropic`,
`google`, `azure-openai`, `azure-ai-inference`, `azure-anthropic`, `ollama`, `litellm`.

## Module Organization
All files are new (greenfield). Two `tsconfig` roots: the project root (NodeNext, ES2022,
`strict`, `.js` import extensions, `outDir dist`, mirroring reference `tsconfig.json`) and the
`API/` sub-package whose `include`/`rootDir` must encompass the shared `../src/core/**` so the
API imports `IGeminiBackend`/`makeBackend`/types by relative path. The `files_to_create`
frontmatter is the authoritative per-file list; it equals the union of the five units' `files`
plus `src/config/agent-config.ts` (U4) and `project-functions.md` (modify).

## Error Handling Strategy
- **No configuration fallbacks (project rule, FR-NFR-2).** Any missing required setting raises
  `ConfigurationError(missingSetting, checkedSources)` naming every source checked — never a
  default. Applies to: profile key resolution (`resolveApiKey`), `makeGenAiClient` (empty key),
  API `config.ts` (missing port/auth), agent provider factories (missing provider config).
- **Quota/limit pitfalls keyed off HTTP 429 (version research §4).** The backend wraps
  data-plane calls with exponential backoff + jitter on HTTP 429, surfacing `RateLimitError`
  (with `retryAfterMs` when present) after exhausting retries. Rate numbers are NOT hardcoded;
  429 is the canonical signal.
- **Pre-upload validation:** reject files >100 MB (`FileTooLargeError`) and audio/video MIME
  types (`UnsupportedMimeTypeError`) before calling the API; map store-count failures on
  `createStore` to `StoreLimitError`.
- **Upload operations:** poll `operations.get` until `done`; if `operation.error` is set, throw
  `UploadOperationError`; never read `operation.response` before `done`.
- **Citation robustness:** optional-chain every grounding level; missing `groundingMetadata`
  → "no sources, answer only"; check `finishReason` before assuming an answer exists.
- **Secret safety (FR-NFR-5):** all agent log lines pass through `redactString`; keys never
  printed by CLI commands; only `CredentialStore.getApiKey` returns plaintext.
- **CLI exit codes:** `ConfigurationError` → exit 3; other errors → exit 2 (reference `shared.ts`).

## Implementation Units

Units U0–U4 are kept exactly as the plan partitioned them; file sets are pairwise disjoint and
every plan step (1–31) maps to exactly one unit. `units_changed_from_plan: false`.

### U0-bootstrap (plan steps 1–7) — SEQUENCE FIRST
Project manifest/tsconfig/vitest, dependency install + vetting log, `bin/gemini-nav.mjs`,
`ConfigurationError`, the four-tier key resolver, `redactString`, `Issues - Pending Items.md`.
- **Exposes:** `ConfigurationError`, `resolveApiKey`, `getToolAgentDir`, `ensureToolAgentDir`,
  `redactString` (signatures above).
- **Consumes:** nothing.
- Must land before U1–U4. Root `package.json` (written here) carries the LangChain cluster so
  U4 never edits a U0 file.

### U1-core-backend (plan steps 8–14) — depends on U0
Core types, typed errors, credential store, hybrid registry, `IGeminiBackend`, GenAI client +
citation renderer, `GenAiBackend`, factory.
- **Exposes:** `IGeminiBackend`, `Page`, all `src/core/types.ts` types, `CredentialStore`,
  `Registry`, `makeBackend`, `makeGenAiClient`, `renderInlineCitations`/`mapSources`/`mapCitations`,
  the five typed errors (signatures above).
- **Consumes:** `ConfigurationError`, `resolveApiKey`, `getToolAgentDir`, `ensureToolAgentDir`.
- Must land before U2/U3/U4.

### U2-cli (plan steps 15–21) — depends on U0, U1
The `gemini-nav` commander program, all command groups, query renderer. Owns all `src/cli/**`
**except** `src/cli/commands/agent.ts` (U4), wired via dynamic import.
- **Exposes:** `registerGeminiNavCli`.
- **Consumes:** `makeBackend`, `IGeminiBackend`, `CredentialStore`, `Registry`,
  `StoreInfo`/`DocumentInfo`/`QueryResult`, `renderInlineCitations`, `ConfigurationError`, the
  typed errors.

### U3-http-api (plan steps 22–26) — depends on U0, U1
The `gemini-nav-api` Express 5 package, static-auth only, entirely under `API/`.
- **Exposes:** `buildApp`, `staticAuthMiddleware`.
- **Consumes:** `makeBackend`, `IGeminiBackend`, `StoreInfo`/`DocumentInfo`/`QueryResult`/`Page`,
  `ConfigurationError`.

### U4-agent-tui (plan steps 27–31) — depends on U0, U1
Agent config (8 providers), provider factories + registry, agent tools, graph/run/system-prompt/
logging, TUI, and `src/cli/commands/agent.ts`.
- **Exposes:** `registerAgentCommand`, `AgentConfig`, `ProviderName`, `buildModel`,
  `assembleTools`, `createAgentGraph`, `runAgent`.
- **Consumes:** `makeBackend`/`IGeminiBackend`, `ConfigurationError`, `redactString`,
  `StoreInfo`/`DocumentInfo`/`QueryResult`.
- Mutating tools (store-delete, doc-upload/delete/replace) are gated through `confirmDestructive`
  (TUI bridge); provider precedence: CLI flag > env > `~/.tool-agents/gemini-nav/.env` > local
  `.env`.

**Parallelism:** U2, U3, U4 may run in parallel once U0+U1 land. The single `src/cli/commands/
agent.ts` is owned solely by U4 and reached by U2 only via dynamic import — no shared file.

## Design Decisions
1. **Single `IGeminiBackend` (vs. three split interfaces).** Mirrors the reference's
   `IStorageBackend` and satisfies acceptance #1 (sole Gemini path). Rejected: per-noun split
   (investigation B2) — adds ceremony with no payoff at MVP scope.
2. **`@google/genai@^2.9.0` as the sole data-plane SDK.** Officially supported, File-Search-
   capable, proven in prior art. Rejected: raw REST (A2, re-derives solved problems) and
   `@langchain/google-genai` for the data plane (A3, cannot do store/document CRUD).
3. **Split store: encrypted `credentials.json` + plaintext `registry.json`.** Encrypts only
   secrets; keeps non-secret cache cheap to read and safe to inspect. Rejected: single encrypted
   file (C2, over-protects) and remote-only (C3, contradicts the locked hybrid decision).
4. **Explicit `{ apiKey }` client construction.** Bypasses the `GOOGLE_API_KEY` vs
   `GEMINI_API_KEY` env-precedence quirk and honors the no-fallback rule deterministically.
   Rejected: the skill's temporary-unset-env hack.
5. **Byte-accurate inline citation rendering on a UTF-8 Buffer.** `segment.start/endIndex` are
   byte offsets; `string.slice` corrupts multi-byte text. Rejected: character-offset slicing.
6. **Upload returns at `STATE_PENDING` (op `done` + one `documents.get`), opt-in `--wait-active`.**
   Resolved Open Question 2 (binding). Trades latency for immediate queryability; the flag lets
   callers block. Rejected: always blocking until `STATE_ACTIVE`.
7. **`query --json` emits normalized `QueryResult`; `--raw-json` emits raw `groundingMetadata`.**
   Resolved Open Question 3 (binding). Rejected: raw-only or normalized-only.
8. **Static-header auth only for the HTTP API.** Resolved refined-request OQ3 → option a. Ports
   `staticAuthMiddleware` verbatim; drops the entire OIDC/RBAC subsystem and `azure.*` config.
   Rejected: toggleable auth / full OIDC+RBAC.
9. **8 LLM providers via the reference registry pattern (additive 6→8).** Adds `ollama`
   (`OLLAMA_HOST`), `litellm` (`LITELLM_*`), `azure-ai-inference` (`AZURE_AI_INFERENCE_*`) to the
   reference's set, renaming `gemini`→`google` and dropping `local-openai` into `litellm`.
   Rejected: hand-rolled agent loop (investigation D2).

## Decisions Requiring User Review

### Resolutions (resolved by user at Phase 5 design-review gate, 2026-06-20) — BINDING
1. **Default query model** → `gemini-3.1-pro-preview` (configurable; `gemini-2.5-pro` is the smoke-tested fallback). Confirmed by the user knowing it is a preview id.
2. **HTTP API static-auth gate** → **OFF by default (opt-in)**. The API runs open on localhost; `staticAuthMiddleware` is wired in but only ENFORCES when an auth secret is configured (via `GEMINI_NAV_API_AUTH_SECRET` env / CLI flag / `~/.tool-agents/gemini-nav/.env`). With no secret configured the gate is a pass-through (do NOT raise ConfigurationError for a missing secret here — absence means "auth disabled", which is the documented local-run posture, mirroring storage-navigator's optional-auth behavior). Header name remains `X-Gemini-Nav-Auth` when active. U3 must implement this opt-in semantics: build the allowed-values list from the configured secret(s); if empty, skip the middleware (or install a no-op) and log that auth is disabled.
1. **Default query model `gemini-3.1-pro-preview` is a preview id.** Resolved (binding) by the
   user at the Phase-4 gate, but the version research flags that File-Search-capable model ids
   drift and this preview may be unavailable in a given API tier. The design ships it as the
   configurable default with `gemini-2.5-pro` as the documented fallback and a smoke test at
   implementation. Confirm this remains the intended default at the design-review gate.
2. **Default static-auth header name `X-Gemini-Nav-Auth`.** Chosen to mirror the reference's
   convention; the gate is a pass-through when no allowed values are configured (local-run).
   Confirm the header name and whether the gate should be enabled by default for local runs.

## Risks
- **No git repo / greenfield, no codebase scan** → no scan-staleness risk; all paths are new and
  were verified against the reference topology (reference files confirmed to exist:
  `src/config/agent-config.ts`, `src/core/credential-store.ts`, `API/src/auth/static-auth.ts`,
  `src/agent/providers/registry.ts`, `src/core/backend/factory.ts`). Mitigation: none needed.
- **Dependency versions move weekly** (`@google/genai`, `vitest`, `langchain`/`@langchain/*`) →
  reference/research pins are informational. Mitigation: plan steps 2 and 22 re-vet every version
  with `npm view` + `npm audit` and log results in `Issues - Pending Items.md`; treat any HIGH+
  advisory as a blocker.
- **`@langchain/ollama` availability** is assumed. Mitigation: if unavailable, implement `ollama`
  via the OpenAI-wire client (`@langchain/openai` + `OLLAMA_HOST/v1`) and log the substitution.
- **Preview model id may be rejected by `fileSearch`** (Decision-review #1). Mitigation:
  configurable default + `gemini-2.5-pro` fallback + implementation-time smoke test.
- **Cross-unit import direction:** `API/` and `src/agent` both import `src/core`. Mitigation: U1
  lands before U2/U3/U4; the `API/tsconfig.json` `include`/`rootDir` must encompass `../src/core`.
- **Tool-conventions mandate:** the `~/.tool-agents/gemini-nav/` config folder and
  `docs/tools/*.md` MUST be produced via `/tool-conventions scaffold` / the
  `tool-doc-config-architect` subagent, never hand-authored. No unit writes those artifacts; they
  are an external prerequisite for acceptance #9.
</content>
</invoke>
