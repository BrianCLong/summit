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

# Authentication Types
"""
Input for user registration
"""
input RegisterInput {
  email: String!
  password: String!
  username: String
  firstName: String!
  lastName: String!
}

input LoginInput {
  email: String!
  password: String!
}

"""
Authentication response with user and tokens
"""
type AuthResponse {
  success: Boolean!
  message: String
  user: AuthUser
  token: String
  refreshToken: String
  expiresIn: Int
}

"""
User data returned in auth responses
"""
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

"""
Token refresh response
"""
type RefreshTokenResponse {
  success: Boolean!
  token: String
  refreshToken: String
}

"""
Simple success/message response
"""
type AuthResult {
  success: Boolean!
  message: String
}

"""
Token verification result
"""
type TokenVerification {
  valid: Boolean!
  user: AuthUser
}

"""
Reset token verification result
"""
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

type LinkedEntity {
  text: String!
  label: String!
  startChar: Int!
  endChar: Int!
  entityId: ID # ID of the linked entity in the graph
}

input LinkedEntityInput {
  text: String!
  label: String!
  startChar: Int!
  endChar: Int!
  entityId: ID # ID of the linked entity in the graph
}

type ExtractedRelationship {
  sourceEntityId: ID!
  targetEntityId: ID!
  type: String!
  confidence: Float!
  textSpan: String!
}

# AI Analysis Schema
# Comprehensive AI-powered analysis capabilities for entity extraction,
# relationship detection, and intelligent insights generation

type ExtractedEntity {
  id: ID!
  text: String!
  type: String!
  confidence: Float!
  position: EntityPosition!
}

type EntityPosition {
  start: Int!
  end: Int!
}

type ExtractedAIRelationship {
  id: ID!
  source: String!
  target: String!
  type: String!
  confidence: Float!
}

type EntityExtractionResult {
  entities: [ExtractedEntity!]!
  relationships: [ExtractedAIRelationship!]!
}

type AnalyzedRelationship {
  id: ID!
  source: String!
  target: String!
  type: String!
  confidence: Float!
  context: String
  metadata: JSON
}

type SuggestedRelationship {
  type: String!
  reason: String!
  confidence: Float!
}

type RiskFactor {
  factor: String!
  severity: String!
  description: String!
}

type EntityInsights {
  entityId: ID!
  insights: [String!]!
  suggestedRelationships: [SuggestedRelationship!]!
  riskFactors: [RiskFactor!]!
  generatedAt: String!
}

type SentimentAnalysis {
  sentiment: String!
  confidence: Float!
  keywords: [String!]!
  metadata: JSON
}

type DataQualityInsight {
  id: ID!
  type: String!
  severity: String!
  message: String!
  suggestions: [String!]!
  affectedEntities: [ID!]!
}

type DataQualityReport {
  graphId: ID!
  overallScore: Float!
  insights: [DataQualityInsight!]!
  recommendations: [String!]!
  generatedAt: String!
}

type AppliedSuggestion {
  suggestionId: ID!
  applied: Boolean!
  message: String!
  changes: [String!]!
}

type AISuggestionResult {
  graphId: ID!
  appliedSuggestions: [AppliedSuggestion!]!
  totalChanges: Int!
  appliedAt: String!
}

type EntityEnhancements {
  properties: [String!]!
  relationships: [String!]!
  insights: [String!]!
}

type EntityEnhancementResult {
  entityId: ID!
  enhancements: EntityEnhancements!
  confidence: Float!
  enhancedAt: String!
}

type AIEnhancementResult {
  enhancements: [EntityEnhancementResult!]!
  totalEntitiesEnhanced: Int!
  totalEnhancementsApplied: Int!
}

# GraphRAG Types
"""
Input for GraphRAG queries with explainable output
"""
input GraphRAGQueryInput {
  """Investigation to query within"""
  investigationId: ID!

  """Natural language question"""
  question: String!

  """Optional entity IDs to focus the search around"""
  focusEntityIds: [ID!]

  """Maximum hops for graph traversal (1-3, default: 2)"""
  maxHops: Int

  """LLM temperature for response generation (0-1, default: 0)"""
  temperature: Float

  """Maximum tokens for LLM response (100-2000, default: 1000)"""
  maxTokens: Int

  """Use case identifier for prompt/response schemas"""
  useCase: String

  """Path ranking strategy (v1 or v2)"""
  rankingStrategy: String
}

"""
GraphRAG response with explainable reasoning
"""
type GraphRAGResponse {
  """Generated answer based on graph context"""
  answer: String!

  """Confidence score 0-1 based on context completeness"""
  confidence: Float!

  """Entity citations that support the answer"""
  citations: Citations!

  """Relationship paths that explain the reasoning"""
  why_paths: [WhyPath!]!
}

"""
Entity citations supporting the answer
"""
type Citations {
  """Entity IDs that were referenced in generating the answer"""
  entityIds: [ID!]!
}

"""
Explainable reasoning path through relationships
"""
type WhyPath {
  """Source entity ID"""
  from: ID!

  """Target entity ID"""
  to: ID!

  """Relationship ID connecting from -> to"""
  relId: ID!

  """Relationship type"""
  type: String!

  """Support score for this path (0-1, optional)"""
  supportScore: Float
  """Breakdown of scoring factors"""
  score_breakdown: ScoreBreakdown
}

type ScoreBreakdown {
  """Contribution from path length"""
  length: Float!
  """Contribution from edge type"""
  edgeType: Float!
  """Contribution from node centrality"""
  centrality: Float!
}

"""
Similar entity result with similarity score
"""
type SimilarEntity {
  """The similar entity"""
  entity: Entity!

  """Similarity score 0-1"""
  similarity: Float!
}

"""
Cache operation result
"""
type CacheOperationResult {
  """Whether the operation succeeded"""
  success: Boolean!

  """Human readable message"""
  message: String!
}

# Geospatial Types

type GeoPoint {
  lat: Float!
  lon: Float!
}

type GeoObject {
  type: String
  confidence: Float
  location: GeoPoint
}

type SatelliteAnalysisResult {
  classification: String
  objectsDetected: [GeoObject]
  cloudCover: Float
  timestamp: String
}

type ChangeDetectionArea {
  type: String
  confidence: Float
  bounds: GeoPoint
}

type ChangeDetectionResult {
  changeDetected: Boolean
  percentageChange: Float
  areas: [ChangeDetectionArea]
}

