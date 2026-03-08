// @ts-nocheck
import config from './index.js';
import logger from '../utils/logger.js';
// @ts-ignore
import ioredis from 'ioredis';

// Handle optional Redis dependency gracefully
let Redis = ioredis;
import {
  getPostgresPool as getManagedPostgresPool,
  closePostgresPool as closeManagedPostgresPool,
  ManagedPostgresPool,
} from '../db/postgres.js';
import {
  getNeo4jDriver as getSharedNeo4jDriver,
  initializeNeo4jDriver,
  isNeo4jMockMode,
  onNeo4jDriverReady,
} from '../db/neo4j.js';

type Neo4jDriver = ReturnType<typeof getSharedNeo4jDriver>;

let neo4jDriver: Neo4jDriver | null = null;
let postgresPool: ManagedPostgresPool | null = null;
let redisClient: Redis | null = null;
let neo4jMigrationsCompleted = false;
let neo4jReadyHookRegistered = false;

// Neo4j Connection
async function connectNeo4j(): Promise<Neo4jDriver> {
  if (neo4jDriver) {
    return neo4jDriver;
  }

  registerNeo4jReadyHook();

  try {
    await initializeNeo4jDriver();
  } catch (error: any) {
    logger.error('❌ Failed to establish Neo4j connectivity:', error);
    if (config.requireRealDbs) {
      throw error;
    }
  }

  neo4jDriver = getSharedNeo4jDriver();

  if (isNeo4jMockMode()) {
    logger.warn('Neo4j unavailable - operating in mock mode for development.');
    neo4jMigrationsCompleted = false;
    return neo4jDriver;
  }

  const session = neo4jDriver.session();
  try {
    await session.run('RETURN 1');
  } finally {
    await session.close();
  }

  if (!neo4jMigrationsCompleted) {
    await runNeo4jMigrations();
    neo4jMigrationsCompleted = true;
  }

  logger.info('✅ Connected to Neo4j');
  return neo4jDriver;
}

async function runNeo4jMigrations(): Promise<void> {
  if (isNeo4jMockMode()) {
    logger.debug('Skipping Neo4j migrations in mock mode.');
    return;
  }
  try {
    // Import migration manager lazily to avoid circular dependencies
    const { migrationManager } = await import('../db/migrations/index.js');
    await migrationManager.migrate();
    logger.info('Neo4j migrations completed successfully');
  } catch (error: any) {
    logger.warn(
      'Migration system not available, falling back to legacy constraints',
    );
    await createNeo4jConstraints();
  }
}

function registerNeo4jReadyHook(): void {
  if (neo4jReadyHookRegistered) {
    return;
  }

  neo4jReadyHookRegistered = true;

  onNeo4jDriverReady(async ({ reason }) => {
    if (isNeo4jMockMode()) {
      neo4jMigrationsCompleted = false;
      return;
    }

    if (reason === 'reconnected' || !neo4jMigrationsCompleted) {
      try {
        await runNeo4jMigrations();
        neo4jMigrationsCompleted = true;
        if (reason === 'reconnected') {
          logger.info('Neo4j migrations reapplied after driver reconnection.');
        }
      } catch (error: any) {
        logger.error('Failed to run Neo4j migrations after driver recovery:', error);
      }
    }
  });
}

async function createNeo4jConstraints(): Promise<void> {
  if (!neo4jDriver) throw new Error('Neo4j driver not initialized');
  if (isNeo4jMockMode()) {
    logger.debug('Skipping Neo4j constraint creation in mock mode.');
    return;
  }
  const session = neo4jDriver.session();

  try {
    const constraints = [
      'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
      'CREATE CONSTRAINT entity_uuid IF NOT EXISTS FOR (e:Entity) REQUIRE e.uuid IS UNIQUE',
      'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
      'CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
      'CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',
      'CREATE CONSTRAINT relationship_id IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE',
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch (error: any) {
        const err = error as Error;
        if (!err.message.includes('already exists')) {
          logger.warn(
            'Failed to create constraint:',
            constraint,
            err.message,
          );
        }
      }
    }

    const indexes = [
      'CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)',
      'CREATE INDEX entity_label IF NOT EXISTS FOR (e:Entity) ON (e.label)',
      'CREATE INDEX entity_created IF NOT EXISTS FOR (e:Entity) ON (e.createdAt)',
      'CREATE INDEX investigation_status IF NOT EXISTS FOR (i:Investigation) ON (i.status)',
      'CREATE INDEX user_username IF NOT EXISTS FOR (u:User) ON (u.username)',
      'CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (e:Entity) ON EACH [e.label, e.description]',
      'CREATE FULLTEXT INDEX investigation_search IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]',
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
      } catch (error: any) {
        const err = error as Error;
        if (!err.message.includes('already exists')) {
          logger.warn('Failed to create index:', index, err.message);
        }
      }
    }

    logger.info('Neo4j constraints and indexes created');
  } catch (error: any) {
    logger.error('Failed to create Neo4j constraints:', error);
  } finally {
    await session.close();
  }
}

// PostgreSQL Connection
async function connectPostgres(): Promise<ManagedPostgresPool> {
  try {
    postgresPool = getManagedPostgresPool();

    const client = await postgresPool.connect();
    try {
      await client.query('SELECT NOW()');
    } finally {
      client.release();
    }

    // Tables are now managed by migrations (npm run db:migrate)
    // await createPostgresTables();

    logger.info('✅ Connected to PostgreSQL');
    return postgresPool;
  } catch (error: any) {
    logger.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

// Redis Connection
async function connectRedis(): Promise<Redis | null> {
  try {
    const redisConfig: Redis.RedisOptions = {
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      enableOfflineQueue: false,
      reconnectOnError: (err: Error) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    // Add password if provided
    if (config.redis.password) {
      redisConfig.password = config.redis.password;
    }

    redisClient = new Redis(redisConfig);

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error.message);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    await redisClient.connect();
    await redisClient.ping();

    logger.info('✅ Connected to Redis');
    return redisClient;
  } catch (error: any) {
    const err = error as Error;
    logger.error('❌ Failed to connect to Redis:', err.message);
    // Don't throw error to allow server to start without Redis if needed
    logger.warn('Server will continue without Redis caching');
    return null;
  }
}

function getNeo4jDriver(): Neo4jDriver {
  return getSharedNeo4jDriver();
}

function getPostgresPool(): ManagedPostgresPool {
  if (!postgresPool) {
    postgresPool = getManagedPostgresPool();
  }
  return postgresPool;
}

function getRedisClient(): Redis | null {
  if (!redisClient) {
    logger.warn('Redis client not available');
    return null;
  }
  return redisClient;
}

async function closeConnections(): Promise<void> {
  if (neo4jDriver) {
    await neo4jDriver.close();
    logger.info('Neo4j connection closed');
    neo4jDriver = null;
    neo4jMigrationsCompleted = false;
  }
  if (postgresPool) {
    await closeManagedPostgresPool();
    postgresPool = null;
    logger.info('PostgreSQL connection closed');
  }
  if (redisClient) {
    redisClient.disconnect();
    logger.info('Redis connection closed');
  }
}

export {
  connectNeo4j,
  connectPostgres,
  connectRedis,
  getNeo4jDriver,
  getPostgresPool,
  getRedisClient,
  closeConnections,
};
