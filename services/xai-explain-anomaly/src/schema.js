"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
exports.typeDefs = (0, apollo_server_express_1.gql) `
  type FeatureContribution {
    name: String!
    contribution: Float!
  }

  type AnomalyExplanation {
    id: ID!
    score: Float!
    explanation: String!
    features: [FeatureContribution!]!
  }

  type Query {
    explainAnomaly(id: ID!): AnomalyExplanation
  }
`;
