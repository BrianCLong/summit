/**
 * GraphRAG GraphQL Resolvers (TypeScript)
 * Provides GraphQL interface for explainable GraphRAG operations
 */

import {
  GraphRAGService,
  type GraphRAGRequest,
  type GraphRAGResponse,
} from "../../services/GraphRAGService.js";
import EmbeddingService from "../../services/EmbeddingService.js";
import LLMService from "../../services/LLMService.js";
import {
  similarityService,
  SimilarEntity,
} from "../../services/SimilarityService.js";
import { getNeo4jDriver, getRedisClient } from "../../config/database.js";
import pino from "pino";
import { GraphQLError } from "graphql";

const logger = pino({ name: "graphragResolvers" });

// Service initialization
let graphRAGService: GraphRAGService | null = null;
let embeddingService: EmbeddingService;
let llmService: LLMService;
let neo4jDriver: any;
let redisClient: any;

function initializeServices(): GraphRAGService {
    if (!graphRAGService) {
      neo4jDriver = getNeo4jDriver();
      redisClient = getRedisClient();

      embeddingService = new EmbeddingService();
      llmService = new LLMService();
      graphRAGService = new GraphRAGService(
        neo4jDriver,
        llmService,
        embeddingService,
        redisClient,
      );

      logger.info("GraphRAG services initialized");
    }
  return graphRAGService;
}

async function fetchEntities(entityIds: string[]): Promise<Map<string, any>> {
  if (!entityIds.length) return new Map();
  const session = neo4jDriver.session();
  try {
    const result = await session.run(
      "MATCH (e:Entity) WHERE e.id IN $ids RETURN e",
      { ids: entityIds },
    );
    const map = new Map<string, any>();
    result.records.forEach((record: any) => {
      const node = record.get("e");
      map.set(node.properties.id, {
        id: node.properties.id,
        type: node.labels[0],
        label: node.properties.label || "",
        description: node.properties.description || "",
        properties: node.properties,
      });
    });
    return map;
  } finally {
    await session.close();
  }
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
      context: Context,
    ): Promise<GraphRAGResponse> => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const service = initializeServices();
      const { input } = args;

      try {
        logger.info(
          `GraphRAG query received. Investigation ID: ${input.investigationId}, User ID: ${context.user.id}, Question Length: ${input.question.length}`,
        );

        const request: GraphRAGRequest = {
          investigationId: input.investigationId,
          question: input.question,
          focusEntityIds: input.focusEntityIds,
          maxHops: input.maxHops,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
        };

        const response = await service.answer(request);

        logger.info(
          `GraphRAG query completed. Investigation ID: ${input.investigationId}, User ID: ${context.user.id}, Confidence: ${response.confidence}, Citations Count: ${response.citations.entityIds.length}, Why Paths Count: ${response.why_paths.length}`,
        );

        return response;
      } catch (error) {
        logger.error(
          `GraphRAG query failed. Investigation ID: ${input.investigationId}, User ID: ${context.user.id}, Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );

        if (
          error instanceof Error &&
          error.message === "LLM schema invalid after retry"
        ) {
          throw new GraphQLError("Invalid LLM response format", {
            extensions: { code: "BAD_REQUEST" },
          });
        }

        throw new Error(
          error instanceof Error
            ? `GraphRAG query failed: ${error.message}`
            : "GraphRAG query failed: Unknown error",
        );
      }
    },

    /**
     * Get similar entities using embedding search
     */
    similarEntities: async (
      _: any,
      args: {
        entityId?: string;
        text?: string;
        topK?: number;
        investigationId: string;
      },
      context: Context,
    ): Promise<
      Array<{
        entity: any;
        similarity: number;
      }>
    > => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const { entityId, text, topK = 10, investigationId } = args;

      try {
        logger.info(
          `Similarity search requested. Entity ID: ${entityId}, Text: ${text?.substring(0, 50)}, Top K: ${topK}, Investigation ID: ${investigationId}, User ID: ${context.user.id}`,
        );

        const result = await similarityService.findSimilar({
          investigationId,
          entityId,
          text,
          topK,
          threshold: 0.7,
          includeText: true,
        });

        const ids = result.results.map((r) => r.entityId);
        const entityMap = await fetchEntities(ids);

        const similarEntities = result.results.map((similar) => ({
          entity:
            entityMap.get(similar.entityId) || {
              id: similar.entityId,
              type: "unknown",
              label: similar.text?.substring(0, 50) || "Unknown",
              description: similar.text || "",
              properties: {},
            },
          similarity: similar.similarity,
        }));

        logger.info(
          `Similarity search completed. Investigation ID: ${investigationId}, User ID: ${context.user.id}, Results Count: ${similarEntities.length}, Execution Time: ${result.executionTime}`,
        );

        return similarEntities;
      } catch (error) {
        logger.error(
          `Similarity search failed. Entity ID: ${entityId}, Investigation ID: ${investigationId}, User ID: ${context.user.id}, Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        throw new Error(
          `Similarity search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },
  },

  Mutation: {
    /**
     * Clear GraphRAG cache for an investigation
     */
    clearGraphRAGCache: async (
      _: any,
      args: { investigationId: string },
      context: Context,
    ): Promise<{ success: boolean; message: string }> => {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      const service = initializeServices();
      const { investigationId } = args;

      try {
        logger.info(
          `GraphRAG cache clear requested. Investigation ID: ${investigationId}, User ID: ${context.user.id}`,
        );

        if (redisClient) {
          const keys = await redisClient.keys(`graphrag:${investigationId}:*`);
          if (keys.length) {
            await redisClient.del(keys);
          }
        }

        return {
          success: true,
          message: `Cache cleared for investigation ${investigationId}`,
        };
      } catch (error) {
        logger.error(
          `Cache clear failed. Investigation ID: ${investigationId}, User ID: ${context.user.id}, Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        return {
          success: false,
          message: "Failed to clear cache",
        };
      }
    },
  },

  // Custom scalar and object resolvers
  GraphRAGResponse: {
    answer: (parent: GraphRAGResponse) => parent.answer,
    confidence: (parent: GraphRAGResponse) => parent.confidence,
    citations: (parent: GraphRAGResponse) => parent.citations,
    why_paths: (parent: GraphRAGResponse) => parent.why_paths,
  },

  WhyPath: {
    from: (parent: any) => parent.from,
    to: (parent: any) => parent.to,
    relId: (parent: any) => parent.relId,
    type: (parent: any) => parent.type,
    supportScore: (parent: any) => parent.supportScore || 1.0,
  },

  Citations: {
    entityIds: (parent: any) => parent.entityIds,
  },
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
    logger.error(
      `GraphRAG health check failed. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return {
      status: "unhealthy",
      cacheStatus: "unknown",
      config: {},
    };
  }
}

export default graphragResolvers;
