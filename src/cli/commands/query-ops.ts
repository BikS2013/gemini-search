/**
 * query command — run a File Search RAG query against one or more stores via the
 * sole `IGeminiBackend` path and render the result.
 *
 * Output modes (resolved Open Question 3):
 *   - default    : human-readable ANSWER + SOURCES + EXCERPTS with inline [n]
 *                  citations (mirrors the skill output; acceptance #3).
 *   - --json     : the normalized `QueryResult` (sources/citations).
 *   - --raw-json : the verbatim raw groundingMetadata passthrough (`result.raw`).
 *
 * Default model is the backend's binding default (`gemini-3.1-pro-preview`,
 * fallback `gemini-2.5-pro`), overridable via --model.
 */

import { getBackend, handleCliError, type GlobalOpts } from './shared.js';
import { renderQueryResult } from '../render/query-render.js';

export interface QueryOpts extends GlobalOpts {
  /** One or more store apiNames (repeatable --store). */
  store: string[];
  /** Optional model override. */
  model?: string;
  /** Optional File Search metadata filter expression. */
  metadataFilter?: string;
  /** Emit the normalized QueryResult as JSON. */
  json?: boolean;
  /** Emit the raw groundingMetadata subtree as JSON. */
  rawJson?: boolean;
}

/** Run a query and render it. `prompt` is the question text. */
export async function runQuery(prompt: string, opts: QueryOpts): Promise<void> {
  try {
    if (!opts.store || opts.store.length === 0) {
      console.error('[usage error] at least one --store is required.');
      process.exit(2);
    }
    const backend = getBackend(opts);
    const result = await backend.query(opts.store, prompt, {
      model: opts.model,
      metadataFilter: opts.metadataFilter,
    });

    if (opts.rawJson) {
      console.log(JSON.stringify(result.raw ?? null, null, 2));
      return;
    }
    if (opts.json) {
      // Emit the normalized QueryResult without the bulky raw passthrough.
      const { raw: _raw, ...normalized } = result;
      console.log(JSON.stringify(normalized, null, 2));
      return;
    }

    console.log(renderQueryResult(result));
  } catch (err) {
    handleCliError(err);
  }
}
