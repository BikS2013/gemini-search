/**
 * Hybrid metadata registry — a PLAINTEXT, non-secret cache of known stores.
 *
 * Persists to ~/.tool-agents/gemini-nav/registry.json. The live Gemini API is
 * the source of truth (refined-request Open Question 4 → hybrid); this file lets
 * users "keep track of" stores across sessions without a live call, and is
 * refreshable on demand.
 *
 * The registry NEVER stores secrets (acceptance #6). Only last-seen store
 * metadata (counts, sizeBytes, timestamps) is cached.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getToolAgentDir, ensureToolAgentDir } from '../config/profile-config.js';
import type { RegistryData, RegistryEntry, StoreInfo } from './types.js';

function getRegistryFile(): string {
  return path.join(getToolAgentDir(), 'registry.json');
}

export class Registry {
  private data: RegistryData = { entries: [] };

  constructor() {
    this.load();
  }

  private load(): void {
    const file = getRegistryFile();
    if (!fs.existsSync(file)) {
      this.data = { entries: [] };
      return;
    }
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as RegistryData;
      this.data = { entries: parsed.entries ?? [] };
    } catch {
      // A corrupt cache must not crash a surface; it is rebuildable via refresh.
      console.error('Failed to read registry.json; starting with an empty cache.');
      this.data = { entries: [] };
    }
  }

  private save(): void {
    ensureToolAgentDir();
    fs.writeFileSync(getRegistryFile(), JSON.stringify(this.data, null, 2), {
      encoding: 'utf-8',
    });
  }

  /** All cached entries (copies). */
  list(): RegistryEntry[] {
    return this.data.entries.map((e) => ({ ...e }));
  }

  /** A cached entry by apiName (copy), or undefined. */
  get(apiName: string): RegistryEntry | undefined {
    const found = this.data.entries.find((e) => e.apiName === apiName);
    return found ? { ...found } : undefined;
  }

  /** Insert or replace an entry keyed by apiName. */
  upsert(entry: RegistryEntry): void {
    const idx = this.data.entries.findIndex((e) => e.apiName === entry.apiName);
    if (idx >= 0) {
      this.data.entries[idx] = { ...entry };
    } else {
      this.data.entries.push({ ...entry });
    }
    this.save();
  }

  /** Remove an entry by apiName. Returns true when one was removed. */
  remove(apiName: string): boolean {
    const before = this.data.entries.length;
    this.data.entries = this.data.entries.filter((e) => e.apiName !== apiName);
    if (this.data.entries.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Reconcile the cache against a live store list for one profile.
   *
   * For each live store, upsert a registry entry copying counters / sizeBytes /
   * timestamps and stamping lastRefreshedAt = now. Entries for this profile that
   * are ABSENT from the live list are left in place (reported as stale by the
   * CLI registry-list and removable via registry-prune) — pruning never deletes
   * the live store, only the cache row.
   */
  reconcile(profile: string, liveStores: StoreInfo[]): void {
    const now = new Date().toISOString();
    for (const s of liveStores) {
      const entry: RegistryEntry = {
        apiName: s.apiName,
        displayName: s.displayName,
        profile,
        createTime: s.createTime,
        updateTime: s.updateTime,
        sizeBytes: s.sizeBytes,
        activeDocumentsCount: s.activeDocumentsCount,
        pendingDocumentsCount: s.pendingDocumentsCount,
        failedDocumentsCount: s.failedDocumentsCount,
        documentCount: s.documentCount,
        lastRefreshedAt: now,
      };
      const idx = this.data.entries.findIndex((e) => e.apiName === s.apiName);
      if (idx >= 0) {
        this.data.entries[idx] = entry;
      } else {
        this.data.entries.push(entry);
      }
    }
    this.save();
  }
}
