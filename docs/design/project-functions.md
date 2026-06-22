# Project Functions — Gemini File Search Store Navigator

This document registers the functional requirements and feature descriptions for the
Gemini File Search Store Navigator. Source of truth for scope: the refined request at
`docs/reference/refined-request-gemini-store-navigator.md`. The agent/TUI surface was
subsequently removed and replaced by an Electron desktop UI surface per
`docs/reference/refined-request-electron-ui-surface.md` and
`docs/design/plan-002-electron-ui-surface.md` (2026-06-21). Original implementation plan:
`docs/design/plan-001-gemini-store-navigator.md`.

## Architecture overview
Three surfaces over one backend abstraction (`IGeminiBackend`), reached exclusively through
the `@google/genai` SDK: a CLI (`gemini-nav`), an Express 5 HTTP API (`gemini-nav-api`), and
an Electron desktop UI. A hybrid local store under `~/.tool-agents/gemini-nav/`: encrypted
per-profile API keys (`credentials.json`, AES-256-GCM) plus a plaintext non-secret metadata
cache (`registry.json`). Four-tier config chain (shell env > `~/.tool-agents/gemini-nav/.env`
> local `.env` > CLI flags), with NO fallback defaults — missing required config raises
`ConfigurationError`.

## Backend abstraction (FR-BE)
- **FR-BE-1** — A single `IGeminiBackend` interface (stores + documents + query); every surface
  reaches Gemini only through it (no surface imports the SDK directly).
- **FR-BE-2** — Stores: list, get one store's metadata (counts, sizeBytes, timestamps,
  embeddingModel; derived display state from counts), create, delete.
- **FR-BE-3** — Documents: list in a store, get one, upload (local path + optional display name,
  async-operation polling then `documents.get` hydration), delete, replace (= delete + re-upload;
  documents are immutable).
- **FR-BE-4** — Query: run a File Search RAG query against one or more stores and return a
  structured `QueryResult` (answer, source documents, grounding/citation spans with byte-accurate
  inline citations, per-source excerpts, raw grounding metadata).

## Local registry (FR-REG)
- **FR-REG-1** — Persist a local registry of known stores + cached metadata (hybrid; live API is
  source of truth, cache refreshable on demand). Secrets never enter the plaintext cache.
- **FR-REG-2** — Commands to register, list, refresh, and prune registry entries.
- **FR-REG-3** — Per-profile API keys persisted encrypted at rest (AES-256-GCM machine-key store);
  a profile may instead declare its key as read-only from the four-tier chain. No plaintext secrets.

## CLI surface (FR-CLI) — `gemini-nav`
- **FR-CLI-1** — Commander-based binary with: `profile-add`/`profiles`/`profile-remove`;
  `stores`/`store-info`/`store-create`/`store-delete`; `docs`/`doc-info`/`doc-upload`/`doc-delete`/
  `doc-replace`; `query`; `registry-list`/`registry-refresh`/`registry-prune`. A
  `--profile <name>` selector mirrors the reference's `--storage`.
- **FR-CLI-2** — Destructive commands (store/document delete, registry prune) require explicit
  confirmation (`--force` / y-n prompt).
- **FR-CLI-3** — `query` renders ANSWER + SOURCES + CITATIONS + EXCERPTS in a readable layout
  matching the existing skill's `query-store.ts` output; `--json` (normalized) and `--raw-json`
  (raw grounding metadata) passthroughs.

## HTTP API surface (FR-API) — `gemini-nav-api`
- **FR-API-1** — Express 5 API exposing the same operations behind a simple static-header /
  API-key perimeter gate (NO OIDC/RBAC), with an OpenAPI spec, a health check, and pagination on
  list endpoints. Calls the same `IGeminiBackend` as the CLI.

## Electron desktop UI surface (FR-UI) — `gemini-nav` Electron app
- **FR-UI-1** — A desktop UI (third surface) whose main process owns `IGeminiBackend` in-process
  via `makeBackend(profileName)` from `src/core/backend/factory.ts`; it NEVER imports `@google/genai`
  directly. The renderer is sandboxed (`contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`) and reaches the backend only through a typed `contextBridge` IPC
  allowlist (`window.gemini.invoke`/`on`).
- **FR-UI-2** — Profile selection: surface the configured named profiles (names/keyMode only, never
  key material) and switch the active profile (selection-only; no API-key entry / profile creation
  in the UI for v1).
- **FR-UI-3** — Store management: list stores, show one store's metadata + derived state, create a
  store, delete a store (in-UI confirmation for destructive actions).
- **FR-UI-4** — Document management: list documents in a store, show one document's metadata, upload
  a local file (pre-upload validation — >100 MB → FileTooLargeError, audio/video MIME →
  UnsupportedMimeTypeError), delete a document (confirmation-gated), replace a document
  (confirmation-gated delete + re-upload). Upload exposes the `wait-active` option and reflects the
  STATE_PENDING → STATE_ACTIVE/STATE_FAILED lifecycle via an `upload:progress` event channel.
- **FR-UI-5** — File Search RAG queries: query one or more selected stores with an optional model
  override (default `gemini-3.1-pro-preview`, fallback `gemini-2.5-pro`) and optional
  metadata-filter expression; render answer with byte-accurate inline citations, source list, and
  excerpts (reusing `citation-render.ts` output produced in the main process).
- **FR-UI-6** — Registry operations: list cached stores, refresh against the live API for the active
  profile, prune a stale entry (confirmation-gated; never deletes the live store).
- **FR-UI-7** — Error and secret handling: typed backend errors are serialized as `{ code, message }`
  only (no stacks, `cause`, or `operationError`) and mapped to clear non-secret UI messages; every
  IPC payload and log line passes through `redactString`; API keys never cross the IPC boundary.
- **FR-UI-8** — Packaging: a documented dev command (`npm run dev:electron`) launches the app against
  the same `~/.tool-agents/gemini-nav/` config the CLI uses; a documented command (`npm run dist:mac`)
  produces a runnable UNSIGNED macOS build (`mac.target "dir"`, `arch arm64`, `identity:null`).

## Non-functional (FR-NFR)
- **FR-NFR-1** — TypeScript (ESM, NodeNext, strict, `.js` import extensions), Node ≥ 20,
  commander/zod/vitest stack; Electron main bundled via esbuild to a single `.mjs`, renderer
  authored in plain HTML/CSS/TypeScript (no framework, no renderer bundler).
- **FR-NFR-2** — No fallback values for any configuration setting; missing required config raises
  `ConfigurationError` naming the sources checked. Documented operational knobs (page size, window
  size, API port) may carry defaults.
- **FR-NFR-3** — Fast-moving runtime/build dependencies (`electron`, `electron-builder`, `esbuild`)
  are version-vetted before pinning: latest stable major, zero HIGH+ advisories, caret pin,
  `npm audit` to zero, vetted-on date recorded in `Issues - Pending Items.md`.
- **FR-NFR-4** — Tool docs at `docs/tools/<tool-name>.md`; config folders at
  `~/.tool-agents/<tool-name>/` (dir 0700, `.env` 0600); both produced via the `/tool-conventions
  scaffold` path, never hand-authored.
- **FR-NFR-5** — Secrets (API keys) never logged, printed, or written to disk in plaintext;
  log output passes through a redaction utility.
