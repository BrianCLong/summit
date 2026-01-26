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

  type LineageEvent {
    eventType: String!
    eventTime: String!
    runId: ID!
    jobName: String!
    inputs: JSON
    outputs: JSON
    producer: String
  }

  type ProvExport {
    id: ID!
    format: String!
    content: String!
    createdAt: String!
  }

  extend type Query {
    evidenceBundles(filter: EvidenceFilterInput!): [EvidenceBundle!]!
    lineageEvents(runId: ID!): [LineageEvent!]!
    provExport(runId: ID!, format: String): ProvExport
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
