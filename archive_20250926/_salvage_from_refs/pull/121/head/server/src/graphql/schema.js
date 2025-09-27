const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  enum Role {
    ADMIN
    ANALYST 
    VIEWER
  }

  enum EntityType {
    PERSON
    ORGANIZATION
    LOCATION
    DOCUMENT
    PHONE
    EMAIL
    IP_ADDRESS
    URL
    EVENT
    VEHICLE
    ACCOUNT
    DEVICE
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
    validFrom: DateTime
    validTo: DateTime
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

  type GraphData {
    nodes: [GraphNode!]!
    edges: [GraphEdge!]!
    metadata: GraphMetadata!
  }

  type GraphNode {
    id: ID!
    label: String!
    type: EntityType!
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

  type ChatMessage {
    id: ID!
    investigationId: ID!
    userId: ID
    content: String!
    createdAt: DateTime!
    editedAt: DateTime
  }

  type Comment {
    id: ID!
    investigationId: ID!
    targetId: ID!
    userId: ID
    content: String!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime
    deletedAt: DateTime
  }

  type Provenance {
    id: ID!
    resourceType: String!
    resourceId: String!
    source: String!
    uri: String
    extractor: String
    metadata: JSON
    createdAt: DateTime!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
    expiresIn: Int!
  }

  type SearchResults {
    entities: [Entity!]!
    investigations: [Investigation!]!
    totalCount: Int!
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

  input PositionInput {
    x: Float!
    y: Float!
  }

  input GraphAnalysisInput {
    investigationId: ID!
    algorithms: [String!]!
    includeMetrics: Boolean = true
    includeClusters: Boolean = true
    includeCentrality: Boolean = true
  }

  type Query {
    me: User
    users(page: Int = 1, limit: Int = 10): [User!]!
    user(id: ID!): User
    investigations(page: Int = 1, limit: Int = 10, status: InvestigationStatus, priority: InvestigationPriority): [Investigation!]!
    investigation(id: ID!): Investigation
    myInvestigations: [Investigation!]!
    entities(investigationId: ID, page: Int = 1, limit: Int = 50): [Entity!]!
    entity(id: ID!): Entity
    searchEntities(query: String!, investigationId: ID, limit: Int = 20): [Entity!]!
    graphData(investigationId: ID!): GraphData!
    graphMetrics(investigationId: ID!): GraphMetrics!
    search(query: String!, limit: Int = 20): SearchResults!
    linkPredictions(investigationId: ID!, limit: Int = 10): [LinkPrediction!]!
    anomalyDetection(investigationId: ID!): [AnomalyDetection!]!
    chatMessages(investigationId: ID!, limit: Int = 50): [ChatMessage!]!
    comments(investigationId: ID!, targetId: ID): [Comment!]!
    geointTimeSeries(points: JSON!, intervalMinutes: Int = 60): [JSON!]!
    provenance(resourceType: String!, resourceId: ID!): [Provenance!]!
  }

  type Mutation {
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!
    createInvestigation(input: CreateInvestigationInput!): Investigation!
    updateInvestigation(id: ID!, input: UpdateInvestigationInput!): Investigation!
    deleteInvestigation(id: ID!): Boolean!
    createEntity(input: CreateEntityInput!): Entity!
    updateEntity(id: ID!, input: UpdateEntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    updateEntityPosition(id: ID!, position: PositionInput!): Entity!
    runGraphAnalysis(input: GraphAnalysisInput!): [JSON!]!
    generateLinkPredictions(investigationId: ID!): [LinkPrediction!]!
    detectAnomalies(investigationId: ID!): [AnomalyDetection!]!
    importEntitiesFromText(investigationId: ID!, text: String!): [Entity!]!
    sendChatMessage(investigationId: ID!, content: String!): ChatMessage!
    deleteChatMessage(messageId: ID!): Boolean!
    addComment(investigationId: ID!, targetId: ID!, content: String!, metadata: JSON): Comment!
    updateComment(id: ID!, content: String!, metadata: JSON): Comment!
    deleteComment(id: ID!): Boolean!
    processArtifacts(artifacts: [JSON!]!): [JSON!]!
    enrichEntityFromWikipedia(entityId: ID, title: String!): Entity!
    ingestRSS(feedUrl: String!): Int!
  }

  type Subscription {
    investigationUpdated(investigationId: ID!): Investigation!
    entityAdded(investigationId: ID!): Entity!
    entityUpdated(investigationId: ID!): Entity!
    entityDeleted(investigationId: ID!): ID!
  }
`;

module.exports = { typeDefs };
