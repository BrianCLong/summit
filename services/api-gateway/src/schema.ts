import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Core Graph Types
  type Entity {
    id: ID!
    type: String!
    properties: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Relationship {
    id: ID!
    source: Entity!
    target: Entity!
    type: String!
    properties: JSON!
    confidence: Float
    createdAt: DateTime!
  }

  # XAI Types
  type Explanation {
    id: ID!
    entityId: String
    edgeId: String
    model: String!
    version: String!
    rationale: String!
    counterfactuals: [String!]!
    fairnessScore: Float
    robustnessScore: Float
    createdAt: DateTime!
  }

  # Provenance Types
  type Claim {
    id: ID!
    content: JSON!
    hash: String!
    signature: String
    createdAt: DateTime!
  }

  type ProvenanceChain {
    id: ID!
    claimId: String!
    transforms: [String!]!
    sources: [String!]!
    lineage: JSON!
  }

  # Runbook Types
  type Runbook {
    id: ID!
    name: String!
    version: String!
    tasks: [RunbookTask!]!
    status: RunbookStatus!
  }

  type RunbookTask {
    id: String!
    name: String!
    uses: String!
    with: JSON
    needs: [String!]
    status: TaskStatus!
  }

  enum RunbookStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
  }

  enum TaskStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
    SKIPPED
  }

  # Prediction Types
  type Forecast {
    id: ID!
    series: String!
    horizon: Int!
    predictions: [Float!]!
    confidence: [Float!]!
    model: String!
    createdAt: DateTime!
  }

  # Query Root
  type Query {
    # Graph Queries
    entity(id: ID!): Entity
    entities(filter: JSON, limit: Int = 10): [Entity!]!
    relationship(id: ID!): Relationship
    relationships(filter: JSON, limit: Int = 10): [Relationship!]!

    # XAI Queries
    explanation(id: ID!): Explanation
    explainEntity(entityId: ID!, model: String!, version: String!): Explanation!
    explainRelationship(
      relationshipId: ID!
      model: String!
      version: String!
    ): Explanation!

    # Provenance Queries
    claim(id: ID!): Claim
    provenance(claimId: ID!): ProvenanceChain

    # Runbook Queries
    runbook(id: ID!): Runbook
    runbooks(status: RunbookStatus): [Runbook!]!

    # Prediction Queries
    forecast(id: ID!): Forecast

    # Health Check
    health: String!
  }

  # Mutation Root
  type Mutation {
    # Provenance Mutations
    createClaim(input: CreateClaimInput!): Claim!

    # Runbook Mutations
    startRunbook(name: String!, version: String, inputs: JSON): Runbook!
    stopRunbook(id: ID!): Runbook!

    # Prediction Mutations
    createForecast(input: CreateForecastInput!): Forecast!
  }

  # Input Types
  input CreateClaimInput {
    content: JSON!
    signature: String
  }

  input CreateForecastInput {
    series: String!
    horizon: Int!
    context: JSON
  }

  # Subscription Root
  type Subscription {
    runbookProgress(id: ID!): Runbook!
    entityUpdates(filter: JSON): Entity!
  }
`;