type MovementAnalysisSegment {
  fromIndex: Int
  toIndex: Int
  distanceMeters: Float
  speedMps: Float
  bearingDegrees: Float
}

type MovementAnalysisResult {
  totalDistanceMeters: Float
  maxSpeedMps: Float
  avgSpeedMps: Float
  pattern: String
  segments: [MovementAnalysisSegment]
}

type ElevationPoint {
  distance: Float
  elevation: Float
  lat: Float
  lon: Float
}

type CoordinateTransformResult {
  lat: Float
  lon: Float
  x: Float
  y: Float
}

input TrackPointInput {
  lat: Float!
  lon: Float!
  timestamp: String
}

input GeoPointInput {
  lat: Float!
  lon: Float!
}

# Support Ticket Types
enum SupportTicketStatus {
  open
  in_progress
  waiting
  resolved
  closed
}

enum SupportTicketPriority {
  low
  medium
  high
  critical
}

enum SupportTicketCategory {
  bug
  feature_request
  question
  incident
  other
}

enum RiskSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ClaimVerdict {
  VERIFIED
  REFUTED
  UNVERIFIED
  DISPUTED
  INCONCLUSIVE
}

enum ClaimSource {
  SOCIAL_MEDIA
  NEWS_OUTLET
  OFFICIAL_STATEMENT
  DOCUMENT
  VIDEO
  IMAGE
  AUDIO
  WEBSITE
  MESSAGING_PLATFORM
  OTHER
}

enum EvidenceType {
  DOCUMENT
  VIDEO_FRAME
  IMAGE
  AUDIO_CLIP
  OFFICIAL_STATEMENT
  STRUCTURED_DATA
  GEOLOCATION
  TIMESTAMP
  METADATA
  WITNESS_ACCOUNT
}

enum NarrativeStatus {
  EMERGING
  ACTIVE
  VIRAL
  DECLINING
  DORMANT
  MUTATING
}

enum CampaignThreatLevel {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFORMATIONAL
}

enum CampaignStatus {
  ACTIVE
  SUSPECTED
  CONFIRMED
  MITIGATED
  ARCHIVED
}

enum CoordinationSignalType {
  TEMPORAL_SYNCHRONY
  CROSS_ACCOUNT_REUSE
  PHRASING_FINGERPRINT
  ASSET_REUPLOAD
  NETWORK_ANOMALY
  CONTENT_LAUNDERING
  AMPLIFICATION_BURST
  HASHTAG_HIJACKING
  BOT_NETWORK
}

enum ResponseActionType {
  BRIEFING
  STAKEHOLDER_MESSAGE
  TAKEDOWN_PACKET
  INTERNAL_COMMS
  PRESS_STATEMENT
  ESCALATION
  MONITORING
  DEBUNK
}

enum PlaybookStatus {
  DRAFT
  ACTIVE
  EXECUTING
  COMPLETED
  SUSPENDED
}

enum IncidentStatus {
  OPEN
  INVESTIGATING
  RESPONDING
  MONITORING
  RESOLVED
  CLOSED
}

enum AppealStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  DENIED
  ESCALATED
}

enum WarRoomRole {
  ADMIN
  MODERATOR
  PARTICIPANT
}

enum EvidenceOkStatus {
  VERIFIED
  UNKNOWN
  FAILED
}

# Trust & Risk Types
type TrustScore {
  subjectId: ID!
  score: Float!
  reasons: [String!]!
  updatedAt: DateTime!
}

type RiskSignal {
  id: ID!
  tenantId: String!
  kind: String!
  severity: RiskSeverity!
  message: String!
  source: String!
  createdAt: DateTime!
  context: JSON
}

