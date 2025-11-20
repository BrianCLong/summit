import Redis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';
import {
  getPostgresPool as getManagedPostgresPool,
  closePostgresPool as closeManagedPostgresPool,
  ManagedPostgresPool,
} from '../db/postgres';
import {
  getNeo4jDriver as getSharedNeo4jDriver,
  initializeNeo4jDriver,
  isNeo4jMockMode,
} from '../db/neo4j.js';

type Neo4jDriver = ReturnType<typeof getSharedNeo4jDriver>;

let neo4jDriver: Neo4jDriver | null = null;
let postgresPool: ManagedPostgresPool | null = null;
let redisClient: Redis | null = null;

// Neo4j Connection
async function connectNeo4j(): Promise<Neo4jDriver> {
  if (neo4jDriver) {
    return neo4jDriver;
  }

  try {
    await initializeNeo4jDriver();
  } catch (error) {
    logger.error('❌ Failed to establish Neo4j connectivity:', error);
    if (config.requireRealDbs) {
      throw error;
    }
  }

  neo4jDriver = getSharedNeo4jDriver();

  if (isNeo4jMockMode()) {
    logger.warn('Neo4j unavailable - operating in mock mode for development.');
    return neo4jDriver;
  }

  const session = neo4jDriver.session();
  try {
    await session.run('RETURN 1');
  } finally {
    await session.close();
  }

  await runNeo4jMigrations();

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
  } catch (error) {
    logger.warn(
      'Migration system not available, falling back to legacy constraints',
    );
    await createNeo4jConstraints();
  }
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
        if (!error.message.includes('already exists')) {
          logger.warn(
            'Failed to create constraint:',
            constraint,
            error.message,
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
      "CREATE FULLTEXT INDEX entity_smart_search IF NOT EXISTS FOR (n:Entity) ON EACH [n.name, n.title, n.description, n.label, n.text, n.summary, n.content, n.props]",
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          logger.warn('Failed to create index:', index, error.message);
        }
      }
    }

    logger.info('Neo4j constraints and indexes created');
  } catch (error) {
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

    await createPostgresTables();

    logger.info('✅ Connected to PostgreSQL');
    return postgresPool;
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

async function createPostgresTables(): Promise<void> {
  if (!postgresPool) throw new Error('PostgreSQL pool not initialized');
  const client = await postgresPool.connect();

  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'ANALYST',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        refresh_token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analysis results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analysis_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id VARCHAR(255) NOT NULL,
        analysis_type VARCHAR(100) NOT NULL,
        algorithm VARCHAR(100) NOT NULL,
        results JSONB NOT NULL,
        confidence_score DECIMAL(3,2),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)',
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_analysis_investigation ON analysis_results(investigation_id)',
    );

    logger.info('PostgreSQL tables created');
  } catch (error) {
    logger.error('Failed to create PostgreSQL tables:', error);
  } finally {
    client.release();
  }
}

// Redis Connection
async function connectRedis(): Promise<Redis | null> {
  try {
    const redisConfig: any = {
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
    logger.error('❌ Failed to connect to Redis:', error.message);
    // Don't throw error to allow server to start without Redis if needed
    logger.warn('Server will continue without Redis caching');
    return null;
  }
}

function getNeo4jDriver(): Neo4jDriver {
  if (!neo4jDriver) throw new Error('Neo4j driver not initialized');
  return neo4jDriver;
}

function getPostgresPool(): ManagedPostgresPool {
  if (!postgresPool) throw new Error('PostgreSQL pool not initialized');
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
