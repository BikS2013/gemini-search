#!/usr/bin/env node
/**
 * `gemini-nav` — Gemini File Search Store Navigator CLI.
 *
 * Commander program wiring every command group (profile / store / doc / query /
 * registry). Mirrors the storage-navigator reference `src/cli/index.ts`
 * structure.
 *
 * Global options:
 *   --profile <name>  named profile to resolve the backend with (default 'default')
 *   --key <key>       inline API key override (highest precedence)
 */

import { Command } from 'commander';
import {
  profileAdd,
  profilesList,
  profileRemove,
} from './commands/profile-ops.js';
import {
  storesList,
  storeInfo,
  storeCreate,
  storeDelete,
} from './commands/store-ops.js';
import {
  docsList,
  docInfo,
  docUpload,
  docDelete,
  docReplace,
} from './commands/doc-ops.js';
import { runQuery } from './commands/query-ops.js';
import {
  registryList,
  registryRefresh,
  registryPrune,
} from './commands/registry-ops.js';
import type { GlobalOpts } from './commands/shared.js';

const parseIntOpt = (v: string): number => parseInt(v, 10);
/** Collect a repeatable option into an array. */
const collect = (v: string, acc: string[]): string[] => {
  acc.push(v);
  return acc;
};

/**
 * Build and return the configured `gemini-nav` commander program.
 *
 * The program is returned (not parsed) so callers — and tests — can `parse`
 * with their own argv. The default-export bin runner below parses `process.argv`.
 */
