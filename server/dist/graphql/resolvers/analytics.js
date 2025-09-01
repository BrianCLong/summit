import { analyticsClient } from '../../ai/analyticsClient';
const analyticsResolvers = {
    Mutation: {
        extractEntities: async (_, { text }) => {
            const { entities } = await analyticsClient.extractEntities(text);
            return entities;
        },
    },
    Query: {
        linkSuggestions: async (_, { investigationId }) => {
            // Graph data retrieval is intentionally decoupled; placeholder uses empty graph.
            const { suggestions } = await analyticsClient.linkSuggestions([], []);
            return suggestions;
        },
    },
};
export default analyticsResolvers;
//# sourceMappingURL=analytics.js.map