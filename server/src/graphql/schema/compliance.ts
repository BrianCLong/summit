import { gql } from 'graphql-tag';

export const complianceTypeDefs = gql`
  type ComplianceAuditLog {
    id: ID!
    action: String!
    resourceType: String!
    resourceId: String
    userId: ID
    userEmail: String
    userRole: String
    ipAddress: String
    userAgent: String
    details: JSON
    createdAt: DateTime!
  }

  type ComplianceSecurityScan {
    id: ID!
    scanType: String!
    target: String
    status: String!
    criticalCount: Int!
    highCount: Int!
    mediumCount: Int!
    lowCount: Int!
    totalFindings: Int!
    durationSeconds: Float
    reportUrl: String
    metadata: JSON
    scannedAt: DateTime!
  }

  type CompliancePolicyValidation {
    id: ID!
    policy: String!
    decision: String!
    allow: Boolean!
    reason: String
    metadata: JSON
    evaluatedAt: DateTime!
  }

  type ComplianceMetricSample {
    name: String!
    value: Float!
    labels: JSON
  }

  type ComplianceMetrics {
    openFindings: Int!
    scanSuccessRate: Float!
    policyPassRate: Float!
    promMetrics: [ComplianceMetricSample!]!
  }

  type ComplianceDashboard {
    generatedAt: DateTime!
    auditLogs: [ComplianceAuditLog!]!
    securityScans: [ComplianceSecurityScan!]!
    policyValidations: [CompliancePolicyValidation!]!
    metrics: ComplianceMetrics!
  }

  extend type Query {
    complianceDashboard(tenantId: String!, limit: Int = 20): ComplianceDashboard!
  }
`;

export default complianceTypeDefs;
