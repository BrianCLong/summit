import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import Redis from 'ioredis';
import neo4j from 'neo4j-driver';
import type { GraphSubgraphConfig } from './config.js';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers/index.js';
import { costExtensionPlugin } from './cost/plugin.js';
import { CostCollector } from './cost/costCollector.js';
import { NeighborhoodCache } from './cache/redisCache.js';
import { Neo4jGraphSource } from './datasources/neo4jGraphSource.js';
import type { GraphContext } from './types.js';
import { createLogger } from './logging.js';

export interface StartOptions {
  config: GraphSubgraphConfig;
}

export async function createServer(config: GraphSubgraphConfig) {
  const logger = createLogger(config);
  const driver = neo4j.driver(
    config.NEO4J_URI,
    neo4j.auth.basic(config.NEO4J_USERNAME, config.NEO4J_PASSWORD),
    { disableLosslessIntegers: true }
  );
  const redis = config.REDIS_URL ? new Redis(config.REDIS_URL) : null;
  const cache = new NeighborhoodCache(redis, {
    ttlSeconds: config.NEIGHBORHOOD_CACHE_TTL_SECONDS,
    logger
  });
  const graphDataSource = new Neo4jGraphSource(driver, logger, config);

  const server = new ApolloServer<GraphContext>({
    schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
    plugins: [costExtensionPlugin()]
  });

  async function contextFactory(): Promise<GraphContext> {
    return {
      dataSources: { graph: graphDataSource },
      cache,
      logger,
      costCollector: new CostCollector()
    };
  }

  async function start() {
    const { url } = await startStandaloneServer(server, {
      context: contextFactory,
      listen: { port: config.SUBGRAPH_PORT }
    });
    logger.info({ url }, 'graph_subgraph_started');
    return url;
  }

  async function stop() {
    await server.stop();
    await driver.close();
    if (redis) {
      await redis.quit();
    }
  }

  return { server, start, stop, driver, redis, cache, logger };
}
