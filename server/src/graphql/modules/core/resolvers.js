"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutation = exports.Query = void 0;
const graph_store_js_1 = require("./services/graph-store.js");
const ai_js_1 = require("./services/ai.js");
const store = (0, graph_store_js_1.createGraphStore)();
const ai = (0, ai_js_1.createAIService)();
exports.Query = {
    entities: (_, { filters }) => store.getEntities(filters || {}),
    relationships: (_, { entityId }) => store.getRelationships(entityId),
};
exports.Mutation = {
    upsertEntity: async (_, { input }) => {
        const enriched = await ai.enrichEntity(input);
        return store.upsertEntity(enriched);
    },
};
