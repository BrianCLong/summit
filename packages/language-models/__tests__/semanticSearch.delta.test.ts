import { EmbeddingGenerator } from '../src/embeddings';
import { SemanticSearch } from '../src/semantic-search';

type Vector = number[];

class FixedEmbedder extends EmbeddingGenerator {
  constructor(private readonly mapping: Record<string, Vector>) {
    const anyVector = Object.values(mapping)[0] ?? [1, 0, 0];
    super('fixed', anyVector.length);
  }

  async encode(text: string) {
    const vector = this.mapping[text] ?? this.mapping.default ?? [1, 0, 0];
    return {
      vector,
      dimension: vector.length,
      model: 'fixed',
    };
  }
}

describe('SemanticSearch delta operator integration', () => {
  const documents = [
    { id: 'doc1', text: 'doc1' },
    { id: 'doc2', text: 'doc2' },
  ];

  const mapping: Record<string, Vector> = {
    query: [1, 0, 0],
    doc1: [1, 0, 0],
    doc2: [0.2, 0.8, 0],
  };

  it('keeps baseline behavior when the feature flag is off', async () => {
    const embedder = new FixedEmbedder(mapping);
    const search = new SemanticSearch({ embedder, deltaOperatorEnabled: false });
    await search.indexDocuments(documents);
    const results = await search.search('query', documents, 2);
    expect(results[0].documentId).toBe('doc1');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('applies delta operator updates and records telemetry when enabled', async () => {
    const embedder = new FixedEmbedder(mapping);
    const telemetry = {
      recordBeta: jest.fn(),
      recordProjectionMagnitude: jest.fn(),
      recordDeltaNorm: jest.fn(),
    };
    const search = new SemanticSearch({
      embedder,
      deltaOperatorEnabled: true,
      deltaConfig: { bias: 0 },
      telemetry,
    });
    await search.indexDocuments(documents);
    const results = await search.search('query', documents, 2);
    expect(results.length).toBe(2);
    expect(telemetry.recordBeta).toHaveBeenCalled();
    expect(telemetry.recordProjectionMagnitude).toHaveBeenCalled();
    expect(telemetry.recordDeltaNorm).toHaveBeenCalled();
    const deltaMagnitude = (telemetry.recordDeltaNorm as jest.Mock).mock.calls[0][0];
    expect(deltaMagnitude).toBeGreaterThan(0);
  });
});
