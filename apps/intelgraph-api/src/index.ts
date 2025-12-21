import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './schema.js';
import { makeContext } from './lib/context.js';
import { expressjwt, type GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { createLogger, requestContextMiddleware } from '@intelgraph/logging';
import { registerInternalStatusRoutes } from './routes/internalStatus.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const app = express();

const logger = createLogger({
  serviceName: 'intelgraph-api',
  environment: process.env.NODE_ENV,
  sampleRates: { debug: Number(process.env.LOG_DEBUG_SAMPLE_RATE ?? '1') },
  redactKeys: ['req.headers.authorization'],
});

app.use(cors());
app.use(
  requestContextMiddleware({
    logger,
    resolveUserId: (req) => (req as any).user?.sub || (req as any).user?.id,
    resolveTenantId: (req) => (req as any).user?.tenant_id,
  }),
);
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
  server.applyMiddleware({ app: app as any, path: '/graphql' });
  registerInternalStatusRoutes(app);
  app.listen(PORT, () => logger.info({ PORT }, 'IntelGraph API listening'));
}

main().catch((err) => {
  logger.fatal({ err }, 'IntelGraph API failed to start');
  process.exit(1);
});
