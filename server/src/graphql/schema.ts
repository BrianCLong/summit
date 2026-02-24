import { factGovSchema } from './schema.factgov.js';

const mainSchema = `
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
    role: String!
    isActive: Boolean!
    lastLogin: DateTime
    createdAt: DateTime!
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

  type WarRoom {
    id: ID!
    name: String!
    status: String
    createdBy: User!
    createdAt: DateTime!
    participants: [WarRoomParticipant!]!
  }

  type WarRoomParticipant {
    user: User!
    role: String!
    joinedAt: DateTime!
  }

  type Ticket {
    id: ID!
    key: String!
    summary: String!
    status: String!
    link: String
    runs: [JSON!]
    deployments: [JSON!]
  }

  type EvidenceBundle {
    id: ID!
    releaseId: ID!
    service: String!
    createdAt: DateTime!
  }


  type CogSecClaim {
    id: ID!
    text: String!
    evidence: [Evidence!]
    relatedClaims: [CogSecClaim!]
    narratives: [CogSecNarrative!]
    actors: [JSON!]
    channels: [JSON!]
  }

  type CogSecCampaign {
    id: ID!
    name: String!
    narratives: [CogSecNarrative!]
    signals: [CoordinationSignal!]
    actors: [JSON!]
    channels: [JSON!]
    claims: [CogSecClaim!]
    playbooks: [JSON!]
    incident: CogSecIncident
  }

  type CogSecIncident {
    id: ID!
    name: String!
    campaigns: [CogSecCampaign!]
    playbooks: [JSON!]
    leadAnalyst: User
    investigation: Investigation
  }

  type VerificationAppeal {
    id: ID!
    status: String!
    claim: CogSecClaim
    appellant: User
    reviewer: User
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

  type SupportTicket {
    id: ID!
    title: String!
    description: String
    status: String!
    priority: String!
    reporterId: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    comments(limit: Int, offset: Int): [SupportTicketComment!]!
  }

  type SupportTicketComment {
    id: ID!
    authorId: String!
    content: String!
    isInternal: Boolean!
    createdAt: DateTime!
  }

  type SupportTicketConnection {
    data: [SupportTicket!]!
    total: Int!
  }

  type CoordinationSignal {
    id: ID!
    type: String!
  }

  type CogSecNarrative {
    id: ID!
    name: String!
    description: String
  }

  type Evidence {
    id: ID!
    title: String!
    content: String!
  }

  type AudienceSegment {
    id: ID!
    name: String!
    description: String
    size: Int
    resilienceScore: Float
    trustInInstitutions: Float
    polarizationIndex: Float
    fearSensitivity: Float
    identityClusters: [String!]
    narrativeIds: [ID!]
    cognitiveStates: [CognitiveStateSnapshot!]
    targetedByCampaigns: [CogSecCampaign!]
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type CognitiveStateSnapshot {
    id: ID!
    segmentId: ID!
    timestamp: DateTime!
    beliefVector: JSON
    resilienceScore: Float
    emotionalValence: Float
    arousalLevel: Float
  }

  type NarrativeCascade {
    id: ID!
    narrativeId: ID!
    startTime: DateTime!
    originNodeId: ID
    totalHops: Int
    maxDepth: Int
    uniqueActors: Int
    velocity: Float
    viralityScore: Float
    narrative: CogSecNarrative
    originActor: JSON
  }

  type NarrativeConflict {
    competingNarrativeId: ID!
    conflictScore: Float!
    contradictingClaims: [ContradictingClaimPair!]!
    competingNarrative: CogSecNarrative
  }

  type ContradictingClaimPair {
    claim1: CogSecClaim!
    claim2: CogSecClaim!
  }

  enum RiskSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  type TrustScore {
    subjectId: ID!
    score: Float!
    reasons: [String!]!
    updatedAt: DateTime!
  }

  type RiskSignalPage {
    items: [RiskSignal!]!
    total: Int!
    nextOffset: Int
  }

  type TrustScorePage {
    items: [TrustScore!]!
    total: Int!
    nextOffset: Int
  }

  type IncidentBundle {
    id: ID!
    type: String!
    status: String!
    signals: [RiskSignal!]!
    actions: [String!]!
    createdAt: DateTime!
    evidenceId: ID
    notes: String
  }

  type ProvenanceExport {
    format: String!
    content: JSON!
    exportedAt: DateTime!
    tenantId: String!
  }

  input CognitiveExposureInput {
    segmentId: ID!
    narrativeId: ID!
    reactionType: String
    sentimentShift: Float
  }

  type Query {
    healthScore: Float!
    evidenceOk(service: String!, releaseId: String!): JSON!
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
    exportProvenance(tenantId: String!, format: String): JSON!
    riskSignals(limit: Int = 50, offset: Int = 0): [RiskSignal!]!
    riskSignalsPage(tenantId: String!, limit: Int = 50, offset: Int = 0, kind: String, severity: RiskSeverity): RiskSignalPage!
    trustScore(subjectId: ID!): TrustScore
    trustScoresPage(tenantId: String!, limit: Int = 50, offset: Int = 0): TrustScorePage
    evidenceBundles(filter: JSON, limit: Int = 20, offset: Int = 0): [EvidenceBundle!]!
    warRooms(status: String): [WarRoom!]!
    warRoom(id: ID!): WarRoom
    activeCampaigns(limit: Int = 20): [CogSecCampaign!]!
    activeIncidents(limit: Int): [CogSecIncident!]!
    audienceCognitiveProfile(id: ID!): AudienceSegment
    influencePathways(narrativeId: ID!): [NarrativeCascade!]!
    narrativeConflicts(narrativeId: ID!): [NarrativeConflict!]!
    incidentBundle(id: ID!): IncidentBundle
    supportTicket(id: ID!): SupportTicket
    supportTickets(filter: JSON, limit: Int, offset: Int): SupportTicketConnection!
    tickets(provider: String!, externalId: String, limit: Int): [Ticket!]!
    cogSecClaim(id: ID!): CogSecClaim
    cogSecClaims(filter: JSON, limit: Int, offset: Int): [CogSecClaim!]
    searchCogSecClaims(query: String!, limit: Int): [CogSecClaim!]
    similarClaims(claimId: ID!, threshold: Float): [CogSecClaim!]
    cogSecEvidence(id: ID!): Evidence
    cogSecNarrative(id: ID!): CogSecNarrative
    narrativeGraph(narrativeId: ID!): JSON
    cogSecCampaign(id: ID!): CogSecCampaign
    campaignSignals(campaignId: ID!): [CoordinationSignal!]
    cogSecIncident(id: ID!): CogSecIncident
    responsePlaybook(id: ID!): JSON
    cogSecAuditLogs(resourceType: String, resourceId: String, limit: Int): [JSON!]
    pendingAppeals(limit: Int): [VerificationAppeal!]
    governancePolicies: [JSON!]
    transparencyReport(startDate: String!, endDate: String!): JSON
    cogSecMetrics(startDate: String!, endDate: String!): JSON
    benchmarkComparison(startDate: String!, endDate: String!): JSON
    riskAssessment: JSON
    contentCredential(id: ID!): JSON
    cognitiveRiskDashboard(filters: JSON): JSON
    narrativeEarlyWarnings(watchlistId: ID): [JSON!]
    ewBattleSpace: JSON
    ewAnalyzeEMP(lat: Float!, lon: Float!, yieldKt: Float!): JSON
    funnel(period: String!): [JSON!]!
    pilotKpis(workspaceId: String!): JSON
    pilotSuccess(workspaceId: String!): [JSON!]!
    deduplicationCandidates(investigationId: ID, threshold: Float): [JSON!]!
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
    register(input: JSON!): AuthResponse!
    requestPasswordReset(email: String!): JSON!
    resetPassword(input: JSON!): JSON!
    refreshToken(token: String!): AuthResponse!
    logout: JSON!
    changePassword(currentPassword: String!, newPassword: String!): JSON!
    revokeToken(token: String!): JSON!
    createInvestigation(input: InvestigationInput!): Investigation!
    updateInvestigation(id: ID!, input: InvestigationInput!): Investigation!
    deleteInvestigation(id: ID!): Boolean!
    createInvestigationSnapshot(investigationId: ID!, label: String): InvestigationSnapshot!
    publishEvidence(input: JSON!): EvidenceBundle!
    recordCognitiveEffect(exposure: CognitiveExposureInput!): CognitiveStateSnapshot!
    createEntity(input: JSON!): Entity!
    updateEntity(id: ID!, input: JSON!, lastSeenTimestamp: String): Entity!
    deleteEntity(id: ID!): Boolean!
    linkEntities(text: String!): [JSON!]!
    extractRelationships(text: String!, entities: [JSON!]!): [JSON!]!
    createRelationship(input: JSON!): Relationship!
    updateRelationship(id: ID!, input: JSON!, lastSeenTimestamp: String): Relationship!
    deleteRelationship(id: ID!): Boolean!
    createUser(input: JSON!): User!
    updateUser(id: ID!, input: JSON!): User!
    deleteUser(id: ID!): Boolean!
    updateUserPreferences(userId: ID!, preferences: JSON!): User!
    extractClaim(input: JSON!): CogSecClaim!
    updateClaimVerdict(input: JSON!): CogSecClaim!
    linkRelatedClaims(claimId1: ID!, claimId2: ID!, relationType: String!): Boolean!
    createEvidence(input: JSON!): Evidence!
    verifyEvidence(evidenceId: ID!, notes: String): Evidence!
    linkEvidenceToClaims(evidenceId: ID!, claimIds: [ID!]!): Boolean!
    createNarrative(input: JSON!): CogSecNarrative!
    updateNarrativeStatus(narrativeId: ID!, status: String!): CogSecNarrative!
    linkClaimsToNarrative(claimIds: [ID!]!, narrativeId: ID!): Boolean!
    runDetectionPipeline: [CoordinationSignal!]!
    clusterIntoCampaigns: [CogSecCampaign!]!
    updateCampaignStatus(campaignId: ID!, status: String!): CogSecCampaign!
    createIncident(input: JSON!): CogSecIncident!
    updateIncidentStatus(incidentId: ID!, status: String!): CogSecIncident!
    addIncidentTimelineEvent(incidentId: ID!, type: String!, description: String!): JSON
    generatePlaybook(input: JSON!): JSON
    executePlaybookAction(playbookId: ID!, actionId: ID!): JSON
    updatePlaybookStatus(playbookId: ID!, status: String!): JSON
    generateBriefing(campaignId: ID!): JSON
    generateStakeholderMessage(campaignId: ID!, stakeholder: String!): JSON
    generateTakedownPacket(input: JSON!): JSON
    createAppeal(input: JSON!): VerificationAppeal!
    reviewAppeal(appealId: ID!, decision: String!, notes: String!): VerificationAppeal!
    createContentCredential(assetId: ID!, mimeType: String!, sourceUrl: String): JSON
    addProvenanceLink(credentialId: ID!, source: String!, platform: String): JSON
    raiseRiskSignal(input: JSON!): RiskSignal!
    updateRiskSignalStatus(id: ID!, status: String!): RiskSignal!
    createIncidentBundle(input: JSON!): IncidentBundle!
    linkTrustScoreEvidence(tenantId: String!, subjectId: ID!, evidenceId: ID!): TrustScore!
    createWarRoom(name: String!): WarRoom!
    addParticipant(warRoomId: ID!, userId: ID!, role: String!): WarRoom!
    removeParticipant(warRoomId: ID!, userId: ID!): WarRoom!
    createSupportTicket(input: JSON!): SupportTicket!
    updateSupportTicket(id: ID!, input: JSON!): SupportTicket!
    deleteSupportTicket(id: ID!): Boolean!
    addSupportTicketComment(ticketId: ID!, content: String!, isInternal: Boolean): JSON
    ewRegisterAsset(id: ID!, name: String!, type: String!, lat: Float!, lon: Float!, capabilities: [JSON], maxPower: Float, minFreq: Float, maxFreq: Float): JSON
    ewDeployJammer(assetId: ID!, targetFrequency: Float!, bandwidth: Float!, effect: JSON, durationSeconds: Int): JSON
    ewStopJammer(missionId: ID!): Boolean!
    ewSimulateSignalDetection(frequency: Float!, bandwidth: Float!, power: Float!, modulation: String!, type: JSON, lat: Float, lon: Float): JSON
    ewTriangulateSignal(signalId: ID!): JSON
    ewActivateProtection(assetId: ID!, measure: JSON): Boolean!
    submitNps(score: Int!, comment: String): Boolean!
    recordEvent(name: String!, props: JSON): Boolean!
    startTrial(plan: String!, days: Int!): Boolean!
    upgradePlan(plan: String!): Boolean!
    runWarGameSimulation(input: JSON!): JSON
    updateCrisisScenario(id: ID!, input: JSON!): JSON
    deleteCrisisScenario(id: ID!): Boolean!
  }

  type Subscription {
    participantAdded: JSON!
    participantRemoved: JSON!
    campaignDetected: JSON!
    coordinationSignalDetected: JSON!
    incidentUpdated(incidentId: ID!): JSON!
    claimVerdictUpdated(narrativeId: ID): JSON!
    playbookActionCompleted(playbookId: ID!): JSON!
  }
`;

export const typeDefs = [mainSchema, factGovSchema];
