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

const app = express()
const logger = pino()
app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'], credentials: true }))
app.use(pinoHttp({ logger, redact: ['req.headers.authorization'] }))

const schema = makeExecutableSchema({ typeDefs, resolvers })
const httpServer = http.createServer(app)

// GraphQL over HTTP
const apollo = new ApolloServer({ schema })
await apollo.start()
app.use('/graphql', express.json(), expressMiddleware(apollo, { context: getContext }))

// Subscriptions
const wss = new WebSocketServer({ server: httpServer as import('http').Server, path: '/graphql' })
useServer({ schema, context: getContext }, wss)

const port = Number(process.env.PORT || 4000)
httpServer.listen(port, () => logger.info({ port }, 'server listening'))

import { closeNeo4jDriver } from './db/neo4j.js';
import { closePostgresPool } from './db/postgres.js';
import { closeRedisClient } from './db/redis.js';

// Graceful shutdown
const shutdown = async (sig: NodeJS.Signals) => {
  logger.info({ sig }, 'shutting down');
  wss.close();
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