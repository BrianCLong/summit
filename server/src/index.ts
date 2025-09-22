import { ApolloServer } from '@apollo/server';
import { schema } from './graphql/schema/index.ts';
import { resolvers } from './graphql/resolvers/index.ts';
import { startKafkaConsumer } from './ingest/kafka.ts';
import { handleHttpSignal, getIngestStatus } from './ingest/http.ts';
import { makePubSub } from './subscriptions/pubsub.ts';
import { enforcePersisted } from './middleware/persisted.ts';
import { rpsLimiter } from './middleware/rpsLimiter.ts';
import { backpressureMiddleware, getTenantRateStatus } from './middleware/backpressure.ts';
import express from 'express';
import { registry } from './metrics/registry.ts';
import { pg } from './db/pg.ts';
import { neo } from './db/neo4j.ts';
import { redis } from './subscriptions/pubsub.ts';

// OpenTelemetry v2 Bootstrap
import { initializeOTelV2 } from './telemetry/otel-v2-bootstrap.js';
import { trace } from '@opentelemetry/api';

// Initialize OpenTelemetry v2
initializeOTelV2();

console.log("Starting v24 Global Coherence Ecosystem server...");

const pubsub = makePubSub();

const app = express();
app.use(express.json());
app.use(enforcePersisted);
app.use(rpsLimiter);

// Expose Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Health check endpoints
app.get('/health', async (req, res) => {
  const pgHealth = await pg.healthCheck();
  const neoHealth = await neo.healthCheck();
  const redisHealth = await redis.healthCheck();
  
  const health = {
    status: pgHealth && neoHealth ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      postgres: pgHealth ? 'healthy' : 'unhealthy',
      neo4j: neoHealth ? 'healthy' : 'unhealthy',
      redis: redisHealth ? 'healthy' : 'degraded'  // Redis is optional, degraded if unavailable
    }
  };
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/health/pg', async (req, res) => {
  const isHealthy = await pg.healthCheck();
  res.status(isHealthy ? 200 : 503).json({
    service: 'postgres',
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/neo4j', async (req, res) => {
  const isHealthy = await neo.healthCheck();
  res.status(isHealthy ? 200 : 503).json({
    service: 'neo4j',
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/redis', async (req, res) => {
  const isHealthy = await redis.healthCheck();
  res.status(isHealthy ? 200 : 200).json({  // Redis failure is not critical
    service: 'redis',
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString()
  });
});

// Streaming ingest endpoints with backpressure
app.post('/ingest/stream', 
  backpressureMiddleware({ tokensPerSecond: 1000, burstCapacity: 5000 }),
  handleHttpSignal
);

// Ingest status endpoints
app.get('/ingest/status', (req, res) => {
  res.json(getIngestStatus());
});

app.get('/ingest/rate/:tenantId', (req, res) => {
  const tenantId = req.params.tenantId;
  res.json(getTenantRateStatus(tenantId));
});

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  context: ({ req, connection }) => {
    if (connection) {
      return { ...connection.context, pubsub };
    } else {
      // S5.2 Trace Sampling: Add tenant_id to baggage (placeholder)
      const currentContext = propagation.extract(context.active(), req.headers);
      const span = trace.getTracer('default').startSpan('request-context', {}, currentContext);
      const tenantId = req.headers['x-tenant-id'] || 'unknown-tenant'; // Example: get tenantId from header
      const newContext = trace.setSpan(context.active(), span);
      const baggage = propagation.createBaggage({ 'tenant_id': tenantId });
      const contextWithBaggage = propagation.setBaggage(newContext, baggage);
      span.end();

      return { req, pubsub, context: contextWithBaggage };
    }
  },
  subscriptions: {
    onConnect: (connectionParams, webSocket, context) => {
      console.log('Subscription client connected');
      return {};
    },
    onDisconnect: (webSocket, context) => {
      console.log('Subscription client disconnected');
    },
  },
});

server.applyMiddleware({ app });

server.listen({ port: 4000 }).then(({ url, subscriptionsUrl }) => {
  console.log(`🚀 Server ready at ${url}`);
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`);

  console.log("Metrics collection initialized.");

  startKafkaConsumer();

  // handleHttpSignal({
  //   tenantId: "http-tenant-1",
  //   type: "http_test",
  //   value: 0.85,
  //   weight: 1.0,
  //   source: "http",
  //   ts: new Date().toISOString()
  // });
});
;
