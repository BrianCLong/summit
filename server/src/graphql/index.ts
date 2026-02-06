import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { schema as typeDefs, safeTypes } from './schema/index.js';
import { resolvers } from './resolvers.js';

export interface GraphQLContext {
  user?: any;
}

export async function mountGraphQL(app: any) {
  const server = new ApolloServer<GraphQLContext>({
    typeDefs: [typeDefs, safeTypes],
    resolvers,
  });
  await server.start();
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }: any) => ({ user: (req as any).user }),
    })
  );
}
