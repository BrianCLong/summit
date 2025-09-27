// services/web-orchestrator/src/schema.answer.ts
import { gql } from 'apollo-server-express'
export const typeDefsAnswer = gql`
  scalar JSON
  type OrchestratedAnswer {
    id: ID!
    answer: String!
    claims: JSON!
    citations: [Citation!]!
    consensusScore: Float!
    conflicts: JSON!
  }
  type Mutation {
    orchestratedAnswer(question: String!, contextId: ID!): OrchestratedAnswer!
  }
`
