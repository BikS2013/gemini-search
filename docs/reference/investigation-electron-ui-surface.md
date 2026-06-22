# Investigation: Electron Desktop UI Surface Toolchain for gemini-nav

## Executive Summary

This investigation selects the build/packaging toolchain, renderer stack, main-process
bundling strategy, and IPC bridge approach for adding an Electron desktop UI as a fourth
surface to `gemini-nav` (alongside CLI and HTTP API), consuming `IGeminiBackend` in-process
via `src/core/backend/factory.ts`. The backend mode, packaging target (macOS-only),
and selection-only profile management are already resolved by the refined request; the
toolchain choice was deferred to this investigation.

**Recommendations (all four decisions):**

1. **Build/packaging toolchain → hand-rolled `tsc`/esbuild + `electron` + `electron-builder`**
   (the reference project's proven approach), NOT electron-forge. It composes with the
   existing `tsc → dist/` ESM build with the least new machinery, gives precise macOS
   `electron-builder` packaging config, and minimizes the fast-moving-dependency surface.
2. **Renderer stack → plain HTML/CSS/TypeScript with no UI framework and no renderer
   bundler.** The UI surface is modest (profile picker, store/doc lists, query view with
   citation rendering). A framework + Vite adds a second build system and a large
   CVE-prone dependency tree for little benefit at this size.
3. **Main-process bundling → esbuild bundle of `src/electron/main.ts` to a single
   `.mjs`** for both dev (temp bundle, reference `launch.ts` pattern) and packaged build
   (bundle into `dist/electron/main.mjs`). The CJS `preload.cjs` ships verbatim via
   `extraResources` (no bundling, sandbox-compatible).
4. **IPC bridge → typed `contextBridge` allowlist** exposing a single
   `window.gemini.invoke(channel, …)` method gated by an explicit `Set` of ~12 allowed
   channels (the reference `preload.cjs` pattern), with `contextIsolation: true`,
   `nodeIntegration: false`, and `sandbox: true`.

This combination keeps the new surface aligned with the project's TS/ESM NodeNext
conventions, adds the smallest viable dependency footprint (three dev-dependencies:
`electron`, `electron-builder`, `esbuild`), and reuses a working topology that a sibling
project already ships.

## Context

**What was investigated and why.** The refined request
(`docs/reference/refined-request-electron-ui-surface.md`) adds an Electron desktop surface
and removes the agent/TUI surface. Four resolved decisions constrain the design: in-process
backend via the factory (no HTTP client), macOS-only runnable build, selection-only profile
management, and TS/ESM NodeNext conventions. The one open decision — the build/packaging
toolchain and its dependent choices (renderer stack, main-process bundling, IPC design) —
is the subject of this investigation (Open Question Q2, resolved to "decide in investigation").

**Key requirements and constraints driving the evaluation:**

- Fit with the existing `tsc → dist/` strict-ESM build (NodeNext, `.js` import extensions,
  named exports, no config fallbacks) — refined-request R17.
- macOS-only runnable build is sufficient; signing/notarization/cross-platform out of scope
  (A5, Q3 resolution).
- Electron + bundler/packager are fast-moving CVE-prone packages; mandatory dependency
  vetting before pinning (R19, dependency-vetting rules). Exact pinning is the
  implementation phase's job; this investigation flags the security posture only.
- Secure architecture: `contextIsolation: true`, `nodeIntegration: false`, `sandbox` where
  feasible, narrow typed IPC, strict redaction (constraints + R14/R16).
- A working reference Electron topology exists at
  `docs/reference/storage-navigator-ref/src/electron/` (electron@^41.1.1 +
  electron-builder@^26.8.2 + esbuild@^0.27.7), informational only — its embedded-Express
  architecture is explicitly NOT copied; gemini-nav uses direct IPC.

**Reference artifacts read:** the reference `package.json` (toolchain + `build` key +
overrides), `src/electron/launch.ts` (esbuild bundle + electron binary spawn + macOS
app-bundle rename), `src/electron/preload.cjs` (CJS allowlist contextBridge), and
`src/electron/main.ts` (window + ipcMain pattern; note its embedded Express server, which
gemini-nav drops).

---

## Decision 1 — Build / Packaging Toolchain

### Option 1A: Hand-rolled `tsc`/esbuild + `electron` + `electron-builder` (reference approach)

- **Description:** Keep the project's `tsc` build for the rest of the source; add `electron`
  (runtime/dev binary), `electron-builder` (packaging), and `esbuild` (main-process bundle)
  as devDependencies. Dev launch via a small `launch.ts` that esbuilds `main.ts` to a temp
  `.mjs` and spawns the `electron` binary; packaging via `electron-builder --mac --arm64`
  driven by a `"build"` key in `package.json`. This is exactly what the sibling
  `storage-navigator` reference ships.
- **Strengths:**
  - Composes with the existing `tsc → dist/` ESM pipeline instead of replacing it — no
    second opinionated build orchestrator imposed on the whole project.
  - `electron-builder` gives direct, declarative macOS packaging config (`mac.target: dmg`,
    `arch: arm64`, `extraResources`, `identity: null` for unsigned local builds) — precisely
    matching the macOS-only, unsigned-runnable-build requirement.
  - Smallest conceptual surface for the maintainer: three well-understood dev-dependencies,
    no plugin ecosystem to track.
  - A proven, copy-adaptable implementation already exists in the reference (launch +
    packaging), de-risking implementation.
  - `electron-builder` is by far the more widely used packager (~2.2M weekly downloads vs.
    electron-forge ~ a few thousand in the cited npmtrends snapshot), so advisories are
    surfaced and fixed quickly.
- **Weaknesses:**
  - "Bring your own tools" — dev launch, main bundling, and renderer serving are wired by
    hand (the reference already provides these patterns, so the cost is mostly one-time).
  - `electron-builder` historically pulls a deep transitive tree (app-builder, asar,
    cacache, etc.); the reference compensates with `overrides` for `@electron/asar`,
    `cacache`, `rimraf`, `global-agent`, `brace-expansion` — implementation must re-vet
    these.
- **Effort/Complexity:** Medium (one-time wiring; reference provides the template).
- **Risk:** Low–Medium (electron-builder transitive-advisory surface, mitigated by
  overrides + `npm audit`).
- **Best suited when:** an existing non-Electron build (`tsc`) must stay authoritative and
  you need fine-grained, single-platform packaging control with minimal new tooling.

### Option 1B: electron-forge

- **Description:** Adopt `@electron-forge/cli` plus makers/plugins (e.g. maker-dmg,
  plugin-vite or plugin-webpack). Forge becomes the orchestrator for dev, bundling, and
  packaging.
- **Strengths:**
  - All-in-one: scaffolds dev environment, bundling, and packaging out of the box.
  - First-party (maintained under the `electron/` org), good long-term alignment with
    Electron itself.
  - Built-in bundler plugins (Vite/webpack) if the renderer later grows.
- **Weaknesses:**
  - Imposes a second, opinionated build system on a project whose source build is already
    `tsc`; Forge wants to own bundling for main/preload/renderer, creating friction with the
    strict-ESM-`tsc` convention and the `.js`-import-extension source style.
  - Its ESM story has been historically rougher (the search surfaced ESM-migration import
    bugs and webpack/Vite plugin ESM/CJS runtime errors that needed fixing) — extra risk for
    a strict-ESM-NodeNext codebase.
  - Larger plugin + maker dependency footprint to vet than the three-package hand-rolled set,
    for a macOS-only single-target need that Forge's cross-platform machinery over-serves.
  - Lower fit with the existing reference, which uses electron-builder — no proven template
    to copy.
- **Effort/Complexity:** Medium–High (learn Forge config + plugin model; reconcile with `tsc`).
- **Risk:** Medium (ESM friction; second build system; more deps).
- **Best suited when:** a greenfield Electron app wants a batteries-included scaffold and
  cross-platform makers/auto-update from day one — not this project's situation.

### Option 1C: Hand-rolled esbuild + `electron` only (no electron-builder)

- **Description:** Use esbuild to bundle main + a script (e.g. `electron-packager` or a
  manual `.app` assembly) for packaging, dropping electron-builder.
- **Strengths:** Fewest packaging dependencies; maximal control.
- **Weaknesses:** Re-implements `.app`/`.dmg` assembly, `extraResources` copying, and
  Info.plist handling by hand — exactly what electron-builder does declaratively. High
  effort for a one-off macOS build; no reference template for the packaging half.
- **Effort/Complexity:** High.
- **Risk:** Medium–High (bespoke packaging is error-prone and unmaintained).
- **Best suited when:** packaging requirements are so unusual that no packager fits — not
  the case here.

### Decision 1 — Recommendation: **Option 1A (tsc/esbuild + electron + electron-builder)**

It is the only option that (a) preserves the authoritative `tsc → dist/` ESM build,
(b) gives declarative, precise macOS-only/unsigned packaging via `electron-builder`,
(c) has a proven, copy-adaptable reference implementation, and (d) keeps the new
fast-moving-dependency surface to three vettable packages. electron-forge is rejected for
imposing a second build system with documented ESM friction and a larger footprint for a
single-target need; the no-builder option is rejected for re-implementing packaging by hand.

---

## Decision 2 — Renderer Stack

### Option 2A: Plain HTML/CSS/TypeScript, no framework, no renderer bundler

- **Description:** Renderer assets under `src/electron/public/` — `index.html`, `styles.css`,
  and renderer logic authored in TypeScript and either compiled to plain `.js` by `tsc`
  (separate tsconfig `target`/`module` for the DOM) or kept as a single hand-written ES
  module loaded directly by the `BrowserWindow`. All backend access via
  `window.gemini.invoke(...)`. Mirrors the reference `public/app.js`.
- **Strengths:**
  - Zero additional runtime/build dependencies for the renderer — no React/Preact/Svelte,
    no Vite. Directly minimizes the CVE-prone surface the dependency-vetting rule targets.
  - The UI surface is modest and list-/form-oriented (profile picker, store list, doc list,
    upload form, query view). Citation rendering reuses `citation-render.ts` output from the
    main process; the renderer mostly injects pre-rendered HTML/text — no reactive framework
    needed.
  - Fastest path to a runnable build; nothing to reconcile with the `tsc`/electron-builder
    toolchain.
  - Matches the reference exactly, so layout/IPC-call patterns are copy-adaptable.
- **Weaknesses:**
  - Manual DOM updates and state handling; more verbose than a framework for dynamic lists.
  - No component reuse abstraction — acceptable at this UI size, could feel limiting if the
    UI grows substantially later.
- **Effort/Complexity:** Low.
- **Risk:** Low.
- **Best suited when:** a small, mostly-CRUD desktop UI where minimizing dependencies and
  build complexity outweighs developer-ergonomics of a framework.

### Option 2B: Lightweight framework (Preact / Svelte / React) + Vite

- **Description:** Renderer is a small SPA built with a framework and bundled by Vite,
  output into `dist/electron/public/` and loaded by the `BrowserWindow`.
- **Strengths:**
  - Better ergonomics for reactive lists/forms; component reuse; HMR in dev.
  - Scales better if the UI grows well beyond the current scope.
- **Weaknesses:**
  - Adds a second build system (Vite) and a framework dependency tree — both `vite` and the
    framework are on the dependency-vetting "fast-moving / CVE-prone" watchlist, increasing
    the vetting and audit burden the request explicitly wants minimized.
  - Over-engineered for the current surface; introduces bundler/main-process and
    bundler/electron-builder integration concerns that the plain approach avoids.
  - No reference template (the reference uses plain `app.js`).
- **Effort/Complexity:** Medium.
- **Risk:** Medium (extra fast-moving deps: `vite` + framework).
- **Best suited when:** the UI is large/highly interactive or expected to grow into a
  substantial app — not the v1 scope here.

### Decision 2 — Recommendation: **Option 2A (plain HTML/CSS/TypeScript, no renderer bundler)**

The v1 UI surface is small and list/form-oriented, and the heavy lifting (byte-accurate
citation rendering) already lives in the main-process-reusable `citation-render.ts`. A
framework + Vite would add a second build system and two fast-moving CVE-prone dependencies
(`vite` + framework) for ergonomics this surface does not need, working against R19's
dependency-minimization intent. If the UI later grows substantially, migrating to Option 2B
is a contained follow-up. Author renderer logic in TypeScript for type-safety, compiled to
plain ES module `.js` (a dedicated renderer `tsconfig` with DOM lib and no NodeNext
resolution), keeping project TS-source discipline without pulling in a bundler.

---

## Decision 3 — Main-Process Bundling

### Option 3A: esbuild bundle `main.ts` → single `.mjs` (reference pattern), dev + packaged

- **Description:** Dev: a `launch.ts` runs `esbuild main.ts --bundle --platform=node
  --format=esm --packages=external` to a temp `.mjs`, then spawns the `electron` binary on
  it (reference `launch.ts`). Packaged: the build script esbuilds `main.ts` into
  `dist/electron/main.mjs` (referenced by `package.json` `"main"`), with `preload.cjs` and
  `public/` shipped via `electron-builder` `extraResources`.
- **Strengths:**
  - One self-contained main bundle — no cross-file ESM resolution surprises inside the
    Electron runtime; `--packages=external` keeps `electron` (and any native deps) external
    while inlining the project's own `src/core/**` modules.
  - Proven by the reference `launch.ts`; directly adaptable (drop the Express/port pieces,
    keep the bundle+spawn+macOS-rename logic).
  - Cleanly handles the strict-ESM `.js`-import-extension source: esbuild resolves the
    project's `.js`-suffixed specifiers against the `.ts` sources during bundling.
  - Electron's main process supports ESM/`.mjs` natively (Electron docs), so a `.mjs`
    bundle runs without a CJS shim.
- **Weaknesses:**
  - Two build steps for the Electron surface (esbuild for main, `tsc`/copy for the rest);
    one more moving part than a pure `tsc` output. Mitigated: the reference shows the
    pattern is small and stable.
  - esbuild is on the fast-moving watchlist — must be vetted/pinned (already a dependency of
    the chosen toolchain).
- **Effort/Complexity:** Low–Medium (reference template exists).
- **Risk:** Low.
- **Best suited when:** the main process imports project ESM modules and must run as a
  single reliable artifact inside Electron — exactly this case (it imports
  `src/core/backend/factory.ts` and friends).

### Option 3B: `tsc` compile `main.ts` → `dist/electron/main.js`

- **Description:** Let the existing `tsc` build emit `src/electron/main.ts` to
  `dist/electron/main.js` as part of the normal `npm run build`; `package.json` `"main"`
  points there; spawn the electron binary on it in dev.
- **Strengths:**
  - No extra bundler step for main; reuses the single `tsc` build the project already runs.
  - Simplest mental model — one compiler for all TS source.
- **Weaknesses:**
  - Emits many separate `.js` files with NodeNext ESM `.js`-suffixed specifiers; the
    Electron main runtime must resolve the full module graph at runtime, which is more
    fragile than a single bundle (path/extension and `node_modules` resolution edge cases
    inside the packaged `.app`).
  - Packaging must then ship the whole `dist/` graph (or carefully select it) rather than a
    single `main.mjs` — more `electron-builder` `files`/`extraResources` bookkeeping.
  - Diverges from the reference (which bundles), so its launch/packaging template is less
    directly reusable.
- **Effort/Complexity:** Low (build) / Medium (packaging correctness).
- **Risk:** Medium (runtime module-resolution fragility inside the packaged app).
- **Best suited when:** the main process is trivial and imports little project code — not
  the case here (it pulls in the core backend graph).

### Decision 3 — Recommendation: **Option 3A (esbuild bundle main.ts → `.mjs`)**

Bundling the main process into a single `.mjs` is the most robust way to run a main process
that imports the project's strict-ESM core modules inside the Electron runtime, both in dev
and inside a packaged `.app`. It is the reference's proven pattern and avoids the runtime
module-graph-resolution fragility of shipping many `tsc`-emitted files. **The `preload`
script ships as CJS (`preload.cjs`) verbatim via `extraResources` — NOT bundled** — because
a sandboxed preload runs as plain CommonJS with `require('electron')` and no ESM context
(confirmed by Electron docs and the reference). This keeps the preload sandbox-compatible
with zero extra bundling.

---

## Decision 4 — IPC Bridge Design Approach (high level)

### Option 4A: Typed `contextBridge` allowlist with a single generic `invoke` (reference pattern)

- **Description:** `preload.cjs` exposes `window.gemini = { invoke(channel, ...args),
  on(channel, listener) }` where `invoke` first asserts `channel ∈ INVOKE_CHANNELS` (an
  explicit `Set` of the ~12 backend operations: list/get/create/delete stores;
  list/get/upload/delete/replace documents; query; registry list/refresh/prune; list
  profiles + select active profile). A shared TypeScript `IpcChannel` union + per-channel
  request/response interfaces (structural, mirroring `src/core/types.ts`, per the project's
  structural-typing convention) type both ends. The main process registers one
  `ipcMain.handle` per channel that calls the in-process `IGeminiBackend`, catches
  `BackendError` subclasses, and returns `{ ok, data } | { ok:false, error:{ code, message } }`
  after `redactString`.
- **Strengths:**
  - Narrow, auditable surface — a compromised renderer can only reach allowlisted channels.
  - Single typed `invoke` keeps the bridge small while a TS channel union gives end-to-end
    type safety.
  - Directly matches the reference `preload.cjs` allowlist pattern (copy-adaptable).
  - Clean home for the request's redaction + typed-error-serialization rules (R13/R16):
    serialize only `{ code, message }`, never stack traces or `operationError`.
- **Weaknesses:**
  - The generic `invoke` is less self-documenting than one named method per operation; the
    channel union + per-channel types compensate.
- **Effort/Complexity:** Low–Medium.
- **Risk:** Low.

### Option 4B: One named `contextBridge` method per operation

- **Description:** `window.gemini = { listStores(), getStore(), createStore(), ... }` — a
  named bridged function per backend method.
- **Strengths:** Most self-documenting; explicit per-method signatures.
- **Weaknesses:** More boilerplate in preload; every new operation touches the bridge
  surface; diverges from the reference's compact allowlist. Functionally equivalent
  security to 4A (still an explicit allowlist, just enumerated as methods).
- **Effort/Complexity:** Medium.
- **Risk:** Low.

### Decision 4 — Recommendation: **Option 4A (typed allowlist + generic `invoke`)**

The allowlisted generic-`invoke` bridge is the reference's proven, minimal pattern and is
the natural fit for ~12 uniform request/response operations. Combined with a shared
TypeScript channel union + structural request/response types, it delivers end-to-end type
safety without per-method preload boilerplate, and centralizes the redaction + typed-error
serialization the request mandates. Window security settings: `contextIsolation: true`,
`nodeIntegration: false`, `sandbox: true`. The detailed channel contract (names, payload
shapes, event channels for upload `STATE_PENDING → STATE_ACTIVE` progress) is the design
phase's job.

---

## Comparison Matrix

### Decision 1 — Toolchain

| Criterion | 1A tsc/esbuild+builder | 1B electron-forge | 1C esbuild only |
|---|---|---|---|
| Fits existing `tsc → dist/` ESM build | High | Low–Medium | Medium |
| macOS-only/unsigned packaging control | High (declarative) | Medium | Low (bespoke) |
| New fast-moving deps to vet | Low (3) | High (forge+plugins+makers) | Low (esbuild) but high custom code |
| Reference template available | Yes | No | Half (launch only) |
| ESM friction | Low | Medium (documented) | Low |
| Maintenance simplicity | High | Medium | Low |
| Complexity / Risk | Medium / Low–Med | Med–High / Med | High / Med–High |

### Decision 2 — Renderer

| Criterion | 2A plain HTML/CSS/TS | 2B framework + Vite |
|---|---|---|
| Dependency/CVE surface | Minimal | Larger (vite + framework) |
| Fit with chosen toolchain | High (no 2nd build) | Medium (Vite integration) |
| Ergonomics for modest UI | Adequate | Better but unneeded |
| Reference template | Yes | No |
| Complexity / Risk | Low / Low | Medium / Medium |

### Decision 3 — Main bundling

| Criterion | 3A esbuild → .mjs | 3B tsc → dist/electron |
|---|---|---|
| Robust packaged-app module resolution | High (single bundle) | Medium (full graph) |
| Reuses existing build | Partial (adds esbuild step) | Full |
| Reference template | Yes | No |
| Packaging bookkeeping | Low (one file) | Higher |
| Complexity / Risk | Low–Med / Low | Low / Medium |

### Decision 4 — IPC

| Criterion | 4A allowlist + invoke | 4B named methods |
|---|---|---|
| Security (narrow allowlist) | High | High |
| Type safety | High (channel union) | High |
| Boilerplate | Low | Medium |
| Reference template | Yes | No |
| Complexity / Risk | Low–Med / Low | Medium / Low |

---

## Recommendation

Adopt the reference project's proven Electron topology, adapted to gemini-nav's direct-IPC
(no embedded Express) architecture:

1. **Toolchain:** `tsc` (project source) + `esbuild` (main bundle) + `electron` (dev/run) +
   `electron-builder` (macOS packaging). Three vettable dev-dependencies.
2. **Renderer:** plain HTML/CSS + TypeScript-authored renderer logic compiled to a plain ES
   module, no framework, no renderer bundler.
3. **Main bundling:** esbuild `main.ts` → single `.mjs` for dev (temp) and packaged
   (`dist/electron/main.mjs`); `preload.cjs` shipped verbatim as `extraResources`.
4. **IPC:** typed `contextBridge` allowlist with a generic `invoke`, a shared TS channel
   union, `{ ok, data | error:{code,message} }` envelopes, `redactString` on every payload,
   and `contextIsolation: true` / `nodeIntegration: false` / `sandbox: true`.

**Why this over alternatives:** it preserves the authoritative `tsc` ESM build, adds the
smallest fast-moving-dependency footprint (key, given the mandatory dependency-vetting rule),
gives precise single-target macOS packaging, and reuses a working, copy-adaptable
implementation from the sibling reference — de-risking every one of the four decisions. The
only deliberate divergence from the reference is dropping its embedded Express server in
favor of direct `ipcMain.handle → IGeminiBackend` calls, which simplifies the architecture
(codebase-scan §5).

**Conditions that would change the recommendation:** if the UI scope expanded
substantially (rich interactive views, many screens), Decision 2 should flip to Option 2B
(framework + Vite), which would in turn make electron-forge's Vite plugin (Decision 1B) more
attractive. If cross-platform/signed distribution became in-scope, re-evaluate
electron-builder's auto-update vs. electron-forge makers. Neither applies to v1.

**Caveats / prerequisites:** all of `electron`, `electron-builder`, and `esbuild` are
fast-moving and CVE-prone. Exact version pinning is the implementation phase's job, but the
**security posture flag** is raised here: the implementation MUST pull the latest stable
Electron major (40.x was the latest stable as of Jan 2026; verify the actual latest at
implementation time — the reference's electron@^41.1.1 is informational only, NOT
authoritative), confirm zero HIGH+ advisories before pinning a caret range, replicate/refresh
the reference's `overrides` (e.g. `@electron/asar`, `cacache`, `rimraf`, `global-agent`,
`brace-expansion`) for electron-builder's transitive tree, run `npm audit` to zero
HIGH-or-above advisories, and record the vetted-on date in `Issues - Pending Items.md`
(R19, Acceptance 10).

