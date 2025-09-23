import 'dotenv/config'
import express from 'express'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express4'
import { makeExecutableSchema } from '@graphql-tools/schema'
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
import WSPersistedQueriesMiddleware from './graphql/middleware/wsPersistedQueries.js';

export const createApp = async () => {
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

  // GraphQL over HTTP
  const { persistedQueriesPlugin } = await import('./graphql/plugins/persistedQueries.js');
  const { default: pbacPlugin } = await import('./graphql/plugins/pbac.js');
  const { default: resolverMetricsPlugin } = await import('./graphql/plugins/resolverMetrics.js');
  const { depthLimit } = await import('./graphql/validation/depthLimit.js');

  const apollo = new ApolloServer({
    schema,
    // Order matters: PBAC early in execution lifecycle
    plugins: [persistedQueriesPlugin as any, resolverMetricsPlugin as any],
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

  return app;
};