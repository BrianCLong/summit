import { gql } from '@apollo/client';

export const WORKFLOW_STATUS_SUBSCRIPTION = gql`
  subscription WorkflowStatus {
    workflowStatus {
      id
      name
      status
      startedAt
      updatedAt
      progress
      nodes {
        id
        label
        status
        startedAt
        finishedAt
      }
      logs {
        id
        level
        message
        timestamp
      }
    }
  }
`;
