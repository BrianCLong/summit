/**
 * E2E Test Setup with Ephemeral Databases
 * Uses Testcontainers for isolated test environments
 */

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Pool } from 'pg';
import { Neo4jContainer, StartedNeo4jContainer } from '@testcontainers/neo4j';
import neo4j from 'neo4j-driver';
import Redis from 'ioredis';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface TestEnvironment {
  postgres: {
    container: StartedTestContainer;
    pool: Pool;
    connectionString: string;
  };
  neo4j: {
    container: StartedNeo4jContainer;
    driver: neo4j.Driver;
    uri: string;
  };
  redis: {
    container: StartedTestContainer;
    client: Redis;
    host: string;
    port: number;
  };
}

let testEnv: TestEnvironment | null = null;

/**
 * Start ephemeral test databases
 */
export async function startTestEnvironment(): Promise<TestEnvironment> {
  if (testEnv) {
    return testEnv;
  }

  console.log('🚀 Starting ephemeral test databases...');

  // Start PostgreSQL
  const postgresContainer = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'intelgraph_test',
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .start();

  const postgresHost = postgresContainer.getHost();
  const postgresPort = postgresContainer.getMappedPort(5432);
  const connectionString = `postgresql://test:test@${postgresHost}:${postgresPort}/intelgraph_test`;

  const pool = new Pool({ connectionString });

  // Start Neo4j
  const neo4jContainer = await new Neo4jContainer('neo4j:5.20.0')
    .withEnvironment({
      NEO4J_AUTH: 'neo4j/testpassword',
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]',
    })
    .withExposedPorts(7687, 7474)
    .start();

  const neo4jUri = neo4jContainer.getBoltUrl();
  const neo4jDriver = neo4j.driver(neo4jUri, neo4j.auth.basic('neo4j', 'testpassword'));

  // Start Redis
  const redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .start();

  const redisHost = redisContainer.getHost();
  const redisPort = redisContainer.getMappedPort(6379);
  const redisClient = new Redis({
    host: redisHost,
    port: redisPort,
  });

  testEnv = {
    postgres: {
      container: postgresContainer,
      pool,
      connectionString,
    },
    neo4j: {
      container: neo4jContainer,
      driver: neo4jDriver,
      uri: neo4jUri,
    },
    redis: {
      container: redisContainer,
      client: redisClient,
      host: redisHost,
      port: redisPort,
    },
  };

  console.log('✅ Test environment ready');
  console.log(`   PostgreSQL: ${connectionString}`);
  console.log(`   Neo4j: ${neo4jUri}`);
  console.log(`   Redis: ${redisHost}:${redisPort}`);

  return testEnv;
}

/**
 * Load golden dataset fixtures into test databases
 */
export async function loadGoldenDataset(env: TestEnvironment) {
  console.log('📦 Loading golden dataset fixtures...');

  // Load PostgreSQL fixtures
  const pgFixtures = readFileSync(
    join(__dirname, '../fixtures/golden/postgres.sql'),
    'utf-8',
  );
  await env.postgres.pool.query(pgFixtures);

  // Load Neo4j fixtures
  const neo4jFixtures = JSON.parse(
    readFileSync(join(__dirname, '../fixtures/golden/neo4j.json'), 'utf-8'),
  );

  const session = env.neo4j.driver.session();
  try {
    for (const statement of neo4jFixtures.statements) {
      await session.run(statement.query, statement.params || {});
    }
  } finally {
    await session.close();
  }

  // Load Redis fixtures
  const redisFixtures = JSON.parse(
    readFileSync(join(__dirname, '../fixtures/golden/redis.json'), 'utf-8'),
  );

  for (const [key, value] of Object.entries(redisFixtures)) {
    if (typeof value === 'object') {
      await env.redis.client.set(key, JSON.stringify(value));
    } else {
      await env.redis.client.set(key, value as string);
    }
  }

  console.log('✅ Golden dataset loaded');
}

/**
 * Stop and cleanup test environment
 */
export async function stopTestEnvironment() {
  if (!testEnv) return;

  console.log('🧹 Cleaning up test environment...');

  try {
    await testEnv.postgres.pool.end();
    await testEnv.postgres.container.stop();

    await testEnv.neo4j.driver.close();
    await testEnv.neo4j.container.stop();

    await testEnv.redis.client.quit();
    await testEnv.redis.container.stop();

    testEnv = null;

    console.log('✅ Test environment cleaned up');
  } catch (error) {
    console.error('Error cleaning up test environment:', error);
  }
}

/**
 * Get current test environment
 */
export function getTestEnvironment(): TestEnvironment {
  if (!testEnv) {
    throw new Error('Test environment not started. Call startTestEnvironment() first.');
  }
  return testEnv;
}

// Global setup and teardown for Jest
export async function globalSetup() {
  await startTestEnvironment();
}

export async function globalTeardown() {
  await stopTestEnvironment();
}
