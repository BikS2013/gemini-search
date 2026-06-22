/**
 * Registry commands — manage the plaintext, non-secret metadata cache of known
 * stores (the hybrid model: the live Gemini API is the source of truth, this
 * cache lets users "keep track of" stores across sessions).
 *
 * Commands:
 *   - registry-list    : show cached known stores + lastRefreshedAt (+ staleness)
 *   - registry-refresh : live listStores per profile → Registry.reconcile
 *   - registry-prune   : remove a stale/orphaned cache row (confirmation-gated)
 *
 * Pruning never deletes the live store — only the cache row.
 */

import { Registry } from '../../core/registry.js';
import {
  getBackend,
  resolveProfileName,
  confirmDestructive,
  formatBytes,
  handleCliError,
  type GlobalOpts,
} from './shared.js';

export interface RegistryListOpts extends GlobalOpts {
  json?: boolean;
}

/** List cached known stores. */
export function registryList(opts: RegistryListOpts): void {
  try {
    const registry = new Registry();
    const entries = registry.list();

    if (opts.json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (entries.length === 0) {
      console.log('No stores in the local registry cache.');
      console.log(
        'Populate it with: gemini-nav registry-refresh  (or: gemini-nav stores)',
      );
      return;
    }

    console.log(`Cached stores (${entries.length}):\n`);
    for (const e of entries) {
      console.log(`  ${e.displayName ?? '(no display name)'}`);
      console.log(`    API name:   ${e.apiName}`);
      console.log(`    Profile:    ${e.profile}`);
      console.log(
        `    Documents:  ${e.documentCount ?? 0} ` +
          `(active ${e.activeDocumentsCount ?? 0}, ` +
          `pending ${e.pendingDocumentsCount ?? 0}, ` +
          `failed ${e.failedDocumentsCount ?? 0})`,
      );
      console.log(`    Size:       ${formatBytes(e.sizeBytes)}`);
      console.log(`    Refreshed:  ${e.lastRefreshedAt}`);
      console.log();
    }
  } catch (err) {
    handleCliError(err);
  }
}

export interface RegistryRefreshOpts extends GlobalOpts {
  json?: boolean;
}

/** Refresh the cache by reconciling against a live listStores for the profile. */
export async function registryRefresh(
  opts: RegistryRefreshOpts,
): Promise<void> {
  try {
    const backend = getBackend(opts);
    const profile = resolveProfileName(opts);

    // Walk all pages so the cache reflects the complete live store list.
    const liveStores = [];
    let pageToken: string | undefined;
    do {
      const page = await backend.listStores({ pageToken });
      liveStores.push(...page.items);
      pageToken = page.nextPageToken ?? undefined;
    } while (pageToken);

    const registry = new Registry();
    registry.reconcile(profile, liveStores);

    if (opts.json) {
      console.log(JSON.stringify(registry.list(), null, 2));
      return;
    }
    console.log(
      `Registry refreshed for profile "${profile}": ${liveStores.length} live store(s) reconciled.`,
    );
  } catch (err) {
    handleCliError(err);
  }
}

export interface RegistryPruneOpts extends GlobalOpts {
  force?: boolean;
}

/** Remove a cache row by apiName (confirmation-gated). Never touches the API. */
export async function registryPrune(
  apiName: string,
  opts: RegistryPruneOpts,
): Promise<void> {
  try {
    const ok = await confirmDestructive(
      `Remove cached entry "${apiName}" from the local registry? ` +
        '(This does not delete the live store.)',
      opts.force,
    );
    if (!ok) {
      console.log('Aborted.');
      return;
    }
    const registry = new Registry();
    const removed = registry.remove(apiName);
    if (removed) {
      console.log(`Cache entry "${apiName}" removed.`);
    } else {
      console.log(`No cache entry found for "${apiName}".`);
    }
  } catch (err) {
    handleCliError(err);
  }
}
