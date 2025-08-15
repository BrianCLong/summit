import 'dotenv/config'
import http from 'http'
import express from 'express'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { useServer } from 'graphql-ws/lib/use/ws'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import helmet from 'helmet'
import pino from 'pino'
import { pinoHttp } from 'pino-http'
import { typeDefs } from './graphql/schema.js'
import resolvers from './graphql/resolvers/index.js'
import { getContext } from './lib/auth.js'
import { getNeo4jDriver } from './db/neo4j.js';

const app = express()
const logger = pino()
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'], credentials: true }))
app.use(pinoHttp({ logger, redact: ['req.headers.authorization'] }))

app.get('/search/evidence', async (req, res) => {
  const { q, skip = 0, limit = 10 } = req.query;

  if (!q) {
    return res.status(400).send({ error: 'Query parameter \'q\' is required' });
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
      session.run(searchQuery, { query: q, skip: Number(skip), limit: Number(limit) }),
      session.run(countQuery, { query: q })
    ]);

    const evidence = searchResult.records.map(record => ({
      node: record.get('node').properties,
      score: record.get('score')
    }));

    const total = countResult.records[0].get('total').toNumber();

    res.send({
      data: evidence,
      metadata: {
        total,
        skip: Number(skip),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
        currentPage: Math.floor(Number(skip) / Number(limit)) + 1
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).send({ error: 'Internal server error' });
  } finally {
    await session.close();
  }
});

const schema = makeExecutableSchema({ typeDefs, resolvers })
const httpServer = http.createServer(app)

// GraphQL over HTTP
import { persistedQueriesPlugin } from './graphql/plugins/persistedQueries.js';

const apollo = new ApolloServer({
  schema,
  plugins: [persistedQueriesPlugin],
})
await apollo.start()
app.use('/graphql', express.json(), expressMiddleware(apollo, { context: getContext }))

// Subscriptions
const wss = new WebSocketServer({ server: httpServer as import('http').Server, path: '/graphql' })
useServer({ schema, context: getContext }, wss)

import { initSocket, getIO } from './realtime/socket.js'; // New import

const port = Number(process.env.PORT || 4000)
httpServer.listen(port, () => logger.info({ port }, 'server listening'))

// Initialize Socket.IO
const io = initSocket(httpServer);

import { closeNeo4jDriver } from './db/neo4j.js';
import { closePostgresPool } from './db/postgres.js';
import { closeRedisClient } from './db/redis.js';

// Graceful shutdown
const shutdown = async (sig: NodeJS.Signals) => {
  logger.info({ sig }, 'shutting down');
  wss.close();
  io.close(); // Close Socket.IO server
  await Promise.allSettled([
    closeNeo4jDriver(),
    closePostgresPool(),
    closeRedisClient(),
  ]);
  httpServer.close(err => {
    if (err) { logger.error(err); process.exitCode = 1 }
    process.exit();
  });
};
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
