/**
 * IPC channel contract — the SINGLE SOURCE OF TRUTH for the Electron surface.
 *
 * This module defines the union of invoke/event channel names, the standard
 * result envelope types crossing the bridge, and the runtime channel-name arrays
 * that the CJS preload (`preload.cjs`) mirrors as plain literals (the preload
 * cannot import this TS module under `sandbox: true`).
 *
 * Design 002 "API & Interface Contracts" is the authority for these names; the
 * 15 invoke channels and the single `upload:progress` event channel below MUST
 * match it exactly so the renderer (U3) and packaging (U4) integrate.
 *
 * No SDK (`@google/genai`), CLI, or `electron` imports are allowed here — this
 * file is consumed type-only by the renderer.
 */

// ---------------------------------------------------------------------------
// Result envelopes (structured-clone-safe; see research §Serialization)
// ---------------------------------------------------------------------------

/** Success envelope: clone-safe plain `data`. */
export type IpcOk<T> = { ok: true; data: T };

/**
 * Error envelope: ONLY a stable `code` and a redacted `message`. Never a stack,
 * `cause`, or raw backend internals (see the error contract in ipc-handlers.ts).
 */
export type IpcErr = { ok: false; error: { code: string; message: string } };

/** Discriminated union returned by every `invoke` channel. */
export type IpcResult<T> = IpcOk<T> | IpcErr;

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

/**
 * Request/response invoke channels — the 9 `IGeminiBackend` methods plus the
 * three registry operations and profile list/select. Order matches
 * INVOKE_CHANNEL_LIST below and the preload allowlist literal.
 */
export type InvokeChannel =
  | 'stores:list'
  | 'stores:get'
  | 'stores:create'
  | 'stores:delete'
  | 'docs:list'
  | 'docs:get'
  | 'docs:upload'
  | 'docs:delete'
  | 'docs:replace'
  | 'query:run'
  | 'registry:list'
  | 'registry:refresh'
  | 'registry:prune'
  | 'profiles:list'
  | 'profiles:select';

/** Main → renderer push channels. */
export type EventChannel = 'upload:progress';

// ---------------------------------------------------------------------------
// Runtime channel lists — the preload.cjs literal Sets MUST equal these exactly.
// ---------------------------------------------------------------------------

/** Runtime mirror of `InvokeChannel`; used by main to register handlers. */
export const INVOKE_CHANNEL_LIST: readonly InvokeChannel[] = [
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
];

/** Runtime mirror of `EventChannel`. */
export const EVENT_CHANNEL_LIST: readonly EventChannel[] = ['upload:progress'];