---

## Technical Research Guidance

This section signals whether deeper technical research is needed before planning and
implementation.

**Research needed**: Yes

The recommendation reuses a proven reference for the launch/packaging skeleton, but two
implementation-critical areas need current, version-specific depth that the investigation
did not (and should not) fully resolve: Electron's security/IPC model for the current major,
and the esbuild/electron-builder macOS configuration specifics. Both are new to this
project (no prior Electron surface), and both are exactly where subtle mistakes cause
security holes or non-runnable builds.

### Topic 1: Electron security & IPC best practices (current major)
- **Name**: Electron security model, contextBridge/IPC, preload & sandbox
- **Why**: The renderer must be fully sandboxed and reach the backend only through a narrow
  typed bridge (R14/R16, security-posture constraints). The exact, current-major-correct
  combination of `contextIsolation`, `sandbox`, `nodeIntegration`, a CJS `preload.cjs` with
  `require('electron')`, and `contextBridge` allowlisting must be verified against the
  Electron major actually pinned — the investigation surfaced a known footgun
  (`electron.shell`/API `undefined` in `preload.cjs` when the main process is ESM on
  Electron 36+, and sandboxed-preload ESM-context limitations) that the design must account
  for.
- **Focus**: `contextIsolation: true` + `sandbox: true` + `nodeIntegration: false` window
  config; CJS `preload.cjs` vs `.mjs` preload trade-offs and the sandboxed-preload plain-CJS
  constraint; `contextBridge.exposeInMainWorld` allowlist patterns; `ipcMain.handle`/
  `ipcRenderer.invoke` typed request/response; safe error serialization (no stack traces);
  the ESM-main-process + CJS-preload interaction caveats for the pinned major; CSP for the
  renderer; `webSecurity` and no-remote-content rules.
