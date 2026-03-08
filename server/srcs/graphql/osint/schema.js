"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.osintTypeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
exports.osintTypeDefs = (0, apollo_server_express_1.gql) `
  extend type Query {
    getIpReputation(ipAddress: String!): JSON
    getIpInfo(ipAddress: String!): JSON
    scrapeWebsite(url: String!): JSON
  }

  extend type Mutation {
    analyzeText(text: String!): JSON
    generateHypotheses(data: JSON!): JSON
    simulateThreats(data: JSON!): JSON
  }
`;
