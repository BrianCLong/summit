"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.provenanceTypeDefs = (0, graphql_tag_1.gql) `
  input EvidenceFilterInput {
    service: String!
    releaseId: ID!
    since: DateTime
    until: DateTime
    limit: Int = 50
    offset: Int = 0
  }

  type ProvenanceExport {
    format: String!
    content: JSON!
    exportedAt: DateTime!
    tenantId: String!
  }

  extend type Query {
    evidenceBundles(filter: EvidenceFilterInput!): [EvidenceBundle!]!
    exportProvenance(tenantId: String!, format: String): ProvenanceExport!
  }

  extend type Mutation {
    linkTrustScoreEvidence(
      tenantId: String!
      subjectId: ID!
      evidenceId: ID!
    ): TrustScore!
  }
`;
exports.default = exports.provenanceTypeDefs;
