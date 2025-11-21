const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Enums
  enum Role {
    ADMIN
    ANALYST
    VIEWER
  }

  # Updated to match canonical_types.py
  enum EntityType {
    PERSON
    ORG
    ASSET
    ACCOUNT
    LOCATION
    EVENT
    DOCUMENT
    COMMUNICATION
    DEVICE
    VEHICLE
    INFRA
    FINANCIAL_INSTRUMENT
    INDICATOR
    CLAIM
    CASE
    NARRATIVE
    CAMPAIGN
    SENSOR
    RUNBOOK
    AUTHORITY
    LICENSE
    # Legacy/Custom types
    PHONE
    EMAIL
    IP_ADDRESS
    URL
    CUSTOM
  }

  enum RelationshipType {
    KNOWS
    WORKS_FOR
    LOCATED_AT
    COMMUNICATES_WITH
    ASSOCIATED_WITH
    OWNS
    MEMBER_OF
    RELATED_TO
    TRANSACTED_WITH
    CONNECTED_TO

    # Canonical Relationship Types
    HAS_ACCOUNT
    PART_OF
    OBSERVED
    ISSUED_BY
    REFERENCES
    AFFECTS
    CONTROLS
    USES

    # Provenance
    SUPPORTED_BY
    MADE_BY
    DERIVES_FROM

    CUSTOM
  }

  enum InvestigationStatus {
    DRAFT
    ACTIVE
    PENDING
    COMPLETED
    ARCHIVED
  }

  enum InvestigationPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  # Core Types
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    fullName: String!
    role: Role!
    isActive: Boolean!
    lastLogin: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Investigation {
    id: ID!
    title: String!
    description: String
    status: InvestigationStatus!
    priority: InvestigationPriority!
    tags: [String!]!
    metadata: JSON
    createdBy: User!
    assignedTo: [User!]!
    entities: [Entity!]!
    relationships: [Relationship!]!
    entityCount: Int!
    relationshipCount: Int!
    analysisResults: [AnalysisResult!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Entity {
    id: ID!
    uuid: String!
    type: EntityType!
    label: String!
    description: String
    properties: JSON!
    confidence: Float
    source: String
    verified: Boolean!
    position: Position
    investigations: [Investigation!]!
    relationships: [Relationship!]!
    incomingRelationships: [Relationship!]!
    outgoingRelationships: [Relationship!]!
    relatedEntities: [Entity!]!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Relationship {
    id: ID!
    uuid: String!
    type: RelationshipType!
    label: String!
    description: String
    properties: JSON!
    weight: Float
    confidence: Float
    source: String
    verified: Boolean!
    sourceEntity: Entity!
    targetEntity: Entity!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Position {
    x: Float!
    y: Float!
  }

  type AnalysisResult {
    id: ID!
    investigationId: String!
    analysisType: String!
    algorithm: String!
    results: JSON!
    confidenceScore: Float
    createdBy: User!
    createdAt: DateTime!
  }

  # Provenance Types
  type Decision {
      id: ID!
      title: String!
      rationale: String!
      status: String
      createdAt: DateTime!
      madeBy: User
      evidence: [Entity!]
  }

  # Graph Analysis Types
  type GraphMetrics {
    nodeCount: Int!
    edgeCount: Int!
    density: Float!
    averageDegree: Float!
    clusters: [Cluster!]!
    centralityScores: [CentralityScore!]!
  }

  type Cluster {
    id: String!
    entities: [Entity!]!
    size: Int!
    cohesion: Float!
  }

  type CentralityScore {
    entityId: String!
    betweenness: Float!
    closeness: Float!
    degree: Int!
    pagerank: Float!
  }

  type LinkPrediction {
    sourceEntityId: String!
    targetEntityId: String!
    predictedRelationshipType: RelationshipType!
    confidence: Float!
    reasoning: String!
  }

  type AnomalyDetection {
    entityId: String!
    anomalyType: String!
    severity: Float!
    description: String!
    evidence: [String!]!
  }

  # Input Types
  input CreateUserInput {
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    password: String!
    role: Role = ANALYST
  }

  input UpdateUserInput {
    email: String
    username: String
    firstName: String
    lastName: String
    role: Role
    isActive: Boolean
  }

  input CreateInvestigationInput {
    title: String!
    description: String
    priority: InvestigationPriority = MEDIUM
    assignedTo: [ID!] = []
    tags: [String!] = []
    metadata: JSON
  }

  input UpdateInvestigationInput {
    title: String
    description: String
    status: InvestigationStatus
    priority: InvestigationPriority
    assignedTo: [ID!]
    tags: [String!]
    metadata: JSON
  }

  input CreateEntityInput {
    type: EntityType!
    label: String!
    description: String
    properties: JSON!
    confidence: Float
    source: String
    investigationId: ID!
    position: PositionInput
  }

  input UpdateEntityInput {
    type: EntityType
    label: String
    description: String
    properties: JSON
    confidence: Float
    source: String
    verified: Boolean
    position: PositionInput
  }

  input CreateRelationshipInput {
    type: RelationshipType!
    label: String!
    description: String
    properties: JSON
    weight: Float
    confidence: Float
    source: String
    sourceEntityId: ID!
    targetEntityId: ID!
  }

  input UpdateRelationshipInput {
    type: RelationshipType
    label: String
    description: String
    properties: JSON
    weight: Float
    confidence: Float
    source: String
    verified: Boolean
  }

  input PositionInput {
    x: Float!
    y: Float!
  }

  input EntityFilterInput {
    types: [EntityType!]
    verified: Boolean
    investigationId: ID
    createdAfter: DateTime
    createdBefore: DateTime
  }

  input GraphAnalysisInput {
    investigationId: ID!
    algorithms: [String!]!
    includeMetrics: Boolean = true
    includeClusters: Boolean = true
    includeCentrality: Boolean = true
  }

  # Auth Types
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresIn: Int!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input RegisterInput {
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    password: String!
  }

  input CreateDecisionInput {
      investigationId: ID!
      title: String!
      rationale: String!
      evidenceIds: [ID!]!
  }

  # Search Types
  type SearchResults {
    entities: [Entity!]!
    investigations: [Investigation!]!
    totalCount: Int!
  }

  # Graph Data for Visualization
  type GraphData {
    nodes: [GraphNode!]!
    edges: [GraphEdge!]!
    metadata: GraphMetadata!
  }

  type GraphNode {
    id: ID!
    label: String!
    type: EntityType! # Using the Enum here might be strict if data has other strings
    properties: JSON!
    position: Position
    size: Float
    color: String
    verified: Boolean!
  }

  type GraphEdge {
    id: ID!
    source: ID!
    target: ID!
    label: String!
    type: RelationshipType!
    properties: JSON!
    weight: Float
    verified: Boolean!
  }

  type GraphMetadata {
    nodeCount: Int!
    edgeCount: Int!
    lastUpdated: DateTime!
  }

  # Queries
  type Query {
    # Authentication
    me: User

    # Users
    users(page: Int = 1, limit: Int = 10): [User!]!
    user(id: ID!): User

    # Investigations
    investigations(
      page: Int = 1
      limit: Int = 10
      status: InvestigationStatus
      priority: InvestigationPriority
    ): [Investigation!]!
    investigation(id: ID!): Investigation
    myInvestigations: [Investigation!]!

    # Entities
    entities(
      investigationId: ID
      filter: EntityFilterInput
      page: Int = 1
      limit: Int = 50
    ): [Entity!]!
    entity(id: ID!): Entity
    entitiesByType(type: EntityType!, investigationId: ID): [Entity!]!

    # Relationships
    relationships(
      investigationId: ID
      page: Int = 1
      limit: Int = 50
    ): [Relationship!]!
    relationship(id: ID!): Relationship

    # Graph and Visualization
    graphData(investigationId: ID!): GraphData!
    graphMetrics(investigationId: ID!): GraphMetrics!

    # Search
    search(query: String!, limit: Int = 20): SearchResults!
    searchEntities(
      query: String!
      investigationId: ID
      limit: Int = 20
    ): [Entity!]!

    # Provenance
    decision(id: ID!): Decision

    # AI Analysis
    linkPredictions(investigationId: ID!, limit: Int = 10): [LinkPrediction!]!
    anomalyDetection(investigationId: ID!): [AnomalyDetection!]!
    analysisResults(investigationId: ID!): [AnalysisResult!]!

    # Hello
    hello: String
    status: String
  }

  # Mutations
  type Mutation {
    # Authentication
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!

    # User Management
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Investigations
    createInvestigation(input: CreateInvestigationInput!): Investigation!
    updateInvestigation(
      id: ID!
      input: UpdateInvestigationInput!
    ): Investigation!
    deleteInvestigation(id: ID!): Boolean!

    # Entities
    createEntity(input: CreateEntityInput!): Entity!
    updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    updateEntityPosition(id: ID!, position: PositionInput!): Entity!
    mergeEntities(sourceId: ID!, targetId: ID!): Entity!

    # Relationships
    createRelationship(input: CreateRelationshipInput!): Relationship!
    updateRelationship(id: ID!, input: UpdateRelationshipInput!): Relationship!
    deleteRelationship(id: ID!): Boolean!

    # Provenance
    createDecision(input: CreateDecisionInput!): Decision!

    # AI Analysis
    runGraphAnalysis(input: GraphAnalysisInput!): [AnalysisResult!]!
    generateLinkPredictions(investigationId: ID!): [LinkPrediction!]!
    detectAnomalies(investigationId: ID!): [AnomalyDetection!]!

    # Data Import
    importEntitiesFromText(investigationId: ID!, text: String!): [Entity!]!
    importEntitiesFromFile(investigationId: ID!, fileUrl: String!): [Entity!]!

    ping: String
  }

  # Subscriptions for Real-time Updates
  type Subscription {
    # Investigation updates
    investigationUpdated(investigationId: ID!): Investigation!

    # Entity updates
    entityAdded(investigationId: ID!): Entity!
    entityUpdated(investigationId: ID!): Entity!
    entityDeleted(investigationId: ID!): ID!

    # Relationship updates
    relationshipAdded(investigationId: ID!): Relationship!
    relationshipUpdated(investigationId: ID!): Relationship!
    relationshipDeleted(investigationId: ID!): ID!

    # Analysis updates
    analysisCompleted(investigationId: ID!): AnalysisResult!
  }
`;

module.exports = { typeDefs };
