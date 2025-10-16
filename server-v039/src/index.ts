import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import bodyParser from 'body-parser';
import { readFileSync } from 'node:fs';
import { createResolvers } from './resolvers.js';
import { makeAuthz } from './opa.js';
import { persistedOnlyMiddleware } from './persisted.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const typeDefs = readFileSync('graphql/schema/mc-admin.graphql', 'utf8');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// Enforce persisted-only + audit/provenance headers at the gateway edge
app.use('/graphql', persistedOnlyMiddleware(logger));

const server = new ApolloServer({
  typeDefs,
  resolvers: createResolvers(logger),
  includeStacktraceInErrorResponses: false,
});
await server.start();

// Context: extract actor/tenant/purpose/region from OIDC / headers
app.use(
  '/graphql',
  expressMiddleware(server, {
    context: async ({ req }) => {
      const actor = {
        id: req.header('x-actor-id') || 'unknown',
        role: req.header('x-actor-role') || 'tenant-admin',
        tenant: (req.header('x-actor-tenant') as any) || 'TENANT_001',
        region: req.header('x-actor-region') || 'US',
      };
      const context = {
        purpose: req.header('x-purpose') || 'ops',
        region: req.header('x-region') || 'US',
      };
      const authz = makeAuthz();
      return { actor, context, authz, logger };
    },
  }),
);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => logger.info({ port }, 'MC admin GraphQL listening'));
