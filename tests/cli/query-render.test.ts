/**
 * Tests for src/cli/render/query-render.ts
 *
 * All tests pass synthetic QueryResult objects and assert structural properties
 * of the rendered string.  No live API calls, no process spawning.
 *
 * Chalk disables colour when there is no TTY (CI-safe), so we strip ANSI codes
 * before structural assertions to keep the tests colour-agnostic.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderQueryResult } from '../../src/cli/render/query-render.js';
import type { QueryResult, QuerySource, CitationSpan } from '../../src/core/types.js';

// ---- helpers ----------------------------------------------------------------

/** Strip ANSI escape codes so assertions are colour-independent. */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

/** Minimal valid QueryResult with no grounding. */
function makeResult(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    answer: 'The capital of France is Paris.',
    sources: [],
    citations: [],
    ...overrides,
  };
}

/** One minimal source. */
function makeSource(overrides: Partial<QuerySource> = {}): QuerySource {
  return {
    title: 'My Doc',
    excerpt: 'Paris is the capital.',
    storeName: 'fileSearchStores/store-abc',
    ...overrides,
  };
}

/** A citation span that references source index 0. */
function makeCitation(overrides: Partial<CitationSpan> = {}): CitationSpan {
  return {
    startIndex: 0,
    endIndex: 31,          // byte offset of "The capital of France is Paris."
    text: 'The capital of France is Paris.',
    chunkIndices: [0],
    ...overrides,
  };
}

// ---- ANSWER section --------------------------------------------------------

describe('renderQueryResult – ANSWER section', () => {
  it('prints the ANSWER heading', () => {
    const out = stripAnsi(renderQueryResult(makeResult()));
    expect(out).toContain('ANSWER');
  });

  it('includes the answer text when non-empty', () => {
    const out = stripAnsi(renderQueryResult(makeResult({ answer: 'Hello world' })));
    expect(out).toContain('Hello world');
  });

  it('shows "(no answer returned)" when answer is empty string', () => {
    const out = stripAnsi(renderQueryResult(makeResult({ answer: '' })));
    expect(out).toContain('(no answer returned)');
  });

  it('does NOT show "(no answer returned)" when answer is non-empty', () => {
    const out = stripAnsi(renderQueryResult(makeResult({ answer: 'Something' })));
    expect(out).not.toContain('(no answer returned)');
  });

  it('answer text appears after the ANSWER heading in the output', () => {
    const out = stripAnsi(renderQueryResult(makeResult({ answer: 'My answer text' })));
    const answerIdx = out.indexOf('ANSWER');
    const textIdx = out.indexOf('My answer text');
    expect(answerIdx).toBeGreaterThanOrEqual(0);
    expect(textIdx).toBeGreaterThan(answerIdx);
  });
});

// ---- SOURCES section -------------------------------------------------------

describe('renderQueryResult – SOURCES section', () => {
  it('shows the no-grounding message when sources is empty', () => {
    const out = stripAnsi(renderQueryResult(makeResult({ sources: [] })));
    expect(out).toContain('no sources');
  });

  it('does NOT show SOURCES heading when sources is empty', () => {
    const out = stripAnsi(renderQueryResult(makeResult({ sources: [] })));
    expect(out).not.toContain('\nSOURCES\n');
  });

  it('prints SOURCES heading when sources are present', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ sources: [makeSource()] })),
    );
    expect(out).toContain('SOURCES');
  });

  it('renders source title with 1-based index', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ sources: [makeSource({ title: 'Report Alpha' })] })),
    );
    expect(out).toMatch(/\[1\].*Report Alpha/);
  });

  it('renders multiple sources with sequential indices', () => {
    const sources = [
      makeSource({ title: 'First' }),
      makeSource({ title: 'Second' }),
      makeSource({ title: 'Third' }),
    ];
    const out = stripAnsi(renderQueryResult(makeResult({ sources })));
    expect(out).toMatch(/\[1\].*First/);
    expect(out).toMatch(/\[2\].*Second/);
    expect(out).toMatch(/\[3\].*Third/);
  });

  it('shows store attribution label derived from storeName path', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({
          sources: [makeSource({ storeName: 'fileSearchStores/my-store-id' })],
        }),
      ),
    );
    // The renderer strips the path prefix and displays only the last segment.
    expect(out).toContain('my-store-id');
    expect(out).not.toContain('fileSearchStores/my-store-id');
  });

  it('handles storeName with no "/" (already a short label)', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ storeName: 'shortname' })] }),
      ),
    );
    expect(out).toContain('shortname');
  });

  it('shows no store attribution when storeName is undefined', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ storeName: undefined })] }),
      ),
    );
    // No "[store:" label at all.
    expect(out).not.toContain('[store:');
  });

  it('prints the URI on a separate line when uri differs from title', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({
          sources: [
            makeSource({
              title: 'My Doc',
              uri: 'https://example.com/doc.pdf',
            }),
          ],
        }),
      ),
    );
    expect(out).toContain('https://example.com/doc.pdf');
  });

  it('does NOT print URI on a second line when uri equals title', () => {
    const uri = 'https://example.com/doc.pdf';
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ title: uri, uri })] }),
      ),
    );
    // URI appears exactly once.
    const count = (out.match(/https:\/\/example\.com\/doc\.pdf/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('prints pageNumber when present', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ pageNumber: 42 })] }),
      ),
    );
    expect(out).toContain('page 42');
  });

  it('does not print pageNumber line when pageNumber is undefined', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ pageNumber: undefined })] }),
      ),
    );
    expect(out).not.toContain('page ');
  });

  it('falls back to URI as title when title is undefined', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({
          sources: [makeSource({ title: undefined, uri: 'https://fallback.uri/x' })],
        }),
      ),
    );
    expect(out).toMatch(/\[1\].*https:\/\/fallback\.uri\/x/);
  });

  it('shows "(untitled source)" when both title and uri are undefined', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({
          sources: [makeSource({ title: undefined, uri: undefined })],
        }),
      ),
    );
    expect(out).toContain('(untitled source)');
  });
});

