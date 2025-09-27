import { gql } from 'graphql-tag';

export const provenanceTypeDefs = gql`
  extend type Query {
    evidenceBundles(service: String!, releaseId: ID!, limit: Int = 1): [EvidenceBundle!]!
  }

  extend type Mutation {
    linkTrustScoreEvidence(tenantId: String!, subjectId: ID!, evidenceId: ID!): TrustScore!
  }
`;

export default provenanceTypeDefs;

