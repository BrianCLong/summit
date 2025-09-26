import logger from '../../config/logger';
import { neo } from '../../db/neo4j';
import vectorStoreService from '../../services/VectorStoreService';

const log = logger.child({ resolver: 'VectorSimilaritySearch' });

export const vectorSearchResolvers = {
  Query: {
    async vectorSimilaritySearch(_: unknown, { input }: any) {
      const { tenantId, nodeId, queryEmbedding, topK, minScore } = input || {};

      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      if (!vectorStoreService.isEnabled()) {
        throw new Error('Vector similarity search is not configured');
      }

      let embedding: number[] | undefined = Array.isArray(queryEmbedding)
        ? queryEmbedding
        : undefined;

      if ((!embedding || embedding.length === 0) && nodeId) {
        const stored = await vectorStoreService.fetchEmbedding(tenantId, nodeId);
        if (!stored) {
          throw new Error('No embedding stored for the supplied nodeId');
        }
        embedding = stored.embedding;
      }

      if (!embedding || embedding.length === 0) {
        throw new Error('Provide either queryEmbedding or a nodeId with a stored embedding');
      }

      const matches = await vectorStoreService.search({
        tenantId,
        embedding,
        topK,
        minScore,
      });

      if (!matches.length) {
        return [];
      }

      const nodeIds = matches.map((match) => match.nodeId);
      let nodeRecords: Map<string, any> = new Map();

      try {
        const result = await neo.run(
          `
          MATCH (n)
          WHERE n.id IN $nodeIds AND n.tenantId = $tenantId
          RETURN n.id as id, n
        `,
          { nodeIds, tenantId },
          { tenantId },
        );

        nodeRecords = new Map(
          result.records.map((record: any) => {
            const node = record.get('n') || record.get('node');
            const props = node?.properties || {};
            return [record.get('id'), {
              id: record.get('id'),
              kind: props.kind,
              labels: props.labels || [],
              props: props.props || {},
              tenantId: props.tenantId,
            }];
          }),
        );
      } catch (error) {
        log.error({ err: error, tenantId }, 'Failed to hydrate Neo4j nodes for vector search results');
      }

      return matches.map((match) => {
        const node = nodeRecords.get(match.nodeId) || {
          id: match.nodeId,
          kind: null,
          labels: [],
          props: {},
          tenantId,
        };

        return {
          node,
          score: match.score,
          embedding: match.embedding || null,
          metadata: match.metadata || null,
        };
      });
    },
  },
};

export default vectorSearchResolvers;
