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

  extend type Query {
    evidenceBundles(filter: EvidenceFilterInput!): [EvidenceBundle!]!
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