- **Depth**: Deep dive
- **Relevance**: Directly governs the secure IPC bridge (Decision 4) and the window
  configuration that the entire surface's security posture depends on.

### Topic 2: electron-builder macOS packaging + esbuild ESM main-process bundling
- **Name**: electron-builder macOS config & esbuild ESM main bundling
- **Why**: The chosen toolchain (Decision 1) and main-process bundling (Decision 3) must
  produce a runnable unsigned macOS `.app`/`.dmg` whose single `.mjs` main bundle correctly
  loads `preload.cjs` and `public/` from `extraResources`. The reference shows the shape but
  uses an older Electron and an embedded-Express variant; the gemini-nav direct-IPC variant
  on the current major needs verified configuration detail.
- **Focus**: `electron-builder` `build` key for macOS-only unsigned (`mac.target: dmg`/`zip`,
  `arch: arm64`, `identity: null`, `category`), `extraResources` vs `files` for `preload.cjs`
  + `public/`, output `directories`; resolving resource paths at runtime inside the packaged
  `.app` (`process.resourcesPath`); esbuild flags for an ESM main bundle
  (`--format=esm --platform=node --packages=external`) and what must stay external
  (`electron`, native modules) vs inlined (`src/core/**`); the dev `launch.ts` bundle+spawn
  pattern and macOS app-bundle rename/Info.plist handling; electron-builder transitive
  advisory overrides for the pinned versions.
