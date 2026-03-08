"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const apollo_server_1 = require("apollo-server");
const schema_1 = require("./schema");
const http_1 = __importDefault(require("http"));
const server = new apollo_server_1.ApolloServer({ typeDefs: schema_1.typeDefs, resolvers: schema_1.resolvers });
server.listen({ port: 4010 }).then(({ url }) => console.log(`[prov-ledger] listening at ${url}`));
// express health shim for k6/dev tools
http_1.default.createServer((_, res) => { res.writeHead(200); res.end('ok'); }).listen(4011);
