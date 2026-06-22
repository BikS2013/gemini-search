# Electron Security Model, contextBridge/IPC, Preload & Sandbox (Current Major)

> Technical research supporting the **Electron desktop UI surface** for `gemini-nav`
> (investigation: `docs/reference/investigation-electron-ui-surface.md`, Topic 1).
> Chosen approach under research: esbuild-bundled **ESM `main.ts` → `.mjs`**, a verbatim
> **CJS `preload.cjs`**, a plain HTML/CSS/TS renderer (no framework), and a typed
> `contextBridge` allowlist exposing a generic `invoke(channel, …)` over ~12 backend
> operations, with `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.

**Research date:** 2026-06-21
**Depth:** Deep dive

---

## Overview

Electron splits an app into a privileged **main process** (full Node.js + Electron APIs)
and one or more **renderer processes** (a Chromium page). The single most important security
boundary in a modern Electron app is the line between these two: the renderer must be treated
as **untrusted** (anything that runs there — including an injected XSS payload — must not be
able to touch Node, the filesystem, or, for `gemini-nav`, the Gemini API key), and the only
sanctioned channel between renderer and main is a **narrow, typed IPC bridge** installed by a
**preload script** through `contextBridge`.

For `gemini-nav` this maps cleanly: the **main process** owns `IGeminiBackend` (via
`makeBackend(profile)`) and therefore owns all API-key material; the **renderer** is a
sandboxed page that can only call ~12 allowlisted operations through
`window.gemini.invoke(channel, …)`. This document establishes the current-major-correct,
secure-by-default configuration for that topology, the end-to-end IPC code, the
ESM-main/CJS-preload footgun and its workaround, and the serialization/redaction rules for
data crossing the bridge.

---

## Current Stable Major (verified at research time)

| Fact | Value (verified 2026-06-21) |
|---|---|
| Latest stable Electron major | **42** (v42.4.1, released 2026-06-16; Chromium 148, Node 24.16) |
| Previous supported majors | **41** (v41.8.0, Chromium 146, Node 24.16) and **40** (v40.10.4, Chromium 144, Node 24.15) |
| Support window | Latest **three** stable majors are supported (8-week major cadence) |
| ESM support introduced | Electron 28.0.0 |
| `contextIsolation: true` default | Electron 12+ |
| `sandbox: true` default (when `nodeIntegration` not enabled) | Electron 20+ |
| `nodeIntegration: false` default | Electron 5+ |

**Recommendation for the pin:** target the **current stable major at implementation time**
(42 as of this research). All of 40, 41, and 42 are in support; the investigation's note that
"40.x was latest as of Jan 2026" is now superseded — 42 is latest. The reference project's
`electron@^41.1.1` is informational only and is now one major behind. Whatever major is
pinned, the security configuration in this document is identical across 40–42; the only
version-sensitive item is the **ESM-main/CJS-preload footgun** (below), which affects
**Electron 36+** and therefore all candidate majors — so the workaround applies regardless of
which of 40/41/42 is chosen.

> Sources: [Electron Releases](https://releases.electronjs.org/),
> [Electron timelines](https://www.electronjs.org/docs/latest/tutorial/electron-timelines),
> [endoflife.date/electron](https://endoflife.date/electron).

---

## Key Concepts

- **Main process** — Node.js environment, owns `BrowserWindow`, `ipcMain`, `app`, `shell`,
  and (for gemini-nav) the `IGeminiBackend` instance and the API key. Bundled ESM `.mjs`.
- **Renderer process** — Chromium page (`file://` HTML for gemini-nav). Untrusted. No Node.
- **Preload script** — runs in the renderer's process **before** the page loads, but in a
  separate, privileged JavaScript world (under context isolation). It is the *only* place
  allowed to call `contextBridge.exposeInMainWorld` and `ipcRenderer`. CJS `preload.cjs`.
- **`contextIsolation`** — runs the preload and Electron internals in a JS context that is
  isolated from the page's `window`. Without it, the page could monkey-patch built-ins the
  preload relies on. **Must be `true`.**
- **`sandbox`** — runs the renderer (and a *sandboxed* preload) in an OS-level Chromium
  sandbox with Node disabled. A sandboxed preload runs as **plain CommonJS** with a
  **limited `require`** (only `electron` and a few polyfilled modules). **Must be `true`.**
- **`nodeIntegration`** — when `false`, the page cannot use `require`/`process`/Node globals.
  **Must be `false`.**
- **`contextBridge`** — the API that copies a frozen, structured-clone-style object from the
  preload's world into the page's `window`, forming the typed bridge.