- **Depth**: Intermediate
- **Relevance**: Governs whether `npm run` dev launch and the packaging command (Acceptance
  5 & 8) actually produce a runnable build, and underpins the dependency-vetting/audit
  requirement (R19, Acceptance 10).

---

## Implementation Considerations

**Key decisions still to be made (design phase):**
- The exact IPC channel list, payload/response type shapes, and any event channels (e.g.
  upload `STATE_PENDING → STATE_ACTIVE/STATE_FAILED` progress for R10).
- Renderer TypeScript build detail: a dedicated renderer `tsconfig` (DOM lib, plain ESM
  output) vs. authoring `app.js` directly; final `src/electron/public/` layout (A6).
- How the active profile is selected/switched and where the active-profile state lives
  (main-process singleton; backend re-created via `makeBackend(profile)` on switch).
- Error-state UI mapping for each typed error (`FileTooLargeError`,
  `UnsupportedMimeTypeError`, `RateLimitError`, `StoreLimitError`, `ConfigurationError`).

**Dependencies / prerequisites:**
- Add devDependencies after vetting: `electron` (latest stable major, verified clean),
  `electron-builder`, `esbuild`. No new runtime dependencies (the UI consumes existing
  `src/core/**`).
- Refresh the reference's `overrides` set against the pinned electron-builder version.
- Removal work (Part 1 of the refined request) should land first or alongside so
  `npm run build`/`typecheck` stay green (codebase-scan §5: delete `tests/agent/` specs
  before/with `src/agent/`).

