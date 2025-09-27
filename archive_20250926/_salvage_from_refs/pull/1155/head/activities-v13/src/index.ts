import { ApolloServer } from 'apollo-server';
import { schema } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { planningStudio } from './planningStudio';

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  plugins: [planningStudio],
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`v13 Collaborative Insights running at ${url}`);
});