import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { driver as neo4jDriver } from './db/neo4j';
import { auditMiddleware } from './middleware/audit';
// import OPA from 'opa';  // OPA package not defined, using placeholder

const server = new ApolloServer({
  schema,
  resolvers,
  plugins: [auditMiddleware], // Logs all ops
});

async function main() {
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => ({ driver: neo4jDriver, user: (req as any).user }),
  });
  console.log(`Active Measures at ${url}`);
}

main().catch((error) => {
  console.error('[active-measures] startup failed', error);
  process.exit(1);
});
