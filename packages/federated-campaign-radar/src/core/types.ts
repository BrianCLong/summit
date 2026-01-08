/**
 * Federated Campaign Radar - Core Types
 *
 * Privacy-preserving cross-organization campaign signal sharing for information warfare defense.
 * Implements federated narrative clustering, C2PA credential support, and early-warning detection.
 *
 * @see https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
 * @see https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// Signal Schema Types
// ============================================================================

/**
 * Normalized campaign signal - atomic unit of shared information
 */
export interface CampaignSignal {
  id: string;
  version: string;
  timestamp: Date;
  expiresAt?: Date;

  // Signal classification
  signalType: SignalType;
  confidence: number; // 0-1

  // Core signal data (normalized)
  indicator: SignalIndicator;

  // Privacy-preserving attributes
  privacyLevel: PrivacyLevel;
  hashedContent?: string; // SHA-256 hash for matching without revealing content
  embeddingVector?: number[]; // Semantic embedding for similarity matching

  // Provenance and credentials
  provenance: SignalProvenance;
  c2paValidation?: C2PAValidationResult;

  // Metadata
  sourceOrganization: string; // Anonymized org ID
  channelMetadata: ChannelMetadata;
  coordinationFeatures: CoordinationFeature[];

  // Federation metadata
  federationMetadata: FederationMetadata;
}

export enum SignalType {
  NARRATIVE = "NARRATIVE",
  CLAIM = "CLAIM",
  MEDIA_ARTIFACT = "MEDIA_ARTIFACT",
  URL = "URL",
  ACCOUNT_HANDLE = "ACCOUNT_HANDLE",
  HASHTAG = "HASHTAG",
  COORDINATION_PATTERN = "COORDINATION_PATTERN",
  AMPLIFICATION_NETWORK = "AMPLIFICATION_NETWORK",
  BOT_NETWORK = "BOT_NETWORK",
  SYNTHETIC_MEDIA = "SYNTHETIC_MEDIA",
}

export enum PrivacyLevel {
  PUBLIC = "PUBLIC", // Can be shared openly
  HASHED = "HASHED", // Only hash shared, not content
  ENCRYPTED = "ENCRYPTED", // Encrypted for MPC computation
  AGGREGATE_ONLY = "AGGREGATE_ONLY", // Only aggregate stats shared
  INTERNAL_ONLY = "INTERNAL_ONLY", // Never shared externally
}

/**
 * Signal indicator - the actual observation data
 */
export interface SignalIndicator {
  // For narratives/claims
  narrative?: NarrativeIndicator;

  // For media artifacts
  media?: MediaIndicator;

  // For URLs
  url?: URLIndicator;

  // For accounts
  account?: AccountIndicator;

  // For coordination patterns
  coordination?: CoordinationIndicator;

  // Raw indicator hash for matching
  indicatorHash: string;
}

export interface NarrativeIndicator {
  claimText?: string; // Actual text (if privacy allows)
  claimHash: string; // SHA-256 of normalized claim
  semanticEmbedding: number[]; // Vector embedding for similarity
  language: string;
  sentiment: number; // -1 to 1
  topics: string[];
  entities: ExtractedEntity[];
  framingTechniques: string[];
}

export interface MediaIndicator {
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  perceptualHash: string; // pHash for images/videos
  contentHash: string; // SHA-256 of content
  dimensions?: { width: number; height: number };
  duration?: number; // For video/audio
  manipulationScore?: number; // 0-1, likelihood of manipulation
  syntheticScore?: number; // 0-1, likelihood of AI-generated
  c2paManifest?: C2PAManifest;
}

export interface URLIndicator {
  domainHash: string; // Hash of domain
  pathHash: string; // Hash of path
  fullUrlHash: string; // Hash of full URL
  domainAge?: number; // Days since domain registration
  certificateInfo?: CertificateInfo;
  redirectChain?: string[]; // Hashes of redirect chain
  hostingProvider?: string;
  ipGeolocation?: string;
}

export interface AccountIndicator {
  platformHash: string; // Hash of platform name
  handleHash: string; // Hash of account handle
  accountAgeRange: "NEW" | "RECENT" | "ESTABLISHED" | "OLD";
  followerRange: "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "MASSIVE";
  behavioralSignature: BehavioralSignature;
  networkPosition?: NetworkPosition;
}

