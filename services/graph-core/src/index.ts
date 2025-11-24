import express, { type Application } from 'express';
import { json } from 'body-parser';
import entities from './routes/entities.js';
import relationships from './routes/relationships.js';
import er from './routes/er.js';
import query from './routes/query.js';
import { correlationId } from './middleware/correlationId.js';
import { setupGraphQL } from './graphql/index.js';

const app: Application = express();
app.use(json());
app.use(correlationId);

// REST API routes (v1)
app.use('/api/v1/entities', entities);
app.use('/api/v1/relationships', relationships);
app.use('/api/v1/er', er);
app.use('/api/v1/query', query);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/health/detailed', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'graph-core',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      rest: '/api/v1/*',
      graphql: '/graphql',
    },
  });
});

// Initialize GraphQL (async)
let graphqlReady = false;

async function initializeGraphQL(): Promise<void> {
  try {
    await setupGraphQL(app);
    graphqlReady = true;
  } catch (error) {
    console.error('Failed to initialize GraphQL:', error);
    // Continue running with REST API only
  }
}

// Ready check (waits for GraphQL)
app.get('/health/ready', (_req, res) => {
  if (graphqlReady) {
    res.json({ status: 'ready', graphql: true });
  } else {
    res.status(503).json({ status: 'not_ready', graphql: false });
  }
});

const port = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  // Initialize GraphQL first, then start server
  initializeGraphQL().then(() => {
    app.listen(port, () => {
      console.log(`graph-core listening on ${port}`);
      console.log(`  REST API: http://localhost:${port}/api/v1/`);
      console.log(`  GraphQL:  http://localhost:${port}/graphql`);
    });
  });
} else {
  // For tests, initialize GraphQL synchronously-ish
  initializeGraphQL();
}

export default app;
