/**
 * Shared in-memory Electron mock helper for tests/electron/.
 *
 * Provides:
 *  - createMockIpcMain: a minimal in-memory ipcMain replacement
 *  - createMockBrowserWindow: a minimal BrowserWindow stub
 *
 * The globalElectronMock singleton is a STABLE reference used by vi.mock().
 * Because vi.mock factories are hoisted before any non-mock code runs, the
 * singleton must live in a module that is loaded by the factory itself.
 * Tests import this module directly to get the same object reference.
 */

export interface MockIpcMain {
  _handlers: Map<string, (...args: unknown[]) => unknown>;
  handle: (channel: string, fn: (...args: unknown[]) => unknown) => void;
  /**
   * Emitter event names. FAITHFUL to real Electron: `ipcMain.handle` invoke
   * handlers are stored in a SEPARATE internal map and are NOT reflected here —
   * only `.on`/`.addListener` listeners would appear. Since this codebase uses
   * only `handle`, this returns `[]`. Use `invokeHandlerNames()` to introspect
   * registered invoke channels. (Production code must never rely on
   * `eventNames()` to detect `handle` registration — that bug shipped once.)
   */
  eventNames: () => string[];
  /** Names of channels registered via `handle` (the real `_invokeHandlers` map analog). */
  invokeHandlerNames: () => string[];
  /** Invoke a registered handler directly, bypassing Electron runtime. */
  invoke: (channel: string, event: unknown, ...args: unknown[]) => unknown;
  /** Reset all registered handlers (call in beforeEach). */
  reset: () => void;
}

export interface MockWebContents {
  sent: Array<{ channel: string; payload: unknown }>;
  send: (channel: string, payload: unknown) => void;
  reset: () => void;
}

export interface MockBrowserWindow {
  _destroyed: boolean;
  webContents: MockWebContents;
  isDestroyed: () => boolean;
  destroy: () => void;
}

/** Create a fresh mock ipcMain instance. */
export function createMockIpcMain(): MockIpcMain {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  return {
    _handlers: handlers,
    handle(channel, fn) {
      handlers.set(channel, fn);
    },
    eventNames() {
      // Faithful to real Electron: `handle` channels are NOT emitter events.
      return [];
    },
    invokeHandlerNames() {
      return Array.from(handlers.keys());
    },
    invoke(channel, event, ...args) {
      const fn = handlers.get(channel);
      if (!fn) throw new Error(`No handler registered for channel: ${channel}`);
      return fn(event, ...args);
    },
    reset() {
      handlers.clear();
    },
  };
}

/** Create a fresh mock BrowserWindow instance. */
export function createMockBrowserWindow(): MockBrowserWindow {
  const webContents: MockWebContents = {
    sent: [],
    send(channel, payload) {
      this.sent.push({ channel, payload });
    },
    reset() {
      this.sent = [];
    },
  };
  return {
    _destroyed: false,
    webContents,
    isDestroyed() {
      return this._destroyed;
    },
    destroy() {
      this._destroyed = true;
    },
  };
}

/**
 * A stable singleton ipcMain used by vi.mock('electron', …).
 * This object persists across tests; call .reset() in beforeEach to clear handlers.
 */
export const globalIpcMain = createMockIpcMain();
