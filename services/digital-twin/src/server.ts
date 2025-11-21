import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { Pool } from 'pg';
import { createClient } from 'redis';
import neo4j from 'neo4j-driver';
import pino from 'pino';
import { typeDefs } from './api/schema.js';
import { resolvers } from './api/resolvers.js';
import { TwinService } from './core/TwinService.js';
import { TwinRepository } from './core/TwinRepository.js';
import { EventBus } from './core/EventBus.js';
import { StateEstimator } from './state/StateEstimator.js';
import { SimulationEngine } from './simulation/SimulationEngine.js';
import { StreamIngestion } from './ingestion/StreamIngestion.js';

const logger = pino({ name: 'digital-twin-server' });

const PORT = process.env.PORT ?? 4100;

async function main() {
  // Initialize connections
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/intelgraph',
  });

  const redis = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });
  await redis.connect();

  const neo4jDriver = neo4j.driver(
    process.env.NEO4J_URI ?? 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER ?? 'neo4j',
      process.env.NEO4J_PASSWORD ?? 'devpassword',
    ),
  );

  // Initialize services
  const eventBus = new EventBus(
    (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    'digital-twin-service',
  );
  await eventBus.connect();

  const repository = new TwinRepository(pgPool, redis as any, neo4jDriver);
  const stateEstimator = new StateEstimator();
  const twinService = new TwinService(repository, stateEstimator, eventBus);
  const simulationEngine = new SimulationEngine();

  // Initialize stream ingestion
  const ingestion = new StreamIngestion(twinService, eventBus);
  await ingestion.start();

  // Create Apollo Server
  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await apollo.start();

  // Create Express app
  const app = express();
  app.use(express.json());

  // Health endpoints
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'digital-twin' });
  });

  app.get('/health/ready', async (_req, res) => {
    try {
      await pgPool.query('SELECT 1');
      await redis.ping();
      const session = neo4jDriver.session();
      await session.run('RETURN 1');
      await session.close();
      res.json({ status: 'ready' });
    } catch (error) {
      res.status(503).json({ status: 'not ready', error: String(error) });
    }
  });

  // GraphQL endpoint
  app.use(
    '/graphql',
    expressMiddleware(apollo, {
      context: async ({ req }) => ({
        twinService,
        simulationEngine,
        eventBus,
        userId: req.headers['x-user-id'] ?? 'system',
      }),
    }),
  );

  // Start server
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Digital Twin service started');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Shutting down...');
    await ingestion.stop();
    await eventBus.disconnect();
    await redis.quit();
    await neo4jDriver.close();
    await pgPool.end();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error(error, 'Failed to start server');
  process.exit(1);
});
