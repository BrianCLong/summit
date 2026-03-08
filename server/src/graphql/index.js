"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountGraphQL = mountGraphQL;
const apollo_server_express_1 = require("apollo-server-express");
const index_js_1 = require("./schema/index.js");
const resolvers_js_1 = require("./resolvers.js");
async function mountGraphQL(app) {
    const server = new apollo_server_express_1.ApolloServer({
        typeDefs: [index_js_1.schema, index_js_1.safeTypes],
        resolvers: resolvers_js_1.resolvers,
        context: ({ req }) => ({ user: req.user }),
    });
    await server.start();
    server.applyMiddleware({ app: app, path: '/graphql' });
}
