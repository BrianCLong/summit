import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'fs';
import path from 'path';
import { dropResolvers } from './graphql/resolvers/drop';

const typeDefs = readFileSync(path.join(__dirname, './graphql/schemas/drop.graphql'), 'utf8');

const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Mutation: {
      ...dropResolvers.Mutation,
    },
  },
});

startStandaloneServer(server, {
  listen: { port: 4001 }, // Use a different port than the main GraphQL API (4000)
}).then(({ url }) => {
  console.log(`🚀 Drop Gateway ready at ${url}`);
});