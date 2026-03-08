"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const schema_1 = require("./graphql/schema");
const resolvers_1 = require("./graphql/resolvers");
const coherenceHub_1 = require("./coherenceHub");
const server = new apollo_server_1.ApolloServer({
    typeDefs: schema_1.schema,
    resolvers: resolvers_1.resolvers,
    plugins: [coherenceHub_1.coherenceHub],
});
server.listen({ port: 4000 }).then(({ url }) => {
    console.log(`v24 Global Coherence Ecosystem running at ${url}`);
});
