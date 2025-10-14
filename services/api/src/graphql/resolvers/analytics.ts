/**
 * Analytics GraphQL Resolvers
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { GraphQLContext } from '../context.js';

export const analyticsResolvers = {
  Query: {
    centralityAnalysis: async (
      _: unknown,
      { entityIds }: { entityIds?: string[] },
      context: GraphQLContext,
    ) => {
      // Simplified: fetch centrality fields from Neo4j nodes; assumes properties are present
      const driver = context.dataSources.neo4j;
      const session = driver.session();
      try {
        const res = entityIds && entityIds.length
          ? await session.run(
              'MATCH (n) WHERE n.id IN $ids RETURN n.id AS id, n.eigenvector AS eigenvector, n.betweenness AS betweenness, n.community AS community',
              { ids: entityIds },
            )
          : await session.run(
              'MATCH (n) RETURN n.id AS id, n.eigenvector AS eigenvector, n.betweenness AS betweenness, n.community AS community LIMIT 100',
            );
        return res.records.map(r=>({ id: r.get('id'), centrality: { eigenvector: r.get('eigenvector'), betweenness: r.get('betweenness') }, clustering: { community: r.get('community') } }));
      } catch (e) {
        context.logger.error({ message:'centralityAnalysis failed', error: String(e) });
        throw e;
      } finally { await session.close(); }
    },

    communityDetection: async (
      _: unknown,
      { entityIds, algorithm }: { entityIds?: string[], algorithm?: string },
      context: GraphQLContext,
    ) => {
      // Basic community aggregation by property; GDS integration can replace this
      const driver = context.dataSources.neo4j;
      const session = driver.session();
      try {
        const res = entityIds && entityIds.length
          ? await session.run('MATCH (n) WHERE n.id IN $ids WITH n.community AS c, collect(n.id) AS members RETURN c AS id, size(members) AS size, members', { ids: entityIds })
          : await session.run('MATCH (n) WITH n.community AS c, collect(n.id) AS members RETURN c AS id, size(members) AS size, members ORDER BY size DESC LIMIT 20');
        return res.records.map(r=>({ id: r.get('id'), size: r.get('size'), members: r.get('members') }));
      } catch (e) {
        context.logger.error({ message:'communityDetection failed', error: String(e) });
        throw e;
      } finally { await session.close(); }
    },
    temporalAnalysis: async (
      _: unknown,
      { entityIds, timeWindow }: { entityIds: string[]; timeWindow: string },
      context: GraphQLContext,
    ) => {
      try {
        const query = `
          SELECT time_bucket($2::interval, ts) AS bucket, AVG(value) AS avg_value
          FROM temporal_metrics
          WHERE entity_id = ANY($1)
          GROUP BY bucket
          ORDER BY bucket;
        `;
        const result = await context.dataSources.timescale.query(query, [entityIds, timeWindow]);
        return result.rows;
      } catch (error) {
        context.logger.error({
          message: 'Temporal analysis query failed',
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  },
};
