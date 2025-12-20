import { createGraphStore } from './services/graph-store';
import { createAIService } from './services/ai';
const store = createGraphStore();
const ai = createAIService();
export const Query = {
    entities: (_, { filters }) => store.getEntities(filters || {}),
    relationships: (_, { entityId }) => store.getRelationships(entityId),
};
export const Mutation = {
    upsertEntity: async (_, { input }) => {
        const enriched = await ai.enrichEntity(input);
        return store.upsertEntity(enriched);
    },
};
//# sourceMappingURL=resolvers.js.map