"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
const apollo_server_1 = require("apollo-server");
exports.typeDefs = (0, apollo_server_1.gql) `
  type NLResult { cypher: String!, plan: String!, estimate: Int!, sandboxResult: String }
  type Mutation { runNlQuery(text: String!): NLResult! }
  type Query { _health: String! }
`;
exports.resolvers = {
    Query: { _health: () => 'ok' },
    Mutation: {
        runNlQuery: (_, { text }) => ({
            cypher: 'MATCH (a)-[:FOLLOWS]->(b) RETURN a,b',
            plan: 'Projected simple plan',
            estimate: 42,
            sandboxResult: 'rows: 0'
        })
    }
};
