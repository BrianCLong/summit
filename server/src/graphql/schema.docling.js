import { gql } from 'graphql-tag';

export const doclingTypeDefs = gql`
  enum DocRetentionTier {
    SHORT
    STANDARD
  }

  type DocFragment {
    id: ID!
    sha256: String!
    text: String!
    metadata: JSON
  }

  type DocFinding {
    id: ID!
    label: String!
    value: String!
    confidence: Float!
    severity: String
    fragmentId: ID
    qualitySignals: JSON
  }

  type DocPolicySignal {
    id: ID!
    classification: String!
    value: String
    purpose: String!
    retention: DocRetentionTier!
    fragmentId: ID
    qualitySignals: JSON
  }

  type DocSummaryResult {
    id: ID!
    text: String!
    focus: String!
    highlights: [String!]!
    qualitySignals: JSON
  }

  type SummarizeBuildFailurePayload {
    summary: DocSummaryResult!
    fragments: [DocFragment!]!
    findings: [DocFinding!]!
    policySignals: [DocPolicySignal!]!
  }

  input SummarizeBuildFailureInput {
    requestId: ID!
    buildId: ID!
    logText: String!
    artifactUri: String
    retention: DocRetentionTier!
    purpose: String!
    maxTokens: Int
  }

  type ExtractLicensesPayload {
    findings: [DocFinding!]!
    policySignals: [DocPolicySignal!]!
  }

  input ExtractLicensesInput {
    requestId: ID!
    text: String!
    retention: DocRetentionTier!
    purpose: String!
    sourceType: String!
    artifactUri: String
  }

  type ReleaseNotesPayload {
    summary: DocSummaryResult!
  }

  input ReleaseNotesInput {
    requestId: ID!
    diffText: String!
    retention: DocRetentionTier!
    purpose: String!
  }

  extend type Query {
    doclingSummary(requestId: ID!): DocSummaryResult
  }

  extend type Mutation {
    summarizeBuildFailure(
      input: SummarizeBuildFailureInput!
    ): SummarizeBuildFailurePayload!
    extractLicenses(input: ExtractLicensesInput!): ExtractLicensesPayload!
    generateReleaseNotes(input: ReleaseNotesInput!): ReleaseNotesPayload!
  }
`;
