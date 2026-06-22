/**
 * Document commands — list / get / upload / delete / replace documents in a
 * store via the sole `IGeminiBackend` path.
 *
 * Commands:
 *   - docs        : list documents in a store
 *   - doc-info    : show one document's metadata
 *   - doc-upload  : upload a file (optional --display-name, --wait-active)
 *   - doc-delete  : delete a document (confirmation-gated unless --force)
 *   - doc-replace : replace a document (delete + re-upload; confirmation-gated)
 *
 * The backend performs pre-upload size/MIME validation and async operation
 * polling; the typed errors it throws are rendered by `handleCliError`.
 * Per Open Question 2, `doc-upload` returns at STATE_PENDING by default; the
 * `--wait-active` flag blocks until STATE_ACTIVE/STATE_FAILED.
 */

import type { DocumentInfo } from '../../core/types.js';
import {
  getBackend,
  confirmDestructive,
  formatBytes,
  displayState,
  handleCliError,
  type GlobalOpts,
} from './shared.js';

/** Print a single document's metadata block. */
function printDocument(d: DocumentInfo): void {
  console.log(`  ${d.displayName ?? '(no display name)'}`);
  console.log(`    API name: ${d.apiName}`);
  console.log(`    State:    ${displayState(d.state)}`);
  if (d.mimeType) console.log(`    MIME:     ${d.mimeType}`);
  console.log(`    Size:     ${formatBytes(d.sizeBytes)}`);
  if (d.createTime) console.log(`    Created:  ${d.createTime}`);
  if (d.updateTime) console.log(`    Updated:  ${d.updateTime}`);
  if (d.customMetadata && d.customMetadata.length > 0) {
    console.log(`    Metadata:`);
    for (const m of d.customMetadata) {
      const value =
        m.stringValue ??
        (m.numericValue != null ? String(m.numericValue) : undefined) ??
        (m.stringListValue ? m.stringListValue.join(', ') : '');
      console.log(`      ${m.key}: ${value}`);
    }
  }
}

export interface DocsListOpts extends GlobalOpts {
  store: string;
  pageSize?: number;
  pageToken?: string;
  json?: boolean;
}

/** List documents in a store. */
export async function docsList(opts: DocsListOpts): Promise<void> {
  try {
    const backend = getBackend(opts);
    const page = await backend.listDocuments(opts.store, {
      pageSize: opts.pageSize,
      pageToken: opts.pageToken,
    });
    if (opts.json) {
      console.log(JSON.stringify(page, null, 2));
      return;
    }
    if (page.items.length === 0) {
      console.log('No documents found in this store.');
      return;
    }
    console.log(`Documents (${page.items.length}):\n`);
    for (const d of page.items) {
      printDocument(d);
      console.log();
    }
    if (page.nextPageToken) {
      console.log(`Next page token: ${page.nextPageToken}`);
    }
  } catch (err) {
    handleCliError(err);
  }
}

export interface DocInfoOpts extends GlobalOpts {
  json?: boolean;
}

/** Show one document's metadata. */
export async function docInfo(
  documentApiName: string,
  opts: DocInfoOpts,
): Promise<void> {
  try {
    const backend = getBackend(opts);
    const doc = await backend.getDocument(documentApiName);
    if (opts.json) {
      console.log(JSON.stringify(doc, null, 2));
      return;
    }
    printDocument(doc);
  } catch (err) {
    handleCliError(err);
  }
}

export interface DocUploadOpts extends GlobalOpts {
  store: string;
  file: string;
  displayName?: string;
  mimeType?: string;
  waitActive?: boolean;
  json?: boolean;
}

/** Upload a file into a store. */
export async function docUpload(opts: DocUploadOpts): Promise<void> {
  try {
    const backend = getBackend(opts);
    if (opts.waitActive) {
      console.log('Uploading and waiting for the document to become active...');
    } else {
      console.log('Uploading...');
    }
    const doc = await backend.uploadDocument(opts.store, opts.file, {
      displayName: opts.displayName,
      mimeType: opts.mimeType,
      waitActive: opts.waitActive ?? false,
    });
    if (opts.json) {
      console.log(JSON.stringify(doc, null, 2));
      return;
    }
    console.log('Document uploaded:');
    printDocument(doc);
  } catch (err) {
    handleCliError(err);
  }
}

export interface DocDeleteOpts extends GlobalOpts {
  force?: boolean;
}

/** Delete a document. Confirmation-gated unless --force. */
export async function docDelete(
  documentApiName: string,
  opts: DocDeleteOpts,
): Promise<void> {
  try {
    const ok = await confirmDestructive(
      `Delete document "${documentApiName}"? This cannot be undone.`,
      opts.force,
    );
    if (!ok) {
      console.log('Aborted.');
      return;
    }
    const backend = getBackend(opts);
    await backend.deleteDocument(documentApiName, opts.force ?? false);
    console.log(`Document "${documentApiName}" deleted.`);
  } catch (err) {
    handleCliError(err);
  }
}

export interface DocReplaceOpts extends GlobalOpts {
  store: string;
  document: string;
  file: string;
  displayName?: string;
  waitActive?: boolean;
  force?: boolean;
  json?: boolean;
}

/** Replace a document = delete the old one then upload the new file. */
export async function docReplace(opts: DocReplaceOpts): Promise<void> {
  try {
    const ok = await confirmDestructive(
      `Replace document "${opts.document}" with "${opts.file}"? ` +
        'The existing document will be deleted.',
      opts.force,
    );
    if (!ok) {
      console.log('Aborted.');
      return;
    }
    const backend = getBackend(opts);
    const doc = await backend.replaceDocument(
      opts.store,
      opts.document,
      opts.file,
      {
        displayName: opts.displayName,
        waitActive: opts.waitActive ?? false,
      },
    );
    if (opts.json) {
      console.log(JSON.stringify(doc, null, 2));
      return;
    }
    console.log('Document replaced:');
    printDocument(doc);
  } catch (err) {
    handleCliError(err);
  }
}
