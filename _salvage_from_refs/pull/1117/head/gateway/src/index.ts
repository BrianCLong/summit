import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloGateway } from '@apollo/gateway';
import express from 'express';
import { makePersistedPlugin } from './plugins/persisted';
import { makeDepthCostPlugin } from './plugins/depthCost';
import { makeAbacPlugin } from './plugins/abac';
import { redactLogs } from './plugins/redactLogs';
import { buildContext } from './context';
import fs from 'node:fs';
import { trace } from '@opentelemetry/api'; // Import trace

export async function startGateway() {
  const gateway = new ApolloGateway({
    supergraphSdl: fs.readFileSync('supergraph/supergraph.graphql', 'utf8'),
  });

  const server = new ApolloServer({
    gateway,
    includeStacktraceInErrorResponses: false,
    plugins: [
      makePersistedPlugin({ storePath: 'ops/persisted.json' }),
      makeDepthCostPlugin({ maxDepth: 10, maxCost: 3000 }),
      makeAbacPlugin(),
      redactLogs(),
    ],
    introspection: process.env.NODE_ENV !== 'production',
  });

  const app = express();

  // OTel Trace Context Middleware
  app.use((req, res, next) => {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      const spanContext = currentSpan.spanContext();
      // Attach traceId and spanId to req.context (assuming buildContext uses req.context)
      // This might need adjustment based on how buildContext is implemented
      (req as any).context = (req as any).context || {};
      (req as any).context.traceId = spanContext.traceId;
      (req as any).context.spanId = spanContext.spanId;

      // Add custom attributes from headers
      const headers = req.headers as Record<string, string | undefined>;
      if (headers['x-run-id']) {
        currentSpan.setAttribute('run.id', headers['x-run-id']);
      }
      if (headers['x-node-id']) {
        currentSpan.setAttribute('node.id', headers['x-node-id']);
      }
      if ((req as any).context?.tenantId) {
        // Assuming tenantId is available in context
        currentSpan.setAttribute('tenant', (req as any).context.tenantId);
      }
      currentSpan.setAttribute('http.route', req.path); // Add route attribute
    }
    next();
  });

  // Provider Health Endpoint
  app.get('/providers/health', (req, res) => {
    // Dummy health data for demonstration
    const healthData = {
      openai: { status: 'healthy', p95: 120, error_rate: 0.01, rpm: 150, limit: 200 },
      anthropic: { status: 'degraded', p95: 300, error_rate: 0.05, rpm: 180, limit: 200 },
      google: { status: 'healthy', p95: 100, error_rate: 0.005, rpm: 100, limit: 150 },
      'vllm-local': { status: 'healthy', p95: 50, error_rate: 0, rpm: 50, limit: 1000 },
      ollama: { status: 'unhealthy', p95: 500, error_rate: 0.1, rpm: 20, limit: 100 },
    };
    res.json(healthData);
  });

  // Chaos Toggle Endpoint
  app.get('/providers/chaos', (req, res) => {
    const { provider, mode } = req.query;
    if (!provider || !mode) {
      return res.status(400).json({ error: 'Provider and mode are required.' });
    }
    // In a real scenario, this would update a global state or configuration
    // that the routing logic would then use to inject errors/latency.
    console.log(`Chaos injected for provider: ${provider}, mode: ${mode}`);
    res.json({ message: `Chaos mode '${mode}' activated for '${provider}'.` });
  });

  // DSAR Endpoints
  app.post('/ops/dsar/export', express.json(), (req, res) => {
    // TODO: Implement admin-only check
    const { tenant, user } = req.query;
    if (!tenant || !user) {
      return res.status(400).json({ error: 'Tenant and user are required.' });
    }
    console.log(`DSAR Export request for Tenant: ${tenant}, User: ${user}`);
    // TODO: Implement actual export logic (JSONL with index + artifacts manifest; redact secrets)
    res.json({ message: `DSAR Export initiated for tenant ${tenant}, user ${user}.` });
  });

  app.post('/ops/dsar/delete', express.json(), (req, res) => {
    // TODO: Implement admin-only check
    const { tenant, user } = req.query;
    if (!tenant || !user) {
      return res.status(400).json({ error: 'Tenant and user are required.' });
    }
    console.log(`DSAR Delete request for Tenant: ${tenant}, User: ${user}`);
    // TODO: Implement actual delete logic (soft delete, apply tombstone, and set TTL where hard delete not feasible)
    res.json({ message: `DSAR Delete initiated for tenant ${tenant}, user ${user}.` });
  });

  app.use('/graphql', express.json(), expressMiddleware(server, { context: buildContext }));
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  return { server, app };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startGateway();
}
