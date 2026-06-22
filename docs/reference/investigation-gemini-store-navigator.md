# Investigation: Gemini File Search Store Navigator

## Executive Summary

This investigation establishes the concrete technical approach for building a **fresh,
standalone TypeScript/ESM "Gemini File Search Store Navigator"** that mirrors the
`storage-navigator` project's "multiple surfaces over one backend abstraction"
architecture, scoped to the three locked surfaces (CLI + HTTP API + Agent/TUI). All five
scope decisions are already resolved in the refined request and are NOT re-opened here.

The recommendation is to **replicate storage-navigator's module topology almost
1:1**, substituting an `IGeminiBackend` abstraction (stores / documents / query) for
`IStorageBackend` (containers / blobs / shares). The Gemini integration is reached
exclusively through the official **`@google/genai` JS SDK** (the same SDK the existing
`manage-gemini-file-search` skill already uses successfully), wrapped behind a single
backend interface. The local "keep-track" requirement is met with a **JSON registry file
under `~/.tool-agents/gemini-nav/`**, encrypted-at-rest with the same AES-256-GCM
machine-key pattern as storage-navigator's `credential-store.ts` (for the per-profile API
keys), plus a separate plaintext registry cache for non-secret store metadata. The Agent
surface reuses storage-navigator's **LangChain + LangGraph** stack verbatim, expanded
from 6 to the 8 provider backends this project's CLAUDE.md mandates. The HTTP API reuses
storage-navigator's **Express 5** layout but keeps only its `staticAuthMiddleware`
(static-header/API-key gate), dropping the OIDC/RBAC subsystem.

The single area where reachable documentation leaves an implementation-level gap is the
**exact JS-SDK field shape of the File Search query response** (the grounding-metadata /
citation object: `groundingChunks[].retrievedContext`, `groundingSupports`, document-level
metadata fields). This is flagged for a Phase 3b technical-research deep dive because the
`query` renderer (FR-CLI-3 / FR-BE-4) depends on it field-by-field.

## Context

**What is being investigated:** the HOW for a greenfield build whose WHAT, scope, and five
key decisions are already locked. Specifically: which Gemini SDK/client to use; how to
mirror `IStorageBackend` as `IGeminiBackend`; how to structure the local hybrid registry;
how to layer config; what the Agent provider stack should be; and how to structure a
lightweight Express API.

**Driving requirements / constraints (from the refined request):**
- Surfaces: **CLI (MVP floor) + HTTP API + Agent/TUI**. No Electron, no macOS packaging.
- **Fresh standalone TypeScript ESM project**, reusing the `manage-gemini-file-search`
  skill's API knowledge but owning its own abstraction.
- HTTP API auth: **simple static-header / API-key gate, local-run only**.
- Store tracking: **hybrid** — local registry cache + live Gemini API refresh.
- **Multi-account named profiles**, each with its own Gemini API key.
- No-fallback config rule; four-tier resolution chain; vendor-canonical env vars; secrets
  never logged or stored in plaintext; tool docs + `~/.tool-agents/` folder via the
  mandatory scaffolding path.

**Source artifacts read:**
- Refined request: `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-gemini-store-navigator.md`
- Reference project: `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/storage-navigator-ref/` (backend interface, credential store, CLI index, agent provider registry, agent config loader, API app/config/static-auth, both `package.json` files).
- Prior art: `manage-gemini-file-search` skill at `/Users/giorgosmarinos/claude-workdocs/.claude/skills/manage-gemini-file-search/SKILL.md`.

This investigation is largely an **architecture-mapping** exercise (the reference design is
the prescribed template), plus a **focused API-surface confirmation** for Gemini File Search.

## Options Identified

The five locked decisions remove most "which surface / which auth / remote-vs-local"
branching. The genuine remaining choices are: (A) the Gemini client library, (B) the
backend-abstraction granularity, (C) the local-registry storage format, and (D) the Agent
provider stack. Options are framed per decision.

### Decision A — Gemini client library

#### Option A1: Official `@google/genai` JS SDK (RECOMMENDED)
- **Description**: Use Google's official `@google/genai` npm package. It exposes
  `ai.fileSearchStores.{create,list,get,delete}`, `ai.fileSearchStores.uploadToFileSearchStore`,
  `ai.fileSearchStores.documents.{list,get,delete}`, `ai.operations.get` (upload polling), and
  `ai.models.generateContent` with the `fileSearch` tool. This is exactly what the existing
  skill's working tools (`create-store.ts`, `query-store.ts`, etc.) already use.
