import { gql } from '@apollo/client';

export const START_RUN = gql`
  mutation StartCopilotRun($goalId: ID!) {
    startCopilotRun(goalId: $goalId) {
      id status createdAt
      plan { id createdAt steps { id kind status } }
    }
  }
`;

export const POLL_EVENTS = gql`
  query CopilotEvents($runId: ID!) {
    copilotEvents(runId: $runId) { runId taskId level message ts payload }
  }
`;