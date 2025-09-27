const { gql } = require('apollo-server-express');

const copilotTypeDefs = gql`
  enum CopilotStatus { PENDING RUNNING SUCCEEDED FAILED CANCELLED }

  type CopilotTask {
    id: ID!
    kind: String!     # e.g. "NEO4J_QUERY", "ENRICH_ENTITY", "SUMMARIZE"
    input: String!    # JSON stringified input for transparency
    output: String    # JSON stringified result
    status: CopilotStatus!
    startedAt: String
    finishedAt: String
    error: String
  }

  type CopilotPlan {
    id: ID!
    goalId: ID!
    steps: [CopilotTask!]!
    createdAt: String!
  }

  type CopilotRun {
    id: ID!
    goalId: ID!
    plan: CopilotPlan!
    status: CopilotStatus!
    createdAt: String!
    startedAt: String
    finishedAt: String
  }

  type CopilotEvent {
    runId: ID!
    taskId: ID
    level: String!      # INFO/WARN/ERROR/PROGRESS
    message: String!
    ts: String!
    payload: String     # JSON stringified
  }

  extend type Query {
    copilotRun(id: ID!): CopilotRun
    copilotEvents(runId: ID!): [CopilotEvent!]!  # polling fallback
  }

  extend type Mutation {
    startCopilotRun(goalId: ID!): CopilotRun!
  }
`;

module.exports = { copilotTypeDefs };