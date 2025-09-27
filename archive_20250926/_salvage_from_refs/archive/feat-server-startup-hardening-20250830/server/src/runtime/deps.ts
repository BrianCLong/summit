import { Pool } from 'pg';
import { Driver } from 'neo4j-driver';
import { Redis } from 'ioredis';
import { getDriver } from '../graph/neo4j';
import { cfg, dbUrls } from '../config';
import { breaker } from './breakers';

let pgPool: Pool | null = null;
let neo4jDriver: Driver | null = null;
let redisClient: Redis | null = null;

// Connection functions
const connectPostgres = async (): Promise<void> => {
  if (!pgPool) {
    pgPool = new Pool({ connectionString: cfg.DATABASE_URL });
  }
  await pgPool.query('SELECT 1');
  console.log('[DEPS] PostgreSQL connected');
};

const connectNeo4j = async (): Promise<void> => {
  if (!neo4jDriver) {
    neo4jDriver = getDriver();
  }
  await neo4jDriver.verifyConnectivity();
  console.log('[DEPS] Neo4j connected');
};

const connectRedis = async (): Promise<void> => {
  if (!redisClient) {
    redisClient = new Redis(dbUrls.redis);
  }
  await redisClient.ping();
  console.log('[DEPS] Redis connected');
};

// Circuit breakers
const pgBreaker = breaker(connectPostgres, 'postgres', { timeout: 5000 });
const neoBreaker = breaker(connectNeo4j, 'neo4j', { timeout: 5000 });
const redisBreaker = breaker(connectRedis, 'redis', { timeout: 3000 });

export async function initDeps(): Promise<void> {
  console.log('[DEPS] Initializing database connections...');
  
  try {
    await Promise.all([
      pgBreaker.fire(),
      neoBreaker.fire(), 
      redisBreaker.fire()
    ]);
    
    console.log('[DEPS] All dependencies initialized successfully');
  } catch (error) {
    console.error('[DEPS] Failed to initialize dependencies:', error);
    throw error;
  }
}

export async function closeDeps(): Promise<void> {
  console.log('[DEPS] Closing database connections...');
  
  const promises = [];
  
  if (pgPool) {
    promises.push(pgPool.end().then(() => console.log('[DEPS] PostgreSQL closed')));
  }
  
  if (neo4jDriver) {
    promises.push(neo4jDriver.close().then(() => console.log('[DEPS] Neo4j closed')));
  }
  
  if (redisClient) {
    promises.push(redisClient.disconnect().then(() => console.log('[DEPS] Redis closed')));
  }
  
  await Promise.all(promises);
}

// Export clients for use in other modules
export { pgPool, neo4jDriver, redisClient };