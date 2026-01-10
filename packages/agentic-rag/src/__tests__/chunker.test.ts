import { RecursiveChunker } from '../core/chunker.js';

describe('RecursiveChunker', () => {
  it('splits content with overlap and preserves offsets', () => {
    const chunker = new RecursiveChunker({ maxTokens: 5, overlap: 1 });
    const chunks = chunker.chunk('doc1', 'one two three four five six seven eight nine ten');
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startOffset).toBe(0);
    expect(chunks[1].startOffset).toBeGreaterThan(0);
  });
});

