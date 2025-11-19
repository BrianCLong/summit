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
  const compatApp = app as unknown as import('express-serve-static-core').Express;
  server.applyMiddleware({ app: compatApp, path: '/graphql' });
}
