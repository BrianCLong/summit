import { GraphRAGService, type GraphRAGRequest } from "../../services/GraphRAGService.js";
import EmbeddingService from "../../services/EmbeddingService.js";
import LLMService from "../../services/LLMService.js";
import { getNeo4jDriver, getRedisClient } from "../../config/database.js";
import pino from "pino";

const logger = pino({ name: "graphragResolvers" });

let service: GraphRAGService | null = null;

function getService(): GraphRAGService {
  if (!service) {
    const neo4j = getNeo4jDriver();
    const redis = getRedisClient();
    const embedding = new EmbeddingService();
    const llm = new LLMService();
    service = new GraphRAGService(neo4j, llm, embedding, redis);
    logger.info("GraphRAG service initialized");
  }
  return service;
}

export const graphragResolvers = {
  Query: {
    askGraphRag: async (
      _: any,
      args: {
        investigationId: string;
        question: string;
        focusEntityIds?: string[];
        maxHops?: number;
      },
    ) => {
      const svc = getService();
      const result = await svc.answer({
        investigationId: args.investigationId,
        question: args.question,
        focusEntityIds: args.focusEntityIds,
        maxHops: args.maxHops,
      } as GraphRAGRequest);
      const ctx = result.context;
      const citations = result.citations.entityIds.map((id) => {
        const ent = ctx.entities.find((e) => e.id === id);
        return { entityId: id, snippet: ent?.description || "" };
      });
      const why_paths = result.why_paths.map((p) => ({
        path: [p.from, p.to],
        score: p.supportScore || 0,
      }));
      return {
        answer: result.answer,
        citations,
        why_paths,
        used_context_stats: result.used_context_stats,
      };
    },
  },
};

export default graphragResolvers;
