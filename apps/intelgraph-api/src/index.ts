import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './schema.js';
import { makeContext } from './lib/context.js';
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { trace } from '@opentelemetry/api'; // Import trace from OpenTelemetry API

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const app = express();

// Custom pino serializer to inject traceId
const pinoLogger = pino({
  mixin() {
    const span = trace.getSpan(trace.activeSpanContext());
    if (span) {
      const { traceId, spanId } = span.spanContext();
      return { traceId, spanId };
    }
    return {};
  },
});

const logger = pinoLogger; // Use the custom pino logger

app.use(cors());
app.get('/healthz', (_, res) => res.json({ ok: true }));

// JWT middleware for authentication
app.use(
  expressjwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri:
        process.env.JWKS_URI || 'http://localhost:8080/.well-known/jwks.json',
    }),
    algorithms: ['RS256'],
    credentialsRequired: false,
  }).unless({
    path: ['/healthz', '/graphql'],
  }),
);

// Error handling for JWT authentication
app.use((err: any, req: any, res: any, next: any) => {
  if (err.name === 'UnauthorizedError') {
    logger.warn({ err }, 'Unauthorized access attempt');
    return res.status(401).send('Invalid token');
  }
  next();
});

async function main() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => makeContext(req, logger),
    formatError: (error) => {
      logger.error(error, 'GraphQL Error');
      return error;
    },
  });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  app.listen(PORT, () => logger.info({ PORT }, 'IntelGraph API listening'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