---

## Core configuration: the secure window

This is the canonical `webPreferences` block. Every value here is the Electron-recommended
secure setting; deviating from any of them weakens the boundary.

```ts
// src/electron/main.ts  (bundled to dist/electron/main.mjs)
import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // ESM has no __dirname

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      // --- The three load-bearing security flags (all are also the modern defaults) ---
      contextIsolation: true,      // isolate preload world from page world
      sandbox: true,               // OS sandbox; preload runs as limited CJS
      nodeIntegration: false,      // no Node in the renderer

      // --- Defense in depth: keep these at their secure defaults, set explicitly ---
      webSecurity: true,                 // enforce same-origin policy (NEVER disable)
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      // nodeIntegrationInWorker: false, // (default) no Node in web workers either
      // nodeIntegrationInSubFrames: false, // (default)

      // --- The preload: see the ESM/CJS footgun section for why this path is resolved
      //     against process.resourcesPath in the packaged app ---
      preload: resolvePreloadPath(),
    },
  });

  win.loadFile(resolveRendererIndex()); // file:// renderer, no remote URL
  hardenWindow(win);
  return win;
}
```

### Why each flag matters (Electron security checklist)

| Flag | Value | Rationale |
|---|---|---|
| `contextIsolation` | `true` | The page cannot tamper with the preload's privileged context; the only thing it sees is the frozen object you `exposeInMainWorld`. Default since Electron 12. |
| `sandbox` | `true` | Renderer + preload run in the Chromium OS sandbox; even a renderer RCE is contained. Default since Electron 20 (when Node integration is off). |
| `nodeIntegration` | `false` | Prevents an XSS in the renderer from escalating to filesystem/RCE. Default since Electron 5. |
| `webSecurity` | `true` | Keeps the same-origin policy on. Disabling it is a classic footgun that opens the renderer to cross-origin attacks. |
| `allowRunningInsecureContent` | `false` | No mixed-content downgrade. |
| `experimentalFeatures` | `false` | No Blink experimental features (larger attack surface). |

