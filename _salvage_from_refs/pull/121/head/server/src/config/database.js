const neo4j = require('neo4j-driver');
const { Pool } = require('pg');
const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let neo4jDriver;
let postgresPool;
let redisClient;

// Neo4j Connection
async function connectNeo4j() {
  try {
    neo4jDriver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.username, config.neo4j.password)
    );

    // Test connection
    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();

    // Create constraints and indexes
    await createNeo4jConstraints();
    
    logger.info('✅ Connected to Neo4j');
    return neo4jDriver;
  } catch (error) {
    logger.error('❌ Failed to connect to Neo4j:', error);
    throw error;
  }
}

async function createNeo4jConstraints() {
  const session = neo4jDriver.session();
  
  try {
    const constraints = [
      'CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
      'CREATE CONSTRAINT entity_uuid IF NOT EXISTS FOR (e:Entity) REQUIRE e.uuid IS UNIQUE',
      'CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
      'CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
      'CREATE CONSTRAINT investigation_id IF NOT EXISTS FOR (i:Investigation) REQUIRE i.id IS UNIQUE',
      'CREATE CONSTRAINT relationship_id IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() REQUIRE r.id IS UNIQUE'
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          logger.warn('Failed to create constraint:', constraint, error.message);
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
      'CREATE FULLTEXT INDEX investigation_search IF NOT EXISTS FOR (i:Investigation) ON EACH [i.title, i.description]'
    ];

    for (const index of indexes) {
      try {
        await session.run(index);
      } catch (error) {
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
async function connectPostgres() {
  try {
    postgresPool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.username,
      password: config.postgres.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const client = await postgresPool.connect();
    await client.query('SELECT NOW()');
    client.release();

    await createPostgresTables();
    
    logger.info('✅ Connected to PostgreSQL');
    return postgresPool;
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

async function createPostgresTables() {
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

    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_analysis_investigation ON analysis_results(investigation_id)');

    // Chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        edited_at TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_chat_investigation ON chat_messages(investigation_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at)');

    // Comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id VARCHAR(255) NOT NULL,
        target_id VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_comments_investigation ON comments(investigation_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_id)');

    // Annotations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS annotations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        investigation_id VARCHAR(255) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_id VARCHAR(255),
        geometry JSONB,
        properties JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_annotations_investigation ON annotations(investigation_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_annotations_target ON annotations(target_id)');
    
    // Provenance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS provenance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255) NOT NULL,
        source VARCHAR(100) NOT NULL,
        hash VARCHAR(128),
        uri TEXT,
        extractor VARCHAR(100),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_provenance_resource ON provenance(resource_type, resource_id)');

    // API keys vault
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(100) NOT NULL,
        key TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider)');

    // Social posts (normalized)
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ext_id VARCHAR(255) UNIQUE,
        source VARCHAR(50) NOT NULL,
        author VARCHAR(255),
        text TEXT,
        url TEXT,
        posted_at TIMESTAMP,
        ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_social_source ON social_posts(source)');

    logger.info('PostgreSQL tables created');
  } catch (error) {
    logger.error('Failed to create PostgreSQL tables:', error);
  } finally {
    client.release();
  }
}

// Redis Connection
async function connectRedis() {
  try {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    await redisClient.ping();
    
    logger.info('✅ Connected to Redis');
    return redisClient;
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

function getNeo4jDriver() {
  if (!neo4jDriver) throw new Error('Neo4j driver not initialized');
  return neo4jDriver;
}

function getPostgresPool() {
  if (!postgresPool) throw new Error('PostgreSQL pool not initialized');
  return postgresPool;
}

function getRedisClient() {
  if (!redisClient) throw new Error('Redis client not initialized');
  return redisClient;
}

async function closeConnections() {
  if (neo4jDriver) {
    await neo4jDriver.close();
    logger.info('Neo4j connection closed');
  }
  if (postgresPool) {
    await postgresPool.end();
    logger.info('PostgreSQL connection closed');
  }
  if (redisClient) {
    redisClient.disconnect();
    logger.info('Redis connection closed');
  }
}

module.exports = {
  connectNeo4j,
  connectPostgres,
  connectRedis,
  getNeo4jDriver,
  getPostgresPool,
  getRedisClient,
  closeConnections
};
