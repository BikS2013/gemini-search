# Gemini File Search Store Navigator (`gemini-nav`)

A TypeScript/ESM tool for managing **Google Gemini File Search** stores — create and
inspect stores, manage documents (upload / list / get / delete / replace), and run File
Search **RAG queries** with answer + sources + byte-accurate inline citations + excerpts.

Everything is built around a single backend abstraction, **`IGeminiBackend`**, consumed by
three surfaces over the same encrypted, multi-account configuration:

| Surface | Entry | What it is |
|---|---|---|
| **CLI** | `gemini-nav` | `commander`-based command line (16 commands). |
| **HTTP API** | `gemini-nav-api` (`API/`) | Express 5 REST surface (independent sub-project). |
| **Electron desktop UI** | `npm run dev:electron` | Sandboxed desktop app over a typed IPC bridge. |

> Multi-account **profiles** each carry their own Gemini API key, **AES-256-GCM-encrypted at
> rest** under `~/.tool-agents/gemini-nav/`. A hybrid local registry caches store metadata.

## Requirements

- **Node ≥ 20**
- npm
- A **Gemini API key** (`GEMINI_API_KEY` or `GOOGLE_API_KEY`)
- The Electron desktop build targets **macOS (arm64)**.

## Install

```bash
npm install
```

## Configure a profile

The UI is **selection-only** (v1), so create a profile with the CLI first.

```bash
# Store the key, encrypted at rest (omit --key to be prompted securely):
npm run cli -- profile-add --name default --key <YOUR_GEMINI_API_KEY>

# …or resolve the key from the environment on demand (not stored):
npm run cli -- profile-add --name default --env

# Verify:
npm run cli -- profiles
```

**Key resolution (four-tier chain, highest wins):** `--key` flag → shell env
(`GEMINI_API_KEY` / `GOOGLE_API_KEY`) → `~/.tool-agents/gemini-nav/.env` → local `./.env`.
There are **no fallback defaults** — a missing required setting raises `ConfigurationError`.

Profiles and the metadata registry live under `~/.tool-agents/gemini-nav/`
(`credentials.json`, `registry.json`) and are shared by all three surfaces.

## Use it

### CLI

```bash
npm run cli -- <command> [options]      # dev (tsx)
gemini-nav <command> [options]          # if installed / linked
```

Commands (16): `profile-add`, `profiles`, `profile-remove`, `stores`, `store-info`,
`store-create`, `store-delete`, `docs`, `doc-info`, `doc-upload`, `doc-delete`,
`doc-replace`, `query`, `registry-list`, `registry-refresh`, `registry-prune`. Add `--help`
to any command for its options. Most commands take a global `--profile <name>`.

```bash
npm run cli -- stores --profile default
npm run cli -- query --profile default --store <apiName> "your question"
```

### Electron desktop UI

```bash
npm run dev:electron     # build the renderer + bundle the main process + launch
npm run dist:mac         # produce a runnable UNSIGNED build at release/mac-arm64/Gemini Nav.app
```

In the app: pick a profile (top-right), then manage stores, manage documents, run File
Search queries (with optional model override + metadata filter), and use the local registry.
Destructive actions are confirmation-gated.

> The `dist:mac` build is **unsigned** — on first launch macOS Gatekeeper may require
> right-click → **Open** (or *System Settings → Privacy & Security → Open Anyway*).

**Security posture:** the Electron main process is the sole holder of the backend and the
credential store; the renderer is sandboxed (`contextIsolation: true`, `sandbox: true`,
`nodeIntegration: false`) and reaches the backend only through an allow-listed, typed IPC
bridge. **API keys never cross the IPC boundary**, and all IPC/log output is redacted.

### HTTP API

The Express 5 surface is a self-contained sub-project under `API/`:

```bash
cd API && npm install && npm run build && npm test
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run build` | Compile the core/CLI TypeScript (`tsc`). |
| `npm run typecheck` | Type-check without emit. |
| `npm test` | Run the test suite (`vitest run`). |
| `npm run cli -- …` | Run the CLI in dev (`tsx`). |
| `npm run dev:electron` | Build renderer + bundle main + launch Electron. |
| `npm run dist:mac` | Package an unsigned macOS arm64 build. |
| `npm run build:electron` / `build:electron-main` / `build:renderer` | Electron build steps. |
| `npm run typecheck:electron` | Type-check the Electron (main + renderer) TypeScript. |

## Project layout

```
src/
  core/        domain layer + IGeminiBackend (the single Gemini access path)
    backend/   backend contract, GenAiBackend (@google/genai), factory, citation rendering
  cli/         commander CLI + command handlers + render
  electron/    main process, preload (CJS), typed IPC, renderer (public/), dev launcher
  config/      profile/key resolution, ConfigurationError
  util/        secret redaction
API/           independent Express 5 HTTP API sub-project
docs/          design, reference, research, and tool documentation
tests/         vitest suites (core, cli, config, electron)
```

## Documentation

- Tool reference: [`docs/tools/gemini-nav.md`](docs/tools/gemini-nav.md)
- Living design: [`docs/design/project-design.md`](docs/design/project-design.md)
- Functional requirements: [`docs/design/project-functions.md`](docs/design/project-functions.md)
- Open issues / deferred items: [`Issues - Pending Items.md`](Issues%20-%20Pending%20Items.md)

## License

ISC.