- **Strengths**: Officially supported and versioned; File Search is a first-class surface;
  proven working in the reuse-anchor skill; handles operation polling, pagination
  (`pager.page` / `hasNextPage()`), and the `fileSearch` tool wiring; one dependency.
- **Weaknesses**: File Search is an actively evolving area, so SDK types for grounding
  metadata may lag the REST surface; the `GOOGLE_API_KEY` vs `GEMINI_API_KEY` precedence
  quirk must be handled (the skill documents the workaround).
- **Effort/Complexity**: Low — the integration recipe already exists in the skill.
- **Risk**: Low.
- **Best suited when**: A TypeScript-native, officially-supported path exists and the goal
  is to reuse proven integration knowledge — exactly this case.

#### Option A2: Raw REST via `fetch` against `generativelanguage.googleapis.com`
- **Description**: Call the File Search REST endpoints directly (no SDK).
- **Strengths**: Zero SDK coupling; full control over request/response shape; can read
  fields the SDK types haven't surfaced yet.
- **Weaknesses**: Must hand-roll auth, pagination, multipart upload, and long-running
  operation polling; re-derives everything the skill already solved; more code to test and
  maintain; brittle against API changes.
- **Effort/Complexity**: High.
- **Risk**: Medium-High.
- **Best suited when**: The SDK is missing a needed capability — not the case here.

#### Option A3: `@langchain/google-genai` for the data plane
- **Description**: Use the LangChain Google wrapper (already a storage-navigator dep) for
  store/document/query operations too.
- **Strengths**: One library for both agent and data plane.
- **Weaknesses**: LangChain's Google wrapper targets chat/generation, **not** File Search
  store/document CRUD; it cannot create stores or list documents. Wrong tool for the data
  plane.
- **Effort/Complexity**: N/A (insufficient capability).
- **Risk**: High (capability gap).
- **Best suited when**: Only for the Agent surface's LLM reasoning — where it IS the right
  choice (see Decision D), but never for the store/document/query data plane.

### Decision B — Backend abstraction granularity

#### Option B1: Single `IGeminiBackend` interface, stores+documents+query (RECOMMENDED)
- **Description**: One TypeScript interface mirroring `IStorageBackend`, covering all three
  noun groups: store ops, document ops, query op. A `GenAiBackend` implementation wraps
  `@google/genai`; a factory (`makeBackend(profile)`) instantiates it from a resolved
  profile, mirroring `src/core/backend/factory.ts`.
- **Strengths**: Exactly mirrors the reference; satisfies acceptance criterion #1 (single
  path to Gemini, no surface imports the SDK directly); keeps CLI/API/Agent symmetric.
- **Weaknesses**: One interface spans three concerns — acceptable, as storage-navigator's
  `IStorageBackend` already spans containers+blobs+shares.
- **Effort/Complexity**: Low.
- **Risk**: Low.
- **Best suited when**: Mirroring a proven single-backend-interface design — this case.

#### Option B2: Three separate interfaces (IStoreBackend / IDocumentBackend / IQueryBackend)
- **Description**: Split by noun.
- **Strengths**: Finer separation; smaller surfaces per interface.
- **Weaknesses**: Diverges from the reference; more wiring; the three concerns share one
  client and one profile, so the split adds ceremony without payoff at MVP scope.
- **Effort/Complexity**: Medium.
- **Risk**: Low.
- **Best suited when**: Multiple independent backend implementations per noun are
  expected — not foreseen here.

### Decision C — Local registry storage format (hybrid model)

#### Option C1: Split store — encrypted secrets file + plaintext metadata-cache file (RECOMMENDED)
- **Description**: Two files under `~/.tool-agents/gemini-nav/`:
  (1) `credentials.json` — AES-256-GCM-encrypted (machine-key, exact pattern from
  `credential-store.ts`) holding per-profile API keys and the profile registry;
  (2) `registry.json` — plaintext cache of **non-secret** store metadata (apiName,
  displayName, createTime, last-seen documentCount/sizeBytes, lastRefreshedAt). Live Gemini
  API is the source of truth; the cache is refreshable on demand and never authoritative
  for secrets.
