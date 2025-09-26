import { gql } from 'graphql-tag';
import { typeDefs as baseTypeDefs } from '../schema/index.js';
import baseResolvers from '../resolvers/index.js';
import { legacySummary, sampleModelOutputs } from './mlSampleData.js';

const versionTypeDefs = gql`
  """
  Legacy ML output used prior to the structured metrics redesign.
  The score field is maintained for compatibility but will be removed in /graphql/v2.
  """
  type LegacyMLOutput {
    id: ID!
    label: String!
    score: Float! @deprecated(reason: "Use mlInferences in API v2 to read structured confidence metrics.")
    explanation: String
    rawOutput: JSON
  }

  extend type Query {
    mlOutputs: [LegacyMLOutput!]!
      @deprecated(reason: "The mlOutputs query is superseded by mlInferences on the /graphql/v2 endpoint.")
  }
`;

export const typeDefs = [...baseTypeDefs, versionTypeDefs];

export const resolvers = {
  ...baseResolvers,
  Query: {
    ...(baseResolvers as any).Query,
    mlOutputs: () =>
      sampleModelOutputs.map((output) => ({
        id: output.id,
        label: output.label,
        score: output.confidence,
        explanation: legacySummary(output.explanations),
        rawOutput: output.rawOutput,
      })),
  },
};