export interface CoordinationIndicator {
  patternType: CoordinationPatternType;
  actorCount: number;
  temporalWindow: { start: Date; end: Date };
  synchronicity: number; // 0-1, how synchronized actions are
  contentSimilarity: number; // 0-1, similarity of shared content
  networkDensity: number; // 0-1, how connected actors are
  amplificationFactor: number;
}

export enum CoordinationPatternType {
  SYNCHRONIZED_POSTING = "SYNCHRONIZED_POSTING",
  COPY_PASTE_CAMPAIGN = "COPY_PASTE_CAMPAIGN",
  HASHTAG_HIJACKING = "HASHTAG_HIJACKING",
  BRIGADING = "BRIGADING",
  ASTROTURFING = "ASTROTURFING",
  BOT_AMPLIFICATION = "BOT_AMPLIFICATION",
  SOCKPUPPET_NETWORK = "SOCKPUPPET_NETWORK",
  INAUTHENTIC_BEHAVIOR = "INAUTHENTIC_BEHAVIOR",
}

// ============================================================================
// Provenance and C2PA Types
// ============================================================================

export interface SignalProvenance {
  sourceType: ProvenanceSourceType;
  collectionMethod: string;
  collectionTimestamp: Date;
  processingPipeline: string[];
  dataQuality: DataQualityMetrics;
  attestations: Attestation[];
}

export enum ProvenanceSourceType {
  DIRECT_OBSERVATION = "DIRECT_OBSERVATION",
  PLATFORM_API = "PLATFORM_API",
  CROWDSOURCED = "CROWDSOURCED",
  PARTNER_FEED = "PARTNER_FEED",
  AUTOMATED_DETECTION = "AUTOMATED_DETECTION",
  INTELLIGENCE_REPORT = "INTELLIGENCE_REPORT",
}

export interface DataQualityMetrics {
  completeness: number; // 0-1
  accuracy: number; // 0-1
  timeliness: number; // 0-1
  consistency: number; // 0-1
}

export interface Attestation {
  attesterId: string;
  attesterType: "HUMAN" | "AUTOMATED" | "HYBRID";
  timestamp: Date;
  confidence: number;
  signature: string;
}

/**
 * C2PA Content Credentials validation result
 * @see https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
 */
export interface C2PAValidationResult {
  isValid: boolean;
  hasManifest: boolean;
  manifestValidation: C2PAManifestValidation;
  claimValidation: C2PAClaimValidation;
  trustChain: C2PATrustChainResult;
  validationTimestamp: Date;
}

export interface C2PAManifest {
  manifestId: string;
  claimGenerator: string;
  claimGeneratorVersion: string;
  title?: string;
  format: string;
  instanceId: string;
  thumbnail?: {
    format: string;
    identifier: string;
  };
  ingredients: C2PAIngredient[];
  assertions: C2PAAssertion[];
  signature: C2PASignature;
}

