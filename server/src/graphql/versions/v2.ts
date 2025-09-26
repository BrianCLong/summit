import { gql } from 'graphql-tag';
import { typeDefs as baseTypeDefs } from '../schema/index.js';
import baseResolvers from '../resolvers/index.js';
import { sampleModelOutputs } from './mlSampleData.js';

const versionTypeDefs = gql`
  type MLOutputMetrics {
    confidence: Float!
    uncertainty: Float!
    sampleSize: Int!
  }

  type MLOutput {
    id: ID!
    label: String!
    metrics: MLOutputMetrics!
    explanations: [String!]!
    rawOutput: JSON
  }

  extend type Query {
    mlInferences: [MLOutput!]!
  }
`;

export const typeDefs = [...baseTypeDefs, versionTypeDefs];

export const resolvers = {
  ...baseResolvers,
  Query: {
    ...(baseResolvers as any).Query,
    mlInferences: () =>
      sampleModelOutputs.map((output) => ({
        id: output.id,
        label: output.label,
        metrics: {
          confidence: output.confidence,
          uncertainty: output.uncertainty,
          sampleSize: output.sampleSize,
        },
        explanations: output.explanations,
        rawOutput: output.rawOutput,
      })),
  },
};
