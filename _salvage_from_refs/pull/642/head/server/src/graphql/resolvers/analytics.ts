import { analyticsClient } from '../../ai/analyticsClient';

const analyticsResolvers = {
  Mutation: {
    extractEntities: async (_: any, { text }: { text: string }) => {
      const { entities } = await analyticsClient.extractEntities(text);
      return entities;
    },
  },
  Query: {
    linkSuggestions: async (_: any, { investigationId }: { investigationId: string }) => {
      // Graph data retrieval is intentionally decoupled; placeholder uses empty graph.
      const { suggestions } = await analyticsClient.linkSuggestions([], []);
      return suggestions;
    },
  },
};

export default analyticsResolvers;
