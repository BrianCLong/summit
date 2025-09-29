import 'dotenv/config'
import http from 'http'
import express from 'express'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express4'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { useServer } from 'graphql-ws/lib/use/ws'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import pino from 'pino'
import { pinoHttp } from 'pino-http'
import monitoringRouter from './routes/monitoring.js'
import aiRouter from './routes/ai.js'
import { typeDefs } from './graphql/schema.js'
import resolvers from './graphql/resolvers/index.js'
import { getContext } from './lib/auth.js'
import { getNeo4jDriver } from './db/neo4j.js';
import path from 'path';
import { fileURLToPath } from 'url';
// import WSPersistedQueriesMiddleware from './graphql/middleware/wsPersistedQueries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express()
const logger: pino.Logger = pino();
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'], credentials: true }))
app.use(pinoHttp({ logger, redact: ['req.headers.authorization'] }))

// Rate limiting (exempt monitoring endpoints)
app.use('/monitoring', monitoringRouter)
app.use('/api/ai', aiRouter)
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 600),
  message: { error: 'Too many requests, please try again later' }
}))

app.get('/search/evidence', async (req, res) => {
  const { q, skip = 0, limit = 10 } = req.query;

  if (!q) {
    return res.status(400).send({ error: "Query parameter 'q' is required" });
  }

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const searchQuery = `
      CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node, score
      RETURN node, score
      SKIP $skip
      LIMIT $limit
    `;

    const countQuery = `
      CALL db.index.fulltext.queryNodes("evidenceContentSearch", $query) YIELD node
      RETURN count(node) as total
    `;

    const [searchResult, countResult] = await Promise.all([
      session.run(searchQuery, {
        query: q,
        skip: Number(skip),
        limit: Number(limit),
      }),
      session.run(countQuery, { query: q }),
    ]);

    const evidence = searchResult.records.map((record) => ({
      node: record.get("node").properties,
      score: record.get("score"),
    }));

    const total = countResult.records[0].get("total").toNumber();

    res.send({
      data: evidence,
      metadata: {
        total,
        skip: Number(skip),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
        currentPage: Math.floor(Number(skip) / Number(limit)) + 1,
      },
    });
  } catch (error) {
    logger.error(`Error in search/evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).send({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
});

const schema = makeExecutableSchema({ typeDefs, resolvers });
const httpServer = http.createServer(app);

// GraphQL over HTTP
import { persistedQueriesPlugin } from './graphql/plugins/persistedQueries.js';
import pbacPlugin from './graphql/plugins/pbac.js';
import { depthLimit } from './graphql/validation/depthLimit.js';

const apollo = new ApolloServer({
  schema,
  // Order matters: PBAC early in execution lifecycle
  plugins: [persistedQueriesPlugin as any],
  // TODO: Complete PBAC Apollo Server 5 compatibility in separate task
  // plugins: [persistedQueriesPlugin as any, pbacPlugin() as any],
  // Disable introspection and playground in production
  introspection: process.env.NODE_ENV !== 'production',
  // Note: ApolloServer 4+ doesn't have playground config, handled by Apollo Studio
  // GraphQL query validation rules
  validationRules: [depthLimit(8)],
})
await apollo.start()
app.use('/graphql', express.json(), expressMiddleware(apollo, { context: getContext }))

// Subscriptions with Persisted Query validation

const wss = new WebSocketServer({
  server: httpServer as import("http").Server,
  path: "/graphql",
});

// const wsPersistedQueries = new WSPersistedQueriesMiddleware();
// const wsMiddleware = wsPersistedQueries.createMiddleware();

useServer({ 
  schema, 
  context: getContext,
  // ...wsMiddleware
}, wss);

if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

import { initSocket, getIO } from './realtime/socket.js'; // New import

const port = Number(process.env.PORT || 4000)
httpServer.listen(port, async () => {
  logger.info(`Server listening on port ${port}`);
  
  // Create sample data for development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      try {
        await createSampleData();
      } catch (error) {
        logger.warn('Failed to create sample data, continuing without it');
      }
    }, 2000); // Wait 2 seconds for connections to be established
  }
})

// Initialize Socket.IO
const io = initSocket(httpServer);

import { closeNeo4jDriver } from './db/neo4j.js';
import { closePostgresPool } from './db/postgres.js';
import { closeRedisClient } from './db/redis.js';
import { createSampleData } from './utils/sampleData.js';

// Graceful shutdown
const shutdown = async (sig: NodeJS.Signals) => {
  logger.info(`Shutting down. Signal: ${sig}`);
  wss.close();
  io.close(); // Close Socket.IO server
  await Promise.allSettled([
    closeNeo4jDriver(),
    closePostgresPool(),
    closeRedisClient(),
  ]);
  httpServer.close(err => {
    if (err) { logger.error(`Error during shutdown: ${err instanceof Error ? err.message : 'Unknown error'}`); process.exitCode = 1 }
    process.exit();
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
