import { neo } from '../db/neo4j.js';

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

      // GNN/Analytics Metadata Persistence (Superset Feature)
      if (args.persist === true) {
        // We assume results have { nodeId: string, score: number }
        // Batch update for efficiency
        const session = neo.session();
        try {
          const updates = results.map(r => ({
            id: r.nodeId,
            score: (r as any).score ?? (r as any).pageRank
          }));

          await session.run(`
            UNWIND $updates AS update
            MATCH (n) WHERE n.id = update.id
            SET n.pageRank = update.score
            SET n.lastPageRankUpdate = datetime()
          `, { updates });
        } catch (e) {
          console.error("Failed to persist PageRank scores", e);
        } finally {
          await session.close();
        }
      }

      return results.map((result) => ({
        ...result,
        pageRank: (result as { score?: number }).score ?? (result as { pageRank?: number }).pageRank,
      }));
    },
    graphCommunities: async (_: unknown, args: Record<string, unknown>, context: GraphAnalyticsContext) => {
      assertAuthorized(context);
      const results = await context.services?.graphAnalytics?.detectCommunities?.(args);

      if (results && args.persist === true) {
        const session = neo.session();
        try {
          const updates = results.map(r => ({
            id: r.nodeId,
            community: (r as any).communityId
          }));

          await session.run(`
            UNWIND $updates AS update
            MATCH (n) WHERE n.id = update.id
            SET n.community = update.community
            SET n.lastCommunityUpdate = datetime()
          `, { updates });
        } catch (e) {
             console.error("Failed to persist Community IDs", e);
        } finally {
          await session.close();
        }
      }

      return results ?? [];
    },
  },
};

export default graphAnalyticsResolvers;
