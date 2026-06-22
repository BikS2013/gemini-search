# Refined Request: Gemini File Search Store Navigator

## Category
Development

## Objective
Build a TypeScript management and observability surface — modelled on the
`storage-navigator` project — for **Google Gemini File Search** (Gemini's managed
RAG offering). Where storage-navigator browses Azure Blob containers/file shares,
this project lets users register, inventory, and operate **Gemini File Search
stores**: list stores and their metadata (document counts, sizes, configuration,
timestamps), manage the documents inside each store (upload / list / delete /
replace), and **test queries** (run File Search / RAG queries against a store and
inspect the returned answer, sources, grounding/citations, and excerpts). The
deliverable mirrors storage-navigator's "multiple surfaces over one backend
abstraction" architecture, scoped to a pragmatic MVP, and reuses the prior art that
already exists rather than reinventing the Gemini API integration.

## Scope

### In scope (subject to the surface-tier decision in Open Questions)
- A single **store/document/query abstraction layer** (the Gemini analog of
  storage-navigator's `IStorageBackend`) that all surfaces call through.
- **Store management**: register/track stores, list stores, view per-store metadata
  (document count, total size, configuration, created/updated timestamps), create a
  store, delete a store.
- **Document management within a store**: upload a document, list documents, view
  document metadata, delete a document, replace a document.
- **Query testing**: run a File Search / RAG query against a store and render the
  answer, source documents, grounding/citations, and text excerpts (mirroring the
  existing `query-store.ts` output shape).
- **Local registry / metadata layer**: a local record of known stores and their
  cached metadata (the analog of storage-navigator's encrypted credential store and
  backend registry), so users can "keep track of" stores across sessions. Exact
  remote-vs-local-cache policy is an Open Question.
- **Configuration & secrets handling** following project conventions: Gemini/Google
  API key(s) resolved via the four-tier chain (shell env > `~/.tool-agents/<name>/.env`
  > local `.env` > CLI flags), no fallback defaults, vendor-canonical env-var names
  (`GOOGLE_API_KEY` / `GEMINI_API_KEY` to be confirmed during research).
- **At least the CLI surface** (the MVP floor — see Open Questions for higher tiers).
- Tool documentation under `docs/tools/<tool-name>.md` and a `~/.tool-agents/<tool-name>/`
  config folder, created via the mandatory `/tool-conventions scaffold` path (never by hand).
- Unit tests (vitest, matching the reference stack) for the abstraction layer and
  each surface that is built.

### Out of scope (for this request / MVP unless a tier decision pulls it in)
- Storage-navigator features with **no Gemini analog**: Azure Blob/File Share
  browsing, repo↔container sync, reverse-git publication, GitHub App auth,
  DOCX/HTML/ZIP rendering pipelines, `If-Match` ETag in-place editing.
- The **Electron desktop UI** and **standalone macOS `.app` packaging** (deferred
  unless explicitly selected as a tier; high cost, low MVP value).
- Production cloud deployment (Docker image, App Service, Key Vault, Managed
  Identity) of any HTTP API surface — local-run only unless explicitly requested.
- A full **OIDC + RBAC broker** for the HTTP API (the simpler-auth default is
  proposed in Open Questions).
- Fine-tuning, embeddings management, or any Gemini capability beyond File Search
  store/document/query operations.
- Multi-cloud or non-Gemini RAG backends.

## Requirements

### Functional — Backend abstraction (FR-BE)
1. FR-BE-1: Define a single TypeScript interface (the Gemini analog of
   `IStorageBackend`) covering store, document, and query operations; every surface
   must call Gemini only through it.
2. FR-BE-2: Support listing stores, fetching one store's metadata, creating a store,
   and deleting a store.
3. FR-BE-3: Support listing documents in a store, fetching one document's metadata,
   uploading a document (from a local file path, with optional display name),
   deleting a document, and replacing a document.
4. FR-BE-4: Support running a query against a store and returning a structured result
   containing: the generated answer, the list of source documents, grounding/citation
   metadata, and per-source text excerpts.

### Functional — Local registry (FR-REG)
5. FR-REG-1: Persist a local registry of known stores and cached metadata so users
   can track stores across sessions (storage location and remote/local-cache policy
   per the Open Questions resolution).
6. FR-REG-2: Provide commands to register, list, refresh, and remove registry entries.
7. FR-REG-3: Never store secrets in plaintext; if API keys are persisted at all,
   reuse an encrypted-at-rest store analogous to storage-navigator's
   `credential-store.ts`. (Whether keys are persisted vs. read-only from the
   four-tier chain is to be decided in design.)

### Functional — CLI surface (FR-CLI) — MVP floor
8. FR-CLI-1: Provide a Commander-based CLI binary with subcommands covering all FR-BE
   and FR-REG operations (e.g. `stores`, `store-info`, `store-create`, `store-delete`,
   `docs`, `doc-upload`, `doc-delete`, `doc-replace`, `query`, plus registry commands).
9. FR-CLI-2: Destructive commands (store/document delete) require explicit confirmation.
10. FR-CLI-3: The `query` command renders answer + sources + citations + excerpts in a
    readable terminal format consistent with the existing skill's `query-store.ts` output.

### Functional — Higher-tier surfaces (FR-API / FR-AGENT) — gated by Open Questions
11. FR-API-1 (if selected): An HTTP API surface exposing the same operations, with the
    auth model chosen in Open Questions (default: simpler API-key/static-header gate,
    not a full OIDC+RBAC broker), an OpenAPI description, and pagination on list
    endpoints.
12. FR-AGENT-1 (if selected): A LangGraph/LangChain ReAct agent surface wrapping every
    CLI operation as an LLM tool, with one-shot + interactive modes, confirmation-gated
    mutations, and the 8 standard LLM providers wired via vendor-canonical env-vars.

### Non-functional (FR-NFR)
13. FR-NFR-1: All code in TypeScript (ESM), Node ≥ 20, matching the reference stack
    (commander, zod, vitest; express only if the API tier is selected).
14. FR-NFR-2: No fallback values for any configuration setting — missing required
    config raises a `ConfigurationError` reporting the sources checked.
15. FR-NFR-3: Any LLM-enabled surface (the agent tier, and the query path if it uses an
    LLM provider abstraction) supports the 8 standard providers and resolves config via
    the four-tier chain with vendor-canonical env-var names.
16. FR-NFR-4: Tool docs live at `docs/tools/<tool-name>.md`; config folders at
    `~/.tool-agents/<tool-name>/` (dir 0700, `.env` 0600); both scaffolded via
    `/tool-conventions scaffold`, never by hand.
17. FR-NFR-5: Secrets (API keys) are never logged, printed, or written to disk in
    plaintext.

## Constraints
- **Language/stack**: TypeScript ESM only; reuse the reference project's library
  choices where a Gemini analog exists. Run all Python-based reference skill tools
  (the existing `manage-gemini-file-search` CLIs) under their own toolchain — the new
  project itself is TypeScript.
- **Reuse anchor**: a user-level skill `manage-gemini-file-search` already exists and
  ships prebuilt TypeScript CLI tools (`create-store.ts`, `upload-document.ts`,
  `query-store.ts`, `list-stores.ts`, etc.). The investigation/research phase must
  study these and the live Gemini File Search API, and **leverage/extend this prior art
  rather than re-deriving the API integration**. A decision on extend-vs-fresh-tool is
  recorded in Open Questions.
- **Config rule**: no fallback defaults for configuration; raise exceptions. Any
  exception to this rule must be recorded in the project memory file before implementation.
- **Tool-conventions rule**: tool documentation and `~/.tool-agents/` config folders
  must be produced via the mandatory scaffolding command/subagent, never hand-authored.
- **Dependency vetting**: every new runtime dependency (especially the Gemini/Google
  GenAI SDK, and `express`/`jose` if the API tier is chosen) must be version-vetted for
  advisories per the dependency-validation procedure and logged in `Issues - Pending Items.md`.
- **Greenfield**: target root `/Users/giorgosmarinos/aiwork/agent-platform/gemini-search`
  currently has no `src/`; this is a fresh build seeded by the reference architecture.

## Acceptance Criteria
1. The backend abstraction interface exists and is the sole path through which every
   surface reaches Gemini File Search (verifiable by code inspection — no surface
   imports the Gemini SDK directly).
2. CLI: a user can register a Gemini API key (via the four-tier chain), list stores,
   view a store's metadata, create and delete a store, upload/list/delete/replace a
   document, and run a query — each demonstrated end-to-end against a real or mocked
   Gemini File Search store.
3. The `query` command prints answer + sources + citations + excerpts in a readable
   layout matching the existing skill's output shape.
4. A local registry persists known stores across CLI invocations and can be listed,
   refreshed, and pruned.
5. Missing required configuration produces a `ConfigurationError` naming the checked
   sources, with no silent default applied (verifiable by a unit test).
6. Secrets never appear in logs, stdout, or on-disk plaintext (verifiable by a
   redaction unit test).
7. vitest unit suite passes and `npx tsc --noEmit` is clean.
8. `npm audit` (or the project audit command) reports zero HIGH-or-above advisories,
   with dependency vetting logged in `Issues - Pending Items.md`.
9. Tool documentation exists at `docs/tools/<tool-name>.md` and the `~/.tool-agents/<tool-name>/`
   config folder was produced via the scaffolding path with correct permissions.
10. For any higher-tier surface selected (API and/or agent), its FR-API-1 / FR-AGENT-1
    requirements are met and demonstrated.

## Assumptions
- **"Gemini Search API" = Google Gemini File Search (managed RAG).** "Stores" are
  Gemini File Search stores, the analog of Azure storage containers. Basis: the raw
  request ("gemini stores… test queries against them") plus the orchestrator's gathered
  context and the existing `manage-gemini-file-search` skill.
- **Greenfield TypeScript build.** No existing `src/` under the target root; the
  reference project is read-only study material. Basis: directory scan returned no source files.
- **CLI is the mandatory MVP floor**; HTTP API, agent/TUI, and desktop UI are optional
  tiers selected via Open Questions. Basis: storage-navigator's CLI is the substrate all
  other surfaces wrap; it is the smallest coherent deliverable.
- **The existing skill's prebuilt CLI tools and the live Gemini File Search API are the
  authoritative integration reference**; concrete API details (endpoints, SDK methods,
  env-var name, metadata fields, citation shape) will be established in the
  investigation/technical-research phases, not assumed here.
- **vendor-canonical Google env var** is `GOOGLE_API_KEY` (with `GEMINI_API_KEY` possibly
  also accepted) — to be confirmed in research; flagged so the no-fallback config rule is
  applied to the correct variable name.
- **Vitest + commander + zod** carry over from the reference stack as the default test
  and CLI libraries unless research finds a Gemini-specific reason to differ.

## Open Questions
The reference project spans five surfaces; the central decision is **how much of that
breadth to build**. Each question below is a decision the user must make before planning;
the orchestrator should present the recommended default as the first option.

1. **Which surfaces to build?**
   - **Why it matters**: Determines overall scope, effort, and which FR groups
     (FR-CLI / FR-API / FR-AGENT / desktop UI) are in play; storage-navigator's five
     surfaces represent very different cost tiers.
   - **Options**: (a) CLI only; (b) CLI + HTTP API; (c) CLI + HTTP API + Agent/TUI;
     (d) all of the above + Electron desktop UI.
   - **Recommended default**: **(c) CLI + HTTP API + Agent/TUI** — mirrors
     storage-navigator's high-value surfaces, exercises the four-tier config and
     multi-provider LLM conventions, and excludes the heavy/low-value desktop UI +
     macOS packaging. If the user wants a faster first cut, fall back to **(a) CLI only**.

2. **Extend the existing `manage-gemini-file-search` skill, or build a fresh standalone tool?**
   - **Why it matters**: Decides whether the abstraction layer wraps/extends the skill's
     existing TypeScript CLIs or is a clean new tool that merely studies them; affects
     code ownership, duplication, and where future Gemini features land.
   - **Options**: (a) fresh standalone project that reuses the skill's API knowledge but
     owns its own abstraction; (b) extend/restructure the skill's tools into the new
     project; (c) have the new project call the skill's tools as a dependency.
   - **Recommended default**: **(a) fresh standalone project, reusing the skill's API
     integration knowledge and code patterns** — gives a clean abstraction layer and
     surface architecture while avoiding re-deriving the Gemini integration, consistent
     with the project's "build generic reusable tools" convention.

3. **Authentication scope for the HTTP API surface (only if a tier with the API is chosen)?**
   - **Why it matters**: Full OIDC+RBAC (storage-navigator's model) is a large subsystem;
     a simpler gate may suffice for a personal-use management tool.
   - **Options**: (a) simple static-header / API-key perimeter gate (local-run);
     (b) optional toggleable auth like storage-navigator (`AUTH_ENABLED`, anon role);
     (c) full OIDC + RBAC broker.
   - **Recommended default**: **(a) simple static-header / API-key gate, local-run only**
     — sufficient for tracking/testing stores without standing up an identity provider.

4. **Are stores remote-only, or also backed by a local registry/metadata cache?**
   - **Why it matters**: Shapes the data model (FR-REG) and whether "keep track of stores"
     means a live list call each time or a persisted, refreshable inventory.
   - **Options**: (a) hybrid — live Gemini API as source of truth plus a local registry
     cache of known stores and last-seen metadata; (b) remote-only (always live calls,
     no local persistence); (c) local-registry-first with explicit refresh.
   - **Recommended default**: **(a) hybrid** — a local registry that records known stores
     and caches metadata, refreshable from the live API on demand; best matches "keep
     track of the gemini stores, their metadata."

5. **Multi-account / multi-API-key support?**
   - **Why it matters**: storage-navigator supports multiple named backends; Gemini users
     may have several projects/keys. Affects the registry/config data model.
   - **Options**: (a) multi-account — named profiles each with their own API key, selectable
     per command (mirrors storage-navigator's `--storage <name>`); (b) single-account only.
   - **Recommended default**: **(a) multi-account named profiles** — low marginal cost,
     mirrors the reference design, and avoids a later rework.

## Open Questions — Resolutions (resolved by user at Phase 1 gate, 2026-06-20)
All five resolved to the recommended defaults:
1. **Surfaces** → **(c) CLI + HTTP API + Agent/TUI** (exclude Electron desktop UI + macOS packaging).
2. **Reuse model** → **(a) fresh standalone project**, reusing the `manage-gemini-file-search` skill's Gemini API integration knowledge and code patterns, owning its own abstraction.
3. **HTTP API auth** → **(a) simple static-header / API-key perimeter gate, local-run only** (no OIDC/RBAC).
4. **Store tracking** → **(a) hybrid** — local registry caching known stores + last-seen metadata, refreshable from the live Gemini API on demand.
5. **Multi-account** → **(a) multi-account named profiles**, each with its own Gemini API key, selectable per command.

These resolutions are binding for all downstream phases (investigation, planning, design, implementation, review, tests).

## Original Request
> I want you to study the https://github.com/BikS2013/storage-navigator.git project and create the equivalent implementation for the Gemini Search API to allow users to keep track of the gemini stores, their metadata, test queries against them, etc