export interface C2PAManifestValidation {
  signatureValid: boolean;
  integrityValid: boolean;
  timestampValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface C2PAClaimValidation {
  claimSignatureValid: boolean;
  claimIntegrityValid: boolean;
  assertionsValid: boolean;
  ingredientsValid: boolean;
}

export interface C2PATrustChainResult {
  isComplete: boolean;
  chainLength: number;
  trustedRoots: string[];
  untrustedElements: string[];
}

export interface C2PAIngredient {
  title: string;
  format: string;
  documentId?: string;
  instanceId: string;
  relationship: "parentOf" | "componentOf" | "inputTo";
  manifest?: C2PAManifest;
}

export interface C2PAAssertion {
  label: string;
  data: Record<string, unknown>;
  kind: "Json" | "Cbor" | "Binary" | "Uri";
}

export interface C2PASignature {
  algorithm: string;
  issuer: string;
  timestamp: Date;
  certificateChain: string[];
}

// ============================================================================
// Channel and Coordination Metadata
// ============================================================================

export interface ChannelMetadata {
  platform: string;
  channelType: ChannelType;
  reach: ReachCategory;
  audienceProfile?: AudienceProfile;
  platformSpecificData?: Record<string, unknown>;
}

export enum ChannelType {
  SOCIAL_MEDIA = "SOCIAL_MEDIA",
  MESSAGING_APP = "MESSAGING_APP",
  NEWS_SITE = "NEWS_SITE",
  BLOG = "BLOG",
  FORUM = "FORUM",
  VIDEO_PLATFORM = "VIDEO_PLATFORM",
  PODCAST = "PODCAST",
  EMAIL = "EMAIL",
  SMS = "SMS",
  OFFLINE = "OFFLINE",
}

export enum ReachCategory {
  MICRO = "MICRO", // < 1K
  SMALL = "SMALL", // 1K - 10K
  MEDIUM = "MEDIUM", // 10K - 100K
  LARGE = "LARGE", // 100K - 1M
  MASSIVE = "MASSIVE", // 1M+
}

export interface AudienceProfile {
  geographicDistribution: Record<string, number>; // region -> percentage
  demographicIndicators: Record<string, number>;
  interestCategories: string[];
  engagementLevel: "LOW" | "MEDIUM" | "HIGH";
}

export interface CoordinationFeature {
  featureType: string;
  value: number | string | boolean;
  confidence: number;
  extractedAt: Date;
}

export interface BehavioralSignature {
  postingFrequency: number;
  activityHours: number[]; // 24-hour distribution
  contentTypes: string[];
  engagementPatterns: Record<string, number>;
  languageConsistency: number;
  topicConsistency: number;
}

export interface NetworkPosition {
  clusterMembership: string[];
  centralityScore: number;
  bridgingScore: number;
  influenceScore: number;
}

export interface CertificateInfo {
  issuer: string;
  validFrom: Date;
  validTo: Date;
  isValid: boolean;
}

export interface ExtractedEntity {
  text: string;
  type: "PERSON" | "ORGANIZATION" | "LOCATION" | "EVENT" | "PRODUCT" | "OTHER";
  confidence: number;
  entityHash?: string;
}

// ============================================================================
// Federation Types
// ============================================================================

export interface FederationMetadata {
  federationId: string;
  originNodeId: string;
  hopCount: number;
  propagationPath: string[]; // Anonymized node IDs
  privacyBudgetUsed: number;
  sharingAgreementId: string;
  retentionPolicy: RetentionPolicy;
}

export interface RetentionPolicy {
  maxRetentionDays: number;
  deleteOnExpiry: boolean;
  allowArchival: boolean;
}

/**
 * Federation participant - represents an organization in the network
 */
export interface FederationParticipant {
  participantId: string;
  publicKey: string;
  joinedAt: Date;
  status: ParticipantStatus;
  capabilities: ParticipantCapability[];
  trustScore: number; // 0-1
  sharingAgreements: SharingAgreement[];
  rateLimits: RateLimits;
  statistics: ParticipantStatistics;
}

export enum ParticipantStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  REVOKED = "REVOKED",
}

export interface ParticipantCapability {
  capability: string;
  enabled: boolean;
  constraints?: Record<string, unknown>;
}

export interface SharingAgreement {
  agreementId: string;
  participantIds: string[];
  signalTypes: SignalType[];
  privacyLevels: PrivacyLevel[];
  validFrom: Date;
  validUntil: Date;
  termsHash: string;
  signatures: AgreementSignature[];
  constraints: SharingConstraint[];
}

export interface AgreementSignature {
  participantId: string;
  signature: string;
  timestamp: Date;
}

export interface SharingConstraint {
  constraintType: string;
  parameters: Record<string, unknown>;
}

export interface RateLimits {
  signalsPerHour: number;
  queriesPerHour: number;
  computeUnitsPerDay: number;
}

export interface ParticipantStatistics {
  totalSignalsContributed: number;
  totalSignalsReceived: number;
  averageSignalQuality: number;
  lastActivityAt: Date;
  uptime: number; // 0-1
}

// ============================================================================
// Campaign Cluster Types
// ============================================================================

/**
 * Campaign cluster - aggregated view of related signals across organizations
 */
export interface CampaignCluster {
  clusterId: string;
  createdAt: Date;
  updatedAt: Date;
  status: ClusterStatus;

  // Cluster composition
  signalCount: number;
  participatingOrgs: number; // Count, not identities
  temporalRange: { start: Date; end: Date };

  // Cluster characteristics
  dominantNarratives: NarrativeClusterSummary[];
  coordinationPatterns: CoordinationPattern[];
  channelDistribution: Record<string, number>;
  geographicSpread: GeographicSpread;

  // Threat assessment
  threatLevel: ThreatLevel;
  confidenceScore: number;
  attributionHypotheses: AttributionHypothesis[];

  // Trend analysis
  velocityMetrics: VelocityMetrics;
  growthTrajectory: "EMERGING" | "GROWING" | "STABLE" | "DECLINING" | "DORMANT";

