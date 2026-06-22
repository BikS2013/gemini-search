/**
 * Store commands — list / get / create / delete File Search stores via the sole
 * `IGeminiBackend` path. `stores` also reconciles the plaintext registry cache
 * (hybrid model: live API is the source of truth).
 *
 * Commands:
 *   - stores       : list stores (+ upserts the registry cache via reconcile)
 *   - store-info   : show one store's metadata + derived display state
 *   - store-create : create a store
 *   - store-delete : delete a store (confirmation-gated unless --force)
 */

import { Registry } from '../../core/registry.js';
import type { StoreInfo } from '../../core/types.js';
import {
  getBackend,
  resolveProfileName,
  confirmDestructive,
  formatBytes,
  deriveStoreState,
  handleCliError,
  type GlobalOpts,
} from './shared.js';

/** Print a single store's metadata block. */
function printStore(s: StoreInfo): void {
  const state = deriveStoreState({
    pendingDocumentsCount: s.pendingDocumentsCount,
    failedDocumentsCount: s.failedDocumentsCount,
    activeDocumentsCount: s.activeDocumentsCount,
  });
  console.log(`  ${s.displayName ?? '(no display name)'}`);
  console.log(`    API name:   ${s.apiName}`);
  console.log(`    State:      ${state}`);
  console.log(
    `    Documents:  ${s.documentCount ?? 0} ` +
      `(active ${s.activeDocumentsCount ?? 0}, ` +
      `pending ${s.pendingDocumentsCount ?? 0}, ` +
      `failed ${s.failedDocumentsCount ?? 0})`,
  );
  console.log(`    Size:       ${formatBytes(s.sizeBytes)}`);
  if (s.embeddingModel) console.log(`    Embedding:  ${s.embeddingModel}`);
  if (s.createTime) console.log(`    Created:    ${s.createTime}`);
  if (s.updateTime) console.log(`    Updated:    ${s.updateTime}`);
}

export interface StoresListOpts extends GlobalOpts {
  pageSize?: number;
  pageToken?: string;
  json?: boolean;
}

/** List stores for the resolved profile, reconciling the registry cache. */
export async function storesList(opts: StoresListOpts): Promise<void> {
  try {
    const backend = getBackend(opts);
    const profile = resolveProfileName(opts);
    const page = await backend.listStores({
      pageSize: opts.pageSize,
      pageToken: opts.pageToken,
    });

    // Reconcile the plaintext metadata cache (hybrid model side effect).
    new Registry().reconcile(profile, page.items);

    if (opts.json) {
      console.log(JSON.stringify(page, null, 2));
      return;
    }

    if (page.items.length === 0) {
      console.log('No stores found for this profile.');
      return;
    }

    console.log(`Stores (${page.items.length}):\n`);
    for (const s of page.items) {
      printStore(s);
      console.log();
    }
    if (page.nextPageToken) {
      console.log(`Next page token: ${page.nextPageToken}`);
    }
  } catch (err) {
    handleCliError(err);
  }
}

export interface StoreInfoOpts extends GlobalOpts {
  json?: boolean;
}

/** Show one store's metadata (accepts apiName or displayName). */
export async function storeInfo(
  nameOrDisplayName: string,
  opts: StoreInfoOpts,
): Promise<void> {
  try {
    const backend = getBackend(opts);
    const store = await backend.getStore(nameOrDisplayName);
    if (opts.json) {
      console.log(JSON.stringify(store, null, 2));
      return;
    }
    printStore(store);
  } catch (err) {
    handleCliError(err);
  }
}

export interface StoreCreateOpts extends GlobalOpts {
  displayName: string;
  embeddingModel?: string;
  json?: boolean;
}

/** Create a store. */
export async function storeCreate(opts: StoreCreateOpts): Promise<void> {
  try {
    const backend = getBackend(opts);
    const store = await backend.createStore(opts.displayName, {
      embeddingModel: opts.embeddingModel,
    });
    if (opts.json) {
      console.log(JSON.stringify(store, null, 2));
      return;
    }
    console.log('Store created:');
    printStore(store);
  } catch (err) {
    handleCliError(err);
  }
}

export interface StoreDeleteOpts extends GlobalOpts {
  force?: boolean;
}

/**
 * Delete a store by apiName. Confirmation-gated unless --force. `--force` is also
 * passed through to the backend (server-side force-delete of non-empty stores).
 */
export async function storeDelete(
  apiName: string,
  opts: StoreDeleteOpts,
): Promise<void> {
  try {
    const ok = await confirmDestructive(
      `Delete store "${apiName}"? This cannot be undone.`,
      opts.force,
    );
    if (!ok) {
      console.log('Aborted.');
      return;
    }
    const backend = getBackend(opts);
    await backend.deleteStore(apiName, opts.force ?? false);

    // Best-effort: drop the cache row (never touches the live store).
    new Registry().remove(apiName);

    console.log(`Store "${apiName}" deleted.`);
  } catch (err) {
    handleCliError(err);
  }
}
