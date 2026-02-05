import { FeatureFlags } from '../../../config/featureFlags.js';
import {
  BedrockKnowledgeBaseClient,
  BedrockKnowledgeBaseQuery,
} from '../../../connectors/aws/bedrock-kb/BedrockKnowledgeBaseClient.js';
import { HybridCandidate } from '../../hybrid/HybridRetriever.js';

export interface NeptuneManagedGraphRagQuery {
  queryText: string;
  topK: number;
  filters?: Record<string, unknown>;
}

export interface NeptuneManagedGraphRagResult {
  candidates: HybridCandidate[];
  source: 'bedrock-knowledge-base';
}

const extractEvidenceIds = (metadata?: Record<string, unknown>): string[] => {
  const ids = metadata?.evidenceIds;
  if (Array.isArray(ids)) {
    return ids.filter((id) => typeof id === 'string');
  }
  return [];
};

export class NeptuneManagedGraphRagAdapter {
  constructor(private readonly client: BedrockKnowledgeBaseClient) {}

  private ensureEnabled(): void {
    const flags = FeatureFlags.getInstance();
    if (!flags.isEnabled('graphrag.neptuneManaged')) {
      throw new Error('Neptune managed GraphRAG mode is disabled by feature flag.');
    }
  }

  async retrieve(
    query: NeptuneManagedGraphRagQuery,
  ): Promise<NeptuneManagedGraphRagResult> {
    this.ensureEnabled();

    const request: BedrockKnowledgeBaseQuery = {
      queryText: query.queryText,
      topK: query.topK,
      filters: query.filters,
    };

    const response = await this.client.retrieve(request);

    const candidates: HybridCandidate[] = response.results.map((result) => {
      const evidenceIds = extractEvidenceIds(result.metadata);
      return {
        id: result.id,
        text: result.content,
        vectorScore: result.score,
        graphScore: result.score,
        combinedScore: result.score,
        evidenceIds: evidenceIds.length > 0 ? evidenceIds : [`EVD-MANAGED-${result.id}`],
        metadata: {
          source: result.source ?? 'bedrock-knowledge-base',
          ...result.metadata,
        },
      };
    });

    return {
      candidates,
      source: 'bedrock-knowledge-base',
    };
  }
}
