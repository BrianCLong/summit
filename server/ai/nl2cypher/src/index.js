"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_1 = require("apollo-server");
const schema_js_1 = require("./schema.js");
new apollo_server_1.ApolloServer({ typeDefs: schema_js_1.typeDefs, resolvers: schema_js_1.resolvers }).listen({ port: 4020 }).then(({ url }) => console.log(`[nl2cypher] ${url}`));
