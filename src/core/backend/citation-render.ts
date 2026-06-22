/**
 * Citation rendering and grounding-metadata mapping helpers.
 *
 * The two load-bearing pitfalls handled here (SDK-schema research §"Worked
 * example"):
 *
 *  1. `Segment.startIndex`/`endIndex` are BYTE offsets, not character offsets.
 *     `renderInlineCitations` slices on a UTF-8 `Buffer` so multi-byte text
 *     (emoji, accented letters, CJK) never misaligns. NEVER use `string.slice`.
 *
 *  2. For File Search, only `groundingChunk.retrievedContext` is populated
 *     (web/maps/image variants stay empty), so `mapSources` reads only that.
 *
 * These helpers take minimal STRUCTURAL types (not SDK class imports) so they
 * stay testable without constructing SDK objects and the backend can pass the
 * raw SDK arrays straight through.
 */

import type { QuerySource, CitationSpan } from '../types.js';

/** Structural shape of a grounding chunk's retrieved context (File Search). */
export interface RetrievedContextLike {
  text?: string;
  title?: string;
  uri?: string;
  pageNumber?: number;
  mediaId?: string;
  fileSearchStore?: string;
  customMetadata?: Array<{
    key?: string;
    stringValue?: string;
    numericValue?: number;
  }>;
}

/** Structural shape of a grounding chunk. */
export interface GroundingChunkLike {
  retrievedContext?: RetrievedContextLike;
}

/** Structural shape of a grounding support (inline-citation mapping). */
export interface GroundingSupportLike {
  segment?: { startIndex?: number; endIndex?: number; text?: string };
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
}

/**
 * Map grounding chunks to the normalized source/excerpt list. Reads only
 * `retrievedContext` (the File Search variant). Index order is preserved so
 * `groundingChunkIndices` line up with this array.
 */
export function mapSources(chunks: GroundingChunkLike[]): QuerySource[] {
  return chunks.map((c) => {
    const rc = c.retrievedContext;
    return {
      title: rc?.title,
      excerpt: rc?.text,
      storeName: rc?.fileSearchStore,
      uri: rc?.uri,
      pageNumber: rc?.pageNumber,
      mediaId: rc?.mediaId,
      customMetadata: rc?.customMetadata?.map((m) => ({
        key: m.key,
        stringValue: m.stringValue,
        numericValue: m.numericValue,
      })),
    };
  });
}

/**
 * Map grounding supports to the normalized `CitationSpan[]` (byte offsets +
 * chunk indices + confidence scores). Supports without a usable segment or
 * chunk indices are dropped.
 */
export function mapCitations(supports: GroundingSupportLike[]): CitationSpan[] {
  const out: CitationSpan[] = [];
  for (const s of supports) {
    const indices = s.groundingChunkIndices ?? [];
    if (indices.length === 0) continue;
    out.push({
      startIndex: s.segment?.startIndex,
      endIndex: s.segment?.endIndex,
      text: s.segment?.text,
      chunkIndices: indices,
      confidenceScores: s.confidenceScores,
    });
  }
  return out;
}

/**
 * Splice inline `[n]` citation markers into the answer at the grounding-support
 * BYTE offsets.
 *
 * - Operates on `Buffer.from(text, 'utf-8')` (byte-accurate).
 * - Processes supports in DESCENDING `endIndex` order so earlier offsets stay
 *   valid as markers are inserted.
 * - Markers are 1-based (`[1]`, `[2][3]`) for human readability, mapping to the
 *   printed SOURCES list.
 *
 * @returns the answer text with markers inserted; the original text unchanged
 *   when there are no usable supports.
 */
export function renderInlineCitations(
  text: string,
  supports: GroundingSupportLike[],
): string {
  const ordered = supports
    .filter(
      (s) =>
        s.segment?.endIndex != null &&
        s.groundingChunkIndices != null &&
        s.groundingChunkIndices.length > 0,
    )
    .sort((a, b) => b.segment!.endIndex! - a.segment!.endIndex!);

  if (ordered.length === 0) return text;

  let out = Buffer.from(text, 'utf-8');
  for (const s of ordered) {
    const marker = Buffer.from(
      ' ' + s.groundingChunkIndices!.map((i) => `[${i + 1}]`).join(''),
      'utf-8',
    );
    // Clamp the offset into the current buffer to stay safe against stale
    // offsets after prior insertions / out-of-range API values.
    const at = Math.min(Math.max(s.segment!.endIndex!, 0), out.length);
    out = Buffer.concat([out.subarray(0, at), marker, out.subarray(at)]);
  }
  return out.toString('utf-8');
}
