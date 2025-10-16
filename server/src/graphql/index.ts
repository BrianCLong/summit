import { ApolloServer } from 'apollo-server-express';
import { schema as typeDefs, safeTypes } from './schema/index.js';
import resolvers from './resolvers/index.js';

export async function mountGraphQL(app: any) {
  const server = new ApolloServer({
    typeDefs: [typeDefs as any, safeTypes as any] as any,
    resolvers: resolvers as any,
    context: ({ req }) => ({ user: (req as any).user }),
  });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
}
