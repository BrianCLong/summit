import { gql } from 'graphql-tag';

export const trustRiskTypeDefs = gql`
  enum RiskSeverity { LOW MEDIUM HIGH CRITICAL }

  type TrustScore {
    subjectId: ID!
    score: Float!
    reasons: [String!]!
    updatedAt: DateTime!
  }

  type RiskSignal {
    id: ID!
    tenantId: String!
    kind: String!
    severity: RiskSeverity!
    message: String!
    source: String!
    createdAt: DateTime!
    context: JSON
  }

  type IncidentBundle {
    id: ID!
    type: String!
    status: String!
    signals: [RiskSignal!]!
    actions: [String!]!
    createdAt: DateTime!
    evidenceId: ID
    notes: String
  }

  input RaiseRiskSignalInput {
    tenantId: String!
    kind: String!
    severity: RiskSeverity!
    message: String!
    source: String!
    context: JSON
  }

  input CreateIncidentBundleInput {
    type: String!
    signalIds: [ID!] = []
    notes: String
  }

  extend type Query {
    trustScore(subjectId: ID!): TrustScore!
    riskSignals(tenantId: String!, limit: Int = 50, kind: String, severity: RiskSeverity): [RiskSignal!]!
    incidentBundle(id: ID!): IncidentBundle
  }

  extend type Mutation {
    raiseRiskSignal(input: RaiseRiskSignalInput!): RiskSignal!
    createIncidentBundle(input: CreateIncidentBundleInput!): IncidentBundle!
  }
`;

export default trustRiskTypeDefs;

