"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const schema_1 = require("./graphql/schema");
const resolvers_1 = require("./graphql/resolvers");
const neo4j_1 = require("./db/neo4j");
const audit_1 = require("./middleware/audit");
// import OPA from 'opa';  // OPA package not defined, using placeholder
const server = new apollo_server_1.ApolloServer({
    schema: schema_1.schema,
    resolvers: resolvers_1.resolvers,
    context: ({ req }) => ({ driver: neo4j_1.driver, user: req.user }),
    plugins: [audit_1.auditMiddleware], // Logs all ops
});
server
    .listen({ port: 4000 })
    .then(({ url }) => console.log(`Active Measures at ${url}`));
