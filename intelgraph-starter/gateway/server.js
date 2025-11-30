import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { createClient } from 'redis';
import fetch from 'node-fetch';

const typeDefs = readFileSync(new URL('./schema.graphql', import.meta.url), 'utf8');
const app = express();

const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const port = Number(process.env.PORT || 4000);

const redis = createClient({ url: redisUrl });
redis.on('error', (err) => console.error('Redis error', err));
redis.connect();

const opaAllow = async (action, subject) => {
  const body = { input: { action, subject } };
  try {
    const res = await fetch(`${opaUrl}/v1/data/intelgraph/allow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.warn('OPA returned non-200', res.status);
      return true;
    }
    const json = await res.json();
    return json?.result === true;
  } catch (err) {
    console.warn('OPA not reachable, defaulting to allow', err.message);
    return true;
  }
};

const oidcGuard = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = { sub: 'anonymous', permissions: ['intelgraph:read'] };
    return next();
  }
  req.user = { sub: 'bearer-user', permissions: ['intelgraph:read', 'intelgraph:write'] };
  next();
};

app.use(express.json({ limit: '2mb' }));
app.use(oidcGuard);

const entities = new Map();
const relationships = new Map();
const provenance = new Map();

const resolvers = {
  Query: {
    ping: () => 'pong',
    entities: (_parent, args) => {
      if (args.type) {
        return [...entities.values()].filter((e) => e.type === args.type);
      }
      return [...entities.values()];
    },
    relationships: (_parent, args) => {
      if (args.type) {
        return [...relationships.values()].filter((r) => r.type === args.type);
      }
      return [...relationships.values()];
    }
  },
  Mutation: {
    upsertEntity: async (_parent, { input }, context) => {
      const allowed = await opaAllow('upsertEntity', context.user?.sub || 'anon');
      if (!allowed) {
        throw new Error('OPA denied entity upsert');
      }
      const id = input.id || `ent-${entities.size + 1}`;
      const record = { ...input, id, labels: input.labels || [], createdAt: new Date().toISOString() };
      entities.set(id, record);
      await redis.set(`entity:${id}`, JSON.stringify(record));
      return record;
    },
    upsertRelationship: async (_parent, { input }, context) => {
      const allowed = await opaAllow('upsertRelationship', context.user?.sub || 'anon');
      if (!allowed) {
        throw new Error('OPA denied relationship upsert');
      }
      const id = input.id || `rel-${relationships.size + 1}`;
      const record = { ...input, id, createdAt: new Date().toISOString() };
      relationships.set(id, record);
      await redis.set(`relationship:${id}`, JSON.stringify(record));
      return record;
    },
    recordProvenance: (_parent, { input }) => {
      const id = `prov-${provenance.size + 1}`;
      const record = { ...input, id, timestamp: input.timestamp || new Date().toISOString() };
      provenance.set(id, record);
      return record;
    },
    uploadObject: async (_parent, { path, bucket }) => {
      const targetBucket = bucket || process.env.MINIO_BUCKET || 'intelgraph-data';
      return `s3://${targetBucket}/${path}`;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({ user: req.user })
});

await server.start();
server.applyMiddleware({ app, path: '/graphql' });

const httpServer = createServer(app);
httpServer.listen({ port }, () => {
  console.log(`Gateway ready at http://localhost:${port}${server.graphqlPath}`);
});
