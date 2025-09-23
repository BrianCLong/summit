import { gql } from 'apollo-server';

export const schema = gql`
  extend type Query {
    activeMeasuresPortfolio(query: String, tuners: TunersInput): [MeasureOption]
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
    graph: String  # Using String instead of JSON for now
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
    details: String # Using String instead of JSON for now
  }
`;