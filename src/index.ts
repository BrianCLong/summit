import { ApolloServer } from 'apollo-server';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { collaborationHub } from './collaborationHub';

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  plugins: [collaborationHub],
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`v21 Harmonized Global Synergy running at ${url}`);
});
