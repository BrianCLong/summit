export const typeDefs = `
  scalar JSON
  scalar DateTime
  type Entity { id: ID!, type: String!, props: JSON, createdAt: DateTime!, updatedAt: DateTime, canonicalId: ID }
  type Relationship { id: ID!, from: ID!, to: ID!, type: String!, props: JSON, createdAt: DateTime! }
  type GeneratedEntitiesResult {
    entities: [Entity!]!
    relationships: [Relationship!]!
  }

  type AISuggestionExplanation {
    score: Float!
    factors: [String!]!
    featureImportances: JSON
  }

  type AIRecommendation {
    from: ID!
    to: ID!
    score: Float!
    explanation: AISuggestionExplanation
  }

  type User {
    id: ID!
    email: String!
    username: String
    firstName: String
    lastName: String
    fullName: String
    role: String
    isActive: Boolean
    lastLogin: DateTime
    preferences: JSON
    createdAt: DateTime!
    updatedAt: DateTime
  }

  input UserInput {
    email: String!
    username: String
  }

  directive @scope(requires: [String]) on FIELD_DEFINITION

  type AuthResponse {
    success: Boolean!
    message: String
    user: AuthUser
    token: String
    refreshToken: String
    expiresIn: Int
  }

  type AuthUser {
    id: ID!
    email: String!
    username: String
    firstName: String
    lastName: String
    fullName: String
    role: String
    isActive: Boolean
    lastLogin: DateTime
    createdAt: DateTime
    updatedAt: DateTime
  }

  type RefreshTokenResponse {
    success: Boolean!
    token: String
    refreshToken: String
  }

  type AuthResult {
    success: Boolean!
    message: String
  }

  type TokenVerification {
    valid: Boolean!
    user: AuthUser
  }

  type ResetTokenVerification {
    valid: Boolean!
  }

  type Investigation {
    id: ID!
    name: String!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime
    entities: [Entity!]
    relationships: [Relationship!]
    status: InvestigationStatus
    priority: Int
  }

  type InvestigationSnapshot {
    id: ID!
    investigationId: ID!
    data: JSON!
    snapshotLabel: String
    createdAt: DateTime!
    createdBy: String!
  }

  input InvestigationInput {
    name: String!
    description: String
  }

  enum InvestigationStatus {
    ACTIVE
    ARCHIVED
    COMPLETED
    ON_HOLD
  }

  type AuditLog {
    id: ID!
    userId: String!
    action: String!
    resourceType: String!
    resourceId: String
    details: JSON
    investigationId: String
    createdAt: DateTime!
  }

  input AuditFilter {
    userId: String
    entityType: String
    from: DateTime
    to: DateTime
  }

  type RiskSignal {
    id: ID!
    tenantId: String!
    kind: String!
    severity: String!
    message: String!
    source: String!
    createdAt: DateTime!
    context: JSON
  }

  type EvidenceOk {
    ok: Boolean!
    reasons: [String!]!
  }

  type EvidenceBundle {
    id: ID!
    releaseId: ID!
    service: String!
    createdAt: DateTime!
  }

  type WarRoom {
    id: ID!
    name: String!
    status: String!
  }

  type WarRoomParticipant {
    id: ID!
    role: String!
  }

  type CogSecClaim {
    id: ID!
    text: String!
  }

  type CogSecCampaign {
    id: ID!
    name: String!
  }

  type CogSecIncident {
    id: ID!
    name: String!
  }

  type VerificationAppeal {
    id: ID!
    status: String!
  }

  type ResponseAction {
    id: ID!
    title: String!
  }

  type ResponseArtifact {
    id: ID!
    title: String!
  }

  type VerifiedBriefing {
    id: ID!
    title: String!
  }

  type TakedownPacket {
    id: ID!
    title: String!
  }

  type CoordinationSignal {
    id: ID!
    type: String!
  }

  type ProvenanceExport {
    format: String!
    content: JSON!
    exportedAt: DateTime!
    tenantId: String!
  }

  type Query {
    healthScore: Int!
    evidenceOk(service: String, releaseId: String): EvidenceOk!
    me: AuthUser
    verifyToken(token: String!): TokenVerification!
    verifyResetToken(token: String!): ResetTokenVerification!
    entity(id: ID!): Entity
    entities(type: String, q: String, limit: Int = 25, offset: Int = 0): [Entity!]!
    user(id: ID!): User
    users(limit: Int = 25, offset: Int = 0): [User!]!
    investigation(id: ID!): Investigation
    investigations(limit: Int = 25, offset: Int = 0): [Investigation!]!
    investigationSnapshots(investigationId: ID!): [InvestigationSnapshot!]!
    investigationSnapshot(id: ID!): InvestigationSnapshot
    semanticSearch(query: String!, filters: JSON, limit: Int = 10, offset: Int = 0): [Entity!]!
    auditTrace(investigationId: ID!, filter: JSON): [JSON!]!
    exportProvenance(tenantId: String!, format: String): ProvenanceExport!
    riskSignals(limit: Int = 50, offset: Int = 0): [RiskSignal!]!
    trustScore(subjectId: ID!): JSON
    trustScoresPage(tenantId: String!, limit: Int, offset: Int): JSON
    evidenceBundles(limit: Int = 20): [EvidenceBundle!]!
    warRooms(status: String): [WarRoom!]!
    activeCampaigns(limit: Int): [CogSecCampaign!]!
    activeIncidents(limit: Int): [CogSecIncident!]!
    getCrisisTelemetry(scenarioId: ID!): JSON
    getAdversaryIntentEstimates(scenarioId: ID!): JSON
    getNarrativeHeatmapData(scenarioId: ID!): JSON
    getStrategicResponsePlaybooks(scenarioId: ID!): JSON
    getCrisisScenario(id: ID!): JSON
    getAllCrisisScenarios: [JSON]
    health: JSON
  }

  type Mutation {
    login(input: JSON!): AuthResponse!
    createInvestigation(input: InvestigationInput!): Investigation!
    publishEvidence(input: JSON!): EvidenceBundle!
    runWarGameSimulation(input: JSON!): JSON
    updateCrisisScenario(id: ID!, input: JSON!): JSON
    deleteCrisisScenario(id: ID!): Boolean!
  }

  type Subscription {
    entityCreated: Entity!
    participantAdded: JSON!
    participantRemoved: JSON!
  }
`;