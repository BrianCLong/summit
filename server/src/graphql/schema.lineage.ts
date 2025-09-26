import { gql } from 'graphql-tag';

export const lineageTypeDefs = gql`
  enum LineageDirection {
    UPSTREAM
    DOWNSTREAM
    BOTH
  }

  type LineageEdge {
    runId: ID
    stepId: String
    eventTime: DateTime!
    eventType: String!
    sourceDataset: String
    targetDataset: String
    sourceColumn: String
    targetColumn: String
    transformation: String
    targetSystem: String
    metadata: JSON
  }

  type LineageRunSummary {
    runId: ID!
    jobName: String
    jobType: String
    status: String
    startedAt: DateTime
    completedAt: DateTime
  }

  type DataLineage {
    dataset: String!
    upstream: [LineageEdge!]!
    downstream: [LineageEdge!]!
    runs: [LineageRunSummary!]!
    generatedAt: DateTime!
  }

  extend type Query {
    dataLineage(dataset: String!, tenantId: String, direction: LineageDirection = BOTH): DataLineage!
  }
`;

export default lineageTypeDefs;
