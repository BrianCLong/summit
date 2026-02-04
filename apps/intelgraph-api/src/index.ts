/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { typeDefs, resolvers } from './schema.js';
import { makeContext } from './lib/context.js';
import { expressjwt, type GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { trace, context } from '@opentelemetry/api';
import { registerInternalStatusRoutes } from './routes/internalStatus.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const app = express();

// Custom pino serializer to inject traceId
const pinoLogger = pino({
  mixin() {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return { traceId: spanContext.traceId, spanId: spanContext.spanId };
    }
    return {};
  },
});

const logger = pinoLogger; // Use the custom pino logger

app.use(cors());
app.get('/healthz', (_, res) => res.json({ ok: true }));

// JWT middleware for authentication
const jwksSecret = jwksRsa.expressJwtSecret({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri:
    process.env.JWKS_URI || 'http://localhost:8080/.well-known/jwks.json',
});

app.use(
  expressjwt({
    secret: jwksSecret as GetVerificationKey,
    algorithms: ['RS256'],
    credentialsRequired: false,
  }).unless({
    path: ['/healthz', '/graphql'],
  }) as unknown as express.RequestHandler,
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
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const server = new ApolloServer<any>({
    typeDefs,
    resolvers,
    formatError: (formattedError, error) => {
      logger.error(error, 'GraphQL Error');
      return formattedError;
    },
  });
  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    expressMiddleware(server, {
      context: async ({ req }) => makeContext(req as any, logger),
    }) as unknown as express.RequestHandler
  );
  registerInternalStatusRoutes(app);
  app.listen(PORT, () => logger.info({ PORT }, 'IntelGraph API listening'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