  // Federation metadata
  crossTenantConfidence: number; // Confidence boost from multiple orgs
  privacyPreservedMetrics: PrivacyPreservedMetrics;
}

export enum ClusterStatus {
  EMERGING = "EMERGING",
  ACTIVE = "ACTIVE",
  PEAK = "PEAK",
  DECLINING = "DECLINING",
  DORMANT = "DORMANT",
  RESOLVED = "RESOLVED",
}

export enum ThreatLevel {
  INFORMATIONAL = "INFORMATIONAL",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface NarrativeClusterSummary {
  narrativeId: string;
  themeSummary: string; // AI-generated summary
  keyTopics: string[];
  sentimentRange: { min: number; max: number };
  signalCount: number;
  confidence: number;
}

export interface CoordinationPattern {
  patternType: CoordinationPatternType;
  strength: number; // 0-1
  actorEstimate: { min: number; max: number };
  evidenceCount: number;
}

export interface GeographicSpread {
  regions: Record<string, number>; // region -> signal count
  spreadIndex: number; // 0-1, how geographically distributed
  primaryRegions: string[];
}

export interface AttributionHypothesis {
  hypothesisId: string;
  actorType: "STATE" | "NON_STATE" | "COMMERCIAL" | "UNKNOWN";
  countryCode?: string;
  confidence: number;
  supportingIndicators: string[];
  contradictingIndicators: string[];
}

export interface VelocityMetrics {
  signalsPerHour: number;
  growthRate: number; // Percentage change
  accelerationRate: number;
  peakVelocity: number;
  peakTimestamp?: Date;
}

export interface PrivacyPreservedMetrics {
  aggregationMethod: "DIFFERENTIAL_PRIVACY" | "SECURE_AGGREGATION" | "MPC";
  epsilon?: number; // Differential privacy parameter
  noiseAdded: boolean;
  minimumThreshold: number; // Minimum signals before aggregation
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Federated campaign alert - early warning notification
 */
export interface FederatedAlert {
  alertId: string;
  createdAt: Date;
  expiresAt?: Date;

  // Alert classification
  alertType: AlertType;
  severity: AlertSeverity;
  priority: AlertPriority;

  // Source information
  clusterId?: string;
  triggerConditions: TriggerCondition[];
  confidenceScore: number;

  // Alert content
  title: string;
  summary: string;
  narrativeSummary?: string;
  topSpreaders: SpreaderSummary[];
  channelDiffusion: ChannelDiffusionSummary;

  // Cross-tenant context
  crossTenantSignal: boolean;
  participatingOrgCount: number;

  // Response recommendations
  recommendedActions: RecommendedAction[];
  responsePack?: ResponsePack;

  // Status tracking
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolution?: AlertResolution;

  // Audit
  auditTrail: AlertAuditEntry[];
}

export enum AlertType {
  CAMPAIGN_EMERGING = "CAMPAIGN_EMERGING",
  CAMPAIGN_ESCALATING = "CAMPAIGN_ESCALATING",
  CROSS_TENANT_SPIKE = "CROSS_TENANT_SPIKE",
  COORDINATION_DETECTED = "COORDINATION_DETECTED",
  NARRATIVE_SHIFT = "NARRATIVE_SHIFT",
  SYNTHETIC_MEDIA_SURGE = "SYNTHETIC_MEDIA_SURGE",
  ATTRIBUTION_UPDATE = "ATTRIBUTION_UPDATE",
  THRESHOLD_BREACH = "THRESHOLD_BREACH",
}

export enum AlertSeverity {
  INFO = "INFO",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum AlertPriority {
  P4 = "P4", // Low
  P3 = "P3", // Normal
  P2 = "P2", // High
  P1 = "P1", // Urgent
  P0 = "P0", // Emergency
}

export enum AlertStatus {
  NEW = "NEW",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  INVESTIGATING = "INVESTIGATING",
  MITIGATING = "MITIGATING",
  RESOLVED = "RESOLVED",
  FALSE_POSITIVE = "FALSE_POSITIVE",
}

export interface TriggerCondition {
  conditionType: string;
  threshold: number;
  actualValue: number;
  direction: "ABOVE" | "BELOW" | "EQUALS";
  windowMinutes: number;
}

export interface SpreaderSummary {
  accountHash: string;
  platform: string;
  reachCategory: ReachCategory;
  activityLevel: "LOW" | "MEDIUM" | "HIGH";
  suspicionScore: number; // 0-1
  publicArtifacts: string[]; // URLs to public posts
}

export interface ChannelDiffusionSummary {
  channels: Record<string, ChannelMetrics>;
  primaryChannel: string;
  crossPlatformScore: number;
  diffusionPattern: "ORGANIC" | "COORDINATED" | "MIXED";
}

export interface ChannelMetrics {
  signalCount: number;
  estimatedReach: number;
  engagementRate: number;
  growthRate: number;
}

export interface RecommendedAction {
  actionId: string;
  actionType: ActionType;
  priority: number;
  description: string;
  estimatedImpact: string;
  automatable: boolean;
}

export enum ActionType {
  MONITOR = "MONITOR",
  INVESTIGATE = "INVESTIGATE",
  ESCALATE = "ESCALATE",
  COUNTER_NARRATIVE = "COUNTER_NARRATIVE",
  PLATFORM_REPORT = "PLATFORM_REPORT",
  PREBUNK = "PREBUNK",
  INOCULATION = "INOCULATION",
  STAKEHOLDER_NOTIFY = "STAKEHOLDER_NOTIFY",
  PUBLIC_STATEMENT = "PUBLIC_STATEMENT",
}

/**
 * Response pack - actionable playbook for responding to campaigns
 */
export interface ResponsePack {
  packId: string;
  generatedAt: Date;
  clusterId: string;