// ---- EXCERPTS section ------------------------------------------------------

describe('renderQueryResult – EXCERPTS section', () => {
  it('shows EXCERPTS heading when at least one source has a non-empty excerpt', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ sources: [makeSource({ excerpt: 'Relevant snippet.' })] })),
    );
    expect(out).toContain('EXCERPTS');
  });

  it('does NOT show EXCERPTS heading when no source has an excerpt', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ excerpt: undefined })] }),
      ),
    );
    expect(out).not.toContain('EXCERPTS');
  });

  it('does NOT show EXCERPTS heading when all excerpts are whitespace-only', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ excerpt: '   ' })] }),
      ),
    );
    expect(out).not.toContain('EXCERPTS');
  });

  it('trims excerpt text before rendering', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ excerpt: '  trimmed content  ' })] }),
      ),
    );
    expect(out).toContain('trimmed content');
    // Leading/trailing spaces stripped in output.
    expect(out).not.toMatch(/\[1\]\s{2,}trimmed/);
  });

  it('renders excerpt with its 1-based source index', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource({ excerpt: 'Excerpt text here.' })] }),
      ),
    );
    expect(out).toMatch(/\[1\]\s+Excerpt text here\./);
  });

  it('shows EXCERPTS section AFTER SOURCES section in output', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ sources: [makeSource()] })),
    );
    const sourcesIdx = out.indexOf('SOURCES');
    const excerptsIdx = out.indexOf('EXCERPTS');
    expect(sourcesIdx).toBeGreaterThanOrEqual(0);
    expect(excerptsIdx).toBeGreaterThan(sourcesIdx);
  });

  it('skips a source index in EXCERPTS when that source has no excerpt', () => {
    const sources: QuerySource[] = [
      makeSource({ title: 'One', excerpt: 'First excerpt.' }),
      makeSource({ title: 'Two', excerpt: undefined }),
      makeSource({ title: 'Three', excerpt: 'Third excerpt.' }),
    ];
    const out = stripAnsi(renderQueryResult(makeResult({ sources })));
    expect(out).toMatch(/\[1\]\s+First excerpt\./);
    expect(out).toMatch(/\[3\]\s+Third excerpt\./);
    // Source 2 skipped in EXCERPTS but present in SOURCES.
    expect(out).not.toMatch(/\[2\].*excerpt/i);
  });
});

// ---- Inline citation markers -----------------------------------------------

