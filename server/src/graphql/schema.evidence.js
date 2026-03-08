"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.evidenceTypeDefs = (0, graphql_tag_1.gql) `
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
exports.default = exports.evidenceTypeDefs;
