/**
 * Registry IPC service — thin functions wrapping the existing plaintext
 * `Registry` cache for the three registry channels (list/refresh/prune).
 *
 * The live Gemini API is the source of truth; the registry is a refreshable,
 * non-secret cache. `registryPrune` removes only the cache row, never the live
 * store (matching `Registry.remove` semantics).
 */

import { Registry } from '../core/registry.js';
import type { IGeminiBackend } from '../core/backend/backend.js';
import type { StoreInfo } from '../core/types.js';
import type { RegistryEntryView } from './ipc-payloads.js';

/** All cached registry entries. */
export function registryList(): RegistryEntryView[] {
  return new Registry().list();
}

/**
 * Refresh the cache for `profile` against the live store list, then return the
 * reconciled entries. Paginates `listStores` fully before reconciling.
 */
export async function registryRefresh(
  profile: string,
  backend: IGeminiBackend,
): Promise<RegistryEntryView[]> {
  const liveStores: StoreInfo[] = [];
  let pageToken: string | undefined;
  do {
    const page = await backend.listStores(pageToken ? { pageToken } : undefined);
    liveStores.push(...page.items);
    pageToken = page.nextPageToken ?? undefined;
  } while (pageToken);

  const registry = new Registry();
  registry.reconcile(profile, liveStores);
  return registry.list();
}

/**
 * Remove a single cache row by apiName. Returns true when a row was removed.
 * Never deletes the live store.
 */
export function registryPrune(apiName: string): boolean {
  return new Registry().remove(apiName);
}
