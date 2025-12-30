import type { GraphStore, AIService } from '../services-types.js';
import { createGraphStore } from './services/graph-store.js';
import { createAIService } from './services/ai.js';

const store: GraphStore = createGraphStore();
const ai: AIService = createAIService();

export const Query = {
  entities: (_: unknown, { filters }: { filters: any }) =>
    store.getEntities(filters || {}),
  relationships: (_: unknown, { entityId }: { entityId: string }) =>
    store.getRelationships(entityId),
};

export const Mutation = {
  upsertEntity: async (_: unknown, { input }: { input: any }) => {
    const enriched = await ai.enrichEntity(input);
    return store.upsertEntity(enriched);
  },
};
