# electron-builder macOS Configuration & esbuild ESM Main-Process Bundling

> Technical research for the **gemini-nav** Electron desktop surface.
> Depth: Intermediate. Supports the investigation
> `docs/reference/investigation-electron-ui-surface.md`
> (Decision 1 = hand-rolled `tsc`/esbuild + electron + electron-builder;
> Decision 3 = esbuild-bundle `main.ts` → single `.mjs`).
>
> **Alignment with the investigation:** All findings in this document
> CONFIRM the investigation's recommended approach. No finding contradicts
> it. Two refinements are surfaced that the investigation did not fully
> resolve and that the design/implementation phase must act on:
> (1) esbuild does **not** auto-shim `__dirname` / `import.meta` for
> ESM-on-node output — a `banner` is required if main code uses them
> (the gemini-nav direct-IPC main must therefore resolve resources via
> `app.getAppPath()` / `process.resourcesPath`, **not** `__dirname`); and
> (2) because gemini-nav drops the reference's embedded Express server, the
> renderer is loaded with `loadFile()` over `file://` rather than
> `loadURL('http://localhost:…')`, which changes the path-resolution helper
> shape (documented in §4).

---

## Overview

The gemini-nav Electron surface needs two outputs from this toolchain:

1. **A dev launcher** — bundle `src/electron/main.ts` (strict ESM, NodeNext,
   `.js`-extension imports) to a runnable `.mjs` with esbuild, resolve the
   `electron` binary, and spawn it pointing at the bundle. Adapted from the
   reference `src/electron/launch.ts` (drop the Express/port pieces; the
   esbuild-bundle + spawn + clean-shutdown skeleton stays).

2. **A packaged, UNSIGNED macOS build** — `electron-builder` driven by a
   minimal `"build"` block in `package.json`, producing an `.app` (and
   optionally a `.dmg`/`.zip`) for arm64, with `preload.cjs` and the static
   `public/` renderer assets shipped as `extraResources`, and code signing /
   notarization disabled (`identity: null`).

The existing `tsc → dist/` build stays authoritative for the rest of the
source; esbuild only handles the single main-process bundle, and `tsc` (with
a renderer-targeted config) or a copy step handles the renderer assets.

**Verified package versions at research time (2026-06-21):**

| Package | Latest stable | Reference uses (informational) | Notes |
|---|---|---|---|
| `electron` | **42.4.1** | `^41.1.1` | Latest-3 majors supported ⇒ 42 / 41 / 40 in support. Pick the latest stable major at implementation time and re-vet. |
| `electron-builder` | **26.15.3** | `^26.8.2` | Same major (26.x) as the reference; refresh the patch + re-vet transitive overrides. |
| `esbuild` | **0.28.1** | `^0.27.7` | 0.x — treat minor bumps as potentially breaking; re-vet. |

> Exact pinning is the implementation phase's job (dependency-vetting rule).
> These numbers are the current-at-research baseline, not a frozen pin.

---

## Key Concepts

- **Main process bundle** — a single `.mjs` that Electron's main process runs.
  Electron's main process uses Node's ESM loader; a `.mjs` file (or a file under
  a `"type":"module"` package) runs as ESM with no CJS shim required.
- **`--packages=external` vs `--external:electron`** — `--packages=external`
  marks *every* bare `node_modules` import as external (not inlined); the
  project's own relative `./...` / `src/core/**` modules are still bundled.
  `--external:electron` marks only `electron`. For the main bundle you want
  `electron` external (it is injected by the Electron runtime, not resolvable
  from `node_modules` at runtime in a way you want to inline) **and** any
  native modules external. `--packages=external` is the broad, safe default the
  reference uses; you can narrow to `--external:electron` only if you
  deliberately want to inline pure-JS npm deps into the bundle.
- **`extraResources`** — files electron-builder copies verbatim into
  `<App>.app/Contents/Resources/` (resolved at runtime via
  `process.resourcesPath`). Use it for `preload.cjs` and `public/` because
  they must exist as real files on disk (a sandboxed preload is loaded by path;
  the renderer HTML is loaded by `file://` path).
- **`files`** — what goes inside the app's ASAR archive (the JS app code).
  `dist/**/*` + `package.json` go here.
- **`identity: null`** — disables macOS code signing, which in turn skips
  notarization (nothing signed to notarize). Required for an unsigned local
  build.
- **`app.isPackaged`** — `true` inside a packaged `.app`, `false` in dev. The
  single switch that drives all dev-vs-packaged path resolution.

---

## Focus Area 1 — esbuild flags to bundle a strict-ESM `main.ts` → runnable `.mjs`

### The command

```bash
esbuild src/electron/main.ts \
  --bundle \
  --platform=node \
  --format=esm \
  --target=node20 \
  --outfile=dist/electron/main.mjs \
  --packages=external \
  --sourcemap
```

Flag-by-flag:

| Flag | Purpose for the gemini-nav main bundle |
|---|---|
| `--bundle` | Inline the project's own modules (`src/core/backend/factory.ts`, types, citation-render, etc.) into one file so the packaged app does not have to resolve a multi-file ESM graph at runtime. |
| `--platform=node` | Generate Node-targeted code; **automatically marks Node built-ins (`fs`, `path`, `os`, `node:*`) as external** so they are not bundled (correct — they come from the runtime). |
| `--format=esm` | Emit `import`/`export`. Electron's main process runs `.mjs` as ESM natively. Required because the source is strict ESM. |
| `--target=node20` | Match the project's Node ≥ 20 floor. (Optionally target the exact Node bundled in the pinned Electron — Electron 42 ships Node 22.x; `node22` is also fine. Keep ≥ the project floor.) |
| `--outfile=dist/electron/main.mjs` | Single output the packaged `"main"` points at. In dev, the launcher writes to a temp path instead (§2). |
| `--packages=external` | Keep all `node_modules` deps (incl. `electron` and any native addon) external; inline only first-party relative imports. This is the reference's choice and the safest default. |
| `--sourcemap` | Emit `dist/electron/main.mjs.map` for debuggable stack traces. Use plain `--sourcemap` (external `.map`); avoid `inline` to keep the bundle lean. |

**Strict-ESM `.js`-extension imports resolve correctly.** esbuild resolves the
project's `.js`-suffixed specifiers (e.g. `import { makeBackend } from
"../core/backend/factory.js"`) against the corresponding `.ts` source during
bundling — no extra config needed. This is exactly the NodeNext source style
gemini-nav uses, and it is the reason bundling (Option 3A) is more robust than
shipping a `tsc`-emitted multi-file graph (Option 3B).

### CRITICAL pitfall: `__dirname` and `import.meta` are NOT auto-shimmed

> **This is the single most important finding for the main process.**

With `--format=esm --platform=node`, esbuild does **not** define `__dirname`,
`__filename`, or `require` (those are CJS-only), and it does **not** rewrite
`import.meta.url`/`import.meta.dirname` to anything special. If `main.ts` uses
`__dirname` it will be a `ReferenceError` at runtime; if it relies on
`import.meta.url` esbuild emits it verbatim (which *does* work under ESM, but
points at the **bundle's** location, not the original source file).

Two ways to handle it, in order of preference for gemini-nav:

**Option A (recommended) — don't use `__dirname` in the main process at all.**
Resolve all runtime resources from Electron's own APIs, which are
location-independent and correct in both dev and packaged contexts:

- `app.getAppPath()` → the app root (the `dist/` tree / ASAR in packaged).
- `process.resourcesPath` → `Contents/Resources` (where `extraResources` land).
- `app.isPackaged` → the dev-vs-packaged switch.

The reference `main.ts` already does this — it uses `process.cwd()` /
`process.resourcesPath`, never `__dirname` — which is why its esbuild ESM
bundle runs without a banner. gemini-nav should follow the same discipline
(see §4 for the exact helper).

**Option B — inject a banner that recreates the CJS globals** (only if some
bundled dependency needs them):

```bash
esbuild src/electron/main.ts --bundle --platform=node --format=esm \
  --outfile=dist/electron/main.mjs --packages=external \
  --banner:js="import{createRequire as ___cr}from'node:module';import{fileURLToPath as ___f}from'node:url';import{dirname as ___d}from'node:path';const require=___cr(import.meta.url);const __filename=___f(import.meta.url);const __dirname=___d(__filename);"
```

Note that under the banner, `__dirname` is the directory of the **bundle**
(`dist/electron/`), not of any original source file. For resource resolution
this is still wrong for the packaged case (resources live in
`Contents/Resources`, not next to `main.mjs`), which is why **Option A is
strongly preferred** — always resolve resources via the Electron path APIs,
not via `__dirname`.

### What stays external

- `electron` — always external (`--packages=external` covers it; or
  `--external:electron` explicitly). It is provided by the runtime.
- Node built-ins (`fs`, `path`, `os`, `node:*`) — automatically external under
  `--platform=node`.
- Native addons (`*.node`) — must be external; esbuild cannot bundle native
  binaries. gemini-nav's core has **no** native deps (it talks to Gemini over
  HTTPS), so this is a non-issue today, but keep `--packages=external` so a
  future native dep does not silently break the bundle.

---

## Focus Area 2 — Dev-launch pattern (`launch.ts`)

Adapt the reference `src/electron/launch.ts`. The gemini-nav version is
**simpler** because there is no Express server and therefore no port to pass,
and because the macOS app-bundle rename/Info.plist patch is a cosmetic nicety
(dock/Cmd-Tab name) that can be kept or dropped. Below is a trimmed,
direct-IPC version.

```ts
// src/electron/launch.ts
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Dev launcher: esbuild-bundle main.ts to a temp .mjs, then spawn the
 * Electron binary pointing at it. No port (direct IPC, no embedded server).
 */
