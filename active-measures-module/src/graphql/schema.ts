import { gql } from 'apollo-server';

export const schema = gql`
  extend type Query {
    activeMeasuresPortfolio(query: String, tuners: TunersInput): [MeasureOption]

    # Iran Narrative Ext
    persianNarratives(status: String): [CogSecNarrative]
  }

  extend type CogSecNarrative {
    canonicalLabel: String
    intendedAudiences: [String]
    evidenceIds: [String]
    languages: [String]
  }

  type MediaObject {
    id: ID!
    sha256: String
    reuseAsNew: Boolean
    evidenceIds: [String]
  }

  type ConnectivityState {
    region: String!
    platform: String!
    state: String!
    evidenceIds: [String]
  }

  extend type Mutation {
    combineMeasures(ids: [ID]!, tuners: TunersInput): OperationPlan
    approveOperation(id: ID!, approver: String): ApprovalStatus
  }
  input TunersInput {
    proportionality: Float = 0.5
    riskLevel: Float = 0.3
    duration: Int
    ethicalIndex: Float
  }
  type MeasureOption {
    id: ID
    category: String
    description: String
    unattributabilityScore: Float
    novelFeatures: [String]
  }
  type OperationPlan {
    graph: String
    predictedEffects: [EffectMetric]
    auditTrail: [AuditEntry]
  }
  type EffectMetric {
    impact: Float
    feedbackLoop: String
  }
  type ApprovalStatus {
    status: String
    chain: [AuditEntry]
  }
  type AuditEntry {
    timestamp: String
    actor: String
    action: String
    details: String
  }
`;
