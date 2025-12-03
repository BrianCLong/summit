/**
 * Service Context
 *
 * Provides shared dependencies and configuration for the HUMINT service.
 */

import neo4j, { Driver as Neo4jDriver, Session } from 'neo4j-driver';
import { Pool } from 'pg';
import Redis from 'ioredis';
import pino from 'pino';

export interface ServiceConfig {
  neo4j: {
    uri: string;
    username: string;
    password: string;
  };
  postgres: {
    connectionString: string;
  };
  redis: {
    url: string;
  };
  auth: {
    jwtSecret: string;
    issuer: string;
  };
}

export interface ServiceContext {
  config: ServiceConfig;
  neo4j: Neo4jDriver;
  postgres: Pool;
  redis: Redis;
  logger: pino.Logger;
  getNeo4jSession: () => Session;
}

function loadConfig(): ServiceConfig {
  return {
    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'devpassword',
    },
    postgres: {
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://postgres:devpassword@localhost:5432/intelgraph',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-prod',
      issuer: process.env.JWT_ISSUER || 'intelgraph',
    },
  };
}

export async function createServiceContext(): Promise<ServiceContext> {
  const config = loadConfig();
  const logger = pino({ name: 'humint-service' });

  // Initialize Neo4j driver
  const neo4jDriver = neo4j.driver(
    config.neo4j.uri,
    neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
    {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
    },
  );

  // Verify Neo4j connection
  try {
    await neo4jDriver.verifyConnectivity();
    logger.info('Neo4j connection established');
  } catch (error) {
    logger.warn({ error }, 'Neo4j connection failed - service will retry');
  }

  // Initialize PostgreSQL pool
  const pgPool = new Pool({
    connectionString: config.postgres.connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Verify PostgreSQL connection
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('PostgreSQL connection established');
  } catch (error) {
    logger.warn({ error }, 'PostgreSQL connection failed - service will retry');
  }

  // Initialize Redis client
  const redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  redisClient.on('connect', () => {
    logger.info('Redis connection established');
  });

  redisClient.on('error', (error) => {
    logger.warn({ error }, 'Redis connection error');
  });

  return {
    config,
    neo4j: neo4jDriver,
    postgres: pgPool,
    redis: redisClient,
    logger,
    getNeo4jSession: () =>
      neo4jDriver.session({
        database: process.env.NEO4J_DATABASE || 'neo4j',
        defaultAccessMode: neo4j.session.WRITE,
      }),
  };
}

export async function closeServiceContext(ctx: ServiceContext): Promise<void> {
  await ctx.neo4j.close();
  await ctx.postgres.end();
  await ctx.redis.quit();
  ctx.logger.info('Service context closed');
}
