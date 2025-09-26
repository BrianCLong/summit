import { gql } from 'graphql-tag';

const typeDefs = gql`
  extend type Query {
    vectorSimilaritySearch(input: VectorSimilarityInput!): [VectorSimilarityResult!]!
  }

  input VectorSimilarityInput {
    tenantId: ID!
    nodeId: ID
    queryEmbedding: [Float!]
    topK: Int = 5
    minScore: Float = 0.0
  }

  type VectorSimilarityNode {
    id: ID!
    kind: String
    labels: [String!]
    props: JSON
    tenantId: ID
  }

  type VectorSimilarityResult {
    node: VectorSimilarityNode!
    score: Float!
    embedding: [Float!]
    metadata: JSON
  }
`;

export default typeDefs;
export const vectorSearchTypeDefs = typeDefs;
