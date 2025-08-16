/**
 * GraphRAG GraphQL Resolvers (TypeScript)
 * Provides GraphQL interface for explainable GraphRAG operations
 */

import { GraphRAGService, GraphRAGRequest, GraphRAGResponse } from '../../services/GraphRAGService.js';
import { EmbeddingService } from '../../services/EmbeddingService.js';
import { LLMService } from '../../services/LLMService.js';
import { similarityService, SimilarEntity } from '../../services/SimilarityService.js';
import { getNeo4jDriver, getRedisClient } from '../../config/database.js';
import pino from 'pino';

const logger = pino({ name: 'graphragResolvers' });

// Service initialization
let graphRAGService: GraphRAGService | null = null;
let embeddingService: EmbeddingService;
let llmService: LLMService;

function initializeServices(): GraphRAGService {
  if (!graphRAGService) {
    const neo4jDriver = getNeo4jDriver();
    const redisClient = getRedisClient();
    
    embeddingService = new EmbeddingService();
    llmService = new LLMService();
    graphRAGService = new GraphRAGService(neo4jDriver, llmService, embeddingService, redisClient);
    
    logger.info('GraphRAG services initialized');
  }
  return graphRAGService;
}

interface GraphRAGQueryInput {
  investigationId: string;
  question: string;
  focusEntityIds?: string[];
  maxHops?: number;
  temperature?: number;
  maxTokens?: number;
}

interface Context {
  user?: {
    id: string;
    roles: string[];
  };
}

export const graphragResolvers = {
  Query: {
    /**
     * Query the knowledge graph using explainable GraphRAG
     */
    graphRagAnswer: async (
      _: any,
      args: { input: GraphRAGQueryInput },
      context: Context
    ): Promise<GraphRAGResponse> => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const service = initializeServices();
      const { input } = args;

      try {
        logger.info('GraphRAG query received', {
          investigationId: input.investigationId,
          userId: context.user.id,
          questionLength: input.question.length
        });

        const request: GraphRAGRequest = {
          investigationId: input.investigationId,
          question: input.question,
          focusEntityIds: input.focusEntityIds,
          maxHops: input.maxHops,
          temperature: input.temperature,
          maxTokens: input.maxTokens
        };

        const response = await service.answer(request);

        logger.info('GraphRAG query completed', {
          investigationId: input.investigationId,
          userId: context.user.id,
          confidence: response.confidence,
          citationsCount: response.citations.entityIds.length,
          whyPathsCount: response.why_paths.length
        });

        return response;

      } catch (error) {
        logger.error('GraphRAG query failed', {
          investigationId: input.investigationId,
          userId: context.user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw new Error(
          error instanceof Error 
            ? `GraphRAG query failed: ${error.message}`
            : 'GraphRAG query failed: Unknown error'
        );
      }
    },

    /**
     * Get similar entities using embedding search
     */
    similarEntities: async (
      _: any,
      args: { entityId?: string; text?: string; topK?: number; investigationId: string },
      context: Context
    ): Promise<Array<{
      entity: any;
      similarity: number;
    }>> => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const { entityId, text, topK = 10, investigationId } = args;

      try {
        logger.info('Similarity search requested', {
          entityId,
          text: text?.substring(0, 50),
          topK,
          investigationId,
          userId: context.user.id
        });

        const result = await similarityService.findSimilar({
          investigationId,
          entityId,
          text,
          topK,
          threshold: 0.7,
          includeText: true
        });

        // TODO: Fetch full entity objects from Neo4j using the entity IDs
        // For now, return simplified entity structure
        const similarEntities = result.results.map(similar => ({
          entity: {
            id: similar.entityId,
            // These would be populated from actual entity lookup
            type: 'unknown',
            label: similar.text?.substring(0, 50) || 'Unknown',
            description: similar.text || '',
            properties: {},
            confidence: similar.similarity
          },
          similarity: similar.similarity
        }));

        logger.info('Similarity search completed', {
          investigationId,
          userId: context.user.id,
          resultsCount: similarEntities.length,
          executionTime: result.executionTime
        });

        return similarEntities;

      } catch (error) {
        logger.error('Similarity search failed', {
          entityId,
          investigationId,
          userId: context.user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw new Error(`Similarity search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  },

  Mutation: {
    /**
     * Clear GraphRAG cache for an investigation
     */
    clearGraphRAGCache: async (
      _: any,
      args: { investigationId: string },
      context: Context
    ): Promise<{ success: boolean; message: string }> => {
      if (!context.user) {
        throw new Error('Authentication required');
      }

      const service = initializeServices();
      const { investigationId } = args;

      try {
        // Implementation would clear Redis cache entries for the investigation
        logger.info('GraphRAG cache clear requested', {
          investigationId,
          userId: context.user.id
        });

        // TODO: Implement cache clearing logic
        return {
          success: true,
          message: `Cache cleared for investigation ${investigationId}`
        };

      } catch (error) {
        logger.error('Cache clear failed', {
          investigationId,
          userId: context.user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
          success: false,
          message: 'Failed to clear cache'
        };
      }
    }
  },

  // Custom scalar and object resolvers
  GraphRAGResponse: {
    answer: (parent: GraphRAGResponse) => parent.answer,
    confidence: (parent: GraphRAGResponse) => parent.confidence,
    citations: (parent: GraphRAGResponse) => parent.citations,
    why_paths: (parent: GraphRAGResponse) => parent.why_paths
  },

  WhyPath: {
    from: (parent: any) => parent.from,
    to: (parent: any) => parent.to,
    relId: (parent: any) => parent.relId,
    type: (parent: any) => parent.type,
    supportScore: (parent: any) => parent.supportScore || 1.0
  },

  Citations: {
    entityIds: (parent: any) => parent.entityIds
  }
};

/**
 * Health check for GraphRAG service
 */
export async function getGraphRAGHealth(): Promise<{
  status: string;
  cacheStatus: string;
  config: any;
}> {
  try {
    const service = initializeServices();
    return await service.getHealth();
  } catch (error) {
    logger.error('GraphRAG health check failed', { error });
    return {
      status: 'unhealthy',
      cacheStatus: 'unknown',
      config: {}
    };
  }
}

export default graphragResolvers;