import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
export async function mountGraphQL(app) {
    const server = new ApolloServer({
        typeDefs, resolvers,
        context: ({ req }) => ({ user: req.user }),
    });
    await server.start();
    server.applyMiddleware({ app, path: "/graphql" });
}
//# sourceMappingURL=index.js.map