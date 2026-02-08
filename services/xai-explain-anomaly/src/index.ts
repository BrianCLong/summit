import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

async function startServer() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });

  await server.start();
  app.use('/graphql', express.json(), expressMiddleware(server));

  app.listen({ port: 4000 }, () =>
    console.log('🚀 Server ready at http://localhost:4000/graphql')
  );
}

startServer();