export function launchElectronApp(): void {
  const projectRoot = path.resolve(__dirname, "..", "..");
  const electronMainTs = path.join(__dirname, "main.ts");

  // Resolve the Electron binary path. `require('electron')` returns the
  // absolute path to the platform binary when called from Node (not from
  // inside the Electron runtime).
  const electronBin = require("electron") as unknown as string;

  // Temp bundle at the project root (cleaned up on exit).
  const outFile = path.join(projectRoot, ".electron-main.mjs");

  console.log("Bundling Electron main process…");
  execSync(
    `npx esbuild "${electronMainTs}" --bundle --platform=node ` +
      `--format=esm --outfile="${outFile}" --packages=external --sourcemap`,
    { cwd: projectRoot, stdio: "pipe" },
  );

  // NOTE: gemini-nav resolves resources via app.getAppPath()/process.cwd()
  // (see §4), so the temp bundle location does not affect resource paths.

  const child = spawn(electronBin, [outFile], {
    stdio: "inherit",
    cwd: projectRoot, // dev resource base — main.ts uses cwd when !isPackaged
    env: { ...process.env },
  });

  const cleanup = () => {
    try { fs.unlinkSync(outFile); } catch { /* best-effort */ }
    try { fs.unlinkSync(`${outFile}.map`); } catch { /* best-effort */ }
  };

  child.on("exit", (code) => { cleanup(); process.exit(code ?? 0); });
  child.on("error", (err) => {
    console.error(`Failed to launch Electron: ${err.message}`);
    cleanup();
    process.exit(1);
  });
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
}
```

Key points adapted from the reference:

- **`require('electron')` returns the binary path** when called from a Node
  process (the `electron` npm package's main export). Spawning
  `electronBin [bundle]` is exactly how `npx electron .` works under the hood.
- **`stdio: "inherit"`** so the renderer/main `console.log` and crashes stream
  to the dev terminal.
- **Clean shutdown** — delete the temp bundle (and its sourcemap) on `exit`,
  `error`, `SIGINT`, `SIGTERM`. The reference also restores its macOS
  app-bundle rename here; gemini-nav only needs the temp-file cleanup unless it
  keeps the rename feature.
- **macOS app-bundle rename (optional, cosmetic).** The reference renames
  `Electron.app → "Storage Navigator.app"` and patches `Info.plist` so the
  dock tooltip / Cmd-Tab / menu-bar show the real product name in **dev**.
  This is purely cosmetic for the dev binary — the packaged build gets its name
  from `productName` automatically. Recommendation: **drop it for v1** to keep
  `launch.ts` minimal; `app.name = "Gemini Nav"` in `main.ts` covers the menu
  bar. If the dev dock tooltip matters, port the rename block verbatim (it is
  self-contained and has the SIGKILL-recovery logic already).
- **No esbuild auto-install fallback.** The reference lazily `npm install`s
  esbuild if missing. gemini-nav declares `esbuild` as a vetted devDependency,
  so drop the install-on-miss branch — if esbuild is absent the build should
  fail loudly (consistent with the no-silent-fallback convention).

> The launcher itself is run with `tsx` (a dev-only devDependency) in the
> `dev`/`ui` script (`tsx src/electron/launch.ts` via a tiny entry that calls
> `launchElectronApp()`), so `launch.ts` does not need pre-compiling.

---

## Focus Area 3 — electron-builder config for UNSIGNED macOS

### The minimal `build` block (in `package.json`)

```jsonc
{
  "main": "dist/electron/main.mjs",
  "build": {
    "appId": "com.giorgosmarinos.gemini-nav",
    "productName": "Gemini Nav",
    "directories": {
      "output": "release",
      "buildResources": "assets"
    },
    "files": [
      "dist/**/*",
      "package.json"
    ],
    "extraResources": [
      { "from": "src/electron/public",      "to": "public" },
      { "from": "src/electron/preload.cjs", "to": "preload.cjs" },
      { "from": "assets",                   "to": "assets" }
    ],
    "mac": {
      "target": [
        { "target": "dir", "arch": ["arm64"] }
      ],
      "category": "public.app-category.developer-tools",
      "icon": "assets/icon.icns",
      "identity": null,
      "hardenedRuntime": false,
      "gatekeeperAssess": false
    }
  }
}
```

Notes on each piece:

- **`main: "dist/electron/main.mjs"`** — points at the **esbuild bundle**, not
  a `tsc`-emitted `main.js`. The build script must therefore esbuild the main
  into `dist/electron/main.mjs` *before* `electron-builder` runs (see §6). The
  reference's `package.json` says `"main": "dist/electron/main.js"` because its
  `dist:mac` script runs `tsc` (which emits `main.js`); gemini-nav uses the
  esbuild `.mjs` instead, so the `"main"` field and the build script must agree
  on `.mjs`.
- **`identity: null`** — disables code signing. With nothing signed,
  notarization is automatically skipped. This is the unsigned-build switch.
- **`hardenedRuntime: false`** — recommended when unsigned. Hardened Runtime
  with no signature can prevent the app from launching; turning it off avoids
  that class of failure for a local-only build.
- **`gatekeeperAssess: false`** — skip the Gatekeeper assessment step during
  build (it would fail for an unsigned app and is irrelevant for local use).
- **`mac.target`** — choose based on the deliverable:
  - **`"dir"`** → produces just `release/mac-arm64/Gemini Nav.app` (an
    unpacked `.app`, no installer). **Fastest, smallest, no DMG tooling** —
    ideal for "a runnable unsigned build" (the stated requirement). Recommended
    default for v1.
  - **`"dmg"`** → also produces a `.dmg` disk image (the reference's choice).
    Nicer to hand someone, but pulls in more electron-builder machinery
    (`dmg-builder`, `app-builder-bin`) and takes longer. Use only if a
    distributable image is actually wanted.
  - **`"zip"`** → a zipped `.app`; useful for transport, lighter than `dmg`.
  - Recommendation: start with **`dir`** (matches "runnable build"); add
    `dmg`/`zip` later if distribution is needed.
- **`arch: ["arm64"]`** — Apple Silicon only (the stated target). Add `x64` or
  `universal` only if Intel/universal is later required; each extra arch
  multiplies build time and output size.
- **`category`** — sets `LSApplicationCategoryType` in `Info.plist`. Cosmetic;
  `public.app-category.developer-tools` is appropriate.
- **`directories.output: "release"`** — where artifacts land
  (`release/mac-arm64/…`). Keep out of `dist/` so it is not confused with the
  `tsc` output; gitignore it.
- **`directories.buildResources: "assets"`** — where electron-builder looks for
  build-time resources (e.g. the icon). The reference uses `assets/`.

### How `extraResources` resolves at runtime (dev vs packaged)

- **Packaged:** electron-builder copies each `extraResources` entry into
  `<App>.app/Contents/Resources/`. At runtime `process.resourcesPath` points
  there, so `public/` is at `path.join(process.resourcesPath, "public")` and
  the preload at `path.join(process.resourcesPath, "preload.cjs")`.
- **Dev:** there is no `Contents/Resources`; the files live in the source tree
  under `src/electron/`. `app.isPackaged` is `false`, so resolve from the
  project tree instead (the reference uses `process.cwd()` +
  `"src/electron"`). See §4 for the exact helper.

> `files` vs `extraResources`: the `dist/**/*` bundle goes in `files` (it is
> application code, packed into the ASAR). `preload.cjs` and `public/` go in
> `extraResources` because they must be **real files on disk** that Electron
> loads by path (`webPreferences.preload` and `loadFile`). A sandboxed preload
> and a `file://`-loaded HTML page cannot be read from inside the ASAR
> reliably, so keeping them as `extraResources` is the safe pattern the
> reference uses.

