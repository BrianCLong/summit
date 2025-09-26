import { gql } from 'graphql-tag';

export default gql`
  scalar JSON

  type Entity {
    id: ID!
    type: String!
    value: String!
    confidence: Float
    source: String
    firstSeen: String
    lastSeen: String
    properties: JSON
    metadata: JSON
  }

  type Relationship {
    id: ID!
    source: ID!
    target: ID!
    type: String!
    label: String
    confidence: Float
    properties: JSON
  }

  input EntityFilters {
    type: String
    q: String
    limit: Int
  }

  type Query {
    entities(filters: EntityFilters): [Entity!]!
    relationships(entityId: ID!): [Relationship!]!
  }

  input UpsertEntityInput {
    id: ID
    type: String!
    value: String!
    confidence: Float
    properties: JSON
  }

  enum AnonymizationTarget {
    POSTGRES
    NEO4J
  }

  input TriggerAnonymizationInput {
    targets: [AnonymizationTarget!]
    dryRun: Boolean
    requestedBy: ID
  }

  type AnonymizationRun {
    runId: ID!
    status: String!
    dryRun: Boolean!
    scope: [AnonymizationTarget!]!
    startedAt: String!
    completedAt: String
    maskedPostgres: Int!
    maskedNeo4j: Int!
    notes: String
  }

  type Mutation {
    upsertEntity(input: UpsertEntityInput!): Entity!
    triggerAnonymization(input: TriggerAnonymizationInput!): AnonymizationRun!
  }
`;
