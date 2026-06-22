# Code Review — Gemini File Search Store Navigator

- **Date:** 2026-06-20
- **Reviewer:** senior code reviewer (Phase 7)
- **Verdict:** **approved_with_concerns**
- **Design (source of truth):** `docs/design/design-001-gemini-store-navigator.md`
- **Verification method:** Serena semantic tools + cclsp LSP diagnostics + `tsc --noEmit` (root & API) + `vitest run` (root & API).

## Scope reviewed
All files in the review set across U0–U4. The on-disk file set was cross-checked
against the design frontmatter `files_to_create`: **exact match — no missing or extra
production files.** All 8 providers + 3 extra provider modules (types/util/registry),
7 agent tools, all CLI command groups, all API routes, `docs/tools/gemini-nav.md`, and
the CLAUDE.md Tools section are present.

## Build, type-check, tests
| Check | Result |
|---|---|
| Root `npx tsc --noEmit` | PASS (exit 0) |
| API `npx tsc --noEmit` | PASS (exit 0) |
| Root `npx vitest run` | No test files (deferred to Phase 9 per Issues file) — exit 0 |
| API `npx vitest run` | **12 passed / 12** (app.test.ts: auth on/off, pagination, validation, error mapping incl. 429/413) |

## LSP diagnostics (cclsp get_diagnostics)
Clean (no errors/warnings/hints) on every file inspected:
`src/core/backend/genai-backend.ts`, `src/agent/tools/registry.ts`, `src/cli/index.ts`,
`API/src/app.ts`. Whole-project `tsc` is also clean, covering every file transitively.

## Priority items

### 1. Config precedence (HIGH) — VERIFIED, documented, no code change
- `resolveApiKey` (`src/config/profile-config.ts`) implements **CLI flag > shell env >
  `~/.tool-agents/gemini-nav/.env` > local `.env`**, accepting both `GEMINI_API_KEY` and
  `GOOGLE_API_KEY`. File layers are read with a private `processEnv:{}` (no `process.env`
  mutation); tool-agent `.env` beats local `.env`. **This matches design §config (line 575)
  exactly.**
- `loadAgentConfig` (`src/config/agent-config.ts`) uses the documented **Policy B file-wins**
  chain: **CLI flag > tool-agent `.env` > shell env > `config.json`** (the `.env` is loaded
  with `override:true` in the agent command entry before the loader reads `process.env`).
- Both surfaces are internally consistent with their own design statements. They differ from
  the generic parent-CLAUDE.md ordering, but the design explicitly fixed these orders
  (Decision 4 + the precedence note), so per the review brief they are left as-is and the final
  orders are documented in `project-design.md` (Contract reconciliations, 2026-06-20).
- **Final precedence (authoritative):**
  - Profile key: `--key` > `GEMINI_API_KEY`/`GOOGLE_API_KEY` (shell) > tool-agent `.env` > local `.env` → else `ConfigurationError`.
  - Agent config: `--flag` > tool-agent `.env` > shell `GEMINI_NAV_AGENT_*` > `config.json` → else `ConfigurationError` for required (provider, model).

### 2. `assembleTools` signature (MEDIUM) — RECONCILED to the implementation
Implemented as `assembleTools(backend, cfg: AgentConfig)` (allowlist from `cfg.toolsAllowlist`).
The impl is the better design — the catalog build needs `cfg.toolsAllowlist` + `cfg.allowMutations`
+ `cfg.perToolBudgetBytes` together, which a bare `string[]` cannot carry. Updated
`design-001` "Agent surface" and mirrored a dated note in `project-design.md`.

### 3. No-fallback rule (HIGH) — PASS
- `makeGenAiClient` throws `ConfigurationError` on empty/blank key.
- `makeBackend` resolves stored→decrypt, else four-tier resolver; missing → `ConfigurationError`.
- All provider builders (`openai`, `ollama`, … sampled + whole-tree tsc) throw `ConfigurationError`
  with the checked-source list on missing required config.
- The opt-in API auth secret is correctly NOT required (absence = auth disabled, logged as a
  warning) — consistent with binding resolution OQ3a; not a violation.

### 4. SDK pitfalls (HIGH) — PASS
- `renderInlineCitations` slices on `Buffer.from(text,'utf-8')` in **descending endIndex**
  order with 1-based `[n]` markers and clamps offsets — byte-accurate (no `string.slice`).
