import { GraphRAGService } from '../services/GraphRAGService.js';

describe('GraphRAGService load', () => {
  it('retries on failure with jitter', async () => {
    const service = new GraphRAGService({} as any, { complete: async () => 'ok' } as any, { generateEmbedding: async () => [] } as any);
    let attempts = 0;
    const result = await service.executeWithRetry(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('fail');
      }
      return 'done';
    });
    expect(result).toBe('done');
    expect(attempts).toBe(2);
  });
});
