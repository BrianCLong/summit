import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs, resolvers } from './schema.js';
const server = new ApolloServer({ typeDefs, resolvers });

startStandaloneServer(server, { listen: { port: 4020 } })
  .then(({ url }) => console.log(`[nl2cypher] ${url}`))
  .catch((error) => {
    console.error('[nl2cypher] startup failed', error);
    process.exit(1);
  });
