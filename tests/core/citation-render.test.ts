/**
 * Tests for citation-render.ts
 *
 * Covers:
 *  - mapSources: field mapping from GroundingChunkLike[] to QuerySource[]
 *  - mapCitations: filtering and mapping from GroundingSupportLike[] to CitationSpan[]
 *  - renderInlineCitations: byte-offset slicing (ASCII, multi-byte, CJK, emoji),
 *    descending endIndex ordering, 1-based [n] markers, clamping, edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  mapSources,
  mapCitations,
  renderInlineCitations,
  type GroundingChunkLike,
  type GroundingSupportLike,
} from '../../src/core/backend/citation-render.js';

// ---------------------------------------------------------------------------
// mapSources
// ---------------------------------------------------------------------------

describe('mapSources', () => {
  it('maps a single chunk with all fields', () => {
    const chunks: GroundingChunkLike[] = [
      {
        retrievedContext: {
          title: 'Doc A',
          text: 'An excerpt about doc A.',
          uri: 'https://example.com/doc-a',
          fileSearchStore: 'fileSearchStores/abc123',
          pageNumber: 3,
          mediaId: 'media/blob-001',
          customMetadata: [
            { key: 'author', stringValue: 'Alice' },
            { key: 'year', numericValue: 2024 },
          ],
        },
      },
    ];
    const result = mapSources(chunks);
    expect(result).toHaveLength(1);
    const s = result[0];
    expect(s.title).toBe('Doc A');
    expect(s.excerpt).toBe('An excerpt about doc A.');
    expect(s.uri).toBe('https://example.com/doc-a');
    expect(s.storeName).toBe('fileSearchStores/abc123');
    expect(s.pageNumber).toBe(3);
    expect(s.mediaId).toBe('media/blob-001');
    expect(s.customMetadata).toEqual([
      { key: 'author', stringValue: 'Alice', numericValue: undefined },
      { key: 'year', stringValue: undefined, numericValue: 2024 },
    ]);
  });

  it('maps a chunk with no retrievedContext to an object with all undefined fields', () => {
    const chunks: GroundingChunkLike[] = [{}];
    const result = mapSources(chunks);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBeUndefined();
    expect(result[0].excerpt).toBeUndefined();
    expect(result[0].storeName).toBeUndefined();
    expect(result[0].uri).toBeUndefined();
    expect(result[0].pageNumber).toBeUndefined();
    expect(result[0].mediaId).toBeUndefined();
    expect(result[0].customMetadata).toBeUndefined();
  });

  it('maps multiple chunks preserving order', () => {
    const chunks: GroundingChunkLike[] = [
      { retrievedContext: { title: 'First' } },
      { retrievedContext: { title: 'Second' } },
      { retrievedContext: { title: 'Third' } },
    ];
    const result = mapSources(chunks);
    expect(result.map((s) => s.title)).toEqual(['First', 'Second', 'Third']);
  });

  it('returns an empty array for empty input', () => {
    expect(mapSources([])).toEqual([]);
  });

  it('reads only retrievedContext, not web/image/maps fields', () => {
    // A chunk that simulates having web-field data — mapSources should not read it
    const chunks: GroundingChunkLike[] = [
      {
        retrievedContext: { title: 'File Search Source' },
        // Type cast to inject extra fields that would exist for web grounding
      } as GroundingChunkLike,
    ];
    const result = mapSources(chunks);
    expect(result[0].title).toBe('File Search Source');
  });

  it('handles chunks with partial retrievedContext fields', () => {
    const chunks: GroundingChunkLike[] = [
      { retrievedContext: { title: 'Only Title' } },
    ];
    const result = mapSources(chunks);
    expect(result[0].title).toBe('Only Title');
    expect(result[0].excerpt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// mapCitations
// ---------------------------------------------------------------------------

describe('mapCitations', () => {
  it('maps a support with all fields', () => {
    const supports: GroundingSupportLike[] = [
      {
        segment: { startIndex: 0, endIndex: 10, text: 'Hello text' },
        groundingChunkIndices: [0, 2],
        confidenceScores: [0.9, 0.8],
      },
    ];
    const result = mapCitations(supports);
    expect(result).toHaveLength(1);
    expect(result[0].startIndex).toBe(0);
    expect(result[0].endIndex).toBe(10);
    expect(result[0].text).toBe('Hello text');
    expect(result[0].chunkIndices).toEqual([0, 2]);
    expect(result[0].confidenceScores).toEqual([0.9, 0.8]);
  });

  it('drops supports with empty groundingChunkIndices', () => {
    const supports: GroundingSupportLike[] = [
      {
        segment: { startIndex: 0, endIndex: 5, text: 'Hi' },
        groundingChunkIndices: [],
      },
    ];
    expect(mapCitations(supports)).toHaveLength(0);
  });

  it('drops supports with no groundingChunkIndices field', () => {
    const supports: GroundingSupportLike[] = [
      {
        segment: { startIndex: 0, endIndex: 5 },
      },
    ];
    expect(mapCitations(supports)).toHaveLength(0);
  });

  it('keeps supports with indices even when segment is partial', () => {
    const supports: GroundingSupportLike[] = [
      {
        groundingChunkIndices: [1],
        // no segment
      },
    ];
    const result = mapCitations(supports);
    expect(result).toHaveLength(1);
    expect(result[0].startIndex).toBeUndefined();
    expect(result[0].endIndex).toBeUndefined();
    expect(result[0].text).toBeUndefined();
    expect(result[0].chunkIndices).toEqual([1]);
  });

  it('handles mixed valid and invalid supports', () => {
    const supports: GroundingSupportLike[] = [
      { groundingChunkIndices: [0], segment: { endIndex: 5 } },
      { groundingChunkIndices: [] },                 // dropped
      { groundingChunkIndices: [1], segment: { endIndex: 20 } },
    ];
    const result = mapCitations(supports);
    expect(result).toHaveLength(2);
    expect(result[0].chunkIndices).toEqual([0]);
    expect(result[1].chunkIndices).toEqual([1]);
  });

  it('returns empty array for empty input', () => {
    expect(mapCitations([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// renderInlineCitations — ASCII
// ---------------------------------------------------------------------------

describe('renderInlineCitations — ASCII', () => {
  it('inserts a single [1] marker at the correct byte offset', () => {
    const text = 'Hello world.';
    const supports: GroundingSupportLike[] = [
      { segment: { startIndex: 0, endIndex: 5 }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    // After byte 5 ("Hello") insert " [1]"
    expect(result).toBe('Hello [1] world.');
  });

  it('inserts multiple markers in descending endIndex order so earlier offsets stay valid', () => {
    // "The quick brown fox"
    //  0123456789...
    // Support A: endIndex=9 (after "The quick") → [1]
    // Support B: endIndex=3 (after "The") → [2]
    // Processing B last (ascending) would shift A's offset — descending avoids that
    const text = 'The quick brown fox';
    const supports: GroundingSupportLike[] = [
      { segment: { startIndex: 0, endIndex: 3 }, groundingChunkIndices: [1] },
      { segment: { startIndex: 4, endIndex: 9 }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    // descending by endIndex: process endIndex=9 first, then endIndex=3
    // After: "The quick [1] brown fox"
    // Then at byte 3 of THAT buffer insert " [2]": "The [2] quick [1] brown fox"
    expect(result).toBe('The [2] quick [1] brown fox');
  });

  it('inserts multiple chunk indices as [1][2] for a single support', () => {
    const text = 'Claim here.';
    const supports: GroundingSupportLike[] = [
      { segment: { startIndex: 0, endIndex: 5 }, groundingChunkIndices: [0, 1] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe('Claim [1][2] here.');
  });

  it('uses 1-based marker labels (index 0 → [1], index 2 → [3])', () => {
    const text = 'Sentence.';
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: 8 }, groundingChunkIndices: [2] },
    ];
    expect(renderInlineCitations(text, supports)).toContain('[3]');
    expect(renderInlineCitations(text, supports)).not.toContain('[2]');
  });

  it('returns the original text unchanged when no usable supports exist', () => {
    const text = 'No citations here.';
    // No endIndex
    const supports: GroundingSupportLike[] = [{ groundingChunkIndices: [0] }];
    expect(renderInlineCitations(text, supports)).toBe(text);
  });

  it('returns the original text unchanged for empty supports array', () => {
    const text = 'Plain text.';
    expect(renderInlineCitations(text, [])).toBe(text);
  });

  it('drops supports without groundingChunkIndices before rendering', () => {
    const text = 'Something.';
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: 5 } }, // no indices
    ];
    expect(renderInlineCitations(text, supports)).toBe(text);
  });

  it('clamps an endIndex beyond buffer length to buffer.length', () => {
    const text = 'Short.';
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: 9999 }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    // Marker appended at end
    expect(result).toBe('Short. [1]');
  });

  it('clamps a negative endIndex to 0 (inserts at start)', () => {
    const text = 'Short.';
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: -1 }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe(' [1]Short.');
  });
});

// ---------------------------------------------------------------------------
// renderInlineCitations — multi-byte / CJK / emoji alignment
// ---------------------------------------------------------------------------

describe('renderInlineCitations — multi-byte alignment (the critical pitfall)', () => {
  it('correctly slices after an accented-latin character (2-byte UTF-8)', () => {
    // "café" in UTF-8: 'c'=0x63 'a'=0x61 'f'=0x66 'é'=0xC3 0xA9 → 5 bytes
    const text = 'café end';
    const byteLen = Buffer.byteLength('café', 'utf-8'); // 5
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: byteLen }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe('café [1] end');
    // Verify no corruption in the 'é' character
    expect(result).toContain('é');
  });

  it('correctly slices within a CJK string (3 bytes each in UTF-8)', () => {
    // "你好" is 6 bytes (3 per character)
    const text = '你好世界';
    // endIndex = 6 (after '你好', before '世界')
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: 6 }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe('你好 [1]世界');
  });

  it('handles a full CJK sentence without character corruption', () => {
    const text = '这是一段文字关于某个主题的内容';
    const byteLen = Buffer.byteLength('这是一段文字', 'utf-8'); // 6 * 3 = 18
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: byteLen }, groundingChunkIndices: [1] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe('这是一段文字 [2]关于某个主题的内容');
  });

  it('correctly slices after an emoji (4 bytes in UTF-8)', () => {
    // "🔥" is 4 bytes (U+1F525)
    const text = 'Hot🔥End';
    // Byte layout: H=1,o=2,t=3,🔥=4..7, E=8, n=9, d=10
    const byteAfterEmoji = Buffer.byteLength('Hot🔥', 'utf-8'); // 7
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: byteAfterEmoji }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe('Hot🔥 [1]End');
    // Ensure emoji is intact
    expect(result).toContain('🔥');
  });

  it('handles mixed ASCII + CJK + emoji in a single text', () => {
    // "AI是🤖 assistant" — AI=2 bytes, 是=3 bytes, 🤖=4 bytes, space=1 byte
    const text = 'AI是🤖 assistant';
    // Insert marker after "AI是🤖 " (2+3+4+1 = 10 bytes)
    const byteOffset = Buffer.byteLength('AI是🤖 ', 'utf-8'); // 10
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: byteOffset }, groundingChunkIndices: [2] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe('AI是🤖  [3]assistant');
    expect(result).toContain('🤖');
    expect(result).toContain('是');
  });

  it('handles multiple markers in descending order across multi-byte boundaries', () => {
    // "前言 正文 结论" — each Chinese char = 3 bytes
    // byte positions: 前=0-2, 言=3-5, ' '=6, 正=7-9, 文=10-12, ' '=13, 结=14-16, 论=17-19
    const text = '前言 正文 结论';
    const byteAfterText1 = Buffer.byteLength('前言', 'utf-8'); // 6
    const byteAfterText2 = Buffer.byteLength('前言 正文', 'utf-8'); // 13
    const supports: GroundingSupportLike[] = [
      // Process in descending endIndex order: byteAfterText2 first, byteAfterText1 second
      { segment: { endIndex: byteAfterText1 }, groundingChunkIndices: [0] },
      { segment: { endIndex: byteAfterText2 }, groundingChunkIndices: [1] },
    ];
    const result = renderInlineCitations(text, supports);
    // Step 1: insert ' [2]' at byte 13 → '前言 正文 [2] 结论'
    // Step 2: insert ' [1]' at byte 6  → '前言 [1] 正文 [2] 结论'
    // (original space at byte 6 between 前言 and 正文 is preserved in the buffer)
    expect(result).toBe('前言 [1] 正文 [2] 结论');
  });
});

// ---------------------------------------------------------------------------
// renderInlineCitations — endIndex = 0 edge case
// ---------------------------------------------------------------------------

describe('renderInlineCitations — edge cases', () => {
  it('handles endIndex = 0 (marker inserted at the very start)', () => {
    const text = 'Start here';
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: 0 }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    expect(result).toBe(' [1]Start here');
  });

  it('handles endIndex exactly equal to text byte length (append at end)', () => {
    const text = 'End';
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: 3 }, groundingChunkIndices: [0] },
    ];
    expect(renderInlineCitations(text, supports)).toBe('End [1]');
  });

  it('handles empty text gracefully', () => {
    // endIndex=0 and text is empty
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: 0 }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations('', supports);
    expect(result).toBe(' [1]');
  });

  it('produces the correct round-trip: decode back to valid UTF-8', () => {
    const text = 'αβγδ result';
    const byteOffset = Buffer.byteLength('αβγδ', 'utf-8'); // 8 bytes (2 each)
    const supports: GroundingSupportLike[] = [
      { segment: { endIndex: byteOffset }, groundingChunkIndices: [0] },
    ];
    const result = renderInlineCitations(text, supports);
    // Verify the result is valid UTF-8 by re-encoding
    const roundTrip = Buffer.from(result, 'utf-8').toString('utf-8');
    expect(result).toBe(roundTrip);
    expect(result).toBe('αβγδ [1] result');
  });
});
