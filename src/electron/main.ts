/**
 * Electron main process (ESM — bundled by esbuild to dist/electron/main.mjs).
 *
 * Owns the secure `BrowserWindow`, resolves all resource paths via Electron path
 * APIs (NEVER `__dirname`/`import.meta` — esbuild does not shim them for ESM Node
 * output), registers the typed IPC handlers, and loads the local `file://`
 * renderer. The main process is the sole holder of `IGeminiBackend` and any key
 * material (held in `profile-state.ts`); the renderer is sandboxed and untrusted.
 *
 * ESM-main async caveat (research §"second ESM-main caveat"): `await
 * app.whenReady()` before any window/backend setup.
 */

import { app, BrowserWindow, type WebPreferences } from 'electron';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { registerIpcHandlers } from './ipc-handlers.js';

app.name = 'Gemini Nav';

/**
 * Base directory holding `preload.cjs` and `public/`. In the packaged app these
 * ship as `extraResources` under `process.resourcesPath`; in dev they live in
 * the source tree under `<appPath>/src/electron`. Resolved via Electron APIs
 * only — never `__dirname`.
 */
function resolveResourceBase(): string {
  return app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), 'src', 'electron');
}

function resolvePreloadPath(): string {
  return path.join(resolveResourceBase(), 'preload.cjs');
}

function resolveRendererIndex(): string {
  return path.join(resolveResourceBase(), 'public', 'index.html');
}

/** Block navigation, new windows, and webview attachment on a window. */
function hardenWindow(win: BrowserWindow, rendererUrl: string): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(rendererUrl)) {
      event.preventDefault();
    }
  });

  win.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

function createWindow(): BrowserWindow {
  const preloadPath = resolvePreloadPath();
  const indexHtml = resolveRendererIndex();
  // Expected sender-frame URL prefix for the renderer (file:// form of the
  // index path); used for IPC sender validation and navigation hardening.
  const rendererUrl = pathToFileURL(indexHtml).toString();

  const webPreferences: WebPreferences = {
    // --- load-bearing security flags (also the modern defaults; set explicitly) ---
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    // --- defense in depth ---
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    preload: preloadPath,
  };

  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences,
  });

  registerIpcHandlers(rendererUrl, win);
  hardenWindow(win, rendererUrl);

  void win.loadFile(indexHtml);
  return win;
}

/** Defensively reject Node integration on any future webview. */
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (_event, webPreferences) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
  });
});

async function main(): Promise<void> {
  await app.whenReady();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

void main();