type RiskSignalPage {
  items: [RiskSignal!]!
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

type TrustScorePage {
  items: [TrustScore!]!
  total: Int!
  nextOffset: Int
}

# Evidence & Provenance Types
type SLOSnapshot {
  service: String!
  p95Ms: Int!
  p99Ms: Int
  errorRate: Float!
  window: String!
}

type CostSnapshot {
  graphqlPerMillionUsd: Float
  ingestPerThousandUsd: Float
}

type EvidenceOk {
  ok: Boolean!
  reasons: [String!]!
  snapshot: SLOSnapshot
  cost: CostSnapshot
}

type ArtifactRef {
  type: String!
  sha256: String!
}

type EvidenceBundle {
  id: ID!
  releaseId: ID!
  service: String!
  artifacts: [ArtifactRef!]!
  slo: SLOSnapshot!
  cost: JSON
  createdAt: DateTime!
}

# Electronic Warfare Types
type GeoLocation {
  lat: Float!
  lon: Float!
  alt: Float
}

type EWAsset {
  id: ID!
  name: String!
  type: String!
  location: GeoLocation!
  capabilities: [String!]!
  maxPower: Float!
  frequencyRange: [Float!]!
  status: String!
  activeProtection: [String!]!
}

type SpectrumSignal {
  id: ID!
  frequency: Float!
  bandwidth: Float!
  power: Float!
  modulation: String!
  type: String!
  sourceId: ID
  location: GeoLocation
  timestamp: String!
  signature: String
  content: String
}

type JammingMission {
  id: ID!
  assetId: ID!
  targetFrequency: Float!
  bandwidth: Float!
  effect: String!
  startTime: String!
  durationSeconds: Float!
  powerOutput: Float!
  status: String!
  effectiveness: Float
}

type InterceptReport {
  id: ID!
  signalId: ID!
  interceptTime: String!
  analyzedType: String!
  confidence: Float!
  content: String
}

type DirectionFindingResult {
  signalId: ID!
  estimatedLocation: GeoLocation!
  errorRadius: Float!
  triangulationPoints: Int!
  timestamp: String!
}

type BattleSpaceView {
  timestamp: String!
  assets: [EWAsset!]!
  signals: [SpectrumSignal!]!
  activeJammers: [JammingMission!]!
  intercepts: [InterceptReport!]!
  spectrumUtilization: Float!
}

type EMPAnalysisReport {
  event: String!
  origin: GeoLocation!
  yieldKt: Float!
  estimatedRadiusKm: Float!
  assetsAtRisk: [ID!]!
  timestamp: String!
}

# Deduplication Types
type DuplicateEntity {
  id: ID!
  label: String!
  description: String
}

type SimilarityScores {
  semantic: Float!
  topology: Float!
  provenance: Float!
}

type DeduplicationCandidate {
  entityA: DuplicateEntity!
  entityB: DuplicateEntity!
  similarity: Float!
  scores: SimilarityScores!
  reasons: [String!]!
}

# Collaboration Types
type WarRoom {
  id: ID!
  name: String!
  createdBy: User
  createdAt: String!
  status: String!
  participants: [WarRoomParticipant!]
}

type WarRoomParticipant {
  id: ID!
  user: User!
  role: String!
  joinedAt: String!
}

# Wargaming Types
type CrisisScenario {
  id: ID!
  crisisType: String!
  targetAudiences: [String!]!
  keyNarratives: [String!]!
  adversaryProfiles: [String!]!
  simulationParameters: JSON
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CrisisScenarioInput {
  crisisType: String!
  simulationParameters: JSON!
}

type SocialMediaTelemetry {
  id: ID!
  scenarioId: ID!
  platform: String!
  postId: String!
  content: String!
  author: String
  timestamp: DateTime!
  sentiment: Float
  viralityScore: Float
  volume: Int
  narrativeDetected: String
}

type AdversaryIntentEstimate {
  id: ID!
  scenarioId: ID!
  adversaryProfile: String!
  estimatedIntent: String!
  likelihood: Float!
  reasoning: String!
  timestamp: DateTime!
}

type NarrativeHeatmapData {
  id: ID!
  scenarioId: ID!
  narrative: String!
  intensity: Float!
  location: JSON
  timestamp: DateTime!
}

type StrategicResponsePlaybook {
  id: ID!
  scenarioId: ID!
  name: String!
  doctrineReference: String!
  description: String!
  steps: [String!]!
  metricsOfEffectiveness: [String!]!
  metricsOfPerformance: [String!]!
}

# Sprint 28 Types
type NpsResponse {
  id: ID!
  score: Int!
  comment: String
  ts: String!
  workspaceId: ID!
}

type FunnelPoint {
  name: String!
  value: Int!
  period: String!
}

type PilotKPI {
  ttfwMin: Int!
  dau: Int!
  queries: Int!
  cases: Int!
  exports: Int!
  nps: Float!
}

type SuccessCard {
  label: String!
  value: String!
  status: String!
  hint: String
}

# Ingestion Types
type IngestionResult {
  tenantId: String!
  ids: [String!]!
  status: String!
}

# Cognitive Security Types
type C2PAManifest {
  manifestId: ID!
  specVersion: String!
  claimGenerator: String!
  signedAt: DateTime!
  certificateChain: [C2PACertificate!]!
  actions: [C2PAAction!]!
  assertions: [C2PAAssertion!]!
  parentManifests: [String!]
  verificationStatus: C2PAVerificationStatus!
}

type C2PACertificate {
  issuer: String!
  subject: String!
  serialNumber: String!
  validFrom: DateTime!
  validTo: DateTime!
  isTrustedRoot: Boolean!
}

type C2PAAction {
  actionType: String!
  softwareAgent: String
  when: DateTime
  parameters: JSON
}

type C2PAAssertion {
  assertionType: String!
  label: String!
  data: JSON!
  hash: String!
}

type C2PAVerificationStatus {
  valid: Boolean!
  signatureVerified: Boolean!
  certificateChainValid: Boolean!
  contentIntegrityValid: Boolean!
  timestampValid: Boolean!
  errors: [String!]!
  warnings: [String!]!
}

type ContentCredential {
  id: ID!
  assetId: String!
  assetHash: String!
  mimeType: String!
  hasC2PA: Boolean!
  c2paManifest: C2PAManifest
  provenanceConfidence: Float!
  createdAt: DateTime!
  lastVerifiedAt: DateTime
  provenanceChain: [ProvenanceLink!]!
}

type ProvenanceLink {
  id: ID!
  source: String!
  observedAt: DateTime!
  platform: String
  observer: String!
  confidence: Float!
  metadata: JSON
}

type CogSecClaim {
  id: ID!
  canonicalText: String!
  originalText: String
  language: String!
  sourceType: ClaimSource!
  sourceUrl: String
  firstObservedAt: DateTime!
  lastObservedAt: DateTime!
  verdict: ClaimVerdict!
  verdictConfidence: Float!
  evidenceIds: [ID!]!
  relatedClaimIds: [ID!]!
  narrativeIds: [ID!]!
  actorIds: [ID!]!
  channelIds: [ID!]!
  entities: [ClaimEntity!]!
  metadata: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
  evidence: [CogSecEvidence!]!
  relatedClaims: [CogSecClaim!]!
  narratives: [CogSecNarrative!]!
  actors: [CogSecActor!]!
  channels: [CogSecChannel!]!
}

type ClaimEntity {
  text: String!
  type: String!
  startOffset: Int!
  endOffset: Int!
  linkedEntityId: ID
  confidence: Float!
}

type CogSecEvidence {
  id: ID!
  type: EvidenceType!
  title: String!
  content: String!
  sourceUrl: String
  sourceCredibility: Float!
  contentCredentialId: ID
  claimIds: [ID!]!
  supportsVerdict: ClaimVerdict!
  verified: Boolean!
  verifiedBy: ID
  verifiedAt: DateTime
  verificationNotes: String
  capturedAt: DateTime!
  createdAt: DateTime!
  metadata: JSON!
  contentCredential: ContentCredential
  claims: [CogSecClaim!]!
}

type CogSecNarrative {
  id: ID!
  name: String!
  description: String!
  summary: String!
  status: NarrativeStatus!
  firstDetectedAt: DateTime!
  peakAt: DateTime
  claimIds: [ID!]!
  parentNarrativeId: ID
  childNarrativeIds: [ID!]!
  actorIds: [ID!]!
  channelIds: [ID!]!
  audienceIds: [ID!]!
  keywords: [String!]!
  velocity: NarrativeVelocity!
  createdAt: DateTime!
  updatedAt: DateTime!
  claims: [CogSecClaim!]!
  parentNarrative: CogSecNarrative
  childNarratives: [CogSecNarrative!]!
  actors: [CogSecActor!]!
  channels: [CogSecChannel!]!
}

type NarrativeVelocity {
  spreadRate: Float!
  acceleration: Float!
  estimatedReach: Int!
  platformCount: Int!
  languageCount: Int!
  regions: [String!]!
}

type CogSecActor {
  id: ID!
  name: String!
  type: String!
  accounts: [ActorAccount!]!
  credibilityScore: Float!
  influenceScore: Float!
  coordinationScore: Float!
  claimIds: [ID!]!
  narrativeIds: [ID!]!
  affiliations: [String!]!
  firstActivityAt: DateTime!
  lastActivityAt: DateTime!
  createdAt: DateTime!
  metadata: JSON!
  claims: [CogSecClaim!]!
  narratives: [CogSecNarrative!]!
}

type ActorAccount {
  platform: String!
  platformAccountId: String!
  username: String!
  profileUrl: String
  followerCount: Int
  accountCreatedAt: DateTime
  isVerified: Boolean!
  lastObservedAt: DateTime!
}

type CogSecChannel {
  id: ID!
  name: String!
  platform: String!
  type: String!
  url: String
  audienceSize: Int
  credibilityScore: Float!
  claimIds: [ID!]!
  narrativeIds: [ID!]!
  actorIds: [ID!]!
  isLaunderingNode: Boolean!
  createdAt: DateTime!
  metadata: JSON!
}

type CoordinationSignal {
  id: ID!
  type: CoordinationSignalType!
  detectedAt: DateTime!
  confidence: Float!
  description: String!
  actorIds: [ID!]!
  claimIds: [ID!]!
  channelIds: [ID!]!
  evidence: CoordinationEvidence!
  campaignId: ID
}

type CoordinationEvidence {
  temporalPattern: TemporalPattern
  contentFingerprint: ContentFingerprint
  networkAnomaly: NetworkAnomaly
  launderingPath: LaunderingPath
}

type TemporalPattern {
  timestamps: [DateTime!]!
  synchronyScore: Float!
  avgDelayMs: Float!
}

type ContentFingerprint {
  contentHash: String!
  similarityScores: [Float!]!
  ngramOverlap: Float!
}

type NetworkAnomaly {
  clusteringCoefficient: Float!
  betweennessCentrality: Float!
  anomalyScore: Float!
}

type LaunderingPath {
  channelPath: [ID!]!
  timeToMainstream: Int!
}

type CogSecCampaign {
  id: ID!
  name: String!
  description: String!
  threatLevel: CampaignThreatLevel!
  status: CampaignStatus!
  firstDetectedAt: DateTime!
  lastActivityAt: DateTime!
  narrativeIds: [ID!]!
  actorIds: [ID!]!
  channelIds: [ID!]!
  coordinationSignalIds: [ID!]!
  claimIds: [ID!]!
  targetAudienceIds: [ID!]!
  ttps: [String!]!
  attributionConfidence: Float!
  suspectedOrigin: String
  responsePlaybookIds: [ID!]!
  incidentId: ID
  createdAt: DateTime!
  updatedAt: DateTime!
  metrics: CampaignMetrics!
  narratives: [CogSecNarrative!]!
  actors: [CogSecActor!]!
  channels: [CogSecChannel!]!
  signals: [CoordinationSignal!]!
  claims: [CogSecClaim!]!
  playbooks: [ResponsePlaybook!]!
  incident: CogSecIncident
}

type CampaignMetrics {
  totalClaims: Int!
  totalActors: Int!
  totalChannels: Int!
  estimatedReach: Int!
  platformSpread: Int!
  languageCount: Int!
  coordinationScore: Float!
  velocity: Float!
  engagementRate: Float!
}

type ResponsePlaybook {
  id: ID!
  name: String!
  description: String!
  status: PlaybookStatus!
  campaignId: ID!
  incidentId: ID
  assigneeId: ID
  actions: [ResponseAction!]!
  priority: Int!
  dueAt: DateTime
  createdBy: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
  campaign: CogSecCampaign!
  incident: CogSecIncident
  assignee: User
}

type ResponseAction {
  id: ID!
  type: ResponseActionType!
  title: String!
  description: String!
  status: String!
  artifact: ResponseArtifact
  assigneeId: ID
  completedAt: DateTime
  completedBy: ID
  notes: String
}

type ResponseArtifact {
  id: ID!
  type: ResponseActionType!
  title: String!
  content: String!
  targetAudience: String!
  citations: [ArtifactCitation!]!
  confidenceScore: Float!
  generatedBy: ID!
  generatedAt: DateTime!
  approvedBy: ID
  approvedAt: DateTime
  exportFormats: [String!]!
}

type ArtifactCitation {
  id: ID!
  referenceText: String!
  sourceType: String!
  sourceId: ID
  externalUrl: String
  confidence: Float!
}

type VerifiedBriefing {
  id: ID!
  type: ResponseActionType!
  title: String!
  content: String!
  targetAudience: String!
  citations: [ArtifactCitation!]!
  confidenceScore: Float!
  generatedBy: ID!
  generatedAt: DateTime!
  exportFormats: [String!]!
  executiveSummary: String!
  keyFindings: [String!]!
  claimVerdicts: [ClaimVerdictSummary!]!
  recommendedActions: [String!]!
  riskAssessment: RiskAssessment!
}

type ClaimVerdictSummary {
  claimId: ID!
  claimText: String!
  verdict: ClaimVerdict!
  confidence: Float!
}

type RiskAssessment {
  level: CampaignThreatLevel!
  factors: [String!]!
  mitigations: [String!]!
}

type TakedownPacket {
  id: ID!
  type: ResponseActionType!
  title: String!
  content: String!
  targetAudience: String!
  citations: [ArtifactCitation!]!
  confidenceScore: Float!
  generatedBy: ID!
  generatedAt: DateTime!
  exportFormats: [String!]!
  platform: String!
  violationType: String!
  urls: [String!]!
  accountIds: [String!]!
  evidenceBundleId: ID!
  legalBasis: String
  contactInfo: String
}

type CogSecIncident {
  id: ID!
  name: String!
  description: String!
  status: IncidentStatus!
  severity: Int!
  campaignIds: [ID!]!
  playbookIds: [ID!]!
  leadAnalystId: ID
  teamMemberIds: [ID!]!
  investigationId: ID
  timeline: [IncidentTimelineEvent!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  resolvedAt: DateTime
  campaigns: [CogSecCampaign!]!
  playbooks: [ResponsePlaybook!]!
  leadAnalyst: User
  investigation: Investigation
}

type IncidentTimelineEvent {
  id: ID!
  type: String!
  description: String!
  actorId: ID
  timestamp: DateTime!
  relatedEntityIds: [ID!]
}

type CogSecAuditLog {
  id: ID!
  action: String!
  resourceType: String!
  resourceId: ID!
  userId: ID!
  tenantId: ID
  previousState: JSON
  newState: JSON
  justification: String
  timestamp: DateTime!
  ipAddress: String
  userAgent: String
}

type VerificationAppeal {
  id: ID!
  claimId: ID!
  currentVerdict: ClaimVerdict!
  requestedVerdict: ClaimVerdict!
  appellantId: ID!
  reason: String!
  supportingEvidence: [String!]!
  status: AppealStatus!
  reviewerId: ID
  reviewNotes: String
  resolution: String
  createdAt: DateTime!
  resolvedAt: DateTime
  claim: CogSecClaim!
  appellant: User!
  reviewer: User
}

type GovernancePolicy {
  id: ID!
  name: String!
  description: String!
  type: String!
  rules: JSON!
  isActive: Boolean!
  version: Int!
  createdBy: ID!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type TransparencyReport {
  period: DateRange!
  claims: ClaimStats!
  appeals: AppealStats!
  actions: ActionStats!
  policies: PolicyStats!
}

type DateRange {
  start: DateTime!
  end: DateTime!
}

type ClaimStats {
  total: Int!
  verified: Int!
  refuted: Int!
  disputed: Int!
  unverified: Int!
}

type AppealStats {
  total: Int!
  approved: Int!
  denied: Int!
  pending: Int!
}

type ActionStats {
  takedownsRequested: Int!
  takedownsExecuted: Int!
  briefingsGenerated: Int!
}

type PolicyStats {
  version: Int!
  lastUpdated: DateTime!
}

type CogSecMetrics {
  id: ID!
  periodStart: DateTime!
  periodEnd: DateTime!
  detection: DetectionMetrics!
  verification: VerificationMetrics!
  response: ResponseMetrics!
  operatorEfficiency: OperatorMetrics!
  generatedAt: DateTime!
}

type DetectionMetrics {
  timeToDetectP50: Float!
  timeToDetectP95: Float!
  campaignsDetected: Int!
  signalsDetected: Int!
  falsePositiveRate: Float!
}

type VerificationMetrics {
  claimPrecision: Float!
  claimRecall: Float!
  citationCorrectness: Float!
  falseAttributionRate: Float!
  avgVerificationTimeMs: Float!
  claimsVerified: Int!
}

type ResponseMetrics {
  narrativeContainmentRate: Float!
  avgGrowthRateReduction: Float!
  crossChannelSpreadReduction: Float!
  playbooksExecuted: Int!
  takedownsSubmitted: Int!
  takedownSuccessRate: Float!
}

type OperatorMetrics {
  minutesPerIncident: Float!
  claimsPerAnalystHour: Float!
  playbooksPerIncident: Float!
  avgResolutionTimeMs: Float!
}

type BenchmarkComparison {
  detection: JSON!
  verification: JSON!
  response: JSON!
  operator: JSON!
  overallScore: Float!
}

type RiskAssessmentReport {
  governanceRisks: [String!]!
  mapRisks: [String!]!
  measureRisks: [String!]!
  manageRisks: [String!]!
  overallRiskLevel: String!
}

  type NarrativeGraph {
  narrative: CogSecNarrative!
  claims: [CogSecClaim!]!
  evidence: [CogSecEvidence!]!
  actors: [CogSecActor!]!
  channels: [CogSecChannel!]!
}

# Copilot Types
enum CopilotRunStatus {
  pending
  running
  succeeded
  failed
  paused
}

enum CopilotTaskStatus {
  pending
  running
  succeeded
  failed
  skipped
}

enum CopilotEventLevel {
  info
  warning
  error
  debug
  progress
}

type CopilotTask {
  id: ID!
  runId: ID!
  sequenceNumber: Int!
  taskType: String!
  kind: String!
  inputParams: JSON!
  input: String!
  outputData: JSON
  output: String
  status: CopilotTaskStatus!
  errorMessage: String
  error: String
  createdAt: String!
  startedAt: String
  finishedAt: String
}

type CopilotPlan {
  id: ID!
  goalId: ID
  steps: [CopilotTask!]!
  createdAt: String!
}

type CopilotRun {
  id: ID!
  goalId: ID
  goalText: String!
  goal: String!
  investigationId: ID
  status: CopilotRunStatus!
  plan: CopilotPlan
  metadata: JSON
  tasks: [CopilotTask!]!
  events(limit: Int = 50): [CopilotEvent!]!
  isActive: Boolean!
  createdAt: String!
  updatedAt: String!
  startedAt: String
  finishedAt: String
}

type CopilotEvent {
  id: ID!
  runId: ID!
  taskId: ID
  level: CopilotEventLevel!
  message: String!
  payload: JSON
  ts: String!
  createdAt: String!
}

type CopilotStats {
  status: String!
  count: Int!
  avgDurationSeconds: Float
}

input StartCopilotRunInput {
  goalId: ID
  goalText: String
  investigationId: ID
  resume: Boolean = false
}

type Goal {
  id: ID!
  text: String!
  investigationId: ID
  status: String!
  progress: Float!
  createdAt: String!
  updatedAt: String!
}






type SupportTicket {
  id: ID!
  title: String!
  description: String!
  status: SupportTicketStatus!
  priority: SupportTicketPriority!
  category: SupportTicketCategory!
  reporter_id: String!
  reporter_email: String
  assignee_id: String
  tags: [String!]!
  metadata: JSON
  created_at: DateTime!
  updated_at: DateTime!
  resolved_at: DateTime
  closed_at: DateTime
  comments(limit: Int = 100, offset: Int = 0): [SupportTicketComment!]!
}

type SupportTicketComment {
  id: ID!
  ticket_id: ID!
  author_id: String!
  author_email: String
  content: String!
  is_internal: Boolean!
  created_at: DateTime!
  updated_at: DateTime!
}

type SupportTicketList {
  data: [SupportTicket!]!
  total: Int!
}

input CreateSupportTicketInput {
  title: String!
  description: String!
  priority: SupportTicketPriority
  category: SupportTicketCategory
  tags: [String!]
  metadata: JSON
}

input UpdateSupportTicketInput {
  title: String
  description: String
  status: SupportTicketStatus
  priority: SupportTicketPriority
  category: SupportTicketCategory
  assignee_id: String
  tags: [String!]
  metadata: JSON
}

input SupportTicketFilter {
  status: SupportTicketStatus
  priority: SupportTicketPriority
  category: SupportTicketCategory
  reporter_id: String
  assignee_id: String
}

input SemanticSearchFilter {
  source: String
  dateFrom: DateTime
  dateTo: DateTime
  threatLevel: Int
}

input EvidenceFilterInput {
  tenantId: String
  kind: String
  severity: RiskSeverity
  status: EvidenceOkStatus
}

input ClaimInput {
  text: String!
  sourceType: ClaimSource!
  sourceUrl: String
  language: String
  actorId: ID
  channelId: ID
}

input EvidenceInput {
  type: EvidenceType!
  title: String!
  content: String!
  sourceUrl: String
  sourceCredibility: Float
  claimIds: [ID!]
  supportsVerdict: ClaimVerdict
}

input NarrativeInput {
  name: String!
  description: String!
  claimIds: [ID!]!
  keywords: [String!]
}

input VerdictInput {
  claimId: ID!
  verdict: ClaimVerdict!
  confidence: Float!
  evidenceIds: [ID!]!
}

input AppealInput {
  claimId: ID!
  requestedVerdict: ClaimVerdict!
  reason: String!
  supportingEvidence: [String!]
}

input PlaybookInput {
  campaignId: ID!
  priority: Int
  assigneeId: ID
  dueAt: DateTime
}

input TakedownInput {
  campaignId: ID!
  platform: String!
  urls: [String!]!
  accountIds: [String!]!
  violationType: String!
  legalBasis: String
  contactInfo: String
}

input IncidentInput {
  campaignId: ID!
  name: String!
  description: String!
  leadAnalystId: ID!
  severity: Int
}

input ClaimFilter {
  verdict: ClaimVerdict
  sourceType: ClaimSource
  dateFrom: DateTime
  dateTo: DateTime
  narrativeId: ID
  query: String
}

input CampaignFilter {
  status: CampaignStatus
  threatLevel: CampaignThreatLevel
  dateFrom: DateTime
  dateTo: DateTime
}


  type Query {
    healthScore: Int!
    evidenceOk(service: String, releaseId: String): EvidenceOk!
    # Authentication Queries
    """Get the currently authenticated user"""
    me: AuthUser

    """Verify if a JWT token is valid"""
    verifyToken(token: String!): TokenVerification!

    """Verify if a password reset token is valid"""
    verifyResetToken(token: String!): ResetTokenVerification!

    # Entity & User Queries
    entity(id: ID!): Entity @scope(requires: "read:graph")
    entities(type: String, q: String, limit: Int = 25, offset: Int = 0): [Entity!]! @scope(requires: "read:graph")
    relationship(id: ID!): Relationship @scope(requires: "read:graph")
    relationships(from: ID, to: ID, type: String, limit: Int = 25, offset: Int = 0): [Relationship!]! @scope(requires: "read:graph")
    user(id: ID!): User
    users(limit: Int = 25, offset: Int = 0): [User!]!
    investigation(id: ID!): Investigation
    investigations(limit: Int = 25, offset: Int = 0): [Investigation!]!
    investigationSnapshots(investigationId: ID!): [InvestigationSnapshot!]!
    investigationSnapshot(id: ID!): InvestigationSnapshot
    semanticSearch(query: String!, filters: SemanticSearchFilter, limit: Int = 10, offset: Int = 0): [Entity!]! # Enhanced query

    # AI Analysis Queries
    """
    Extract entities and relationships from text using AI/NLP techniques
    """
    extractEntities(
      text: String!
      extractRelationships: Boolean = false
      confidenceThreshold: Float = 0.7
    ): EntityExtractionResult!

    """
    Analyze potential relationships between a list of entities within given text
    """
    analyzeRelationships(
      entities: [String!]!
      text: String!
    ): [AnalyzedRelationship!]!

    """
    Generate AI-powered insights for a specific entity
    """
    generateEntityInsights(
      entityId: ID!
      entityType: String!
      properties: JSON = {}
    ): EntityInsights!

    """
    Perform sentiment analysis on text content
    """
    analyzeSentiment(
      text: String!
    ): SentimentAnalysis!

    """
    Get AI-generated insights about data quality and suggestions for improvement
    """
    getDataQualityInsights(
      graphId: ID
    ): DataQualityReport!

    # Geospatial Queries
    analyzeSatelliteImage(imageUrl: String!): SatelliteAnalysisResult
    detectChange(beforeImageUrl: String!, afterImageUrl: String!): ChangeDetectionResult
    checkGeofence(pointLat: Float!, pointLon: Float!, polygonCoords: [[Float!]!]!): Boolean
    analyzeMovement(trackPoints: [TrackPointInput!]!): MovementAnalysisResult
    getElevationProfile(path: [GeoPointInput!]!): [ElevationPoint]
    transformCoordinates(lat: Float!, lon: Float!, fromSys: String!, toSys: String!): CoordinateTransformResult

    """
    Query the knowledge graph using explainable GraphRAG.
    Returns structured response with answer, confidence, citations, and why_paths.
    """
    graphRagAnswer(input: GraphRAGQueryInput!): GraphRAGResponse!

    """
    Find entities similar to the given entity or text.
    Uses vector embeddings for semantic similarity.
    """
    similarEntities(
      entityId: ID
      text: String
      topK: Int = 10
      investigationId: ID!
    ): [SimilarEntity!]!
    auditTrace(
      investigationId: ID!
      filter: AuditFilter
    ): [AuditLog!]!

    # Support Ticket Queries
    supportTicket(id: ID!): SupportTicket
    supportTickets(filter: SupportTicketFilter, limit: Int = 50, offset: Int = 0): SupportTicketList!

    """
    Generate a causal influence graph for the investigation
    """
    causalGraph(investigationId: ID!): CausalGraph!

    # Trust & Risk Queries
    trustScore(subjectId: ID!): TrustScore
    riskSignals(filter: EvidenceFilterInput, limit: Int = 50, offset: Int = 0): [RiskSignal!]!
    riskSignalsPage(filter: EvidenceFilterInput, limit: Int = 50, offset: Int = 0): RiskSignalPage!
    trustScoresPage(limit: Int = 50, offset: Int = 0): TrustScorePage!
    incidentBundle(id: ID!): IncidentBundle

    # Evidence & Provenance Queries
    evidenceBundles(filter: EvidenceFilterInput, limit: Int = 20): [EvidenceBundle!]!

    # Electronic Warfare Queries
    ewBattleSpace: BattleSpaceView!
    ewAnalyzeEMP(eventLocation: GeoPointInput!, yieldKt: Float!): EMPAnalysisReport!

    # Deduplication Queries
    deduplicationCandidates(investigationId: ID!, threshold: Float = 0.8): [DeduplicationCandidate!]!

    # Collaboration Queries
    warRoom(id: ID!): WarRoom
    warRooms(status: String): [WarRoom!]!

    # Cognitive Security Queries
    cogSecClaim(id: ID!): CogSecClaim
    cogSecClaims(filter: ClaimFilter, limit: Int, offset: Int): [CogSecClaim!]!
    searchCogSecClaims(query: String!, limit: Int): [CogSecClaim!]!
    similarClaims(claimId: ID!, threshold: Float): [CogSecClaim!]!
    cogSecEvidence(id: ID!): CogSecEvidence
    cogSecNarrative(id: ID!): CogSecNarrative
    cogSecNarratives(status: NarrativeStatus, limit: Int): [CogSecNarrative!]!
    narrativeGraph(narrativeId: ID!): NarrativeGraph!
    cogSecCampaign(id: ID!): CogSecCampaign
    cogSecCampaigns(filter: CampaignFilter, limit: Int): [CogSecCampaign!]!
    activeCampaigns(limit: Int): [CogSecCampaign!]!
    campaignSignals(campaignId: ID!): [CoordinationSignal!]!
    cogSecIncident(id: ID!): CogSecIncident
    cogSecIncidents(status: IncidentStatus, limit: Int): [CogSecIncident!]!
    responsePlaybook(id: ID!): ResponsePlaybook
    campaignPlaybooks(campaignId: ID!): [ResponsePlaybook!]!
    cogSecAuditLogs(resourceType: String, resourceId: ID, limit: Int): [CogSecAuditLog!]!
    verificationAppeal(id: ID!): VerificationAppeal
    pendingAppeals(limit: Int): [VerificationAppeal!]!
    governancePolicies: [GovernancePolicy!]!
    transparencyReport(startDate: DateTime!, endDate: DateTime!): TransparencyReport!
    cogSecMetrics(startDate: DateTime!, endDate: DateTime!): CogSecMetrics!
    benchmarkComparison(startDate: DateTime!, endDate: DateTime!): BenchmarkComparison!
    riskAssessment: RiskAssessmentReport!
    contentCredential(id: ID!): ContentCredential
    verifyC2PAManifest(assetId: ID!): C2PAVerificationStatus!

    # Wargaming Queries
    getCrisisTelemetry(scenarioId: ID!): [SocialMediaTelemetry!]!
    getAdversaryIntentEstimates(scenarioId: ID!): [AdversaryIntentEstimate!]!
    getNarrativeHeatmapData(scenarioId: ID!): [NarrativeHeatmapData!]!
    getStrategicResponsePlaybooks(scenarioId: ID!): [StrategicResponsePlaybook!]!
    getCrisisScenario(id: ID!): CrisisScenario
    getAllCrisisScenarios: [CrisisScenario!]!

    # Sprint 28 Queries
    funnel(period: String = "7d"): [FunnelPoint!]!
    pilotKpis(workspaceId: ID!): PilotKPI!
    pilotSuccess(workspaceId: ID!): [SuccessCard!]!

    # Copilot Goal Queries
    copilotGoals(investigationId: ID): [Goal!]!
    copilotGoal(id: ID!): Goal

    # Ticket Queries
    tickets(provider: String!, externalId: String, limit: Int): [Ticket!]!
  }


  input EntityInput { type: String!, props: JSON }
  input RelationshipInput { from: ID!, to: ID!, type: String!, props: JSON }

  type Mutation {
    # Authentication Mutations
    """Register a new user account"""
    register(input: RegisterInput!): AuthResponse!

    """Authenticate user and return JWT tokens"""
    login(input: LoginInput!): AuthResponse!

    """Refresh access token using refresh token"""
    refreshToken(refreshToken: String!): RefreshTokenResponse!

    """Logout user and invalidate tokens"""
    logout: AuthResult!

    """Request password reset email"""
    requestPasswordReset(email: String!): AuthResult!

    """Reset password using reset token"""
    resetPassword(token: String!, newPassword: String!): AuthResult!

    """Change password for authenticated user"""
    changePassword(currentPassword: String!, newPassword: String!): AuthResult!

    """Revoke a specific JWT token"""
    revokeToken(token: String!): AuthResult!

    # Entity & User Mutations
    createEntity(input: EntityInput!): Entity!
    updateEntity(id: ID!, input: EntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    createRelationship(input: RelationshipInput!): Relationship!
    updateRelationship(id: ID!, input: RelationshipInput!): Relationship!
    deleteRelationship(id: ID!): Boolean!
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    updateUserPreferences(userId: ID!, preferences: JSON!): User!
    deleteUser(id: ID!): Boolean!
    createInvestigation(input: InvestigationInput!): Investigation! @scope(requires: "write:case")
    updateInvestigation(id: ID!, input: InvestigationInput!): Investigation! @scope(requires: "write:case")
    deleteInvestigation(id: ID!): Boolean! @scope(requires: "write:case")
    createInvestigationSnapshot(investigationId: ID!, label: String): InvestigationSnapshot! @scope(requires: "write:case")
    linkEntities(text: String!): [LinkedEntity!]!
    extractRelationships(text: String!, entities: [LinkedEntityInput!]!): [ExtractedRelationship!]!
    generateEntitiesFromText(investigationId: ID!, text: String!): GeneratedEntitiesResult!

    # AI Analysis Mutations
    """
    Apply AI-generated suggestions to improve graph structure and data quality
    """
    applyAISuggestions(
      graphId: ID!
      suggestionIds: [ID!]!
    ): AISuggestionResult!

    """
    Use AI to enhance entities with additional properties, relationships, and insights
    """
    enhanceEntitiesWithAI(
      entityIds: [ID!]!
      enhancementTypes: [String!] = ["properties", "relationships", "insights"]
    ): AIEnhancementResult!

    """
    Clear GraphRAG cache for an investigation.
    Useful when investigation data has changed significantly.
    """
    clearGraphRAGCache(investigationId: ID!): CacheOperationResult!

    # Support Ticket Mutations
    createSupportTicket(input: CreateSupportTicketInput!): SupportTicket!
    updateSupportTicket(id: ID!, input: UpdateSupportTicketInput!): SupportTicket
    deleteSupportTicket(id: ID!): Boolean!
    addSupportTicketComment(ticketId: ID!, content: String!, isInternal: Boolean): SupportTicketComment!

    # Trust & Risk Mutations
    raiseRiskSignal(input: JSON!): RiskSignal!
    createIncidentBundle(input: JSON!): IncidentBundle!

    # Evidence & Provenance Mutations
    linkTrustScoreEvidence(trustScoreId: ID!, evidenceId: ID!): TrustScore!
    publishEvidence(input: JSON!): EvidenceBundle!

    # Electronic Warfare Mutations
    ewRegisterAsset(input: JSON!): EWAsset!
    ewDeployJammer(input: JSON!): JammingMission!
    ewStopJammer(missionId: ID!): Boolean!
    ewSimulateSignalDetection(input: JSON!): SpectrumSignal!
    ewTriangulateSignal(signalId: ID!): DirectionFindingResult!
    ewActivateProtection(assetId: ID!, protectionType: String!): Boolean!

    # Cognitive Security Mutations
    extractClaim(input: ClaimInput!): CogSecClaim!
    updateClaimVerdict(input: VerdictInput!): CogSecClaim!
    linkRelatedClaims(claimId1: ID!, claimId2: ID!, relationType: String!): Boolean!
    createEvidence(input: EvidenceInput!): CogSecEvidence!
    verifyEvidence(evidenceId: ID!, notes: String): CogSecEvidence!
    linkEvidenceToClaims(evidenceId: ID!, claimIds: [ID!]!): Boolean!
    createNarrative(input: NarrativeInput!): CogSecNarrative!
    updateNarrativeStatus(narrativeId: ID!, status: NarrativeStatus!): CogSecNarrative!
    linkClaimsToNarrative(claimIds: [ID!]!, narrativeId: ID!): Boolean!
    runDetectionPipeline: [CoordinationSignal!]!
    clusterIntoCampaigns: [CogSecCampaign!]!
    updateCampaignStatus(campaignId: ID!, status: CampaignStatus!): CogSecCampaign!
    createIncident(input: IncidentInput!): CogSecIncident!
    updateIncidentStatus(incidentId: ID!, status: IncidentStatus!): CogSecIncident!
    addIncidentTimelineEvent(incidentId: ID!, type: String!, description: String!): IncidentTimelineEvent!
    generatePlaybook(input: PlaybookInput!): ResponsePlaybook!
    executePlaybookAction(playbookId: ID!, actionId: ID!): ResponseAction!
    updatePlaybookStatus(playbookId: ID!, status: PlaybookStatus!): ResponsePlaybook!
    generateBriefing(campaignId: ID!): VerifiedBriefing!
    generateStakeholderMessage(campaignId: ID!, stakeholder: String!): ResponseArtifact!
    generateTakedownPacket(input: TakedownInput!): TakedownPacket!
    createAppeal(input: AppealInput!): VerificationAppeal!
    reviewAppeal(appealId: ID!, decision: String!, notes: String!): VerificationAppeal!
    createContentCredential(assetId: ID!, mimeType: String!, sourceUrl: String): ContentCredential!
    addProvenanceLink(credentialId: ID!, source: String!, platform: String): ProvenanceLink!

    # Wargaming Mutations
    runWarGameSimulation(input: CrisisScenarioInput!): CrisisScenario!
    updateCrisisScenario(id: ID!, input: CrisisScenarioInput!): CrisisScenario!
    deleteCrisisScenario(id: ID!): Boolean!

    # Collaboration Mutations
    createWarRoom(name: String!): WarRoom!
    addParticipant(warRoomId: ID!, userId: ID!, role: String!): WarRoomParticipant!
    removeParticipant(warRoomId: ID!, userId: ID!): Boolean!

    # Sprint 28 Mutations
    submitNps(score: Int!, comment: String): Boolean!
    recordEvent(name: String!, props: JSON): Boolean!
    startTrial(plan: String!, days: Int = 14): Boolean!
    upgradePlan(plan: String!): Boolean!

    # Copilot Mutations
    startCopilotRun(goalId: ID, goalText: String, investigationId: ID, resume: Boolean = false): CopilotRun!
    pauseCopilotRun(runId: ID!): CopilotRun!
    resumeCopilotRun(runId: ID!): CopilotRun!

    # Goal Mutations
    createCopilotGoal(text: String!, investigationId: ID): Goal!
    updateCopilotGoal(id: ID!, text: String, status: String): Goal!
    deleteCopilotGoal(id: ID!): Boolean!

  }


  type Subscription {
    entityCreated: Entity!
    entityUpdated: Entity!
    entityDeleted: ID!
    aiRecommendationUpdated: AIRecommendation!

    # Cognitive Security Subscriptions
    campaignDetected: CogSecCampaign!
    coordinationSignalDetected: CoordinationSignal!
    incidentUpdated(incidentId: ID!): CogSecIncident!
    claimVerdictUpdated(narrativeId: ID): CogSecClaim!
    playbookActionCompleted(playbookId: ID!): ResponseAction!

    # Ingestion Subscriptions
    evidenceIngested(tenantId: String!): IngestionResult

    # Collaboration Subscriptions
    participantAdded: WarRoomSubscriptionPayload!
    participantRemoved: WarRoomSubscriptionPayload!

    # Copilot Subscriptions
    copilotEvents(runId: ID!): CopilotEvent!
  }

  type WarRoomSubscriptionPayload {
    warRoom: WarRoom!
  }


  # Causal Graph Types
  type CausalNode {
    id: ID!
    label: String!
    type: String!
    confidence: Float
    metadata: JSON
  }

  type CausalEdge {
    source: ID!
    target: ID!
    type: String!
    weight: Float!
    evidence: String
  }

  type CausalGraph {
    nodes: [CausalNode!]!
    edges: [CausalEdge!]!
  }
  type Run { id: ID! }
  type Deployment { id: ID! }
  type Ticket {
    provider: String!
    externalId: String!
    title: String
    assignee: String
    labels: [String!]
    project: String
    repo: String
    runs: [Run!]
    deployments: [Deployment!]
  }
`;
