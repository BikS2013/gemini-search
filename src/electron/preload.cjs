'use strict';

/**
 * CJS preload bridge — shipped VERBATIM via extraResources (NOT bundled).
 *
 * Under `sandbox: true` a preload MUST be CommonJS and may `require` only
 * `electron` (limited require). It exposes a single frozen `window.gemini`
 * object with `invoke` + `on`, each gated by a channel allowlist; raw
 * `ipcRenderer` is NEVER exposed, and the Electron `event` object is stripped
 * before any payload reaches a renderer callback.
 *
 * IMPORTANT — single source of truth: the two allowlist literals below MUST stay
 * in sync with INVOKE_CHANNEL_LIST / EVENT_CHANNEL_LIST in
 * `src/electron/ipc-contract.ts`. This file cannot import that TS module (it
 * ships as unbundled CJS under sandbox), so the lists are duplicated as plain
 * literals. Update both places together.
 */

const { contextBridge, ipcRenderer } = require('electron'); // ONLY these two (see #47413)

// Mirror of INVOKE_CHANNEL_LIST in ipc-contract.ts — keep in sync.
const INVOKE_CHANNELS = new Set([
  'stores:list',
  'stores:get',
  'stores:create',
  'stores:delete',
  'docs:list',
  'docs:get',
  'docs:upload',
  'docs:delete',
  'docs:replace',
  'query:run',
  'registry:list',
  'registry:refresh',
  'registry:prune',
  'profiles:list',
  'profiles:select',
]);

// Mirror of EVENT_CHANNEL_LIST in ipc-contract.ts — keep in sync.
const EVENT_CHANNELS = new Set(['upload:progress']);

contextBridge.exposeInMainWorld('gemini', {
  /**
   * Generic allowlisted invoke. A compromised renderer can only ever reach
   * channels in INVOKE_CHANNELS — never arbitrary IPC.
   */
  invoke(channel, ...args) {
    if (!INVOKE_CHANNELS.has(channel)) {
      return Promise.reject(new Error('Blocked IPC channel: ' + String(channel)));
    }
    return ipcRenderer.invoke(channel, ...args);
  },

  /**
   * Safe event subscription. Validates the channel, strips the Electron `event`
   * object (forwards payload only), and returns an unsubscribe function.
   */
  on(channel, callback) {
    if (!EVENT_CHANNELS.has(channel)) {
      throw new Error('Blocked event channel: ' + String(channel));
    }
    if (typeof callback !== 'function') {
      throw new TypeError('listener must be a function');
    }
    const listener = (_event, payload) => callback(payload); // drop _event on purpose
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
