import { ApolloServer } from 'apollo-server-express';
import { schema as typeDefs, safeTypes } from './schema/index.ts';
import { resolvers } from './resolvers';

/**
 * Mount the primary GraphQL server on the provided Express application.
 *
 * The Apollo instance is configured with schema extensions that expose
 * authorization-aware resolvers and contextual user metadata.  The
 * resulting server is used both by production clients and internal
 * automation, so we centralise the setup here to make it visible to
 * TypeDoc and the generated API reference.
 *
 * @param app - Express application that should receive the `/graphql` route.
 */
export async function mountGraphQL(app: any) {
  const server = new ApolloServer({
    typeDefs: [typeDefs, safeTypes],
    resolvers,
    context: ({ req }) => ({ user: (req as any).user }),
  });
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
}
