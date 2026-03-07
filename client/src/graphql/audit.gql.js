import { gql } from "@apollo/client";

export const GET_AUDIT_TRACE = gql`
  query GetAuditTrace($investigationId: ID!, $filter: AuditLogFilter) {
    auditTrace(investigationId: $investigationId, filter: $filter) {
      id
      userId
      action
      resourceType
      resourceId
      details
      investigationId
      createdAt
    }
  }
`;
