import { ApolloServer } from 'apollo-server';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { coherenceHub } from './coherenceHub';

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  plugins: [coherenceHub],
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`v24 Global Coherence Ecosystem running at ${url}`);
});