**Potential pitfalls to watch for:**
- ESM-main-process + CJS-preload interaction on the pinned major (Topic 1 footgun:
  `electron.*` undefined in preload under some Electron 36+ ESM-main setups).
- Resource path resolution differs between dev (project tree) and packaged `.app`
  (`process.resourcesPath`); `preload.cjs` and `public/` must resolve correctly in both.
- API key material must never cross IPC; route every payload through `redactString`
  (R16) and serialize only `{ code, message }` from typed errors (R13).
- `electron-builder` transitive advisories — vet and override before marking complete.

**Suggested first steps:**
1. Dispatch the two technical-research topics above (parallelizable).
2. Vet + pin `electron`/`electron-builder`/`esbuild`; record vetted-on date.
3. Adapt reference `launch.ts` (drop Express/port; keep esbuild-bundle + spawn + macOS
   rename) and `preload.cjs` (swap channel allowlist to the ~12 gemini-nav channels).
4. Write `src/electron/main.ts` that calls `makeBackend(activeProfile)` and registers the
   `ipcMain.handle` channels.

---

## References

| # | Source | URL | What was learned |
|---|--------|-----|-----------------|
| 1 | Reference project `package.json` | `docs/reference/storage-navigator-ref/package.json` | Proven toolchain (electron@^41.1.1 + electron-builder@^26.8.2 + esbuild@^0.27.7), `build` key macOS config (`mac.target dmg`, `arch arm64`, `identity null`, `extraResources`), `overrides` set for builder's transitive tree |
| 2 | Reference `launch.ts` | `docs/reference/storage-navigator-ref/src/electron/launch.ts` | Dev pattern: esbuild `main.ts → temp .mjs` (`--bundle --platform=node --format=esm --packages=external`), spawn electron binary, macOS app-bundle rename + Info.plist patch |
| 3 | Reference `preload.cjs` | `docs/reference/storage-navigator-ref/src/electron/preload.cjs` | CJS contextBridge allowlist pattern: `Set` of invoke/event channels + generic `invoke`/`on` exposed on `window.electron` |
| 4 | Reference `main.ts` | `docs/reference/storage-navigator-ref/src/electron/main.ts` | `ipcMain.handle` registration + BrowserWindow pattern; embedded Express server (the part gemini-nav drops for direct IPC) |
| 5 | Electron Releases / timelines | https://www.electronjs.org/docs/latest/tutorial/electron-timelines | 8-week major cadence; latest-three majors supported; 40.0.0 stable Jan 13 2026 (latest at knowledge cutoff) |
| 6 | endoflife.date — Electron | https://endoflife.date/electron | Per-major EOL dates (e.g. 38 EOL Mar 2026, 39 EOL May 2026) to avoid pinning a near-EOL major |
| 7 | ES Modules (ESM) in Electron | https://www.electronjs.org/docs/latest/tutorial/esm | Main process supports ESM/`.mjs` natively; preload must be `.mjs` for ESM OR plain CJS; sandboxed preloads run as plain JS with `require('electron')`, no ESM context — bundle preload if external modules needed |
| 8 | Using Preload Scripts | https://www.electronjs.org/docs/latest/tutorial/tutorial-preload | contextBridge usage with context isolation; preload as the IPC setup point between main and renderer |
| 9 | Electron issue #47413 | https://github.com/electron/electron/issues/47413 | Footgun: `electron.shell` undefined in `preload.cjs` when main process uses ESM (Electron 36+) — design must verify against pinned major |
| 10 | electron-builder vs electron-forge (npmtrends) | https://npmtrends.com/electron-builder-vs-electron-forge | electron-builder ~2.2M weekly downloads vs electron-forge far fewer; builder is a packager ("bring your own tools"), forge is all-in-one scaffold |
| 11 | electron-forge releases | https://github.com/electron/forge/releases | Forge ESM-migration import bugs and webpack/Vite plugin ESM/CJS runtime errors that needed fixing — ESM-friction signal for a strict-ESM codebase |

---

## Original Request

Refined request: `docs/reference/refined-request-electron-ui-surface.md`
Codebase scan: `docs/reference/codebase-scan-electron-ui-surface.md`

> Original user request: "I want you to remove the TUI/agent part and build an electron ui interface"

Resolved decisions carried in from the refined request (not re-litigated here): backend
mode = in-process via `src/core/backend/factory.ts`; packaging = macOS-only runnable build;
profile management = selection-only (no API-key entry in UI); toolchain = decided by this
investigation.