---

## Focus Area 4 — Resolving preload + renderer paths (dev vs packaged)

This is where gemini-nav **diverges from the reference**: the reference loads
the renderer from an embedded Express server
(`win.loadURL("http://localhost:" + port)`); gemini-nav has **no server** and
loads the static `index.html` directly over `file://` with `loadFile()`.

### The dev-vs-packaged resolution helper

```ts
// inside src/electron/main.ts
import { app, BrowserWindow } from "electron";
import * as path from "node:path";

// Single switch: packaged resources live in Contents/Resources
// (process.resourcesPath); dev resources live in the source tree.
//
//   Packaged:  RES_BASE = process.resourcesPath
//              ⇒ <App>.app/Contents/Resources/{public,preload.cjs,assets}
//   Dev:       RES_BASE = <projectRoot>/src/electron
//              ⇒ src/electron/{public,preload.cjs}; assets at <projectRoot>/assets
//
// Dev base uses app.getAppPath() (== projectRoot when launched via the
// launcher) rather than __dirname, because the esbuild ESM bundle does NOT
// shim __dirname (see §1). process.cwd() also works because the launcher
// spawns Electron with cwd = projectRoot.
const PROJECT_ROOT = app.getAppPath();

const RES_BASE = app.isPackaged
  ? process.resourcesPath
  : path.join(PROJECT_ROOT, "src", "electron");

const ASSET_BASE = app.isPackaged
  ? process.resourcesPath
  : PROJECT_ROOT;

const preloadPath = path.join(RES_BASE, "preload.cjs");
const indexHtml   = path.join(RES_BASE, "public", "index.html");
const iconPath    = path.join(ASSET_BASE, "assets", "icon.png");

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Gemini Nav",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,            // sandboxed ⇒ preload MUST be CJS (preload.cjs)
      preload: preloadPath,
    },
  });

  // Direct file:// load — no embedded server (the gemini-nav divergence).
  win.loadFile(indexHtml);
});
```

