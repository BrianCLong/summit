import { makeExecutableSchema } from '@graphql-tools/schema';
import { stepUpSensitive } from '../middleware/stepUpSensitive';
import crypto from 'crypto';

// Placeholder for typeDefs and resolvers
const typeDefs = `
  directive @sensitive on FIELD_DEFINITION

  type Query {
    hello: String
  }

  type Mutation {
    sensitiveAction: String @sensitive
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
  },
  Mutation: {
    sensitiveAction: () => 'Sensitive action performed!',
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

// Persisted query cache (in‑mem; swap with Redis for multi‑pod)
const pqCache = new Map<string, string>();

function sha256(input: string) { return crypto.createHash('sha256').update(input).digest('hex'); }

export function lookupPersistedQuery(extensions?: any) {
  const hash = extensions?.persistedQuery?.sha256Hash;
  if (!hash) return null;
  return pqCache.get(hash) ?? null;
}

export function registerPersistedQuery(query: string) {
  const hash = sha256(query);
  pqCache.set(hash, query);
  return hash;
}

// Apollo server init …
// Attach step‑up middleware
// (example: wrap resolvers at schema build time or via plugin)
