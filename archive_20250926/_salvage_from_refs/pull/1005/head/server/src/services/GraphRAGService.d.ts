// server/src/services/GraphRAGService.d.ts
import { JSONSchemaType } from 'ajv'; // Assuming ajv is correctly typed
import { Driver } from 'neo4j-driver'; // Assuming neo4j-driver is correctly typed
import { Redis } from 'ioredis'; // Assuming ioredis is correctly typed
import pino from 'pino'; // Assuming pino is correctly typed

// Re-declare types from GraphRAGService.ts
export type WhyPath = { from: string; to: string; relId: string; type: string };
export type RAG = { answer: string; confidence: number; citations: { entityIds: string[] }; why_paths: WhyPath[] };

// Re-declare the main service class
export class GraphRAGService {
  constructor(neo4jDriver: Driver, llmService: any, embeddingService: any, redisClient?: Redis);
  answer(req: {investigationId:string; question:string; focusEntityIds?:string[]; maxHops?:number}): Promise<RAG>;
  // Add other public methods if needed
}

// Export the types with their original names
export type GraphRAGRequest = {
  investigationId: string;
  question: string;
  focusEntityIds?: string[];
  maxHops?: number;
  temperature?: number;
  maxTokens?: number;
};

export type GraphRAGResponse = RAG;