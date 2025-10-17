import { ApolloServer } from 'apollo-server';
import { readFileSync } from 'fs';
import { dropResolvers } from './graphql/resolvers/drop';

const typeDefs = readFileSync(
  new URL('./graphql/schemas/drop.graphql', import.meta.url),
  'utf8',
);

const server = new ApolloServer({
  typeDefs,
  resolvers: {
    Mutation: {
      ...dropResolvers.Mutation,
    },
  },
});

server
  .listen({ port: 4001 })
  .then(({ url }) => {
    console.log(`🚀 Drop Gateway ready at ${url}`);
  })
  .catch((error) => {
    console.error('Failed to start Drop Gateway server', error);
  });