- **Strengths**: Secrets are encrypted-at-rest (FR-REG-3, FR-NFR-5); non-secret cache is
  cheap to read/inspect and safe to commit-diff; cleanly separates "what must be protected"
  from "what is just a convenience cache"; matches the hybrid decision exactly.
- **Weaknesses**: Two files to keep coherent (mitigated: secrets file owns profiles,
  metadata file owns cache; no overlap).
- **Effort/Complexity**: Low — `credential-store.ts` is directly portable.
- **Risk**: Low.
- **Best suited when**: Secrets and cacheable metadata coexist — this case.

#### Option C2: Single encrypted file for everything
- **Description**: Encrypt both secrets and the metadata cache in one file.
- **Strengths**: One file; uniform handling.
- **Weaknesses**: Encrypting non-secret cache data adds friction (every read decrypts);
  harder to inspect/debug the cache; over-protects data that needs no protection.
- **Effort/Complexity**: Low.
- **Risk**: Low.
- **Best suited when**: Everything is sensitive — not the case (store metadata is not).

#### Option C3: Remote-only, no local cache
- **Description**: Always live-call the API; persist only profiles+keys.
- **Strengths**: No cache-coherence concern; simplest data model.
- **Weaknesses**: **Contradicts the locked hybrid decision** ("keep track of stores… their
  metadata" across sessions). Rejected on scope grounds.
- **Effort/Complexity**: Low.
- **Risk**: N/A — out of scope.
- **Best suited when**: Never, given the locked decision.

### Decision D — Agent provider stack

#### Option D1: Reuse storage-navigator's LangChain + LangGraph stack, extended to 8 providers (RECOMMENDED)
- **Description**: Adopt `@langchain/core`, `@langchain/langgraph`, `@langchain/openai`,
  `@langchain/anthropic`, `@langchain/google-genai`, plus the provider-factory registry
  pattern (`src/agent/providers/registry.ts`) and the ReAct graph. Expand from
  storage-navigator's 6 providers to the **8 mandated** by this project's CLAUDE.md.
- **Strengths**: Proven pattern; the provider-precedence config layering and
  `ConfigurationError` discipline port directly; LangGraph ReAct + tool-wrapping is exactly
  the agent shape required (FR-AGENT-1); satisfies the multi-provider mandate.
- **Weaknesses**: Must reconcile 6 → 8 providers (see "reconciliation" below); LangChain
  major versions move fast (v1.x) — must be dependency-vetted.
- **Effort/Complexity**: Medium (the 6→8 reconciliation is additive).
- **Risk**: Low-Medium (version vetting).
- **Best suited when**: An Agent surface must wrap CLI ops as LLM tools with multi-provider
  support — this case.

#### Option D2: Lighter custom agent loop (no LangGraph)
- **Description**: Hand-roll a tool-calling loop over each provider's native SDK.
- **Strengths**: Fewer dependencies; no LangChain version churn.
- **Weaknesses**: Re-implements ReAct orchestration, memory, streaming, and per-provider
  tool-calling adapters that LangGraph already provides; diverges from the reference the
  user asked to mirror.
- **Effort/Complexity**: High.
- **Risk**: Medium.
- **Best suited when**: Minimizing dependencies outweighs reuse — not the stated goal.

## Comparison Matrix

| Criterion | A1 `@google/genai` | A2 raw REST | B1 single iface | C1 split store | D1 LangGraph (8 prov) |
|---|---|---|---|---|---|
| Reuses prior art / reference | High | Low | High | High | High |
| Fits locked decisions | Yes | Yes | Yes | Yes (hybrid) | Yes (8-provider mandate) |
| File Search capability coverage | Full | Full (hand-rolled) | n/a | n/a | n/a (LLM plane only) |
| Implementation effort | Low | High | Low | Low | Medium |
| Maintenance / version risk | Low | Medium-High | Low | Low | Low-Med (vet LangChain) |
| Secrets-at-rest compliance | n/a | n/a | n/a | Strong | n/a |
| Long-term viability | High | Medium | High | High | High |

(A3 / B2 / C2 / C3 / D2 are dominated alternatives, discussed above.)

## Recommendation

**Build a fresh standalone TypeScript/ESM project that mirrors storage-navigator's module
topology 1:1, with these concrete choices: A1 + B1 + C1 + D1.**

### Why
- **A1 (`@google/genai`)**: It is the officially supported, File-Search-capable, TypeScript
  path the reuse-anchor skill already proves working. The investigation confirmed the exact
  method surface (`fileSearchStores.create/list/get/delete`, `uploadToFileSearchStore`,
  `documents.list/get/delete`, `operations.get` for polling, `models.generateContent` with
  `tools:[{ fileSearch:{ fileSearchStoreNames }}]`). Choosing raw REST would re-derive
  solved problems for no benefit.
- **B1 (single `IGeminiBackend`)**: Directly satisfies acceptance criterion #1 and keeps the
  three surfaces symmetric, exactly as `IStorageBackend` does in the reference.
- **C1 (split encrypted-secrets + plaintext-metadata)**: The cleanest realization of the
  locked hybrid decision while honoring FR-REG-3 / FR-NFR-5 — `credential-store.ts` ports
  almost verbatim for the secrets half.
- **D1 (LangGraph, 8 providers)**: Reuses the exact stack the user asked to mirror and
  satisfies this project's 8-provider mandate with additive effort.

### Concrete recommended module layout (mirrors the reference)

```
gemini-search/
  package.json                       # ESM, "type":"module", bin: gemini-nav
  src/
    core/
      types.ts                       # StoreInfo, DocumentInfo, QueryResult, ProfileEntry
      credential-store.ts            # PORT of reference — AES-256-GCM, per-profile API keys
      registry.ts                    # plaintext metadata cache (hybrid), refresh reconcile
      backend/
        backend.ts                   # IGeminiBackend interface (see sketch)
        genai-backend.ts             # @google/genai implementation
        factory.ts                   # makeBackend(profile) -> IGeminiBackend
    config/
      agent-config.ts                # PORT of reference loader (4-tier chain, ConfigurationError)
    cli/
      index.ts                       # commander program (see command list)
      commands/                      # one file per command group
    agent/
      graph.ts  run.ts  system-prompt.ts
      providers/                     # registry.ts + 8 provider factories
      tools/                         # wrap each backend op as an LLM tool, confirm-gated
    tui/                             # interactive REPL (port subset of reference)
  API/                               # separate express-5 package (mirrors reference API/)
    src/app.ts  config.ts  auth/static-auth.ts  routes/{stores,documents,query,health,openapi}.ts
    openapi.yaml
```

### Recommended `IGeminiBackend` interface sketch

```typescript
// src/core/backend/backend.ts
export type Page<T> = { items: T[]; nextPageToken: string | null };

export interface StoreInfo {
  apiName: string;          // fileSearchStores/abc123  (SDK: name)
  displayName: string;
  createTime?: string;
  updateTime?: string;
  sizeBytes?: number;       // CONFIRM field name in Phase 3b
  documentCount?: number;   // may require a documents.list count, not store-level
  state?: string;
}

export interface DocumentInfo {
  apiName: string;          // fileSearchStores/abc/documents/doc1 (SDK: name)
  displayName: string;
  state: 'ACTIVE' | 'PENDING' | 'FAILED' | string;
  sizeBytes?: number;
  mimeType?: string;
  customMetadata?: Array<{ key: string; stringValue?: string; numericValue?: number }>;
}

export interface QuerySource {
  title?: string;           // groundingChunks[].retrievedContext.title
  excerpt?: string;         // groundingChunks[].retrievedContext.text
  // page_number / media_id / customMetadata — CONFIRM in Phase 3b
}

export interface QueryResult {
  answer: string;           // response.text
  sources: QuerySource[];   // derived from candidates[0].groundingMetadata.groundingChunks
  raw?: unknown;            // full groundingMetadata for --json
}

export interface IGeminiBackend {
  // stores
  listStores(opts?: { pageSize?: number; pageToken?: string }): Promise<Page<StoreInfo>>;
  getStore(apiNameOrDisplayName: string): Promise<StoreInfo>;
  createStore(displayName: string): Promise<StoreInfo>;
  deleteStore(apiName: string, force?: boolean): Promise<void>;

  // documents
  listDocuments(storeApiName: string, opts?: { pageSize?: number; pageToken?: string }): Promise<Page<DocumentInfo>>;
  getDocument(documentApiName: string): Promise<DocumentInfo>;
  uploadDocument(storeApiName: string, filePath: string, opts?: { displayName?: string; mimeType?: string }): Promise<DocumentInfo>;
  deleteDocument(documentApiName: string, force?: boolean): Promise<void>;
  replaceDocument(storeApiName: string, documentApiName: string, filePath: string, opts?: { displayName?: string }): Promise<DocumentInfo>;

  // query
  query(storeApiNames: string[], prompt: string, opts?: { model?: string; metadataFilter?: string }): Promise<QueryResult>;
}
```

### Recommended CLI command set (commander, mirrors the skill's tools + registry)

`profile-add` / `profiles` / `profile-remove`, `stores`, `store-info`, `store-create`,
`store-delete`, `docs`, `doc-info`, `doc-upload`, `doc-delete`, `doc-replace`, `query`,
plus registry ops `registry-list` / `registry-refresh` / `registry-prune`. Destructive
commands gate on `--force` (mirroring the reference). A `--profile <name>` option mirrors
the reference's `--storage <name>`.

### Recommended dependency versions (vet before pinning)

Carry the reference pins as a **starting point**, but per the dependency-validation rule,
re-verify each against current advisories at scaffold time and pin to a clean caret range:

- Data plane: `@google/genai` (latest stable — NOT in the reference; vet fresh).
- CLI: `commander ^14`, `zod` (reference uses `^3.25` in root, `^4` in API — standardize on
  one major across the project; recommend `zod ^4` to match the API and current ecosystem),
  `chalk ^5`, `dotenv ^17`.
- Agent: `@langchain/core ^1`, `@langchain/langgraph ^1`, `@langchain/openai ^1`,
  `@langchain/anthropic ^1`, `@langchain/google-genai ^2`, `langchain ^1`.
- API: `express ^5`, `pino ^10` + `pino-http ^11`, `swagger-ui-express ^5`, `yaml ^2`,
  `uuid ^11`. **Drop `jose`** (no OIDC) unless a later tier reintroduces it.
- Tooling: `tsx ^4`, `typescript ^6`, `vitest ^4` (fast-moving — pull latest stable major
  and audit).

### 6 → 8 provider reconciliation (mandatory)

storage-navigator ships 6 agent providers: `openai`, `anthropic`, `gemini`,
`azure-openai`, `azure-anthropic`, `local-openai`. This project's CLAUDE.md mandates **8
standard LLM providers** with vendor-canonical env-var names
(`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `AZURE_OPENAI_*`,
`AZURE_AI_INFERENCE_*`, `OLLAMA_HOST`, `LITELLM_*`). The reconciliation is **additive**: add
the two missing standard providers (`ollama` via `OLLAMA_HOST`, and `litellm` via
`LITELLM_*`) to the provider registry, and confirm the env-var names exactly match the
canonical set (the reference's `gemini.ts` already accepts both `GOOGLE_API_KEY` and
`GEMINI_API_KEY`). The exact authoritative list of the 8 and their env-var names is owned by
the `tool-doc-config-architect` subagent — the scaffolding step must produce the
`~/.tool-agents/gemini-nav/` config folder and the env-var matrix, never hand-authored.

### HTTP API recommendation

Mirror the reference `API/` package but **delete the OIDC/RBAC half**: keep
`buildApp`, the pino observability, the error middleware, the OpenAPI/swagger routes, the
pagination util, and **only** `staticAuthMiddleware` for auth (the static-header/API-key
gate, confirmed at `API/src/auth/static-auth.ts`). Config (`API/src/config.ts`) collapses to
`port`, `logLevel`, `staticAuth.{values,headerName}`, `pagination`, and the Gemini
profile/key resolution — drop the entire `oidc` discriminated union and `azure.*` block.
Routes become `/stores`, `/stores/:name/documents`, `/stores/:name/query`, `/health`,
`/openapi`. The API calls the **same `IGeminiBackend`** as the CLI.

### Conditions under which the recommendation would change
- If Phase 3b finds the `@google/genai` SDK does **not** surface grounding-metadata fields
  the renderer needs (only available over REST), selectively drop to **A2 (raw REST) for the
  query path only**, keeping A1 for store/document CRUD.
- If dependency vetting flags an unavoidable HIGH advisory in a LangChain v1 package with no
  clean version, surface the trade-off before adopting (per the dependency-validation rule).

### Caveats / prerequisites
- The `GOOGLE_API_KEY` vs `GEMINI_API_KEY` precedence quirk (the SDK prefers
  `GOOGLE_API_KEY` when both are set) must be handled explicitly in the backend's client
  init — the skill documents the temporary-unset workaround; prefer instead constructing the
  client with an explicit `{ apiKey }` from the resolved profile so process-env ordering is
  irrelevant.
- "document count" and "total size" may not be store-level fields — the skill computes them
  by listing documents. The backend's `getStore` may need a documents-list pass to populate
  `documentCount`/`sizeBytes`. Confirm in Phase 3b.
- Upload is a long-running operation requiring `operations.get` polling until `done` —
  the backend's `uploadDocument` must encapsulate the poll loop.

## Technical Research Guidance

**Research needed**: Yes

The architecture mapping is fully determined by the reference and needs no further research.
The one implementation-level gap is the **exact Gemini File Search query/citation response
shape and store/document metadata field names as surfaced by the `@google/genai` JS SDK** —
the `query` renderer and the `StoreInfo`/`DocumentInfo` types depend on these field-by-field,
and reachable docs confirmed the shape only at the property-name level (camelCase
`groundingChunks` / `retrievedContext` / `groundingSupports`) without an authoritative
field-by-field JS-SDK type listing.

### Topic 1: Gemini File Search query/citation response shape (JS SDK)
- **Name**: Gemini File Search query response & grounding-metadata schema (`@google/genai`)
- **Why**: FR-BE-4 and FR-CLI-3 require rendering answer + sources + citations + excerpts.
  The mapping from `response.candidates[0].groundingMetadata` to `QueryResult.sources`
  (title, excerpt, page_number, media_id, customMetadata) must be exact, and the JS-SDK
  type names must be confirmed (REST uses snake_case `grounding_chunks`/`retrieved_context`;
  the JS SDK appears to expose camelCase `groundingChunks`/`retrievedContext` — confirm).
- **Focus**: `groundingMetadata.groundingChunks[].retrievedContext.{text,title,pageNumber,mediaId,customMetadata}`;
  `groundingSupports` (segment→chunk index mapping for inline citations); how `response.text`
  relates to the supports; `--json` raw passthrough shape; behavior when no grounding is
  returned; multi-store query result attribution.
- **Depth**: Deep dive
- **Relevance**: Directly drives the `QueryResult`/`QuerySource` types and the `query`
  command renderer that mirrors the skill's answer/sources/excerpts output.

### Topic 2: Gemini File Search store & document metadata fields (JS SDK)
- **Name**: File Search store/document metadata field set (`@google/genai`)
- **Why**: `StoreInfo` and `DocumentInfo` (FR-BE-2/FR-BE-3) and the hybrid registry cache
  (FR-REG-1) need the authoritative, current field names and which fields are store-level
  vs. computed-from-documents (documentCount, totalSize, state).
- **Focus**: `fileSearchStores.get`/`list` returned fields (name, displayName, createTime,
  updateTime, sizeBytes?, state?); `documents.list`/`get` fields (name, displayName, state,
  sizeBytes, mimeType, customMetadata); upload `operations.get` result shape and polling
  contract; pagination tokens (`pager.page`, `hasNextPage()`, `nextPage()`).
- **Depth**: Intermediate
- **Relevance**: Defines the backend return types and what the local metadata cache stores
  and reconciles against live state.

### Topic 3: `@google/genai` version, API-key resolution, and File Search availability
- **Name**: `@google/genai` SDK version & auth/init for File Search
- **Why**: This is a NEW runtime dependency not present in the reference; it must be
  version-vetted (dependency-validation rule) and its API-key precedence
  (`GOOGLE_API_KEY` vs `GEMINI_API_KEY`) and File Search model support confirmed.
- **Focus**: Latest stable version + advisory status; explicit `{ apiKey }` client init to
  bypass env-precedence ordering; which Gemini models support the `fileSearch` tool; the
  "File Search cannot be combined with other tools" constraint; tier/quota limits relevant
  to error handling.
- **Depth**: Overview
- **Relevance**: Locks the dependency pin and the backend client construction; feeds the
  `Issues - Pending Items.md` dependency-vetting log.

## Implementation Considerations

- **Open decisions left for design** (no user access mid-investigation, so flagged here):
  (1) Whether per-profile API keys are *persisted encrypted* or read-only from the four-tier
  chain — FR-REG-3 allows either; recommend supporting both (persist via `credential-store`
  for convenience, but a profile may declare "read key from env only"). (2) Whether
  `documentCount`/`sizeBytes` are eagerly computed on every `getStore` (extra list call) or
  lazily/cached — recommend cached in the registry, refreshed on `registry-refresh`.
  (3) `zod` major-version standardization (root `^3` vs API `^4` in the reference) — recommend
  a single `^4` across the project.
- **Dependencies / prerequisites**: `@google/genai` and the LangChain v1 cluster must pass
  the dependency-validation procedure and be logged in `Issues - Pending Items.md` before
  pinning. `vitest`/`tsx`/`typescript`/`express` are fast-movers — pull latest stable majors
  and audit, do not adopt reference pins verbatim.
- **Tooling mandate**: The `~/.tool-agents/gemini-nav/` config folder and `docs/tools/<name>.md`
  MUST be produced via `/tool-conventions scaffold` (or the `tool-doc-config-architect`
  subagent), never by hand — this also owns the authoritative 8-provider env-var matrix.
- **Pitfalls to watch**: SDK env-key precedence quirk (use explicit `{ apiKey }`); upload is
  async — always poll `operations.get` until `done`; documents are immutable — `replace` =
  delete + re-upload (mirror the skill); store soft-limit (~10/project) and file-size limit
  (100 MB) should surface as typed errors, not crashes; secrets must never enter logs or the
  plaintext metadata cache (redaction unit test per acceptance criterion #6).
- **Suggested first steps**: (1) Scaffold the project + `~/.tool-agents/gemini-nav/` via the
  tool-conventions path. (2) Port `credential-store.ts` and `agent-config.ts` from the
  reference. (3) Define `IGeminiBackend` + `GenAiBackend` against the confirmed (Phase 3b)
  field shapes. (4) Build the CLI command layer + registry. (5) Add the Agent (8 providers)
  and the lightweight Express API last.

## References

| # | Source | URL | What was learned |
|---|--------|-----|-----------------|
| 1 | Gemini API — File Search docs | https://ai.google.dev/gemini-api/docs/file-search | Store create/list/delete, upload/import, `documents.list/get/delete`, query via `models.generateContent` + `fileSearch` tool; response `grounding_metadata.grounding_chunks[].retrieved_context.{text,title,page_number,media_id,custom_metadata}`; limits (100 MB/file, tier quotas, <20 GB/store recommended); model support; File Search not combinable with other tools |
| 2 | Gemini File Search JS tutorial (P. Schmid) | https://www.philschmid.de/gemini-file-search-javascript | Exact `@google/genai` JS for create store, `uploadToFileSearchStore` + `operations.get` polling loop, `generateContent` with `fileSearch` tool; citations at `response.candidates[0].groundingMetadata` (field-by-field JS type names NOT fully specified — gap for Phase 3b) |
| 3 | Web search — grounding metadata in JS SDK | (aggregate; incl. AI SDK Google provider) https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai | JS SDK exposes camelCase `groundingMetadata.groundingChunks` with `retrievedContext` (`title`, `fileSearchStore`, `media_id`); `groundingSupports` links generated segments to source chunks; raw metadata under provider metadata |
| 4 | `manage-gemini-file-search` skill (prior art) | local: `~/claude-workdocs/.claude/skills/manage-gemini-file-search/SKILL.md` | Working `@google/genai` patterns: `fileSearchStores.create/list/delete`, `uploadToFileSearchStore`, `documents.list/delete`, query result shape (answer/sources/excerpts), `GEMINI_API_KEY` vs `GOOGLE_API_KEY` precedence workaround, limits, supported formats |
| 5 | storage-navigator reference project | local: `docs/reference/storage-navigator-ref/` | `IStorageBackend` + factory pattern, `credential-store.ts` AES-256-GCM machine-key store, commander CLI structure, LangGraph 6-provider registry + 4-tier `ConfigurationError` config loader, Express 5 `buildApp` + `staticAuthMiddleware`, dependency pins |

## Original Request

> I want you to study the https://github.com/BikS2013/storage-navigator.git project and create the equivalent implementation for the Gemini Search API to allow users to keep track of the gemini stores, their metadata, test queries against them, etc

Authoritative refined specification (binding, with all five Open Questions resolved to the
recommended defaults):
`/Users/giorgosmarinos/aiwork/agent-platform/gemini-search/docs/reference/refined-request-gemini-store-navigator.md`
