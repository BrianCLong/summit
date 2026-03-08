"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefsAnswer = void 0;
// services/web-orchestrator/src/schema.answer.ts
const apollo_server_express_1 = require("apollo-server-express");
exports.typeDefsAnswer = (0, apollo_server_express_1.gql) `
  scalar JSON
  type OrchestratedAnswer {
    id: ID!
    answer: String!
    claims: JSON!
    citations: [Citation!]!
    consensusScore: Float!
    conflicts: JSON!
  }
  type Mutation {
    orchestratedAnswer(question: String!, contextId: ID!): OrchestratedAnswer!
  }
`;
