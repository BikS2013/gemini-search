/**
 * Query result renderer — produces the human-readable ANSWER / SOURCES /
 * EXCERPTS layout, mirroring the `manage-gemini-file-search` skill's output
 * shape (acceptance #3).
 *
 * The ANSWER is printed with inline `[n]` citation markers produced by the
 * byte-accurate `renderInlineCitations` helper (the markers are 1-based and map
 * to the printed SOURCES list). SOURCES carry `title` + multi-store attribution
 * (`storeName`); EXCERPTS carry the retrieved `excerpt` text.
 *
 * Handles the no-grounding case gracefully (answer only) and surfaces a
 * non-STOP `finishReason` as a trailing note.
 */

import chalk from 'chalk';
import type { QueryResult } from '../../core/types.js';
import { renderInlineCitations } from '../../core/backend/citation-render.js';

/** Strip a `fileSearchStores/<id>` prefix to a short label for display. */
function shortStore(storeName: string | undefined): string | undefined {
  if (!storeName) return undefined;
  const parts = storeName.split('/');
  return parts.length > 1 ? parts[parts.length - 1] : storeName;
}

/**
 * Render a `QueryResult` to a printable string in the skill's answer/sources/
 * excerpts layout. Colors degrade gracefully when stdout is not a TTY (chalk
 * auto-detects).
 */
export function renderQueryResult(result: QueryResult): string {
  const lines: string[] = [];

  // ---- ANSWER (with inline [n] citation markers) ----
  // The CitationSpan[] is a normalized view; renderInlineCitations needs the
  // grounding-support shape, so reconstruct the minimal structural objects it
  // consumes from the normalized citations.
  const supports = result.citations.map((c) => ({
    segment: {
      startIndex: c.startIndex,
      endIndex: c.endIndex,
      text: c.text,
    },
    groundingChunkIndices: c.chunkIndices,
    confidenceScores: c.confidenceScores,
  }));

  const answerText =
    supports.length > 0
      ? renderInlineCitations(result.answer, supports)
      : result.answer;

  lines.push(chalk.bold('ANSWER'));
  lines.push(answerText.length > 0 ? answerText : '(no answer returned)');
  lines.push('');

  // ---- SOURCES ----
  if (result.sources.length > 0) {
    lines.push(chalk.bold('SOURCES'));
    result.sources.forEach((s, i) => {
      const n = i + 1;
      const title = s.title ?? s.uri ?? '(untitled source)';
      const store = shortStore(s.storeName);
      const attribution = store ? chalk.dim(` [store: ${store}]`) : '';
      lines.push(`  [${n}] ${title}${attribution}`);
      if (s.uri && s.uri !== title) lines.push(chalk.dim(`      ${s.uri}`));
      if (s.pageNumber != null) lines.push(chalk.dim(`      page ${s.pageNumber}`));
    });
    lines.push('');

    // ---- EXCERPTS ----
    const withExcerpts = result.sources
      .map((s, i) => ({ n: i + 1, excerpt: s.excerpt }))
      .filter((e) => e.excerpt && e.excerpt.trim() !== '');
    if (withExcerpts.length > 0) {
      lines.push(chalk.bold('EXCERPTS'));
      for (const e of withExcerpts) {
        lines.push(`  [${e.n}] ${e.excerpt!.trim()}`);
        lines.push('');
      }
    }
  } else {
    lines.push(chalk.dim('(no sources — answer is not grounded in any document)'));
    lines.push('');
  }

  // ---- finishReason note ----
  if (result.finishReason && result.finishReason !== 'STOP') {
    lines.push(chalk.yellow(`Note: finishReason = ${result.finishReason}`));
  }

  return lines.join('\n').replace(/\n+$/, '\n');
}
