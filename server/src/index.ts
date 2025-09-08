import { ApolloServer } from 'apollo-server';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { startKafkaConsumer } from './ingest/kafka';
import { handleHttpSignal } from './ingest/http';
import { makePubSub } from './subscriptions/pubsub';
import { enforcePersisted } from './middleware/persisted';
import { rpsLimiter } from './middleware/rpsLimiter';
import express from 'express';
import bodyParser from 'body-parser';
import { registry } from './metrics';

// OpenTelemetry imports
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { context, propagation, trace } from '@opentelemetry/api';

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'v24-coherence-server',
  }),
  spanProcessor: new BatchSpanProcessor(new ConsoleSpanExporter()),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();

console.log("Starting v24 Global Coherence Ecosystem server...");

const pubsub = makePubSub();

const app = express();
app.use(bodyParser.json());
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
