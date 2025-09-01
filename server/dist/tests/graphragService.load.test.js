import { GraphRAGService } from '../services/GraphRAGService.js';
describe('GraphRAGService load', () => {
    it('retries on failure with jitter', async () => {
        const service = new GraphRAGService({}, { complete: async () => 'ok' }, { generateEmbedding: async () => [] });
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
//# sourceMappingURL=graphragService.load.test.js.map