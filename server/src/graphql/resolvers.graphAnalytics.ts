type GraphAnalyticsContext = {
  user?: { id: string; role?: string };
  services?: {
    graphAnalytics?: {
      calculatePageRank?: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
      detectCommunities?: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
    };
  };
};

function assertAuthorized(context?: GraphAnalyticsContext) {
  if (!context?.user) {
    throw new Error('Not authenticated');
  }
  const role = context.user.role;
  if (role !== 'ANALYST' && role !== 'ADMIN') {
    throw new Error('Forbidden');
  }
}

const graphAnalyticsResolvers = {
  Query: {
    graphPageRank: async (_: unknown, args: Record<string, unknown>, context: GraphAnalyticsContext) => {
      assertAuthorized(context);
      const results = await context.services?.graphAnalytics?.calculatePageRank?.(args);
      if (!results) return [];
      return results.map((result) => ({
        ...result,
        pageRank: (result as { score?: number }).score ?? (result as { pageRank?: number }).pageRank,
      }));
    },
    graphCommunities: async (_: unknown, args: Record<string, unknown>, context: GraphAnalyticsContext) => {
      assertAuthorized(context);
      const results = await context.services?.graphAnalytics?.detectCommunities?.(args);
      return results ?? [];
    },
  },
};

export default graphAnalyticsResolvers;
