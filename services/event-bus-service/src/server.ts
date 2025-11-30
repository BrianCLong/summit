/**
 * Event Bus Service - Standalone distributed event bus
 *
 * REST API for event bus operations
 */

import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { EventBus, EventBusConfig } from '@intelgraph/event-bus';
import { EventStore, EventStoreConfig } from '@intelgraph/event-sourcing';
import { CommandBus, QueryBus } from '@intelgraph/cqrs';
import { SagaOrchestrator } from '@intelgraph/messaging';
import { StreamProcessor } from '@intelgraph/event-streaming';
import Redis from 'ioredis';
import { Pool } from 'pg';

const logger = pino({ name: 'EventBusService' });

const app = express();
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Configuration
const config: EventBusConfig = {
  name: process.env.SERVICE_NAME || 'event-bus-service',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  kafka: process.env.KAFKA_BROKERS ? {
    brokers: process.env.KAFKA_BROKERS.split(',')
  } : undefined
};

const eventStoreConfig: EventStoreConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/eventstore'
};

// Initialize components
let eventBus: EventBus;
let eventStore: EventStore;
let commandBus: CommandBus;
let queryBus: QueryBus;
let redis: Redis;

async function initialize() {
  logger.info('Initializing Event Bus Service...');

  // Initialize Redis
  redis = new Redis(config.redis);

  // Initialize Event Bus
  eventBus = new EventBus(config);
  await eventBus.initialize();

  // Initialize Event Store
  eventStore = new EventStore(eventStoreConfig);
  await eventStore.initialize();

  // Initialize CQRS
  commandBus = new CommandBus();
  queryBus = new QueryBus(redis);

  logger.info('Event Bus Service initialized');
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'event-bus-service',
    timestamp: new Date().toISOString()
  });
});

// Publish message
app.post('/api/v1/publish', async (req, res) => {
  try {
    const { topic, payload, options } = req.body;

    const messageId = await eventBus.publish(topic, payload, options);

    res.json({
      success: true,
      messageId
    });
  } catch (err: any) {
    logger.error({ err }, 'Publish error');
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Enqueue message
app.post('/api/v1/enqueue', async (req, res) => {
  try {
    const { queue, payload, options } = req.body;

    const messageId = await eventBus.enqueue(queue, payload, options);

    res.json({
      success: true,
      messageId
    });
  } catch (err: any) {
    logger.error({ err }, 'Enqueue error');
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get metrics
app.get('/api/v1/metrics', (req, res) => {
  const metrics = eventBus.getMetrics();

  res.json({
    success: true,
    metrics
  });
});

// Execute command
app.post('/api/v1/commands', async (req, res) => {
  try {
    const { commandType, payload, metadata } = req.body;

    const result = await commandBus.execute(commandType, payload, metadata);

    res.json(result);
  } catch (err: any) {
    logger.error({ err }, 'Command error');
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Execute query
app.post('/api/v1/queries', async (req, res) => {
  try {
    const { queryType, parameters, metadata } = req.body;

    const result = await queryBus.execute(queryType, parameters, metadata);

    res.json(result);
  } catch (err: any) {
    logger.error({ err }, 'Query error');
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Get event stream
app.get('/api/v1/events/:aggregateId', async (req, res) => {
  try {
    const { aggregateId } = req.params;
    const fromVersion = parseInt(req.query.fromVersion as string || '0');

    const stream = await eventStore.getEventStream(aggregateId, fromVersion);

    res.json({
      success: true,
      stream
    });
  } catch (err: any) {
    logger.error({ err }, 'Get event stream error');
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// Start server
const PORT = parseInt(process.env.PORT || '3000');

initialize().then(() => {
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Event Bus Service listening');
  });
}).catch(err => {
  logger.error({ err }, 'Failed to initialize service');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  await eventBus.shutdown();
  await eventStore.close();
  await redis.quit();

  process.exit(0);
});
