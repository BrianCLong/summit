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

  type Health {
    ok: Boolean!
    timestamp: DateTime!
  }

  type PingResponse {
    ok: Boolean!
    timestamp: DateTime!
    message: String
  }

  input PingInput {
    message: String!
    timestamp: DateTime
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

  # Case Management Types
  type Case {
    id: ID!
    tenantId: String!
    title: String!
    description: String
    status: String!
    priority: String!
    compartment: String
    policyLabels: [String!]
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    closedAt: DateTime
    closedBy: String
    slaTimers: [SLATimer!]
    comments(limit: Int, offset: Int): [Comment!]
  }

  type Comment {
    commentId: ID!
    tenantId: String!
    targetType: String!
    targetId: String!
    parentId: ID
    rootId: ID
    content: String!
    authorId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    mentions: [String!]
    isEdited: Boolean!
    isDeleted: Boolean!
    metadata: JSON
  }

  type SLATimer {
    slaId: ID!
    caseId: ID!
    tenantId: String!
    type: String!
    name: String!
    startTime: DateTime!
    deadline: DateTime!
    completedAt: DateTime
    status: String!
    targetDurationSeconds: Int!
    metadata: JSON
  }

  input CaseInput {
    title: String!
    description: String
    status: String
    priority: String
    compartment: String
    policyLabels: [String!]
    metadata: JSON
    reason: String
    legalBasis: String
  }

  input CaseUpdateInput {
    id: ID!
    title: String
    description: String
    status: String
    priority: String
    compartment: String
    policyLabels: [String!]
    metadata: JSON
    reason: String
    legalBasis: String
  }

  input CommentInput {
    targetType: String!
    targetId: String!
    parentId: ID
    content: String!
    mentions: [String!]
    metadata: JSON
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

    # Case Management Queries
    case(id: ID!, reason: String!, legalBasis: String!): Case
    cases(status: String, compartment: String, limit: Int, offset: Int): [Case!]
    comments(targetType: String!, targetId: String!, limit: Int, offset: Int): [Comment!]

    # Health Check
    health: Health!
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

    # Case Management Mutations
    createCase(input: CaseInput!): Case!
    updateCase(input: CaseUpdateInput!): Case!
    archiveCase(id: ID!, reason: String!, legalBasis: String!): Case!
    addComment(input: CommentInput!): Comment!
    updateComment(id: ID!, content: String!): Comment!
    deleteComment(id: ID!): Boolean!

    # System Mutations
    ping(input: PingInput!): PingResponse!
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
