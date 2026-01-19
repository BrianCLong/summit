import { packContext } from '../context/ContextPacker.js';
import type { EvidenceChunk } from '../types/index.js';
import type { HighlightResponse } from '../context/types.js';

const baseChunk = (id: string, content: string): EvidenceChunk => ({
  id,
  content,
  citations: [
    {
      id,
      documentId: id,
      spanStart: 0,
      spanEnd: content.length,
      content,
      confidence: 0.8,
      sourceType: 'document',
    },
  ],
  graphPaths: [],
  relevanceScore: 0.6,
  tenantId: 't-1',
});

const highlight: HighlightResponse = {
  selected_spans: [],
  selected_sentences: [
    {
      doc_id: 'doc-1',
      index: 0,
      start: 0,
      end: 10,
      text: 'Alpha',
      score: 0.9,
      token_count: 2,
    },
  ],
  sentence_scores: [],
  token_scores: null,
  compression_rate: 0.5,
  kept_token_count: 4,
  total_token_count: 8,
  model_version: 'zilliz/semantic-highlight-bilingual-v1@rev',
  timings_ms: { total: 10 },
  conflict_sets: [],
};

describe('packContext', () => {
  it('packs by utility when budget is provided', () => {
    const chunks = [
      baseChunk('doc-1', 'Alpha beta gamma'),
      baseChunk('doc-2', 'Delta epsilon zeta eta theta iota'),
    ];

    const packed = packContext(chunks, highlight, 3);
    expect(packed.chunks.length).toBeGreaterThanOrEqual(1);
    expect(packed.chunks[0].id).toBe('doc-1');
  });
});
