import { CitationBuilder } from '../core/citationBuilder.js';
import type { RetrievedChunk } from '../core/types.js';

describe('CitationBuilder', () => {
  it('emits citation data with offsets', () => {
    const builder = new CitationBuilder();
    const chunk: RetrievedChunk = {
      id: 'c1',
      documentId: 'doc',
      content: 'Example content for citation testing',
      position: 0,
      startOffset: 5,
      endOffset: 15,
      metadata: { title: 'Doc', url: 'http://example.com' },
      score: 0.8,
    } as RetrievedChunk;

    const citations = builder.build([chunk]);
    expect(citations[0].offsets.start).toBe(5);
    expect(citations[0].title).toBe('Doc');
  });
});

