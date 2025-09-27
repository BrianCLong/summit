/**
 * Integration Test Setup
 * Additional setup specifically for integration tests
 */

console.log('integration.setup.js loaded');

const { execSync } = require('child_process');

// Extended timeout for integration tests
jest.setTimeout(60000);

// Integration test utilities
global.integrationUtils = {
  // Database connection helpers
  async connectToNeo4j() {
    const neo4j = require('neo4j-driver');
    const driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'testpassword'
      )
    );
    
    const session = driver.session();
    return { driver, session };
  },
  
  async connectToPostgres() {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'intelgraph_test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'testpassword'
    });
    
    return pool;
  },
  
  async connectToRedis() {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/1');
    return redis;
  },
  
  // Clean up test data between integration tests
  async cleanupTestData() {
    try {
      // Clean Neo4j test data
      const { driver, session } = await this.connectToNeo4j();
      try {
        await session.run('MATCH (n) WHERE n.id STARTS WITH "test_" DETACH DELETE n');
      } finally {
        await session.close();
        await driver.close();
      }
      
      // Clean PostgreSQL test data
      const pool = await this.connectToPostgres();
      try {
        await pool.query('DELETE FROM audit_event WHERE user_id LIKE $1', ['test_%']);
        // Add other cleanup queries as needed
      } finally {
        await pool.end();
      }
      
      // Clean Redis test data
      const redis = await this.connectToRedis();
      try {
        const keys = await redis.keys('test_*');
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } finally {
        redis.disconnect();
      }
      
    } catch (error) {
      console.warn('Failed to clean up test data:', error.message);
    }
  },
  
  // Wait for services to be available
  async waitForServices() {
    const maxWait = 30000;
    const interval = 1000;
    let waited = 0;
    
    while (waited < maxWait) {
      try {
        // Test Neo4j connection
        const { driver, session } = await this.connectToNeo4j();
        await session.run('RETURN 1');
        await session.close();
        await driver.close();
        
        // Test PostgreSQL connection
        const pool = await this.connectToPostgres();
        await pool.query('SELECT 1');
        await pool.end();
        
        // Test Redis connection
        const redis = await this.connectToRedis();
        await redis.ping();
        redis.disconnect();
        
        console.log('✅ All services are ready for integration tests');
        return;
        
      } catch (error) {
        waited += interval;
        if (waited < maxWait) {
          console.log(`⏳ Waiting for services... (${waited}ms/${maxWait}ms)`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }
    
    throw new Error('Services did not become ready in time for integration tests');
  }
};

// Set up integration test environment
beforeAll(async () => {
  if (process.env.CI) {
    await global.integrationUtils.waitForServices();
  }
});

// Clean up after each integration test
afterEach(async () => {
  await global.integrationUtils.cleanupTestData();
});