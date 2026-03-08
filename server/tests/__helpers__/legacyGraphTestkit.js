"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withLegacyGraphServer = withLegacyGraphServer;
const server_1 = require("@apollo/server");
const schema_1 = require("../../src/graphql/schema");
const resolvers_1 = require("../../src/graphql/resolvers");
async function withLegacyGraphServer(run, context = {}) {
    const server = new server_1.ApolloServer({ typeDefs: schema_1.typeDefs, resolvers: resolvers_1.resolvers, introspection: true });
    await server.start();
    try {
        const exec = async ({ query, variables }) => {
            return server.executeOperation({ query, variables }, { contextValue: context });
        };
        return await run(exec);
    }
    finally {
        await server.stop();
    }
}
