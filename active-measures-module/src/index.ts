import { ApolloServer } from 'apollo-server';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { driver as neo4jDriver } from './db/neo4j';
import { auditMiddleware } from './middleware/audit';
// import OPA from 'opa';  // OPA package not defined, using placeholder

const server = new ApolloServer({
  schema,
  resolvers,
  context: ({ req }) => ({ driver: neo4jDriver, user: (req as any).user }),
  plugins: [auditMiddleware], // Logs all ops
});

server
  .listen({ port: 4000 })
  .then(({ url }) => console.log(`Active Measures at ${url}`));
