import { gql } from 'graphql-tag';

export const auditLogTypeDefs = gql`
  enum AuditLogExportFormat {
    CSV
    JSON
  }

  input AuditLogExportFilterInput {
    from: DateTime
    to: DateTime
    actions: [String!]
    userIds: [ID!]
    resourceTypes: [String!]
  }

  input AuditLogPaginationInput {
    limit: Int = 500
    cursor: String
  }

  type AuditLogEntry {
    id: ID!
    userId: ID
    action: String!
    resourceType: String!
    resourceId: String
    details: JSON
    ipAddress: String
    userAgent: String
    createdAt: DateTime!
  }

  type AuditLogPageInfo {
    hasNextPage: Boolean!
    nextCursor: String
    totalCount: Int!
    limit: Int!
  }

  type AuditLogExportResult {
    format: AuditLogExportFormat!
    content: String!
    records: [AuditLogEntry!]!
    pageInfo: AuditLogPageInfo!
  }

  extend type Query {
    exportAuditLogs(
      format: AuditLogExportFormat!
      filter: AuditLogExportFilterInput
      pagination: AuditLogPaginationInput
    ): AuditLogExportResult!
  }
`;

export default { auditLogTypeDefs };
