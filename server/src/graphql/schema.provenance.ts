import { gql } from 'graphql-tag';

export const provenanceTypeDefs = gql`
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

export default provenanceTypeDefs;
