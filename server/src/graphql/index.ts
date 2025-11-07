import { ApolloServer } from 'apollo-server-express';
import { schema as typeDefs, safeTypes } from './schema/index.js';
import { resolvers } from './resolvers';

export async function mountGraphQL(app: any) {
  const server = new ApolloServer({
    typeDefs: [typeDefs, safeTypes],
    resolvers,
    context: ({ req }) => ({ user: (req as any).user }),
  });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
}
