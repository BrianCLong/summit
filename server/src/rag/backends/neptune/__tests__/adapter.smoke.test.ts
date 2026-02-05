import { FeatureFlags } from '../../../../config/featureFlags.js';
import {
  BedrockKnowledgeBaseClient,
  BedrockKnowledgeBaseTransport,
} from '../../../../connectors/aws/bedrock-kb/BedrockKnowledgeBaseClient.js';
import { NeptuneManagedGraphRagAdapter } from '../NeptuneManagedGraphRagAdapter.js';

describe('NeptuneManagedGraphRagAdapter', () => {
  const transport: BedrockKnowledgeBaseTransport = {
    async retrieve() {
      return {
        results: [
          {
            id: 'kb-1',
            content: 'Managed result 1',
            score: 0.91,
            source: 'kb',
            metadata: { evidenceIds: ['EVD-KB-1'] },
          },
        ],
      };
    },
  };

  it('blocks when feature flag is disabled', async () => {
    const flags = FeatureFlags.getInstance();
    flags.update({ 'graphrag.neptuneManaged': false });

    const client = new BedrockKnowledgeBaseClient({
      knowledgeBaseId: 'kb',
      transport,
    });
    const adapter = new NeptuneManagedGraphRagAdapter(client);

    await expect(
      adapter.retrieve({ queryText: 'test', topK: 3 }),
    ).rejects.toThrow('Neptune managed GraphRAG mode is disabled');
  });

  it('returns managed candidates when enabled', async () => {
    const flags = FeatureFlags.getInstance();
    flags.update({ 'graphrag.neptuneManaged': true });

    const client = new BedrockKnowledgeBaseClient({
      knowledgeBaseId: 'kb',
      transport,
    });
    const adapter = new NeptuneManagedGraphRagAdapter(client);

    const result = await adapter.retrieve({ queryText: 'test', topK: 3 });

    expect(result.source).toBe('bedrock-knowledge-base');
    expect(result.candidates[0].id).toBe('kb-1');
    expect(result.candidates[0].evidenceIds).toEqual(['EVD-KB-1']);
    expect(result.candidates[0].combinedScore).toBe(0.91);
  });
});
