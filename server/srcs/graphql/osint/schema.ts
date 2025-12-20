import { gql } from 'apollo-server-express';

export const osintTypeDefs = gql`
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
