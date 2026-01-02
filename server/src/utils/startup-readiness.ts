import { getPostgresPool } from '../db/postgres.js';
import { getRedisClient } from '../db/redis.js';
import { getNeo4jDriver, initializeNeo4jDriver } from '../db/neo4j.js';
import { logger } from './logger.js';

interface ReadinessOptions {
  requireRedis?: boolean;
}

export async function verifyStartupDependencies(options: ReadinessOptions = {}) {
  const { requireRedis = true } = options;
  const missingEnv: string[] = [];
  const required = [
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'NEO4J_URI',
    'NEO4J_USERNAME',
    'NEO4J_PASSWORD',
  ];

  required.forEach((key) => {
    if (!process.env[key]) {
      missingEnv.push(key);
    }
  });

  if (requireRedis && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
    missingEnv.push('REDIS_URL');
  }

  if (missingEnv.length > 0) {
    const message = `Missing required environment for startup: ${missingEnv.join(', ')}`;
    logger.error(message);
    throw new Error(message);
  }

  const failures: string[] = [];

  try {
    await initializeNeo4jDriver();
    await getNeo4jDriver().verifyConnectivity();
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown Neo4j error';
    failures.push(`neo4j: ${message}`);
    logger.error({ error }, 'Neo4j readiness check failed');
  }

  try {
    const pool = getPostgresPool();
    await pool.query('SELECT 1');
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown Postgres error';
    failures.push(`postgres: ${message}`);
    logger.error({ error }, 'Postgres readiness check failed');
  }

  if (requireRedis) {
    try {
      const redis = getRedisClient();
      await redis.ping();
    } catch (error: any) {
      const message = error instanceof Error ? error.message : 'Unknown Redis error';
      failures.push(`redis: ${message}`);
      logger.error({ error }, 'Redis readiness check failed');
    }
  }

  if (failures.length > 0) {
    throw new Error(`Startup readiness failed: ${failures.join('; ')}`);
  }

  logger.info('Core dependencies verified for startup');
}
