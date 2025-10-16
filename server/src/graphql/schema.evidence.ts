import { gql } from 'graphql-tag';

export const evidenceTypeDefs = gql`
  type SLOSnapshot {
    service: String!
    p95Ms: Int!
    p99Ms: Int
    errorRate: Float!
    window: String!
  }

  type ArtifactRef {
    type: String!
    sha256: String!
  }

  input ArtifactRefInput {
    type: String!
    sha256: String!
  }

  type EvidenceBundle {
    id: ID!
    releaseId: ID!
    service: String!
    artifacts: [ArtifactRef!]!
    slo: SLOSnapshot!
    cost: JSON
    createdAt: DateTime!
  }

  input SLOSnapshotInput {
    service: String!
    p95Ms: Int!
    p99Ms: Int
    errorRate: Float!
    window: String!
  }

  input EvidenceInput {
    releaseId: ID!
    service: String!
    artifacts: [ArtifactRefInput!]!
    slo: SLOSnapshotInput!
    cost: JSON
  }

  extend type Mutation {
    publishEvidence(input: EvidenceInput!): EvidenceBundle!
  }
`;

export default evidenceTypeDefs;
