<gemini-nav>
    <objective>
        Gemini File Search Store Navigator — a TypeScript CLI (with an HTTP API surface and an
        Electron desktop UI) for managing Google Gemini File Search stores. Tracks stores
        and their metadata in a hybrid local registry, manages documents (upload/list/get/delete/
        replace), and runs File Search RAG queries rendering answer + sources + citations +
        excerpts. Supports multiple named account profiles, each with its own Gemini API key
        encrypted at rest (AES-256-GCM).
    </objective>
    <command>
        gemini-nav &lt;command&gt; [options]

        # Dev invocation (from project root)
        npx tsx src/cli/index.ts &lt;command&gt; [options]

        # HTTP API (from API/)
        cd API &amp;&amp; npm run dev          # dev mode (tsx watch)
        cd API &amp;&amp; npm start            # production (node dist/index.js)
        # or via bin alias:
        gemini-nav-api

        # Electron desktop UI (from project root)
        npm run dev:electron          # launch the app in development
        npm run dist:mac              # build release/mac-arm64/Gemini Nav.app (unsigned)
    </command>
    <info>
        Three integrated surfaces share a single IGeminiBackend abstraction backed by
        @google/genai: the CLI, the HTTP API, and the Electron desktop UI. All Gemini
        data-plane operations (store/document CRUD, RAG queries) are always routed through
        this interface.

        ─────────────────────────────────────────────────────────────────
        Configuration &amp; Secret Resolution
        ─────────────────────────────────────────────────────────────────

        Config folder: ~/.tool-agents/gemini-nav/   (mode 0700)
          credentials.json   AES-256-GCM encrypted vault — profile list + per-profile API keys
          machine.key        Random 32-byte AES master key (mode 0600, auto-generated)
          registry.json      Plaintext metadata cache (non-secret, refreshable)
          .env               Secrets and provider config (mode 0600)

        Resolution chain — lowest to highest priority (file-wins policy):
          1. Shell environment variables       (process.env — lowest priority)
          2. ~/.tool-agents/gemini-nav/.env    (values here OVERRIDE shell exports)
          3. Local .env in the current working directory
          4. CLI flags                         (--key, --provider, --model, …) — highest priority

        No fallbacks for required settings. Missing required values raise ConfigurationError
        (exit 3). The ONLY exceptions are operational knobs (port, log level, page size,
        window size) which have documented defaults and are not secrets.

        Gemini API key (data plane) — per-profile, two key modes:
          stored  Key is encrypted at rest in credentials.json via CredentialStore (AES-256-GCM).
                  Retrieved with `CredentialStore.getApiKey(profileName)` at runtime.
          env     Key is NOT stored; resolved on demand via the four-tier chain above.
                  Accepted env var names (both are equivalent):
                    GOOGLE_API_KEY
                    GEMINI_API_KEY      (alias; same canonical slot)

        ─────────────────────────────────────────────────────────────────
        Global Options (all commands)
        ─────────────────────────────────────────────────────────────────

          --profile &lt;name&gt;   Named profile (default: "default")
          --key &lt;key&gt;        Inline API key override (highest precedence — never stored)

        ─────────────────────────────────────────────────────────────────
        Surface 1 — gemini-nav CLI
        ─────────────────────────────────────────────────────────────────

        Profile Management:

          profile-add
            Add or update a named profile (API key encrypted at rest, or resolved from env).
            --name &lt;name&gt;      Profile name (required)
            --key &lt;key&gt;        Gemini API key (prompts if omitted, unless --env)
            --env              Resolve the key from the environment on demand (not stored)

          profiles
            List configured profiles. Never prints key material.

          profile-remove
            Remove a profile and its stored encrypted key.
            --name &lt;name&gt;      Profile name to remove (required)

        Store Management:

          stores
            List File Search stores (also reconciles and refreshes the local registry cache).
            --page-size &lt;n&gt;     Page size
            --page-token &lt;tok&gt;  Pagination token
            --json              Emit the raw page as JSON

          store-info &lt;nameOrDisplayName&gt;
            Show one store's metadata and derived state (active/pending/failed doc counts,
            sizeBytes, embeddingModel, timestamps).
            --json              Emit JSON

          store-create
            Create a File Search store.
            --display-name &lt;name&gt;      Store display name (required)
            --embedding-model &lt;model&gt;  Embedding model override (optional)
            --json                     Emit JSON

          store-delete &lt;apiName&gt;
            Delete a store (asks for confirmation unless --force).
            --force             Skip confirmation and force-delete a non-empty store

        Document Management:

          docs
            List documents in a store.
            --store &lt;apiName&gt;    Store apiName (required)
            --page-size &lt;n&gt;      Page size
            --page-token &lt;tok&gt;   Pagination token
            --json               Emit the raw page as JSON

          doc-info &lt;documentApiName&gt;
            Show one document's metadata (state, sizeBytes, mimeType, timestamps,
            customMetadata).
            --json              Emit JSON

          doc-upload
            Upload a file into a store. Returns immediately at STATE_PENDING (op done +
            one documents.get hydration). Use --wait-active to block until STATE_ACTIVE.
            --store &lt;apiName&gt;       Store apiName (required)
            --file &lt;path&gt;           Path to the local file (required)
            --display-name &lt;name&gt;   Document display name (optional)
            --mime-type &lt;type&gt;      Explicit MIME type override (optional)
            --wait-active           Block until STATE_ACTIVE (or STATE_FAILED)
            --json                  Emit JSON
            Pre-upload validation: rejects files &gt;100 MB (FileTooLargeError) and
            audio/video MIME types (UnsupportedMimeTypeError) before calling the API.

          doc-delete &lt;documentApiName&gt;
            Delete a document (asks for confirmation unless --force).
            --force             Skip confirmation

          doc-replace
            Replace a document (delete + re-upload; confirmation-gated). Documents are
            immutable in the Gemini API, so replace = delete then upload.
            --store &lt;apiName&gt;         Store apiName (required)
            --document &lt;apiName&gt;      Document apiName to replace (required)
            --file &lt;path&gt;             Path to the new file (required)
            --display-name &lt;name&gt;     New document display name (optional)
            --wait-active             Block until STATE_ACTIVE
            --force                   Skip confirmation
            --json                    Emit JSON

        RAG Query:

          query &lt;prompt&gt;
            Run a File Search RAG query against one or more stores. Renders answer +
            inline citations (byte-accurate, UTF-8 Buffer sliced) + sources + excerpts.
            --store &lt;apiName&gt;         Store apiName (repeatable, required)
            --model &lt;model&gt;           Model id override (default: gemini-3.1-pro-preview;
                                       documented fallback: gemini-2.5-pro)
            --metadata-filter &lt;expr&gt;  File Search metadata filter expression (optional)
            --json                    Emit the normalized QueryResult as JSON
            --raw-json                Emit the raw groundingMetadata subtree as JSON

          GEMINI_NAV_QUERY_MODEL env var — optional override for the default query model.
          When set it is used as the default for --model (CLI flag still wins).

        Local Registry (metadata cache):

          registry-list
            List cached known stores from the local registry (plaintext, non-secret).
            --json              Emit JSON

          registry-refresh
            Reconcile the local registry against the live Gemini API for the active profile.
            Calls listStores and upserts each RegistryEntry (apiName keyed).
            --json              Emit JSON

          registry-prune &lt;apiName&gt;
            Remove a stale cache entry from the registry (does NOT delete the live store).
            Asks for confirmation unless --force.
            --force             Skip confirmation

        Exit codes:
          0   Success
          2   Unexpected / backend error
          3   Configuration error (missing required value — ConfigurationError)

        ─────────────────────────────────────────────────────────────────
        Surface 2 — gemini-nav-api (HTTP API)
        ─────────────────────────────────────────────────────────────────

        Separate deployable under API/ with its own package.json and tsconfig. Express 5
        application that brokers all Gemini backend operations over HTTP.

        Auth: optional static-header gate (opt-in). When GEMINI_NAV_API_AUTH_SECRET is
        unset or empty, the API runs OPEN on localhost (auth disabled by design — the
        documented local-run posture). Absence of the secret is NOT a ConfigurationError.
        When set, every protected route requires the header X-Gemini-Nav-Auth (or a
        custom header via GEMINI_NAV_API_AUTH_HEADER) to match one of the comma-separated
        allowed values.

        API Environment Variables:
          GEMINI_NAV_API_AUTH_SECRET    Comma-separated allowed header values (OPTIONAL).
                                         When absent/empty → auth disabled (pass-through).
          GEMINI_NAV_API_AUTH_HEADER    Custom auth header name (default: X-Gemini-Nav-Auth)
          GEMINI_NAV_API_PORT           HTTP listen port (default: 3000). Also accepts PORT.
          GEMINI_NAV_API_PROFILE        Default Gemini profile (default: "default")
          LOG_LEVEL                     Log level: debug|info|warn|error (default: info)
          SWAGGER_UI_ENABLED            Enable Swagger UI at /docs (default: true)
          DEFAULT_PAGE_SIZE             Default pagination page size (default: 20)
          MAX_PAGE_SIZE                 Maximum pagination page size (default: 100)

        Endpoint Map (all protected routes require the static-auth header when auth is on):
          GET  /health                               Liveness (before auth, always open)
          GET  /openapi                              OpenAPI spec + Swagger UI (before auth)
          GET  /stores?pageSize&amp;pageToken           List stores (paginated)
          GET  /stores/:name                         Get one store by apiName or displayName
          POST /stores                               Create store { displayName, embeddingModel? }
          DEL  /stores/:name?force=                  Delete store (204)
          GET  /stores/:name/documents?pageSize&amp;pageToken  List documents (paginated)
          GET  /stores/:name/documents/:doc          Get one document
          POST /stores/:name/documents               Upload document (multipart or { filePath };
                                                      ?waitActive= flag supported)
          DEL  /stores/:name/documents/:doc?force=   Delete document (204)
          POST /stores/:name/query                   RAG query { prompt, model?, metadataFilter?,
                                                      storeNames? }; ?raw= for groundingMetadata

        Error → HTTP status mapping:
          ConfigurationError        → 500 CONFIG_MISSING
          RateLimitError            → 429
          FileTooLargeError         → 422
          UnsupportedMimeTypeError  → 422
          StoreLimitError           → 409
          Static auth failure       → 401 STATIC_AUTH_FAILED

        Commands (from API/):
          npm run dev                # tsx watch (development)
          npm run build              # tsc → dist/
          npm start                  # node dist/index.js (production)
          npm test                   # vitest run

        ─────────────────────────────────────────────────────────────────
        Surface — Electron desktop UI
        ─────────────────────────────────────────────────────────────────

        A native desktop application (the third surface alongside the CLI and HTTP API) for
        managing stores, documents, registry entries, and File Search RAG queries through a
        windowed UI. It consumes the SAME IGeminiBackend abstraction IN-PROCESS via
        makeBackend(profileName) (src/core/backend/factory.ts) — it NEVER imports @google/genai
        directly and does NOT call the HTTP API over the network. It reads the same encrypted
        ~/.tool-agents/gemini-nav/ configuration (credentials.json + registry.json) the CLI uses.

        Build &amp; run commands (from the project root):
          npm run dev:electron     Launch the app in development against the live
                                    ~/.tool-agents/gemini-nav/ config (esbuild-bundles the main
                                    process and spawns the Electron binary).
          npm run dist:mac          Produce a runnable UNSIGNED macOS arm64 build at
                                    release/mac-arm64/Gemini Nav.app.
          npm run build:electron    Build artifacts only (dist/electron/main.mjs +
                                    src/electron/public/app.js) without packaging.
          npm run typecheck:electron  Typecheck the Electron main-side TypeScript.

        Unsigned-build caveat: because release/mac-arm64/Gemini Nav.app is unsigned and
        un-notarized, macOS Gatekeeper blocks the first launch. Open it once via right-click →
        Open (or System Settings → Privacy &amp; Security → "Open Anyway"); subsequent launches run
        normally. The build is Apple-Silicon (arm64) only.

        Secure architecture:
          - The MAIN process is the sole holder of IGeminiBackend, CredentialStore, and all API
            key material. API keys NEVER cross the IPC boundary into the renderer.
          - The renderer is sandboxed (contextIsolation: true, sandbox: true,
            nodeIntegration: false, webSecurity: true) and loaded from a local file:// page with a
            strict Content-Security-Policy (connect-src 'none' — no outbound network of its own).
          - A CJS preload (preload.cjs) exposes only a typed, allowlisted bridge:
            window.gemini.invoke(channel, ...args) over 15 invoke channels (stores list/get/create/
            delete, docs list/get/upload/delete/replace, query run, registry list/refresh/prune,
            profiles list/select) plus window.gemini.on('upload:progress', …) for one event channel.
            Raw ipcRenderer is never exposed; channels outside the allowlist are rejected.
          - Every IPC handler validates the sender frame, maps typed backend errors to a plain
            { code, message } envelope, and runs every outbound message through redactString. Stacks,
            cause, operationError, and the raw grounding subtree are never serialized across IPC.

        UI coverage:
          - Profiles: list the configured named profiles (names + key mode only — never key
            material) and switch the active profile. Selection-only — no API-key entry or profile
            creation in the UI (use the CLI `profile-add` for that).
          - Stores: list, show one store's metadata + derived state, create, delete
            (in-UI confirmation for the destructive delete).
          - Documents: list in a store, show one document's metadata, upload a local file
            (pre-upload validation — &gt;100 MB rejected as FileTooLargeError, audio/video MIME
            rejected as UnsupportedMimeTypeError), delete (confirmation-gated), replace
            (confirmation-gated delete + re-upload). Upload exposes the wait-active option and
            reflects the STATE_PENDING → STATE_ACTIVE/STATE_FAILED lifecycle via the
            upload:progress event channel.
          - Query: run a File Search RAG query against one or more selected stores with an optional
            model override (default gemini-3.1-pro-preview; documented fallback gemini-2.5-pro) and
            an optional metadata-filter expression, rendering answer + byte-accurate inline
            citations + sources + excerpts (the citation spans are produced once in the core via
            citation-render.ts and rendered, not recomputed, in the renderer).
          - Registry: list cached stores, refresh against the live API for the active profile, and
            prune a stale entry (confirmation-gated; never deletes the live store).
          - Destructive actions (store-delete, doc-delete, doc-replace, registry-prune) are all
            gated behind an explicit in-UI confirmation dialog. Typed backend errors map to clear,
            non-secret UI messages (FILE_TOO_LARGE, UNSUPPORTED_MIME_TYPE, STORE_LIMIT, RATE_LIMIT,
            UPLOAD_OPERATION_FAILED, CONFIGURATION_ERROR, INTERNAL).

        Design rule: all main-only Electron APIs (shell/dialog/app) are routed through IPC — they
        are never called from the preload.

        Toolchain: electron (^42), electron-builder (^26), esbuild (^0.28) as devDependencies; the
        main process is bundled by esbuild to dist/electron/main.mjs (package.json "main") and the
        renderer is plain HTML/CSS/TypeScript (no framework, no renderer bundler), compiled to
        src/electron/public/app.js. preload.cjs ships verbatim via extraResources.

        ─────────────────────────────────────────────────────────────────
        Examples
        ─────────────────────────────────────────────────────────────────

        # 1. Add a profile (key stored encrypted)
        gemini-nav profile-add --name prod --key "AIza..."

        # 2. Add a profile resolved from the environment (key NOT stored)
        gemini-nav profile-add --name ci --env
        export GOOGLE_API_KEY="AIza..."       # or GEMINI_API_KEY="AIza..."

        # 3. List stores (also refreshes the registry cache)
        gemini-nav --profile prod stores

        # 4. Create a store
        gemini-nav --profile prod store-create --display-name "my-knowledge-base"

        # 5. Upload a document and wait for it to become active
        gemini-nav --profile prod doc-upload \
            --store "fileSearchStores/abc123" \
            --file ./report.pdf \
            --display-name "Q4 Report" \
            --wait-active

        # 6. RAG query across two stores
        gemini-nav --profile prod query "Summarize the main findings" \
            --store "fileSearchStores/abc123" \
            --store "fileSearchStores/def456"

        # 7. RAG query with model override and JSON output
        gemini-nav --profile prod query "What are the risks?" \
            --store "fileSearchStores/abc123" \
            --model gemini-2.5-pro \
            --json

        # 8. Replace a document (delete + re-upload, confirmation-gated)
        gemini-nav --profile prod doc-replace \
            --store "fileSearchStores/abc123" \
            --document "fileSearchStores/abc123/documents/xyz789" \
            --file ./updated-report.pdf \
            --wait-active

        # 9. List and prune the local registry
        gemini-nav registry-list
        gemini-nav registry-refresh --profile prod
        gemini-nav registry-prune "fileSearchStores/stale123"

        # 10. Start the HTTP API (auth disabled, localhost only)
        cd API &amp;&amp; npm start

        # 11. Start the HTTP API with static-auth enabled
        export GEMINI_NAV_API_AUTH_SECRET="my-secret-value"
        cd API &amp;&amp; npm start
        # Then call with: -H "X-Gemini-Nav-Auth: my-secret-value"

        # 12. Launch the Electron desktop UI in development
        npm run dev:electron
        # (select a profile created via `gemini-nav profile-add`, then manage
        #  stores/documents/registry and run RAG queries from the window)

        # 13. Build the unsigned macOS desktop app
        npm run dist:mac
        # → release/mac-arm64/Gemini Nav.app  (first launch: right-click → Open)
    </info>
</gemini-nav>
