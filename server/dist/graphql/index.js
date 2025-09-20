import { ApolloServer } from 'apollo-server-express';
import { schema as typeDefs, safeTypes } from './schema/index.ts';
import { resolvers } from './resolvers';
export async function mountGraphQL(app) {
    const server = new ApolloServer({
        typeDefs: [typeDefs, safeTypes],
        resolvers,
        context: ({ req }) => ({ user: req.user }),
    });
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' });
}
//# sourceMappingURL=index.js.map