describe('renderQueryResult – inline citation markers', () => {
  it('inserts [1] marker into answer text when a citation references source 0', () => {
    const answer = 'Paris is the capital.';
    const citation: CitationSpan = {
      startIndex: 0,
      endIndex: Buffer.byteLength('Paris is the capital.', 'utf-8'),
      text: 'Paris is the capital.',
      chunkIndices: [0],
    };
    const out = stripAnsi(
      renderQueryResult(makeResult({ answer, citations: [citation], sources: [makeSource()] })),
    );
    // Marker must appear somewhere in the answer block before SOURCES.
    const answerBlock = out.substring(0, out.indexOf('SOURCES'));
    expect(answerBlock).toContain('[1]');
  });

  it('does not insert citation markers when citations array is empty', () => {
    const answer = 'No citations here.';
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ answer, citations: [], sources: [makeSource()] }),
      ),
    );
    // The raw answer text appears unmodified before SOURCES.
    const answerBlock = out.substring(out.indexOf('ANSWER'), out.indexOf('SOURCES'));
    expect(answerBlock).toContain('No citations here.');
  });

  it('maps chunkIndices correctly: chunk 1 → [2] marker', () => {
    const answer = 'Alpha beta.';
    const citation: CitationSpan = {
      startIndex: 0,
      endIndex: Buffer.byteLength('Alpha beta.', 'utf-8'),
      text: 'Alpha beta.',
      chunkIndices: [1],   // 0-based → [2] in output
    };
    const sources = [makeSource({ title: 'SourceA' }), makeSource({ title: 'SourceB' })];
    const out = stripAnsi(renderQueryResult(makeResult({ answer, citations: [citation], sources })));
    const answerBlock = out.substring(0, out.indexOf('SOURCES'));
    expect(answerBlock).toContain('[2]');
    expect(answerBlock).not.toContain('[1]');
  });

  it('handles multi-byte UTF-8 text without misalignment', () => {
    // "Café" — the "é" is 2 bytes in UTF-8.
    const answer = 'Café au lait.';
    const byteLen = Buffer.byteLength(answer, 'utf-8');
    const citation: CitationSpan = {
      startIndex: 0,
      endIndex: byteLen,
      text: answer,
      chunkIndices: [0],
    };
    const out = stripAnsi(
      renderQueryResult(makeResult({ answer, citations: [citation], sources: [makeSource()] })),
    );
    // Marker appears; answer text is not garbled.
    expect(out).toContain('Café au lait.');
    expect(out).toContain('[1]');
  });
});

// ---- finishReason note -------------------------------------------------------

describe('renderQueryResult – finishReason note', () => {
  it('shows no finishReason note when finishReason is "STOP"', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ finishReason: 'STOP' })),
    );
    expect(out).not.toContain('finishReason');
  });

  it('shows no finishReason note when finishReason is undefined', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ finishReason: undefined })),
    );
    expect(out).not.toContain('finishReason');
  });

  it('shows finishReason note for MAX_TOKENS', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ finishReason: 'MAX_TOKENS' })),
    );
    expect(out).toContain('finishReason');
    expect(out).toContain('MAX_TOKENS');
  });

  it('shows finishReason note for SAFETY', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ finishReason: 'SAFETY' })),
    );
    expect(out).toContain('finishReason');
    expect(out).toContain('SAFETY');
  });

  it('shows finishReason note for any non-STOP value', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ finishReason: 'RECITATION' })),
    );
    expect(out).toContain('RECITATION');
  });

  it('finishReason note appears AFTER the sources/excerpts sections', () => {
    const out = stripAnsi(
      renderQueryResult(
        makeResult({ sources: [makeSource()], finishReason: 'MAX_TOKENS' }),
      ),
    );
    const excerptsIdx = out.indexOf('EXCERPTS');
    const noteIdx = out.indexOf('finishReason');
    expect(noteIdx).toBeGreaterThan(excerptsIdx);
  });
});

// ---- overall output shape / trailing newline --------------------------------

describe('renderQueryResult – output shape', () => {
  it('returns a string ending with exactly one newline', () => {
    const out = renderQueryResult(makeResult());
    expect(out.endsWith('\n')).toBe(true);
    // No double-newline at the very end.
    expect(out.endsWith('\n\n')).toBe(false);
  });

  it('ANSWER heading appears before SOURCES heading', () => {
    const out = stripAnsi(
      renderQueryResult(makeResult({ sources: [makeSource()] })),
    );
    expect(out.indexOf('ANSWER')).toBeLessThan(out.indexOf('SOURCES'));
  });

  it('multi-store result lists each store short-name individually', () => {
    const sources: QuerySource[] = [
      makeSource({ title: 'Doc A', storeName: 'fileSearchStores/store-one' }),
      makeSource({ title: 'Doc B', storeName: 'fileSearchStores/store-two' }),
    ];
    const out = stripAnsi(renderQueryResult(makeResult({ sources })));
    expect(out).toContain('store-one');
    expect(out).toContain('store-two');
  });
});