Caveats and reasoning:

- **`loadFile()` not `loadURL("http://…")`.** `loadFile` reads the HTML from a
  real path over the `file://` protocol. Because gemini-nav has no server,
  this is the correct loader. All backend access is via `window.gemini.invoke`
  (IPC), so the renderer never makes HTTP calls.
- **`app.getAppPath()` for the dev base** instead of `__dirname` — the ESM
  bundle does not provide `__dirname` (§1), and `app.getAppPath()` is correct
  in both contexts (it returns the project root in dev when the launcher sets
  `cwd`, and the ASAR/app root when packaged — but for *resources* we use
  `process.resourcesPath` in the packaged branch, sidestepping ASAR entirely).
- **`sandbox: true` ⇒ preload must be plain CJS** (`preload.cjs` with
  `require('electron')`). A sandboxed preload **cannot** use ESM imports
  (verified, Electron ESM docs). This is exactly why the preload ships as
  `preload.cjs` via `extraResources` and is **not** bundled by esbuild. Cross-
  reference: Topic 1 research covers the `contextBridge` allowlist details.
- **CSP / file:// considerations.** Under `file://` you cannot rely on an HTTP
  `Content-Security-Policy` response header; set CSP via a `<meta>` tag in
  `index.html` (e.g. `default-src 'self'; script-src 'self'`). Keep all
  renderer assets local (no remote `<script src="https://…">`), which the
  plain-HTML/CSS renderer (Decision 2) already satisfies.
- **Relative asset URLs in `index.html` work under `file://`** as long as
  `styles.css` / `app.js` are siblings in `public/` and referenced relatively
  (`./styles.css`, `./app.js`). Avoid absolute `/styles.css` paths — under
  `file://` `/` is the filesystem root, not `public/`.

---

## Focus Area 5 — Dependency & security hygiene

`electron-builder` historically pulls a deep transitive tree that has
accumulated advisories over time. The reference compensates with an
`overrides` block; gemini-nav must **refresh and re-vet** it against the pinned
`electron-builder` version (do not copy the versions blindly).

### Reference `overrides` (informational — re-vet every one)

```jsonc
"overrides": {
  "@electron/asar": "^4.2.0",
  "global-agent":   "^4.1.3",
  "rimraf":         "^6.1.3",
  "cacache":        "^20.0.4",
  "brace-expansion": "^5.0.6"
}
```

Why each is a typical watch-item in the electron-builder tree:

| Override | Why it shows up / why overridden |
|---|---|
| `@electron/asar` | ASAR packer; older lines pulled vulnerable deps. Force a current major. |
| `global-agent` | Proxy agent used by builder's downloader; old versions had advisory-bearing transitives. |
| `rimraf` | Old `rimraf` (≤3) pulls a `glob`/`brace-expansion` chain with ReDoS history. Force `^6`. |
| `cacache` | Download cache; older lines pulled vulnerable `tar`/`minipass`. Force a current major. |
| `brace-expansion` | ReDoS advisory (CVE in `<1.1.12` / `<2.0.2`); commonly forced project-wide. |
| `ejs` *(historical)* | Older electron-builder used `ejs` for templates with an RCE advisory. Modern 26.x may no longer pull it — **check** and add an override only if `npm ls ejs` shows a vulnerable version. |

### The vetting procedure (per the project dependency-vetting rule)

1. **Pin the latest stable major** of each fast-mover after verifying it is on
   a supported branch:
   - `electron` — pick the latest stable major (42.x at research time);
     confirm it is one of the latest-three supported majors via the Electron
     release schedule, and not near EOL.
   - `electron-builder` — latest 26.x patch (26.15.3 at research time).
   - `esbuild` — latest 0.28.x.
2. **Check advisories** for each candidate version
   (`npm audit --package <pkg>@<ver> --json`, GitHub Advisory DB, npm
   vulnerability tab). If a candidate has an unfixed HIGH+ advisory, bump to
   the next clean major or surface the trade-off.
