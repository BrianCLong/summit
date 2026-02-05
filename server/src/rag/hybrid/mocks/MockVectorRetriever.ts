import {
  HybridQuery,
  VectorCandidate,
  VectorRetriever,
} from '../HybridRetriever.js';

const seedScores = (text: string) => {
  const base = text.length % 10;
  return [0.9 - base * 0.01, 0.8 - base * 0.01, 0.7 - base * 0.01];
};

export class MockVectorRetriever implements VectorRetriever {
  async retrieve(query: HybridQuery): Promise<VectorCandidate[]> {
    const scores = seedScores(query.queryText);
    return [
      {
        id: 'doc-alpha',
        text: 'Alpha vector snippet',
        score: scores[0],
        evidenceIds: ['EVD-VECTOR-ALPHA'],
        metadata: { source: 'mock-vector' },
      },
      {
        id: 'doc-beta',
        text: 'Beta vector snippet',
        score: scores[1],
        evidenceIds: ['EVD-VECTOR-BETA'],
        metadata: { source: 'mock-vector' },
      },
      {
        id: 'doc-gamma',
        text: 'Gamma vector snippet',
        score: scores[2],
        evidenceIds: ['EVD-VECTOR-GAMMA'],
        metadata: { source: 'mock-vector' },
      },
    ];
  }
}