  // Narrative intelligence
  narrativeSummary: NarrativeIntelligence;

  // Recommended comms playbook
  commsPlaybook: CommsPlaybook;

  // Platform-specific actions
  platformActions: PlatformAction[];

  // Stakeholder communication
  stakeholderBriefing: StakeholderBriefing;

  // Measurement plan
  measurementPlan: MeasurementPlan;
}

export interface NarrativeIntelligence {
  mainNarratives: string[];
  counterPoints: string[];
  factChecks: FactCheck[];
  sourceCredibilityAssessment: SourceCredibilityAssessment;
  audienceVulnerabilities: string[];
}

export interface FactCheck {
  claim: string;
  verdict: "TRUE" | "FALSE" | "MISLEADING" | "MISSING_CONTEXT" | "UNVERIFIED";
  explanation: string;
  sources: string[];
}

export interface SourceCredibilityAssessment {
  primarySources: SourceAssessment[];
  amplifierSources: SourceAssessment[];
  overallCredibility: number;
}

export interface SourceAssessment {
  sourceHash: string;
  credibilityScore: number;
  factors: string[];
}

export interface CommsPlaybook {
  strategy: "IGNORE" | "MONITOR" | "PREBUNK" | "DEBUNK" | "COUNTER_NARRATIVE";
  keyMessages: string[];
  talkingPoints: string[];
  avoidTopics: string[];
  timing: TimingRecommendation;
  audienceSegments: AudienceSegment[];
}

export interface TimingRecommendation {
  urgency: "IMMEDIATE" | "WITHIN_HOURS" | "WITHIN_DAYS" | "ONGOING";
  optimalWindows: { start: Date; end: Date }[];
  avoidWindows: { start: Date; end: Date; reason: string }[];
}

export interface AudienceSegment {
  segmentId: string;
  description: string;
  vulnerability: number;
  recommendedApproach: string;
  channels: string[];
}

export interface PlatformAction {
  platform: string;
  actionType: string;
  priority: number;
  steps: string[];
  estimatedTimeline: string;
}

export interface StakeholderBriefing {
  executiveSummary: string;
  keyFindings: string[];
  riskAssessment: string;
  recommendedActions: string[];
  escalationPath: string[];
}

export interface MeasurementPlan {
  kpis: KPI[];
  trackingWindow: { start: Date; end: Date };
  checkpoints: { date: Date; metrics: string[] }[];
  successCriteria: string[];
}

export interface KPI {
  name: string;
  baseline: number;
  target: number;
  currentValue?: number;
  measurement: string;
}

export interface AlertResolution {
  resolvedAt: Date;
  resolvedBy: string;
  resolutionType: "MITIGATED" | "EXPIRED" | "FALSE_POSITIVE" | "ESCALATED";
  notes: string;
  lessonsLearned?: string[];
}

export interface AlertAuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: Record<string, unknown>;
}

// ============================================================================
// Privacy-Preserving Computation Types
// ============================================================================

export interface PrivacyBudget {
  budgetId: string;
  organizationId: string;
  totalEpsilon: number;
  usedEpsilon: number;
  totalDelta: number;
  usedDelta: number;
  resetPeriod: "DAILY" | "WEEKLY" | "MONTHLY";
  lastResetAt: Date;
  nextResetAt: Date;
}

export interface DifferentialPrivacyConfig {
  epsilon: number;
  delta: number;
  sensitivityBound: number;
  noiseType: "LAPLACE" | "GAUSSIAN";
  clippingNorm?: number;
}

export interface SecureAggregationConfig {
  minimumParticipants: number;
  threshold: number;
  roundTimeout: number;
  protocol: "SECAGG" | "SECAGG_PLUS";
}

export interface MPCConfig {
  protocol: "SHAMIR" | "BGW" | "GMW" | "SPDZ";
  threshold: number;
  totalParties: number;
  securityParameter: number;
}

// ============================================================================
// Evaluation and Metrics Types
// ============================================================================

export interface EvaluationMetrics {
  // Time-to-detect metrics
  timeToDetect: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };

