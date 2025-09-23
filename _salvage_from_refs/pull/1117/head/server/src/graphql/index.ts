import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

export async function mountGraphQL(app: any) {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ user: (req as any).user }),
  });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
}