3. **Install, then `npm audit`.** Inspect remaining advisories. For each HIGH+
   advisory that lives in a *transitive* dep, add/refresh an `overrides` entry
   forcing the fixed version. Re-run `npm audit` until **zero HIGH-or-above**.
   - Practical loop: `npm audit --omit=dev` first (runtime), then full
     `npm audit` (electron-builder/esbuild are devDeps, so most builder
     advisories are dev-only — still drive them to zero HIGH+ per the rule).
   - Use `npm ls <pkg>` to find which override version actually de-duplicates
     the tree (an override only helps if it satisfies all dependents' ranges).
4. **Caret-pin** against the verified-clean version
   (e.g. `"electron": "^42.4.1"`), not a bare major.
5. **Record the vetted-on date** in `Issues - Pending Items.md` under a
   "Dependency vetting log" section, and document each override's removal
   condition ("remove once electron-builder bundles `cacache` ≥ X").

> Because `electron`, `electron-builder`, and `esbuild` are all on the
> fast-moving watchlist, the reference's exact versions are **informational
> only**. Re-vet at implementation time; the procedure above — not a frozen
> version list — is the deliverable.

---

## Focus Area 6 — `package.json` wiring (scripts + main field)

```jsonc
{
  "type": "module",
  "main": "dist/electron/main.mjs",        // ← esbuild output, NOT tsc main.js
  "scripts": {
    // existing project build stays authoritative
    "build": "tsc",

    // bundle the main process to a runnable .mjs (packaged path)
    "build:electron-main": "esbuild src/electron/main.ts --bundle --platform=node --format=esm --target=node20 --outfile=dist/electron/main.mjs --packages=external --sourcemap",

    // compile renderer TS → public/*.js (DOM-targeted tsconfig) OR copy static
    "build:renderer": "tsc -p src/electron/tsconfig.renderer.json",

    // full electron build artifacts that electron-builder will package
    "build:electron": "npm run build && npm run build:electron-main && npm run build:renderer",

    // dev launcher (esbuild temp bundle + spawn electron) via tsx
    "dev:electron": "tsx src/electron/dev.ts",   // dev.ts calls launchElectronApp()

    // packaged, unsigned macOS build (arm64)
    "dist:mac": "npm run build:electron && electron-builder --mac --arm64"
  }
}
```

Wiring notes:

- **`"main"` must equal the esbuild output (`dist/electron/main.mjs`).** This
  is the one place the reference differs: it points at `dist/electron/main.js`
  because it bundles via `tsc`. gemini-nav's `dist:mac` runs
  `build:electron-main` (esbuild) so the `.mjs` exists before packaging.
- **`build:electron` ordering** — `tsc` first (core source), then esbuild the
  main bundle, then the renderer. electron-builder then packs `dist/**/*`
  (`files`) and copies `extraResources`.
- **`"type": "module"`** is already set project-wide. Note: with
  `"type":"module"`, a `main.js` would *also* be treated as ESM — but emitting
  `.mjs` is unambiguous and matches the bundle's `--format=esm`. Keep `.mjs`.
- **Renderer build** — a dedicated `src/electron/tsconfig.renderer.json` with
  `"lib": ["DOM","ES2022"]`, `"module": "ES2022"`, `"moduleResolution":
  "Bundler"` (or `Node`), `"outDir": "src/electron/public"` (so the compiled
  `app.js` sits next to `index.html` for `extraResources`). This keeps renderer
  TS type-safe without a bundler (Decision 2). Alternatively, if the renderer
  is hand-written plain JS, drop `build:renderer` and ship `app.js` verbatim.
- **`electron-builder --mac --arm64`** — CLI flags override the `build.mac`
  block's target/arch if both are present; keeping `arm64` in both is
  harmless and explicit.

---

## Best Practices

- **Never use `__dirname` in the ESM main bundle.** Resolve resources via
  `app.getAppPath()`, `process.resourcesPath`, and `app.isPackaged`. (§1, §4)
- **Keep `preload.cjs` as CJS and ship it via `extraResources`** — never bundle
  it. A sandboxed preload must be plain CJS. (§3, §4)
- **`identity: null` + `hardenedRuntime: false` + `gatekeeperAssess: false`**
  for a clean unsigned local build. (§3)
- **Prefer `mac.target: "dir"` for v1** — a runnable `.app` with no DMG
  tooling, the lightest path to the stated requirement. (§3)
- **Drive `npm audit` to zero HIGH+** before marking the toolchain complete;
  refresh `overrides` against the pinned versions; log the vetted-on date. (§5)
- **`--packages=external`** for the main bundle so `electron`, node built-ins,
  and any future native dep stay external. (§1)
- **Set a `<meta>` CSP** in `index.html` since `file://` has no response
  headers; keep all renderer assets local. (§4)
- **`stdio: "inherit"`** in the dev launcher so main/renderer logs reach the
  terminal; clean up the temp bundle on every exit path. (§2)

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---|---|---|
| `__dirname is not defined` in main | `ReferenceError` at startup of the packaged/dev app | Use `app.getAppPath()`/`process.resourcesPath`; or inject the CJS banner (§1) — but prefer the Electron path APIs. |
| Preload authored as ESM under `sandbox: true` | `window.gemini` undefined; preload silently fails to load | Keep `preload.cjs` (CJS); ship via `extraResources`. (§4) |
| Resources resolved from `__dirname`/bundle path in packaged app | `index.html`/`preload.cjs` not found inside `.app` | Packaged resources live in `process.resourcesPath`, not next to `main.mjs`. Use the `RES_BASE` helper. (§4) |
| Absolute `/styles.css` under `file://` | CSS/JS 404 in packaged app | Use relative `./styles.css`; `/` is filesystem root under `file://`. (§4) |
| Hardened Runtime on, unsigned | App won't launch / immediately quits | `hardenedRuntime: false` when `identity: null`. (§3) |
| Gatekeeper blocks first launch | "App is damaged / cannot be opened" on a fresh machine | Expected for unsigned apps: right-click → Open, or System Settings → Privacy & Security → "Open Anyway". Local dev machine usually fine. (§ Gatekeeper) |
| `"main"` points at `main.js` but esbuild emits `.mjs` | electron-builder packages, app fails: "cannot find module" | Set `"main": "dist/electron/main.mjs"` and ensure `build:electron-main` runs before packaging. (§6) |
| esbuild missing in CI but launcher auto-installs | Non-deterministic builds | Declare `esbuild` as a vetted devDependency; remove the install-on-miss fallback from `launch.ts`. (§2) |
| Stale `overrides` copied from reference | `npm audit` still flags HIGH+ | Re-vet every override against the pinned `electron-builder`; some may be unneeded, others missing. (§5) |

### Unsigned-app Gatekeeper behavior (macOS)

An **unsigned** (`identity: null`) `.app` triggers Gatekeeper on first launch
on macOS — especially if it carries the quarantine attribute (e.g. downloaded
or transferred). On the build machine itself a freshly-built unsigned `.app`
usually opens fine. On another machine you may need to **right-click → Open**
(then confirm) or approve it under **System Settings → Privacy & Security →
"Open Anyway"**. There is no way around this without a Developer ID signature +
notarization, which are explicitly **out of scope** for v1. If a build needs
to run on a clean machine without the dialog, that is the trigger to revisit
signing — note it as a known limitation, not a bug.

---

## Assumptions & Scope

| Assumption | Confidence | Impact if wrong |
|---|---|---|
| gemini-nav loads the renderer via `loadFile()`/`file://` (no embedded server, unlike the reference's `loadURL`) | HIGH | If a server is reintroduced, §4 reverts to the reference's `loadURL("http://localhost:port")` pattern and the CSP/relative-path notes change. The investigation explicitly drops Express, so this is well-grounded. |
| The main process can resolve all resources via Electron path APIs and avoid `__dirname` entirely | HIGH | If a bundled dep needs `__dirname`/`require`, the banner (§1 Option B) is required; resource resolution still must use the Electron APIs. |
| `sandbox: true` is the chosen window setting (preload must be CJS) | HIGH | If `sandbox` is later disabled, an ESM `.mjs` preload becomes possible — but the investigation/Topic-1 mandates `sandbox: true`, so CJS preload stands. |
| `mac.target: "dir"` satisfies "runnable unsigned build" | MEDIUM | If a distributable `.dmg`/`.zip` is actually wanted, switch the target (and accept the extra `dmg-builder` deps to vet). Stated requirement says "runnable", so `dir` is the lean default. |
| arm64-only is sufficient | HIGH | If Intel/universal is needed, add `x64`/`universal` arch (longer builds, larger output). Refined request says macOS-only runnable; arch not pinned, arm64 assumed (Apple Silicon dev machine). |
| Renderer TS compiled by a dedicated `tsconfig` to `public/` | MEDIUM | If the renderer is hand-written plain JS, drop `build:renderer`. Either way `extraResources` ships `public/`. Investigation Decision 2 leaves this to the design phase. |
| Electron 42.x is the right major to pin | MEDIUM | Verify at implementation time it is still a supported (latest-3) major and advisory-clean; 42/41/40 are in support as of research. The pin is the implementation phase's job. |

## Uncertainties & Gaps

- **Exact `overrides` set for the pinned electron-builder 26.15.3** is not
  verified line-by-line here (deliberately — pinning is the implementation
  phase's job). The reference's set is a starting point; some entries
  (e.g. `ejs`) may be obsolete in 26.x and others may be newly required. Run
  `npm ls` + `npm audit` after install to derive the authoritative set.
- **Electron 42's bundled Node version** (for the precise esbuild `--target`)
  was not independently confirmed; `node20` is safe (≥ project floor) and a
  conservative target. Bump to the exact bundled Node (`node22` for Electron 42
  per the typical Electron↔Node mapping) only if a newer language feature is
  needed — verify against the Electron release notes for the pinned version.
- **DMG-specific transitive advisories** (the `dmg-builder`/`app-builder-bin`
  chain) are only relevant if `mac.target` includes `dmg`; not audited here
  because `dir` is recommended for v1.
- The reference's **macOS app-bundle rename / Info.plist patch** is a dev-only
  cosmetic feature; whether gemini-nav keeps it is a design choice, not a
  technical blocker.

## Clarifying Questions for Follow-up

1. Is a distributable artifact (`.dmg`/`.zip`) required, or is a runnable
   `.app` (`mac.target: "dir"`) sufficient for v1? (Drives the target choice
   and the DMG-chain dependency-vetting scope.)
2. Is the build/run machine Apple Silicon only, or must the build also run on
   Intel / be universal? (Drives `arch`.)
3. Will the renderer be authored in TypeScript (needs a renderer `tsconfig` +
   `build:renderer` step) or hand-written plain JS (ship verbatim)?
4. Should the dev launcher keep the reference's cosmetic macOS app-bundle
   rename (dock/Cmd-Tab shows "Gemini Nav" in dev), or is `app.name` in the
   menu bar enough?
5. Does any current or planned `src/core/**` dependency include a native addon
   (`*.node`)? (If yes, it must stay external and may complicate packaging.)

---

## References

| # | Source | URL | Information gathered |
|---|--------|-----|---------------------|
| 1 | npm registry — electron | https://registry.npmjs.org/electron/latest | Latest stable electron = **42.4.1** (research-time baseline). |
| 2 | npm registry — electron-builder | https://registry.npmjs.org/electron-builder/latest | Latest stable electron-builder = **26.15.3**. |
| 3 | npm registry — esbuild | https://registry.npmjs.org/esbuild/latest | Latest stable esbuild = **0.28.1**. |
| 4 | Electron — ESM support | https://www.electronjs.org/docs/latest/tutorial/esm | Main process uses Node's ESM loader (`.mjs` or `"type":"module"`); sandboxed preloads **cannot** use ESM (must be CJS/bundled); ESM preloads must be `.mjs`; `await` before `ready`. |
| 5 | esbuild — API | https://esbuild.github.io/api/ | `--bundle`, `--platform=node` (auto-externals node built-ins), `--format=esm`, `--packages=external`, `--external`, `--target`, `--sourcemap` semantics. |
| 6 | esbuild issue #1492 / #3099 — import.meta.url | https://github.com/evanw/esbuild/issues/1492 | esbuild does **not** auto-shim `__dirname`/`import.meta.url` for ESM-node; banner needed if used. |
| 7 | DEV / community — esbuild cjs/esm node | https://dev.to/marcogrcr/nodejs-and-esbuild-beware-of-mixing-cjs-and-esm-493n | Banner pattern recreating `require`/`__filename`/`__dirname` via `createRequire`/`fileURLToPath`; cjs-vs-esm mixing caveats. |
| 8 | electron-builder — macOS docs | https://www.electron.build/docs/mac/ | `mac.target` (dmg/zip/dir), `identity`, `category`, arch; `extraResources` vs `files`. |
| 9 | electron-builder — code signing (mac) | https://www.electron.build/docs/features/code-signing/code-signing-mac/ | `identity: null` disables signing; unsigned ⇒ notarization skipped; `hardenedRuntime: false` + `gatekeeperAssess: false` for unsigned builds; Apple-Silicon "Open Anyway" approval. |
| 10 | Electron — version timelines | https://www.electronjs.org/docs/latest/tutorial/electron-timelines | Latest-3 stable majors supported; 8-week major cadence; check release schedule for EOL before pinning. |
| 11 | Reference `launch.ts` | docs/reference/storage-navigator-ref/src/electron/launch.ts | Dev pattern: esbuild `main.ts → temp .mjs` (`--bundle --platform=node --format=esm --packages=external`), resolve `electron` binary via `require('electron')`, spawn, clean shutdown; macOS rename (cosmetic). |
| 12 | Reference `main.ts` | docs/reference/storage-navigator-ref/src/electron/main.ts | `app.isPackaged ? process.resourcesPath : process.cwd()+'src/electron'` resource resolution; preload resolved from same base; uses `process.cwd()`, never `__dirname`. |
| 13 | Reference `preload.cjs` | docs/reference/storage-navigator-ref/src/electron/preload.cjs | CJS `contextBridge` allowlist (`require('electron')`) shipped via `extraResources`, not bundled. |
| 14 | Reference `package.json` | docs/reference/storage-navigator-ref/package.json | `build` block (appId, productName, directories.output `release`, files `dist/**/*`, extraResources public+preload.cjs+assets, mac dmg/arm64/identity null), `overrides` set for builder's transitive tree, `dist:mac` script. |

### Recommended for Deep Reading

- **Electron ESM tutorial (ref #4)** — the authoritative source on why the
  preload must be CJS under `sandbox: true` and how the ESM main loader behaves;
  governs the §4 window config.
- **electron-builder macOS + code-signing docs (refs #8, #9)** — the exact
  `identity: null` / `hardenedRuntime` / target semantics for the unsigned
  build; the basis for the §3 `build` block.
- **esbuild API + import.meta.url issue (refs #5, #6)** — confirms the
  no-`__dirname`-shim behavior that drives the §1/§4 "use Electron path APIs"
  rule (the single most consequential finding).