- `mapSources` reads only `retrievedContext` (File Search variant).
- `uploadDocument` polls `operations.get` to `done`, checks `operation.error`, then hydrates
  via `documents.get(operation.response.documentName)`; `waitActive` adds STATE_ACTIVE polling.
- `query` sends a **single `fileSearch` tool** only.

## Other findings

- **HTTP error map deviation (reconciled):** impl maps `FileTooLargeError`→**413** (design said
  422). 413 PAYLOAD_TOO_LARGE is the canonical status; reconciled in favour of the impl —
  `design-001` error table + `project-design.md` updated. `UnsupportedMimeTypeError`→422 unchanged.
- **Pagination (verified, not a bug):** `listStores`/`listDocuments` return
  `pager.params.config?.pageToken` as `nextPageToken`. The `@google/genai` `Pager.params`
  getter returns the *next* page's request config (confirmed in `genai.d.ts:9856-9864`), so the
  token is the forward token — correct.
- **Security:** credential store uses AES-256-GCM with a persisted 32-byte machine key,
  `credentials.json`/`machine.key` at `0600`, dir `0700`; `getApiKey` is the only plaintext path.
  Agent logging routes **every** line through `redactString` (Google `AIza…`, OpenAI `sk-…`, JWT,
  bearer, generic key/secret patterns); log files `0600`. No command injection (no shell exec of
  user input; SDK calls only). API logs do not leak secrets (verified in vitest run output).
- **Confirmation gating:** destructive tools (delete store/doc, replace doc) route through
  `confirmDestructive`; `create_store`/`upload` also confirm (stricter than design — acceptable).
  TUI bridge wired via lazy import; readline fallback for one-shot mode.
- **Cross-unit link:** `registerAgentCommand` is reached only by dynamic
  `import('./commands/agent.js')` from `src/cli/index.ts` (lines 313-327) with a fallback stub —
  the U2↔U4 seam is intact and keeps the unit file sets disjoint (no static reference, by design).
- **U3→core imports** resolve via relative `../../../src/core/*` paths under the API tsconfig;
  both tsc roots compile.

## Issues fixed in this review
- Reconciled the two design/impl contract mismatches by updating the design (impl wins in both):
  `assembleTools` signature and `FileTooLargeError`→413 mapping. Mirrored as dated notes in
  `project-design.md`. Updated `Issues - Pending Items.md` (moved the assembleTools item from
  pending to a new "Resolved during code review" block; recorded the pagination verification).

## Remaining concerns (non-blocking)
1. **No root-level unit tests.** Core logic with the trickiest pitfalls — `renderInlineCitations`
   byte-slicing (CJK/emoji), `mapSources`/`mapCitations`, `isRateLimit`/`isStoreLimit` heuristics,
   and a mocked-SDK `GenAiBackend` mapping/pagination test — is currently unverified by automated
   tests. Already logged for Phase 9 test-builders; recommend prioritising the citation and
   error-classification tests before any live use.
2. **Preview default model `gemini-3.1-pro-preview`** may be unavailable in some API tiers
   (binding user choice; `gemini-2.5-pro` documented fallback). Needs a live smoke test before
   release — cannot be verified here (no live API).
3. **`isStoreLimit`/`isRateLimit` are message-substring heuristics.** Robust enough for the
   documented signals (HTTP 429, "resource_exhausted", "quota"), but brittle if Google changes
   error text. Low risk; the 429 status check is the primary path.
4. **HTTP document upload is JSON `{ filePath }` only** (server-accessible path), not multipart —
   acceptable for the local-run posture, already logged as deferred.
5. **Tooling prerequisite:** the `~/.tool-agents/gemini-nav/` runtime config folder must be
   produced via the `tool-doc-config-architect` (not hand-authored); `docs/tools/gemini-nav.md`
   with the `<gemini-nav>` block and the CLAUDE.md Tools entry are present and correct.

## Verdict
**approved_with_concerns** — All three surfaces compile cleanly, API tests pass, all four
priority items verified correct (one reconciled to the better implementation), security and
no-fallback rules satisfied, and the file set matches the design. The only material gap is the
absence of root-level automated tests for the citation/error-classification logic (already
scheduled for Phase 9) and the unverifiable preview model id. Neither blocks acceptance of the
implementation as designed.
