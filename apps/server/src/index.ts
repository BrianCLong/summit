import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import RedisStoreFactory from 'connect-redis';
import Redis from 'ioredis';
import { readFileSync } from 'fs';
import { createRateLimiter } from './config/rateLimit.js';
import { securityHeaders, extraSecurityHeaders } from './config/security.js';
import { dropResolvers } from './graphql/resolvers/drop.js';
import { fetchSecret } from './security/vault.js';
import { securityLogger } from './observability/securityLogger.js';
import { issueCsrfToken, csrfProtector } from './security/csrf.js';
import { wafShield } from './security/waf.js';
import { surfaceRegistry } from './security/surfaceInventory.js';
import { tenantResolver } from './security/tenant.js';

const typeDefs = readFileSync(
  new URL('./graphql/schemas/drop.graphql', import.meta.url),
  'utf8',
);

const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Query: {
      ...dropResolvers.Query,
    },
    Mutation: {
      ...dropResolvers.Mutation,
    },
  },
});

let serverStarted = false;

export const createApp = async () => {
  if (!serverStarted) {
    await server.start();
    serverStarted = true;
  }

  const app = express();
  app.set('trust proxy', 1);

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['content-type', 'authorization', 'x-tenant-id', 'x-csrf-token'],
    }),
  );

  app.use(securityHeaders());
  app.use(extraSecurityHeaders);
  app.use(createRateLimiter());
  app.use(bodyParser.json({ limit: '2mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
  app.use(wafShield);

  const redisUrl = process.env.REDIS_URL;
  const redisClient = redisUrl
    ? new Redis(redisUrl, { enableReadyCheck: false })
    : undefined;
  const RedisStore = RedisStoreFactory(session);
  const sessionSecret =
    (await fetchSecret('session_secret', process.env.SESSION_SECRET || '')) || 'change-me';

  if (sessionSecret === 'change-me') {
    securityLogger.logEvent('session_warning', {
      level: 'warn',
      message: 'Session secret fallback in use. Configure Vault or SESSION_SECRET.',
    });
  }

  app.use(
    session({
      store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60, // 1 hour
      },
      name: process.env.SESSION_COOKIE_NAME || 'drop.sid',
    }),
  );

  app.use(tenantResolver);
  app.use('/security/csrf-token', issueCsrfToken);
  app.use(csrfProtector);

  app.use('/healthz', (_req, res) => res.json({ status: 'ok' }));

  surfaceRegistry.register({
    method: 'GET',
    path: '/healthz',
    category: 'public',
    description: 'Health probe',
  });
  surfaceRegistry.register({
    method: 'POST',
    path: '/graphql',
    category: 'public',
    description: 'GraphQL endpoint',
  });
  surfaceRegistry.register({
    method: 'GET',
    path: '/security/csrf-token',
    category: 'admin',
    description: 'Issue CSRF tokens for session',
  });

  const surfaceToken = process.env.SURFACE_INVENTORY_TOKEN;
  surfaceRegistry.register({
    method: 'GET',
    path: '/security/surface',
    category: 'admin',
    description: 'Surface inventory',
  });
  app.get('/security/surface', surfaceRegistry.handler(surfaceToken));

  app.post('/actions/ping', (_req, res) => {
    res.json({ status: 'ok' });
  });
  surfaceRegistry.register({
    method: 'POST',
    path: '/actions/ping',
    category: 'admin',
    description: 'Authenticated liveness check for CSRF and session validation',
  });

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => ({
        ip: req.ip,
        sessionId: (req as any).sessionID,
        tenantId: (req as any).tenantId,
      }),
    }),
  );

  return app;
};

export const startServer = async () => {
  const app = await createApp();
  const port = Number(process.env.PORT) || 4001;
  app.listen(port, () => {
    console.log(`🚀 Drop Gateway ready at http://localhost:${port}/graphql`);
  });
};

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], 'file://').href &&
  process.env.NODE_ENV !== 'test'
) {
  startServer().catch((error) => {
    console.error('Failed to start Drop Gateway server', error);
  });
}