> Source: [Electron Security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

---

## Why the preload must be CJS under sandbox (and its limited `require`)

This is the crux of focus areas #3 and #4. The rules, straight from the official ESM tutorial:

- **A sandboxed preload cannot use ESM `import` at all.** It "runs as plain JavaScript
  without an ESM context." There is no ESM loader available to it. Therefore the preload
  must be authored as **CommonJS** — hence `preload.cjs`, shipped verbatim (not bundled).
- **The `electron` module is still reachable via `require('electron')`** inside a sandboxed
  preload. This is a *limited* `require`: it resolves only the `electron` module and a small
  set of Node built-ins that Electron polyfills for the sandbox (e.g. `events`, `timers`,
  `url`). **It cannot `require` arbitrary npm packages or your own project files.** If a
  preload genuinely needed external modules, you would have to *bundle* them into the preload
  — but the gemini-nav preload deliberately needs nothing beyond `contextBridge` and
  `ipcRenderer`, so it ships unbundled.
- By contrast, an **unsandboxed** preload must use the `.mjs` extension to be ESM (and
  `"type": "module"` is *ignored* for preloads). Since gemini-nav uses `sandbox: true`, this
  path does not apply — the preload is plain CJS.

**Net rule for gemini-nav:** `sandbox: true` ⇒ preload is `preload.cjs`, CommonJS,
`require('electron')` only, no project imports, shipped as-is via `extraResources`. This is
exactly what Decision 3 of the investigation specified, and it is *required*, not optional,
under the chosen sandbox setting.

> Source: [ES Modules in Electron](https://www.electronjs.org/docs/latest/tutorial/esm).

---

## The ESM-main + CJS-preload footgun (Electron issue #47413)

### What breaks

When the **main process is ESM** (`main.mjs` / `"type": "module"`) and the **preload is
CJS** (`preload.cjs`), on **Electron 36+**, certain Electron sub-APIs accessed via the
destructured/property form inside the preload can come back **`undefined`** — the reported
case is `require('electron').shell` being `undefined` while `contextBridge` and
`ipcRenderer` work fine. (Reported on Electron 36+, Windows 10 x64; tracked as
[electron/electron#47413](https://github.com/electron/electron/issues/47413).)

### Why it happens

The preload's limited `require('electron')` returns a process-type-specific binding. The
renderer/preload binding of the `electron` module legitimately exposes only the subset of
APIs valid in a preload context (`contextBridge`, `ipcRenderer`, `webFrame`, `webUtils`).
**`shell` is a main-process API and was never meant to be available in a sandboxed
preload** — so its being `undefined` there is, in large part, *correct behavior* rather than
a pure bug. The issue #47413 confusion arises because the same `require('electron').shell`
shape *appeared* to work in some older/unsandboxed/CJS-main setups, and the ESM-main
migration made the (correct) preload-context restriction more visible. The Electron team
closed #47413 as **"not planned" / needs-repro**, consistent with "the API was never
supposed to be there."

The practical, generalized footgun is therefore twofold:

1. **Do not expect main-process-only APIs (`shell`, `app`, `dialog`, `BrowserWindow`, `Menu`,
   `clipboard` in some modes) to be available inside a sandboxed CJS preload via
   `require('electron')`.** Only `contextBridge`, `ipcRenderer`, `webFrame`, and `webUtils`
   are dependable in a preload.
2. **Mixed module systems (ESM main + CJS preload) are supported, but the boundary is the
   `require('electron')` *binding shape*, not the file extension.** The ESM main bundle and
   the CJS preload do not share a module graph; the preload cannot import anything from the
   main bundle.

### Recommended workaround / design rule (applies to all of Electron 40/41/42)

The robust pattern — which sidesteps #47413 entirely and aligns with the security model —
is: **never reach for a main-process API inside the preload. Route it through IPC.**

- If the renderer needs to open an external URL (the typical reason to want `shell`), expose
  an IPC channel and call `shell.openExternal` **in the main process**, after validating the
  URL:

  ```ts
  // main.ts (ESM, has full `shell`)
  import { ipcMain, shell } from 'electron';
  ipcMain.handle('shell:openExternal', (event, url: string) => {
    assertTrustedSender(event);                 // see sender validation below
    const u = new URL(url);                      // throws on garbage
    if (u.protocol !== 'https:') throw new Error('refused');
    return shell.openExternal(u.toString());     // runs in main, never in preload
  });
  ```

  ```cjs
  // preload.cjs (CJS, only contextBridge + ipcRenderer)
  const { contextBridge, ipcRenderer } = require('electron'); // shell intentionally NOT required
  // exposed as part of the allowlisted invoke() below
  ```

- Keep the preload's `require('electron')` to **only** `{ contextBridge, ipcRenderer }`.
  Destructuring those two is reliable on 40/41/42 with an ESM main. Anything else belongs in
  main.

This rule means gemini-nav's preload is immune to #47413 by construction: it never touches
`shell`, `app`, or any main-only API. (gemini-nav's surface has no obvious need for
`openExternal`; if one appears, the IPC route above is the answer.)

> Sources: [electron/electron#47413](https://github.com/electron/electron/issues/47413),
> [ES Modules in Electron](https://www.electronjs.org/docs/latest/tutorial/esm).

### A second, related ESM-main caveat (timing)

Because **ESM main entry imports load asynchronously**, only side effects from the entry
point's *imports* are guaranteed to run before the `ready` event. Use `await app.whenReady()`
(rather than the `app.on('ready', …)` callback alone) and `await` any dynamic imports needed
before window creation, or APIs like `app.setPath(...)` may run too late. For gemini-nav this
means the `makeBackend(activeProfile)` setup and window creation should sit inside an
`await app.whenReady().then(...)` flow.

```ts
await app.whenReady();
const backend = await makeBackend(activeProfile); // backend ready before window/IPC use
registerIpcHandlers(backend);
createWindow();
```

> Source: [ES Modules in Electron — async import caveat](https://www.electronjs.org/docs/latest/tutorial/esm).

---

## End-to-end IPC: the typed generic-invoke bridge

This section delivers focus area #2 — `contextBridge.exposeInMainWorld` exposing a typed
`invoke(channel, …args)` over an allowlist, plus safe event subscription — shown
end-to-end across **preload.cjs → main `ipcMain.handle` → renderer usage**.

### 1. Shared channel contract (TypeScript, imported by main + renderer types only)

Author one shared union of channel names and a discriminated request/response map. The
preload itself is plain CJS and only needs the *runtime* allowlist `Set`, but main and the
renderer's `.d.ts` use the types for end-to-end safety.

```ts
// src/electron/ipc-contract.ts  (compiled with the project; types used by main + renderer)
export type InvokeChannel =
  | 'stores:list' | 'stores:get' | 'stores:create' | 'stores:delete'
  | 'docs:list'   | 'docs:get'   | 'docs:upload'   | 'docs:delete' | 'docs:replace'
  | 'query:run'
  | 'registry:list' | 'registry:refresh' | 'registry:prune'
  | 'profiles:list' | 'profiles:select';

export type EventChannel = 'upload:progress'; // main → renderer push

// Standard envelope crossing the bridge (see serialization section)
export type IpcOk<T>  = { ok: true;  data: T };
export type IpcErr    = { ok: false; error: { code: string; message: string } };
export type IpcResult<T> = IpcOk<T> | IpcErr;
```

The **runtime allowlist** that the CJS preload uses must be a plain literal (no TS import at
runtime, since the preload is unbundled CJS):

```cjs
// these literals MUST stay in sync with InvokeChannel above (single source of truth lives
// in ipc-contract.ts; this list is a runtime mirror inside the preload)
const INVOKE_CHANNELS = new Set([
  'stores:list', 'stores:get', 'stores:create', 'stores:delete',
  'docs:list', 'docs:get', 'docs:upload', 'docs:delete', 'docs:replace',
  'query:run',
  'registry:list', 'registry:refresh', 'registry:prune',
  'profiles:list', 'profiles:select',
]);
const EVENT_CHANNELS = new Set(['upload:progress']);
```

### 2. `preload.cjs` (CommonJS, sandbox-compatible, verbatim)

```cjs
// src/electron/preload.cjs  — shipped verbatim via extraResources, NOT bundled.
'use strict';
const { contextBridge, ipcRenderer } = require('electron'); // ONLY these two (see #47413)

const INVOKE_CHANNELS = new Set([
  'stores:list', 'stores:get', 'stores:create', 'stores:delete',
  'docs:list', 'docs:get', 'docs:upload', 'docs:delete', 'docs:replace',
  'query:run',
  'registry:list', 'registry:refresh', 'registry:prune',
  'profiles:list', 'profiles:select',
]);
const EVENT_CHANNELS = new Set(['upload:progress']);

contextBridge.exposeInMainWorld('gemini', {
  /**
   * Generic typed invoke gated by an allowlist. A compromised renderer can only ever
   * reach channels in INVOKE_CHANNELS — never arbitrary IPC.
   */
  invoke(channel, ...args) {
    if (!INVOKE_CHANNELS.has(channel)) {
      // Reject unknown channels at the bridge, before any IPC is sent.
      return Promise.reject(new Error(`Blocked IPC channel: ${String(channel)}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * Safe event subscription. We wrap ipcRenderer.on so the renderer never receives the
   * Electron `event` object (which would leak event.sender / ipcRenderer). Only the
   * payload is forwarded to the caller's callback.
   * Returns an unsubscribe function.
   */
  on(channel, callback) {
    if (!EVENT_CHANNELS.has(channel)) {
      throw new Error(`Blocked event channel: ${String(channel)}`);
    }
    if (typeof callback !== 'function') {
      throw new TypeError('listener must be a function');
    }
    const listener = (_event, payload) => callback(payload); // drop _event on purpose
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
```

Key safety properties of this preload:

- **Raw `ipcRenderer` is never exposed** — only the two wrapper methods. Exposing
  `ipcRenderer.on`/`ipcRenderer.send` directly is explicitly called out as dangerous because
  it hands the page the whole IPC event system.
- **Channel names are validated against an allowlist** both for `invoke` and `on`.
- **The Electron `event` object is stripped** before the payload reaches the renderer
  callback — preventing the `event.sender` → `ipcRenderer` leak documented by Electron.
- It uses **only `contextBridge` + `ipcRenderer`** from `require('electron')`, so it is
  immune to the #47413 `shell`-undefined footgun.

### 3. Main process `ipcMain.handle` registration

```ts
// src/electron/ipc-handlers.ts  (bundled into main.mjs)
import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { IGeminiBackend } from '../core/backend/types.js';
import type { InvokeChannel, IpcResult } from './ipc-contract.js';
import { redactString } from '../core/redact.js'; // existing project redaction
import { BackendError } from '../core/errors.js';   // base of typed backend errors

/** Validate that an IPC message came from our own window, not a rogue/iframe sender. */
function assertTrustedSender(event: IpcMainInvokeEvent, expectedUrl: string): void {
  const senderUrl = event.senderFrame?.url ?? '';
  if (!senderUrl.startsWith(expectedUrl)) {
    throw new Error('Untrusted IPC sender');
  }
}

/** Wrap a backend call into the standard envelope, redacting + flattening typed errors. */
async function run<T>(fn: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };               // (callers must ensure data is clone-safe)
  } catch (err) {
    if (err instanceof BackendError) {
      // Serialize ONLY code + message; never the stack, cause, or operationError.
      return { ok: false, error: { code: err.code, message: redactString(err.message) } };
    }
    // Unknown error: opaque, redacted message; never leak internals to the renderer.
    return { ok: false, error: { code: 'INTERNAL', message: 'Internal error' } };
  }
}

export function registerIpcHandlers(backend: IGeminiBackend, rendererUrl: string): void {
  const handle = <T>(channel: InvokeChannel,
                     fn: (e: IpcMainInvokeEvent, ...a: any[]) => Promise<T>) =>
    ipcMain.handle(channel, (event, ...args) => {
      assertTrustedSender(event, rendererUrl);
      return run(() => fn(event, ...args));
    });

  handle('stores:list',   () => backend.listStores());
  handle('stores:get',    (_e, id: string) => backend.getStore(id));
  handle('stores:create', (_e, input) => backend.createStore(input));
  handle('stores:delete', (_e, id: string) => backend.deleteStore(id));

  handle('docs:list',    (_e, storeId: string) => backend.listDocuments(storeId));
  handle('docs:get',     (_e, storeId: string, docId: string) => backend.getDocument(storeId, docId));
  handle('docs:upload',  (_e, storeId: string, file) => backend.uploadDocument(storeId, file));
  handle('docs:delete',  (_e, storeId: string, docId: string) => backend.deleteDocument(storeId, docId));
  handle('docs:replace', (_e, storeId: string, docId: string, file) => backend.replaceDocument(storeId, docId, file));

  handle('query:run',    (_e, storeId: string, q) => backend.query(storeId, q));

  handle('registry:list',    () => backend.registryList());
  handle('registry:refresh', () => backend.registryRefresh());
  handle('registry:prune',   () => backend.registryPrune());

  handle('profiles:list',   () => backend.listProfiles());
  handle('profiles:select', (_e, name: string) => backend.selectProfile(name));
}
```

Two security practices are folded in here, both from the Electron checklist:

- **Sender validation** (`assertTrustedSender`) — confirm `event.senderFrame.url` is the
  expected `file://` renderer before acting. This blocks any rogue frame from invoking
  handlers.
- **Typed error flattening + redaction** — the renderer only ever receives
  `{ code, message }` (redacted), never a stack trace, `cause`, or a raw backend
  `operationError` that could leak the API key, a request URL with a key in it, etc.

### 4. Pushing events (upload progress) main → renderer

```ts
// somewhere in docs:upload handling, as the upload transitions STATE_PENDING → STATE_ACTIVE
function emitUploadProgress(win: BrowserWindow, payload: { docId: string; state: string; pct?: number }) {
  if (!win.isDestroyed()) {
    win.webContents.send('upload:progress', payload); // clone-safe plain object only
  }
}
```

### 5. Renderer usage (typed, no Node, no raw ipcRenderer)

```ts
// src/electron/public/app.ts  (compiled to plain ESM .js, DOM lib only)
import type { InvokeChannel, EventChannel, IpcResult } from '../ipc-contract.js';

// Ambient typing for the bridged object that preload.cjs installed on window.
declare global {
  interface Window {
    gemini: {
      invoke<T = unknown>(channel: InvokeChannel, ...args: unknown[]): Promise<IpcResult<T>>;
      on(channel: EventChannel, cb: (payload: unknown) => void): () => void;
    };
  }
}

async function listStores() {
  const res = await window.gemini.invoke<Store[]>('stores:list');
  if (!res.ok) {
    showError(res.error.code, res.error.message); // map typed error code → UI state
    return;
  }
  renderStores(res.data);
}

// Event subscription (returns an unsubscribe fn)
const unsubscribe = window.gemini.on('upload:progress', (p) => {
  updateProgressBar(p as { docId: string; state: string; pct?: number });
});
// call unsubscribe() when leaving the upload view
```

The renderer **never** sees `ipcRenderer`, `require`, `process`, or Node — only the frozen
`window.gemini` object with two methods.

> Sources: [Inter-Process Communication](https://www.electronjs.org/docs/latest/tutorial/ipc),
> [contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge),
> [Security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

---

## Window hardening: navigation, new-windows, CSP, webPreferences

Focus area #5. Three layers beyond the `webPreferences` flags.

### 1. Block navigation and new windows

A sandboxed renderer should never navigate away from your local page or spawn windows to
arbitrary origins. Install handlers on every window's `webContents`:

```ts
function hardenWindow(win: BrowserWindow): void {
  // Refuse to open ANY new window from renderer-initiated window.open / target=_blank.
  win.webContents.setWindowOpenHandler(({ url }) => {
    // If you ever need to open trusted external links, validate + shell.openExternal here
    // (in main), then still deny the in-app window:
    // if (isTrustedHttpsUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Refuse navigation away from the local renderer file.
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = resolveRendererIndex();           // your file:// index
    if (!url.startsWith('file://') || !url.includes('index.html')) {
      event.preventDefault();
    }
  });

  // Optional: refuse attaching webviews entirely.
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
}
```

### 2. Content Security Policy for the `file://` renderer

Even a `file://` renderer benefits from a strict CSP to neutralize injected `<script>` /
inline handlers / remote resource loads. Because gemini-nav loads no remote content, the CSP
can be very tight. Prefer setting it via response headers from the main process; for a pure
`file://` page, a `<meta>` tag in `index.html` is the practical option:

```html
<!-- src/electron/public/index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               script-src 'self';
               style-src 'self';
               img-src 'self' data:;
               font-src 'self';
               connect-src 'none';
               base-uri 'none';
               form-action 'none';
               frame-ancestors 'none';">
```

- `default-src 'none'` — deny everything by default; allowlist only what the local UI needs.
- `script-src 'self'` — only the bundled renderer script; **no inline scripts, no `eval`**.
  (This forbids inline `onclick=` handlers — wire events with `addEventListener` in `app.ts`.)
- `connect-src 'none'` — the renderer makes **no network calls of its own**; all backend
  traffic goes through main via IPC. This is a strong guarantee for gemini-nav: the API key
  lives in main, and the renderer cannot open its own connection to Gemini or anywhere else.
- `style-src 'self'` — keep CSS in a file, not inline `<style>`/`style=` (or add a nonce if
  inline is unavoidable).

> Note: a header-based CSP (`session.defaultSession.webRequest.onHeadersReceived`) is
> generally preferred over `<meta>`, but for `file://` pages the `<meta>` form is the
> reliable cross-platform choice and is sufficient here.

### 3. Lock down `webPreferences` globally

In addition to the per-window flags shown earlier, you can defensively reject any future
window that tries to enable Node integration:

```ts
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (event, webPreferences) => {
    delete webPreferences.preload;          // strip unexpected preloads on webviews
    webPreferences.nodeIntegration = false;
  });
});
```

> Source: [Security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

---

## Serialization & redaction across the bridge

Focus area #6 — the rules for what may cross IPC and `contextBridge`.

### What can cross (structured-clone semantics)

Both `ipcRenderer.invoke`/`ipcMain.handle` (over the structured clone algorithm) and
`contextBridge.exposeInMainWorld` (a structured-clone-like copy with extra freezing) accept:

- **Primitives:** `string`, `number`, `boolean`, `null`, `undefined`, `bigint`.
- **Plain objects and arrays** (deeply, as long as every leaf is clone-safe).
- **`Promise`** (proxied), `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`/typed arrays,
  `Blob`, and similar structured-clone types.
- **Functions** — only across `contextBridge` (proxied), not over `ipcMain`/`ipcRenderer`.

### What does NOT cross (the footguns)

- **Class instances lose their prototype.** "Sending custom classes will not work" —
  prototypes/methods are dropped; you receive a plain data object. So **never pass a
  `BackendError` instance or any class instance across the bridge** — flatten it to
  `{ code, message }` first (as the `run()` wrapper does).
- **`Symbol` is dropped** (cannot be cloned across contexts).
- **Node objects (`Buffer`, streams, `fs` handles, `EventEmitter`, etc.) are not clone-safe**
  and must never be sent. Convert `Buffer` to a typed array / base64 string if file bytes
  must cross (for uploads, prefer passing a path or a `File`/`ArrayBuffer` the renderer
  already holds, and do the Node-side reading in main).
- **Functions cannot cross `ipcMain`/`ipcRenderer`** — only across `contextBridge`. Don't try
  to send a callback over `invoke`; use the event channel pattern instead.
- **Anything non-cloneable throws** a "could not be cloned" error at send time.

### Typed-error serialization (mandatory for gemini-nav)

Per the refined request (R13/R16) and reinforced by the clone rules:

- Serialize typed backend errors as **`{ code, message }` only**. Never the `stack`, the
  `cause`, or a wrapped `operationError` — these can contain request URLs, headers, or the
  API key.
- Run **every** outbound `message` (and every payload field that could echo user input or
  backend internals) through the existing `redactString` before it leaves main. The `run()`
  wrapper above is the single choke point that guarantees this.
- For unknown (non-`BackendError`) exceptions, return an opaque
  `{ code: 'INTERNAL', message: 'Internal error' }` — never reflect the raw error.

### Secret redaction in *all* payloads, not just errors

The API key must never cross the bridge in *any* direction. Concretely:

- `profiles:list` returns profile **names/metadata only** — never the encrypted key, never
  the decrypted key.
- `stores:*`, `docs:*`, `query:*` responses must be scrubbed of any field that could embed a
  key (e.g. a signed upload URL containing the key) via `redactString` before the envelope is
  built.
- Because `connect-src 'none'` is in the CSP, the renderer cannot exfiltrate a leaked secret
  even if one slipped through — but redaction at the source remains the primary control;
  CSP is defense in depth.

> Sources: [contextBridge API — supported types](https://www.electronjs.org/docs/latest/api/context-bridge),
> [Security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

---

## Best Practices (consolidated checklist)

1. `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`,
   `allowRunningInsecureContent: false`, `experimentalFeatures: false` — set explicitly even
   though most are defaults.
2. Preload is **CJS `preload.cjs`**, shipped verbatim (no bundling). It `require`s **only**
   `{ contextBridge, ipcRenderer }`.
3. Expose a **single frozen object** (`window.gemini`) with `invoke` + `on` — never raw
   `ipcRenderer`.
4. **Allowlist** every channel for both `invoke` and `on`; reject unknown channels at the
   bridge before any IPC is sent.
5. **Strip the Electron `event`** in event wrappers; forward only the payload to renderer
   callbacks.
6. **Validate the IPC sender** (`event.senderFrame.url`) in every `ipcMain.handle`.
7. Cross the bridge with **plain clone-safe data only** — flatten class instances; never send
   Node objects, `Buffer`s, streams, or functions over `invoke`.
8. Serialize typed errors as **`{ code, message }`**, redacted; opaque message for unknown
   errors.
9. Route **all main-process-only APIs (`shell.openExternal`, etc.) through IPC** — never call
   them from the preload (avoids #47413 and respects the security model).
10. `setWindowOpenHandler(() => ({ action: 'deny' }))`, prevent `will-navigate`, prevent
    `will-attach-webview`.
11. Strict **CSP** (`default-src 'none'; script-src 'self'; connect-src 'none'; …`); no inline
    scripts/handlers/styles.
12. Use `await app.whenReady()` and `await` dynamic imports before window/backend setup
    (ESM-main async-load caveat).

## Common Pitfalls

- **Expecting `shell`/`app`/`dialog` in the preload** → `undefined` (#47413). They are
  main-only; use IPC.
- **Exposing `ipcRenderer` or `ipcRenderer.on` directly** → hands the page the entire IPC
  system; classic privilege escalation vector.
- **Passing the Electron `event` to a renderer callback** → leaks `event.sender`/`ipcRenderer`.
- **Sending a `BackendError` instance over IPC** → prototype/methods stripped, *and* risks
  leaking `stack`/`cause`/key. Always flatten + redact.
- **Trying to ESM-`import` inside a sandboxed preload** → not supported; preload must be CJS.
- **Trying to `require` a project module or npm package in a sandboxed preload** → limited
  `require` only resolves `electron` + a few built-ins; bundle if (rarely) needed.
- **Disabling `webSecurity` "to make `file://` work"** → opens cross-origin attacks; instead
  fix paths and CSP.
- **Forgetting the ESM-main async caveat** → `app.setPath`/early APIs run too late; use
  `await app.whenReady()`.
- **Resolving `preload`/`public` paths relative to the dev tree** → breaks in the packaged
  `.app`; resolve against `process.resourcesPath` when packaged (see packaging research,
  Topic 2).

---

## Findings that affect the investigation's recommended approach

**Overall: the investigation's recommended approach is fully compatible with the current
Electron major (42) and the secure-by-default model. No decision needs to change.** Specific
confirmations and refinements:

1. **`sandbox: true` is fully compatible with the chosen design.** It does *not* conflict
   with anything gemini-nav needs: the renderer makes no network calls of its own (all via
   IPC), needs no Node, and the preload needs no external modules. Sandbox is *not* a
   constraint to relax — keep it on. **(Confirms Decision 4.)**

2. **The CJS preload choice is not merely convenient, it is required.** Under `sandbox: true`
   the preload *cannot* be ESM; CJS `preload.cjs` shipped verbatim is the only valid option.
   **(Confirms Decision 3's preload-as-CJS-extraResources call.)**

3. **The #47413 footgun does not affect gemini-nav as designed**, because the preload only
   uses `contextBridge` + `ipcRenderer` and never reaches for `shell`/main-only APIs. The
   design rule "main-only APIs go through IPC" must be written into the design doc so a future
   contributor does not reintroduce the bug by importing `shell` in the preload. **(Refines,
   does not contradict, Decision 3/4.)**

4. **Version pin is now Electron 42**, not 40. The investigation correctly told the
   implementer to verify the latest at implementation time; this research does that
   verification: **42** is latest stable (40/41/42 all in support; reference's 41 is one
   major behind). The security config is identical across 40–42. **(Updates the version note
   in the investigation's Caveats section.)**

5. **One ESM-main behavior to add to the design that the investigation did not call out:** the
   asynchronous ESM-import timing caveat requires `await app.whenReady()` and awaited dynamic
   imports before backend/window setup. This is a small but real correctness item for an ESM
   `main.mjs`. **(New detail, additive.)**

No contradictions with the investigation were found.

---

## Assumptions & Scope

- **In scope:** security configuration, contextBridge/IPC patterns, preload sandbox
  constraints, the ESM-main/CJS-preload footgun, and serialization/redaction rules for the
  current Electron major.
- **Out of scope (covered by Topic 2):** electron-builder macOS packaging, esbuild bundling
  flags, `extraResources`/`process.resourcesPath` path resolution in the packaged `.app`.
  This document references those only where they intersect security (preload path resolution).
- **Assumed** the gemini-nav renderer loads a local `file://` page with **no remote content**
  (per the investigation's plain-HTML/CSS/TS Decision 2). The CSP and navigation hardening are
  tuned for that; a remote-content design would need a different CSP/navigation posture.
- **Assumed** existing project primitives `redactString`, `BackendError` (typed-error base
  with a `code`), and `makeBackend(profile)` exist as referenced by the investigation and
  refined request; exact names/signatures are the design/codebase-scan phase's authority.

---

## References

| # | Source | URL | What was gathered |
|---|--------|-----|-------------------|
| 1 | Electron Releases (live) | https://releases.electronjs.org/ | Verified latest stable = **42** (v42.4.1, 2026-06-16); 40/41/42 all in support |
| 2 | Electron — Security checklist | https://www.electronjs.org/docs/latest/tutorial/security | `contextIsolation`/`sandbox`/`nodeIntegration` values + rationale; don't expose raw `ipcRenderer`; validate sender; CSP; `setWindowOpenHandler`; `webSecurity` |
| 3 | Electron — ES Modules (ESM) | https://www.electronjs.org/docs/latest/tutorial/esm | Sandboxed preload = plain CJS, no ESM, limited `require('electron')`; ESM-main async-import timing caveat; preload `.mjs` only when unsandboxed |
| 4 | Electron — Inter-Process Communication | https://www.electronjs.org/docs/latest/tutorial/ipc | `ipcMain.handle`/`ipcRenderer.invoke` request/response; safe event wrapper (drop `event`, avoid `event.sender` leak) |
| 5 | Electron — contextBridge API | https://www.electronjs.org/docs/latest/api/context-bridge | Supported/unsupported cross-bridge types; values frozen/immutable; prototypes dropped (no class instances); `Symbol` dropped; structured-clone semantics |
| 6 | Electron — Using Preload Scripts | https://www.electronjs.org/docs/latest/tutorial/tutorial-preload | Preload as the contextBridge setup point under context isolation |
| 7 | electron/electron#47413 | https://github.com/electron/electron/issues/47413 | The `shell` undefined-in-CJS-preload-under-ESM-main footgun (Electron 36+); closed not-planned; basis for the "main-only APIs via IPC" workaround |
| 8 | Electron — timelines | https://www.electronjs.org/docs/latest/tutorial/electron-timelines | 8-week cadence; latest-three-majors support window |
| 9 | endoflife.date — Electron | https://endoflife.date/electron | Per-major EOL guidance for avoiding a near-EOL pin |

### Recommended for deep reading

- **Electron Security checklist** (#2) — the authoritative source for every window flag,
  IPC, navigation, and CSP rule; read in full before writing `main.ts`.
- **ES Modules in Electron** (#3) — the definitive statement of the sandboxed-preload-must-be-CJS
  rule and the ESM-main async caveat; directly governs the preload + main bundling choices.
- **contextBridge API** (#5) — the precise serialization/clone rules that dictate the
  `{ ok, data | error:{code,message} }` envelope and the "flatten class instances" rule.
