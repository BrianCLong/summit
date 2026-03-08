"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
exports.resolvers = {
    Query: {
        aiInfluenceCampaign: async (_, { campaignId }, context) => {
            // Mocked resolution since it's an additive GraphQL module.
            // Logic would typically look into the database / knowledge graph based on context.
            return {
                campaignId,
                actorIds: ["actor_example"],
                objectives: ["Influence"],
                tacticIds: [],
                techniqueIds: [],
                aiUsage: [],
                evidenceIds: ["EVID:ai-influence-campaign:evidence:0001"],
            };
        },
        aiInfluenceCampaignsByTactic: async (_, { tacticId }, context) => {
            // Return a mocked array or fetch from backend
            return [];
        },
    },
};