  // False attribution metrics
  falseAttributionRate: number;
  truePositiveRate: number;
  precision: number;
  recall: number;
  f1Score: number;

  // Containment metrics
  containmentDelta: number; // Impact reduction from early detection
  mitigationEffectiveness: number;

  // Federation health
  federationCoverage: number;
  participantEngagement: number;
  signalQuality: number;

  // Privacy compliance
  privacyBudgetUtilization: number;
  complianceScore: number;
}

export interface IncidentMetrics {
  incidentId: string;
  detectionTime: Date;
  alertTime: Date;
  acknowledgmentTime?: Date;
  mitigationStartTime?: Date;
  resolutionTime?: Date;

  // Calculated metrics
  timeToDetect: number; // ms
  timeToAlert: number;
  timeToAcknowledge?: number;
  timeToMitigate?: number;
  timeToResolve?: number;

  // Impact metrics
  estimatedReachPrevented?: number;
  containmentEffectiveness?: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createSignalId(): string {
  return `sig_${uuidv4()}`;
}

export function createClusterId(): string {
  return `clst_${uuidv4()}`;
}

export function createAlertId(): string {
  return `alrt_${uuidv4()}`;
}

export function createFederationId(): string {
  return `fed_${uuidv4()}`;
}

export function calculateThreatLevel(
  signalCount: number,
  orgCount: number,
  velocityMetrics: VelocityMetrics,
  coordinationStrength: number
): ThreatLevel {
  // Composite threat scoring
  let score = 0;

  // Signal volume factor
  if (signalCount > 1000) score += 30;
  else if (signalCount > 100) score += 20;
  else if (signalCount > 10) score += 10;

  // Cross-org factor (network effect)
  if (orgCount > 5) score += 25;
  else if (orgCount > 2) score += 15;
  else if (orgCount > 1) score += 5;

  // Velocity factor
  if (velocityMetrics.growthRate > 100) score += 25;
  else if (velocityMetrics.growthRate > 50) score += 15;
  else if (velocityMetrics.growthRate > 10) score += 5;

  // Coordination factor
  score += coordinationStrength * 20;

  // Map to threat level
  if (score >= 80) return ThreatLevel.CRITICAL;
  if (score >= 60) return ThreatLevel.HIGH;
  if (score >= 40) return ThreatLevel.MEDIUM;
  if (score >= 20) return ThreatLevel.LOW;
  return ThreatLevel.INFORMATIONAL;
}

export function calculateAlertPriority(
  severity: AlertSeverity,
  crossTenantSignal: boolean,
  orgCount: number
): AlertPriority {
  let priorityScore = 0;

  // Base priority from severity
  switch (severity) {
    case AlertSeverity.CRITICAL:
      priorityScore = 4;
      break;
    case AlertSeverity.HIGH:
      priorityScore = 3;
      break;
    case AlertSeverity.MEDIUM:
      priorityScore = 2;
      break;
    case AlertSeverity.LOW:
      priorityScore = 1;
      break;
    default:
      priorityScore = 0;
  }

  // Boost for cross-tenant
  if (crossTenantSignal) priorityScore += 1;

  // Boost for multiple orgs
  if (orgCount > 3) priorityScore += 1;

  // Map to priority
  if (priorityScore >= 5) return AlertPriority.P0;
  if (priorityScore >= 4) return AlertPriority.P1;
  if (priorityScore >= 3) return AlertPriority.P2;
  if (priorityScore >= 2) return AlertPriority.P3;
  return AlertPriority.P4;
}
