/**
 * GraphQL Schema for Federated Campaign Radar
 *
 * Provides API for federation operations, signal sharing, and alert management.
 */

import { gql } from 'graphql-tag';

export const typeDefs = gql`
  """
  Federated Campaign Radar API

  Privacy-preserving cross-organization campaign signal sharing for information warfare defense.
  """

  # ============================================================================
  # Enums
  # ============================================================================

  enum SignalType {
    NARRATIVE
    CLAIM
    MEDIA_ARTIFACT
    URL
    ACCOUNT_HANDLE
    HASHTAG
    COORDINATION_PATTERN
    AMPLIFICATION_NETWORK
    BOT_NETWORK
    SYNTHETIC_MEDIA
  }

  enum PrivacyLevel {
    PUBLIC
    HASHED
    ENCRYPTED
    AGGREGATE_ONLY
    INTERNAL_ONLY
  }

  enum ThreatLevel {
    INFORMATIONAL
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum ClusterStatus {
    EMERGING
    ACTIVE
    PEAK
    DECLINING
    DORMANT
    RESOLVED
  }

  enum AlertType {
    CAMPAIGN_EMERGING
    CAMPAIGN_ESCALATING
    CROSS_TENANT_SPIKE
    COORDINATION_DETECTED
    NARRATIVE_SHIFT
    SYNTHETIC_MEDIA_SURGE
    ATTRIBUTION_UPDATE
    THRESHOLD_BREACH
  }

  enum AlertSeverity {
    INFO
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum AlertPriority {
    P4
    P3
    P2
    P1
    P0
  }

  enum AlertStatus {
    NEW
    ACKNOWLEDGED
    INVESTIGATING
    MITIGATING
    RESOLVED
    FALSE_POSITIVE
  }

  enum ParticipantStatus {
    ACTIVE
    SUSPENDED
    PENDING_APPROVAL
    REVOKED
  }

  enum CoordinationPatternType {
    SYNCHRONIZED_POSTING
    COPY_PASTE_CAMPAIGN
    HASHTAG_HIJACKING
    BRIGADING
    ASTROTURFING
    BOT_AMPLIFICATION
    SOCKPUPPET_NETWORK
    INAUTHENTIC_BEHAVIOR
  }

  # ============================================================================
  # Signal Types
  # ============================================================================

  type CampaignSignal {
    id: ID!
    version: String!
    timestamp: DateTime!
    expiresAt: DateTime
    signalType: SignalType!
    confidence: Float!
    privacyLevel: PrivacyLevel!
    hashedContent: String
    sourceOrganization: String!
    channelMetadata: ChannelMetadata!
    provenance: SignalProvenance!
    c2paValidation: C2PAValidationResult
    federationMetadata: FederationMetadata!
  }

  type ChannelMetadata {
    platform: String!
    channelType: String!
    reach: String!
  }

  type SignalProvenance {
    sourceType: String!
    collectionMethod: String!
    collectionTimestamp: DateTime!
    processingPipeline: [String!]!
    dataQuality: DataQualityMetrics!
  }

  type DataQualityMetrics {
    completeness: Float!
    accuracy: Float!
    timeliness: Float!
    consistency: Float!
  }

  type C2PAValidationResult {
    isValid: Boolean!
    hasManifest: Boolean!
    validationTimestamp: DateTime!
    manifestValidation: C2PAManifestValidation
    trustChain: C2PATrustChainResult
  }

  type C2PAManifestValidation {
    signatureValid: Boolean!
    integrityValid: Boolean!
    timestampValid: Boolean!
    errors: [String!]!
    warnings: [String!]!
  }

  type C2PATrustChainResult {
    isComplete: Boolean!
    chainLength: Int!
    trustedRoots: [String!]!
  }

  type FederationMetadata {
    federationId: String!
    originNodeId: String!
    hopCount: Int!
    propagationPath: [String!]!
    privacyBudgetUsed: Float!
    sharingAgreementId: String!
  }

  # ============================================================================
  # Cluster Types
  # ============================================================================

  type CampaignCluster {
    clusterId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    status: ClusterStatus!
    signalCount: Int!
    participatingOrgs: Int!
    temporalRange: TemporalRange!
    dominantNarratives: [NarrativeClusterSummary!]!
    coordinationPatterns: [CoordinationPattern!]!
    channelDistribution: JSON
    geographicSpread: GeographicSpread!
    threatLevel: ThreatLevel!
    confidenceScore: Float!
    attributionHypotheses: [AttributionHypothesis!]!
    velocityMetrics: VelocityMetrics!
    growthTrajectory: String!
    crossTenantConfidence: Float!
    privacyPreservedMetrics: PrivacyPreservedMetrics!
  }

  type TemporalRange {
    start: DateTime!
    end: DateTime!
  }

  type NarrativeClusterSummary {
    narrativeId: ID!
    themeSummary: String!
    keyTopics: [String!]!
    sentimentRange: SentimentRange!
    signalCount: Int!
    confidence: Float!
  }

  type SentimentRange {
    min: Float!
    max: Float!
  }

  type CoordinationPattern {
    patternType: CoordinationPatternType!
    strength: Float!
    actorEstimate: ActorEstimate!
    evidenceCount: Int!
  }

  type ActorEstimate {
    min: Int!
    max: Int!
  }

  type GeographicSpread {
    regions: JSON
    spreadIndex: Float!
    primaryRegions: [String!]!
  }

  type AttributionHypothesis {
    hypothesisId: ID!
    actorType: String!
    countryCode: String
    confidence: Float!
    supportingIndicators: [String!]!
    contradictingIndicators: [String!]!
  }

  type VelocityMetrics {
    signalsPerHour: Float!
    growthRate: Float!
    accelerationRate: Float!
    peakVelocity: Float!
    peakTimestamp: DateTime
  }

  type PrivacyPreservedMetrics {
    aggregationMethod: String!
    epsilon: Float
    noiseAdded: Boolean!
    minimumThreshold: Int!
  }

  # ============================================================================
  # Alert Types
  # ============================================================================

  type FederatedAlert {
    alertId: ID!
    createdAt: DateTime!
    expiresAt: DateTime
    alertType: AlertType!
    severity: AlertSeverity!
    priority: AlertPriority!
    clusterId: ID
    triggerConditions: [TriggerCondition!]!
    confidenceScore: Float!
    title: String!
    summary: String!
    narrativeSummary: String
    topSpreaders: [SpreaderSummary!]!
    channelDiffusion: ChannelDiffusionSummary!
    crossTenantSignal: Boolean!
    participatingOrgCount: Int!
    recommendedActions: [RecommendedAction!]!
    responsePack: ResponsePack
    status: AlertStatus!
    acknowledgedBy: String
    acknowledgedAt: DateTime
    resolution: AlertResolution
    auditTrail: [AlertAuditEntry!]!
  }

  type TriggerCondition {
    conditionType: String!
    threshold: Float!
    actualValue: Float!
    direction: String!
    windowMinutes: Int!
  }

  type SpreaderSummary {
    accountHash: String!
    platform: String!
    reachCategory: String!
    activityLevel: String!
    suspicionScore: Float!
    publicArtifacts: [String!]!
  }

  type ChannelDiffusionSummary {
    channels: JSON!
    primaryChannel: String!
    crossPlatformScore: Float!
    diffusionPattern: String!
  }

  type RecommendedAction {
    actionId: ID!
    actionType: String!
    priority: Int!
    description: String!
    estimatedImpact: String!
    automatable: Boolean!
  }

  type ResponsePack {
    packId: ID!
    generatedAt: DateTime!
    clusterId: ID!
    narrativeSummary: NarrativeIntelligence!
    commsPlaybook: CommsPlaybook!
    stakeholderBriefing: StakeholderBriefing!
    measurementPlan: MeasurementPlan!
  }

  type NarrativeIntelligence {
    mainNarratives: [String!]!
    counterPoints: [String!]!
    factChecks: [FactCheck!]!
    audienceVulnerabilities: [String!]!
  }

  type FactCheck {
    claim: String!
    verdict: String!
    explanation: String!
    sources: [String!]!
  }

  type CommsPlaybook {
    strategy: String!
    keyMessages: [String!]!
    talkingPoints: [String!]!
    avoidTopics: [String!]!
    urgency: String!
  }

  type StakeholderBriefing {
    executiveSummary: String!
    keyFindings: [String!]!
    riskAssessment: String!
    recommendedActions: [String!]!
    escalationPath: [String!]!
  }

  type MeasurementPlan {
    kpis: [KPI!]!
    successCriteria: [String!]!
  }

  type KPI {
    name: String!
    baseline: Float!
    target: Float!
    currentValue: Float
    measurement: String!
  }

  type AlertResolution {
    resolvedAt: DateTime!
    resolvedBy: String!
    resolutionType: String!
    notes: String!
    lessonsLearned: [String!]
  }

  type AlertAuditEntry {
    timestamp: DateTime!
    action: String!
    actor: String!
    details: JSON
  }

  # ============================================================================
  # Federation Types
  # ============================================================================

  type FederationParticipant {
    participantId: ID!
    status: ParticipantStatus!
    joinedAt: DateTime!
    trustScore: Float!
    capabilities: [ParticipantCapability!]!
    rateLimits: RateLimits!
    statistics: ParticipantStatistics!
  }

  type ParticipantCapability {
    capability: String!
    enabled: Boolean!
  }

  type RateLimits {
    signalsPerHour: Int!
    queriesPerHour: Int!
    computeUnitsPerDay: Int!
  }

  type ParticipantStatistics {
    totalSignalsContributed: Int!
    totalSignalsReceived: Int!
    averageSignalQuality: Float!
    lastActivityAt: DateTime!
    uptime: Float!
  }

  type SharingAgreement {
    agreementId: ID!
    participantIds: [String!]!
    signalTypes: [SignalType!]!
    privacyLevels: [PrivacyLevel!]!
    validFrom: DateTime!
    validUntil: DateTime!
    termsHash: String!
  }

  type PrivacyBudget {
    budgetId: ID!
    organizationId: String!
    totalEpsilon: Float!
    usedEpsilon: Float!
    totalDelta: Float!
    usedDelta: Float!
    resetPeriod: String!
    lastResetAt: DateTime!
    nextResetAt: DateTime!
  }

  type AggregatedStats {
    aggregationId: ID!
    windowStart: DateTime!
    windowEnd: DateTime!
    signalType: SignalType!
    signalCount: NoisyCount!
    uniqueIndicators: NoisyCount!
    participatingOrgs: NoisyCount!
    channelDistribution: JSON
    aggregationMethod: String!
  }

  type NoisyCount {
    value: Int!
    noiseAdded: Boolean!
    epsilon: Float
    confidenceInterval: ConfidenceInterval
  }

  type ConfidenceInterval {
    lower: Float!
    upper: Float!
  }

  type CrossTenantOverlap {
    overlapScore: Float!
    participatingOrgs: Int!
    sharedIndicators: Int!
  }

  # ============================================================================
  # Metrics Types
  # ============================================================================

  type AlertMetrics {
    totalAlerts: Int!
    truePositiveRate: Float!
    falsePositiveRate: Float!
    averageTimeToDetect: Float!
    activeAlertCount: Int!
  }

  type EvaluationMetrics {
    timeToDetect: TimeToDetectMetrics!
    falseAttributionRate: Float!
    truePositiveRate: Float!
    precision: Float!
    recall: Float!
    f1Score: Float!
    containmentDelta: Float!
    federationCoverage: Float!
    privacyBudgetUtilization: Float!
  }

  type TimeToDetectMetrics {
    mean: Float!
    median: Float!
    p95: Float!
    p99: Float!
  }

  # ============================================================================
  # Input Types
  # ============================================================================

  input SubmitSignalInput {
    signalType: SignalType!
    privacyLevel: PrivacyLevel!
    content: SignalContentInput!
    channelMetadata: ChannelMetadataInput!
    coordinationFeatures: [CoordinationFeatureInput!]
  }

  input SignalContentInput {
    text: String
    mediaHash: String
    url: String
    accountHandle: String
  }

  input ChannelMetadataInput {
    platform: String!
    channelType: String
    reach: String
  }

  input CoordinationFeatureInput {
    featureType: String!
    value: String!
    confidence: Float!
  }

  input ClusterFilters {
    minThreatLevel: ThreatLevel
    status: [ClusterStatus!]
    signalTypes: [SignalType!]
    minSignalCount: Int
    minCrossTenantConfidence: Float
    temporalRange: TemporalRangeInput
  }

  input TemporalRangeInput {
    start: DateTime!
    end: DateTime!
  }

  input AlertFilters {
    severity: [AlertSeverity!]
    type: [AlertType!]
    status: [AlertStatus!]
    crossTenantOnly: Boolean
  }

  input CreateSharingAgreementInput {
    participantIds: [String!]!
    signalTypes: [SignalType!]!
    privacyLevels: [PrivacyLevel!]!
    validDays: Int!
  }

  input ResolveAlertInput {
    resolutionType: String!
    notes: String!
    lessonsLearned: [String!]
  }

  # ============================================================================
  # Queries
  # ============================================================================

  type Query {
    """
    Get active campaign clusters with optional filtering
    """
    getClusters(filters: ClusterFilters, limit: Int, offset: Int): [CampaignCluster!]!

    """
    Get a specific cluster by ID
    """
    getCluster(clusterId: ID!): CampaignCluster

    """
    Get cluster evolution history
    """
    getClusterHistory(clusterId: ID!): [CampaignCluster!]!

    """
    Get active alerts with optional filtering
    """
    getAlerts(filters: AlertFilters, limit: Int, offset: Int): [FederatedAlert!]!

    """
    Get a specific alert by ID
    """
    getAlert(alertId: ID!): FederatedAlert

    """
    Get aggregated statistics with privacy protections
    """
    getAggregatedStats(signalType: SignalType!, windowHours: Int): AggregatedStats!

    """
    Get cross-tenant signal overlap metrics
    """
    getCrossTenantOverlap: CrossTenantOverlap!

    """
    Get current privacy budget status
    """
    getPrivacyBudget: PrivacyBudget!

    """
    Get federation participants
    """
    getParticipants(status: ParticipantStatus): [FederationParticipant!]!

    """
    Get sharing agreements
    """
    getSharingAgreements: [SharingAgreement!]!

    """
    Get alert performance metrics
    """
    getAlertMetrics: AlertMetrics!

    """
    Get overall evaluation metrics
    """
    getEvaluationMetrics: EvaluationMetrics!
  }

  # ============================================================================
  # Mutations
  # ============================================================================

  type Mutation {
    """
    Submit a campaign signal to the federation
    """
    submitSignal(input: SubmitSignalInput!): SignalSubmissionResult!

    """
    Trigger federated clustering on current signals
    """
    performClustering(signalType: SignalType, windowHours: Int): [CampaignCluster!]!

    """
    Acknowledge an alert
    """
    acknowledgeAlert(alertId: ID!): FederatedAlert!

    """
    Resolve an alert
    """
    resolveAlert(alertId: ID!, input: ResolveAlertInput!): FederatedAlert!

    """
    Generate response pack for an alert
    """
    generateResponsePack(alertId: ID!): ResponsePack!

    """
    Register as a federation participant
    """
    registerParticipant(publicKey: String!, capabilities: [String!]!): FederationParticipant!

    """
    Create a sharing agreement between participants
    """
    createSharingAgreement(input: CreateSharingAgreementInput!): SharingAgreement!

    """
    Initiate secure aggregation round
    """
    initiateSecureAggregation(
      aggregationType: String!
      participantIds: [String!]!
    ): SecureAggregationResult!
  }

  type SignalSubmissionResult {
    success: Boolean!
    signalId: ID
    federatedSignalId: ID
    error: String
  }

  type SecureAggregationResult {
    roundId: ID!
    status: String!
  }

  # ============================================================================
  # Subscriptions
  # ============================================================================

  type Subscription {
    """
    Subscribe to new alerts
    """
    alertCreated(minSeverity: AlertSeverity): FederatedAlert!

    """
    Subscribe to cluster updates
    """
    clusterUpdated(minThreatLevel: ThreatLevel): CampaignCluster!

    """
    Subscribe to cross-tenant spike events
    """
    crossTenantSpike: CrossTenantSpikeEvent!

    """
    Subscribe to federation events
    """
    federationEvent: FederationEvent!
  }

  type CrossTenantSpikeEvent {
    clusterId: ID!
    participatingOrgs: Int!
    confidenceBoost: Float!
    timestamp: DateTime!
  }

  type FederationEvent {
    eventType: String!
    participantId: String
    details: JSON
    timestamp: DateTime!
  }

  # ============================================================================
  # Scalars
  # ============================================================================

  scalar DateTime
  scalar JSON
`;

export default typeDefs;