export function registerGeminiNavCli(): Command {
  const program = new Command();

  program
    .name('gemini-nav')
    .description(
      'Gemini File Search Store Navigator — manage Gemini stores, documents, ' +
        'and run RAG queries',
    )
    .version('1.0.0')
    .option('--profile <name>', 'Named profile to use (default: "default")')
    .option('--key <key>', 'Inline Gemini API key override (highest precedence)');

  /** Merge global (program-level) options with the command's own options. */
  const withGlobals = <T extends Record<string, unknown>>(
    cmd: Command,
    local: T,
  ): T & GlobalOpts => {
    const g = program.opts<GlobalOpts>();
    return {
      profile: (local as GlobalOpts).profile ?? g.profile,
      key: (local as GlobalOpts).key ?? g.key,
      ...local,
    };
  };

  // ---- profile commands ----
  program
    .command('profile-add')
    .description('Add or update a named profile (API key encrypted at rest)')
    .requiredOption('--name <name>', 'Profile name')
    .option('--key <key>', 'Gemini API key (prompts if omitted, unless --env)')
    .option('--env', 'Resolve the key on demand from the environment (not stored)', false)
    .action(async (opts) => {
      await profileAdd({ name: opts.name, key: opts.key, env: opts.env });
    });

  program
    .command('profiles')
    .description('List configured profiles (never prints key material)')
    .action(() => {
      profilesList();
    });

  program
    .command('profile-remove')
    .description('Remove a profile and its stored key')
    .requiredOption('--name <name>', 'Profile name to remove')
    .action((opts) => {
      profileRemove(opts.name);
    });

  // ---- store commands ----
  program
    .command('stores')
    .description('List File Search stores (also refreshes the local registry cache)')
    .option('--page-size <n>', 'Page size', parseIntOpt)
    .option('--page-token <token>', 'Page token for pagination')
    .option('--json', 'Emit the raw page as JSON', false)
    .action(async (opts, cmd: Command) => {
      await storesList(
        withGlobals(cmd, {
          pageSize: opts.pageSize,
          pageToken: opts.pageToken,
          json: opts.json,
        }),
      );
    });

  program
    .command('store-info <nameOrDisplayName>')
    .description("Show one store's metadata + derived state")
    .option('--json', 'Emit JSON', false)
    .action(async (nameOrDisplayName: string, opts, cmd: Command) => {
      await storeInfo(nameOrDisplayName, withGlobals(cmd, { json: opts.json }));
    });

  program
    .command('store-create')
    .description('Create a File Search store')
    .requiredOption('--display-name <name>', 'Store display name')
    .option('--embedding-model <model>', 'Embedding model override')
    .option('--json', 'Emit JSON', false)
    .action(async (opts, cmd: Command) => {
      await storeCreate(
        withGlobals(cmd, {
          displayName: opts.displayName,
          embeddingModel: opts.embeddingModel,
          json: opts.json,
        }),
      );
    });

  program
    .command('store-delete <apiName>')
    .description('Delete a store (asks for confirmation unless --force)')
    .option('--force', 'Skip confirmation and force-delete a non-empty store', false)
    .action(async (apiName: string, opts, cmd: Command) => {
      await storeDelete(apiName, withGlobals(cmd, { force: opts.force }));
    });

  // ---- document commands ----
  program
    .command('docs')
    .description('List documents in a store')
    .requiredOption('--store <apiName>', 'Store apiName')
    .option('--page-size <n>', 'Page size', parseIntOpt)
    .option('--page-token <token>', 'Page token for pagination')
    .option('--json', 'Emit the raw page as JSON', false)
    .action(async (opts, cmd: Command) => {
      await docsList(
        withGlobals(cmd, {
          store: opts.store,
          pageSize: opts.pageSize,
          pageToken: opts.pageToken,
          json: opts.json,
        }),
      );
    });

  program
    .command('doc-info <documentApiName>')
    .description("Show one document's metadata")
    .option('--json', 'Emit JSON', false)
    .action(async (documentApiName: string, opts, cmd: Command) => {
      await docInfo(documentApiName, withGlobals(cmd, { json: opts.json }));
    });

  program
    .command('doc-upload')
    .description('Upload a file into a store')
    .requiredOption('--store <apiName>', 'Store apiName')
    .requiredOption('--file <path>', 'Path to the file to upload')
    .option('--display-name <name>', 'Document display name')
    .option('--mime-type <type>', 'Explicit MIME type override')
    .option('--wait-active', 'Block until the document reaches STATE_ACTIVE', false)
    .option('--json', 'Emit JSON', false)
    .action(async (opts, cmd: Command) => {
      await docUpload(
        withGlobals(cmd, {
          store: opts.store,
          file: opts.file,
          displayName: opts.displayName,
          mimeType: opts.mimeType,
          waitActive: opts.waitActive,
          json: opts.json,
        }),
      );
    });

  program
    .command('doc-delete <documentApiName>')
    .description('Delete a document (asks for confirmation unless --force)')
    .option('--force', 'Skip confirmation', false)
    .action(async (documentApiName: string, opts, cmd: Command) => {
      await docDelete(documentApiName, withGlobals(cmd, { force: opts.force }));
    });

  program
    .command('doc-replace')
    .description('Replace a document (delete + re-upload; confirmation-gated)')
    .requiredOption('--store <apiName>', 'Store apiName')
    .requiredOption('--document <documentApiName>', 'Document apiName to replace')
    .requiredOption('--file <path>', 'Path to the new file')
    .option('--display-name <name>', 'New document display name')
    .option('--wait-active', 'Block until the new document reaches STATE_ACTIVE', false)
    .option('--force', 'Skip confirmation', false)
    .option('--json', 'Emit JSON', false)
    .action(async (opts, cmd: Command) => {
      await docReplace(
        withGlobals(cmd, {
          store: opts.store,
          document: opts.document,
          file: opts.file,
          displayName: opts.displayName,
          waitActive: opts.waitActive,
          force: opts.force,
          json: opts.json,
        }),
      );
    });

  // ---- query command ----
  program
    .command('query <prompt>')
    .description('Run a File Search RAG query against one or more stores')
    .requiredOption(
      '--store <apiName>',
      'Store apiName (repeatable for multi-store queries)',
      collect,
      [],
    )
    .option('--model <model>', 'Model id override (default: gemini-3.1-pro-preview)')
    .option('--metadata-filter <expr>', 'File Search metadata filter expression')
    .option('--json', 'Emit the normalized QueryResult as JSON', false)
    .option('--raw-json', 'Emit the raw groundingMetadata subtree as JSON', false)
    .action(async (prompt: string, opts, cmd: Command) => {
      await runQuery(
        prompt,
        withGlobals(cmd, {
          store: opts.store,
          model: opts.model,
          metadataFilter: opts.metadataFilter,
          json: opts.json,
          rawJson: opts.rawJson,
        }),
      );
    });

  // ---- registry commands ----
  program
    .command('registry-list')
    .description('List cached known stores from the local registry')
    .option('--json', 'Emit JSON', false)
    .action((opts, cmd: Command) => {
      registryList(withGlobals(cmd, { json: opts.json }));
    });

  program
    .command('registry-refresh')
    .description('Reconcile the local registry against the live API for the profile')
    .option('--json', 'Emit JSON', false)
    .action(async (opts, cmd: Command) => {
      await registryRefresh(withGlobals(cmd, { json: opts.json }));
    });

  program
    .command('registry-prune <apiName>')
    .description('Remove a stale cache entry (does not delete the live store)')
    .option('--force', 'Skip confirmation', false)
    .action(async (apiName: string, opts, cmd: Command) => {
      await registryPrune(apiName, withGlobals(cmd, { force: opts.force }));
    });

  return program;
}

/**
 * Bin entry: build the program and parse argv.
 */
async function main(): Promise<void> {
  const program = registerGeminiNavCli();
  await program.parseAsync(process.argv);
}

// Run only when invoked directly (not when imported by tests / the bin shim that
// re-exports registerGeminiNavCli).
const invokedDirectly =
  process.argv[1] !== undefined &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith('/cli/index.ts') ||
    import.meta.url.endsWith('/cli/index.js'));

if (invokedDirectly) {
  void main();
}
