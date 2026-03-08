"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = exports.typeDefs = void 0;
// @ts-nocheck
const apollo_server_1 = require("apollo-server");
const ledger_1 = require("./ledger");
exports.typeDefs = (0, apollo_server_1.gql) `
  type Evidence { id: ID!, sha256: String!, contentType: String!, createdAt: String! }
  type Claim { id: ID!, hashRoot: String!, transformChain: [String!]! }
  type Manifest { data: String! }

  type Query {
    _health: String!
    getManifest(caseId: String!): Manifest!
  }

  type Mutation {
    registerEvidence(sha256: String!, contentType: String!): Evidence!
    registerClaim(evidenceIds: [ID!]!, transformChain: [String!]!): Claim!
  }
`;
exports.resolvers = {
    Query: {
        _health: () => 'ok',
        getManifest: async (_, { caseId }) => {
            const data = await (0, ledger_1.exportManifest)(caseId);
            return { data };
        }
    },
    Mutation: {
        registerEvidence: async (_, { sha256, contentType }) => {
            return await (0, ledger_1.addEvidence)(sha256, contentType);
        },
        registerClaim: async (_, { evidenceIds, transformChain }) => {
            return await (0, ledger_1.addClaim)(evidenceIds, transformChain);
        }
    }
};
