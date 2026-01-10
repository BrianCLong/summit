// @ts-nocheck

import { Neo4jGraphAnalyticsService } from '../../services/GraphAnalyticsService.js';

export const analyticsResolvers = {
  Query: {
    shortestPath: async (_: any, args: any, context: any) => {
      const { from, to, maxDepth } = args;
      return Neo4jGraphAnalyticsService.getInstance().shortestPath({
        tenantId: context.user?.tenantId || 'default',
        from,
        to,
        maxDepth
      });
    },
    centrality: async (_: any, args: any, context: any) => {
      const { scope, algorithm } = args;
      return Neo4jGraphAnalyticsService.getInstance().centrality({
        tenantId: context.user?.tenantId || 'default',
        scope,
        algorithm
      });
    },
    detectAnomalies: async (_: any, args: any, context: any) => {
      const { scope, kind } = args;
      return Neo4jGraphAnalyticsService.getInstance().detectAnomalies({
        tenantId: context.user?.tenantId || 'default',
        scope,
        kind
      });
    },
    temporalMotifs: async (_: any, args: any, context: any) => {
      const { scope } = args;
      return Neo4jGraphAnalyticsService.getInstance().temporalMotifs({
        tenantId: context.user?.tenantId || 'default',
        scope
      });
    }
  }
};
