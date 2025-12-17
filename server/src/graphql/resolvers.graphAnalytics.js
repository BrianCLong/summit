const GraphAnalyticsService = require('../services/GraphAnalyticsService');
const { getNeo4jDriver, getRedisClient } = require('../config/database');

const DEFAULT_ALLOWED_ROLES = ['ANALYST', 'ADMIN'];

function normalizeRole(role) {
  return String(role || '').toUpperCase();
}

function ensureAuthorized(user, allowedRoles = DEFAULT_ALLOWED_ROLES) {
  if (!user) {
    const error = new Error('Not authenticated');
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  if (allowedRoles.length === 0) {
    return true;
  }

  const userRole = normalizeRole(user.role);
  if (!allowedRoles.includes(userRole)) {
    const error = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }

  return true;
}

function getService(context) {
  if (context?.services?.graphAnalytics) {
    return context.services.graphAnalytics;
  }

  if (!context) {
    context = {};
  }

  if (!context.__graphAnalyticsService) {
    let driver;
    let redis;
    try {
      driver = getNeo4jDriver();
    } catch (error) {
      context?.logger?.error?.(
        'Graph analytics resolver failed to acquire Neo4j driver',
        error,
      );
    }

    try {
      redis = getRedisClient();
    } catch (error) {
      context?.logger?.warn?.(
        'Graph analytics resolver failed to acquire Redis client',
        error,
      );
    }

    context.__graphAnalyticsService = new GraphAnalyticsService({
      driver,
      redis,
    });
  }

  return context.__graphAnalyticsService;
}

const resolvers = {
  Query: {
    async graphPageRank(_, args, context) {
      ensureAuthorized(context?.user);
      const service = getService(context);

      const results = await service.calculatePageRank({
        investigationId: args?.investigationId ?? null,
        limit: args?.limit,
        maxIterations: args?.maxIterations,
        dampingFactor: args?.dampingFactor,
        concurrency: args?.concurrency,
        forceRefresh: Boolean(args?.forceRefresh),
      });

      return results.map((node) => ({
        nodeId: node.nodeId,
        label: node.label,
        score: node.score ?? node.pageRank,
        pageRank: node.pageRank ?? node.score,
      }));
    },

    async graphCommunities(_, args, context) {
      ensureAuthorized(context?.user);
      const service = getService(context);

      const communities = await service.detectCommunities({
        investigationId: args?.investigationId ?? null,
        limit: args?.limit,
        algorithm: args?.algorithm,
        maxIterations: args?.maxIterations,
        tolerance: args?.tolerance,
        concurrency: args?.concurrency,
        forceRefresh: Boolean(args?.forceRefresh),
      });

      return communities.map((community) => ({
        communityId: community.communityId ?? community.id,
        size: community.size,
        algorithm: community.algorithm || 'LOUVAIN',
        nodes: (community.nodes || []).map((node) => ({
          nodeId: node.nodeId ?? node.id ?? node,
          label: node.label ?? null,
        })),
      }));
    },
  },
};

module.exports = resolvers;
