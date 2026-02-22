/**
 * Cognitive Security Operations - Type Definitions
 *
 * Core types for the defensive cognitive security system including:
 * - Claim Graph model (claims → evidence → narratives → actors → channels)
 * - C2PA/Content Credentials provenance
 * - Campaign detection signals
 * - Response operations artifacts
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Enumerations
// ============================================================================

export type ClaimVerdict = 'VERIFIED' | 'REFUTED' | 'UNVERIFIED' | 'DISPUTED' | 'INCONCLUSIVE';

export type ClaimSource =
  | 'SOCIAL_MEDIA'
  | 'NEWS_OUTLET'
  | 'OFFICIAL_STATEMENT'
  | 'DOCUMENT'
  | 'VIDEO'
  | 'IMAGE'
  | 'AUDIO'
  | 'WEBSITE'
  | 'MESSAGING_PLATFORM'
  | 'OTHER';

export type EvidenceType =
  | 'DOCUMENT'
  | 'VIDEO_FRAME'
  | 'IMAGE'
  | 'AUDIO_CLIP'
  | 'OFFICIAL_STATEMENT'
  | 'STRUCTURED_DATA'
  | 'GEOLOCATION'
  | 'TIMESTAMP'
  | 'METADATA'
  | 'WITNESS_ACCOUNT';

export type NarrativeStatus =
  | 'EMERGING'
  | 'ACTIVE'
  | 'VIRAL'
  | 'DECLINING'
  | 'DORMANT'
  | 'MUTATING';

export type CampaignThreatLevel =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFORMATIONAL';

export type CoordinationSignalType =
  | 'TEMPORAL_SYNCHRONY'
  | 'CROSS_ACCOUNT_REUSE'
  | 'PHRASING_FINGERPRINT'
  | 'ASSET_REUPLOAD'
  | 'NETWORK_ANOMALY'
  | 'CONTENT_LAUNDERING'
  | 'AMPLIFICATION_BURST'
  | 'HASHTAG_HIJACKING'
  | 'BOT_NETWORK';

export type ResponseActionType =
  | 'BRIEFING'
  | 'STAKEHOLDER_MESSAGE'
  | 'TAKEDOWN_PACKET'
  | 'INTERNAL_COMMS'
  | 'PRESS_STATEMENT'
  | 'ESCALATION'
  | 'MONITORING'
  | 'DEBUNK';

export type PlaybookStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'SUSPENDED';

export type IncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'RESPONDING'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED';

export type AppealStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'DENIED'
  | 'ESCALATED';

// ============================================================================
// C2PA / Content Credentials Types
// ============================================================================

export interface C2PAManifest {
  /** Unique manifest ID */
  manifestId: string;
  /** C2PA specification version */
  specVersion: string;
  /** Claim generator (software/hardware that created the manifest) */
  claimGenerator: string;
  /** Signing timestamp */
  signedAt: string;
  /** Certificate chain for verification */
  certificateChain: C2PACertificate[];
  /** Actions performed on the asset */
  actions: C2PAAction[];
  /** Assertions about the content */
  assertions: C2PAAssertion[];
  /** Parent manifest references (for derived content) */
  parentManifests?: string[];
  /** Verification status */
  verificationStatus: C2PAVerificationStatus;
}

export interface C2PACertificate {
  /** Certificate issuer */
  issuer: string;
  /** Certificate subject */
  subject: string;
  /** Serial number */
  serialNumber: string;
  /** Valid from */
  validFrom: string;
  /** Valid to */
  validTo: string;
  /** Is trusted root */
  isTrustedRoot: boolean;
}

export interface C2PAAction {
  /** Action type (e.g., 'c2pa.created', 'c2pa.edited', 'c2pa.cropped') */
  actionType: string;
  /** Software used */
  softwareAgent?: string;
  /** When the action occurred */
  when?: string;
  /** Parameters of the action */
  parameters?: Record<string, unknown>;
}

export interface C2PAAssertion {
  /** Assertion type */
  assertionType: string;
  /** Label */
  label: string;
  /** Data */
  data: Record<string, unknown>;
  /** Hash of the assertion data */
  hash: string;
}

export interface C2PAVerificationStatus {
  /** Overall valid */
  valid: boolean;
  /** Signature verified */
  signatureVerified: boolean;
  /** Certificate chain verified */
  certificateChainValid: boolean;
  /** Content integrity verified (hash matches) */
  contentIntegrityValid: boolean;
  /** Timestamp verified */
  timestampValid: boolean;
  /** Any validation errors */
  errors: string[];
  /** Warnings */
  warnings: string[];
}

export interface ContentCredential {
  /** Unique ID */
  id: string;
  /** Asset ID this credential belongs to */
  assetId: string;
  /** Asset hash (SHA-256) */
  assetHash: string;
  /** MIME type */
  mimeType: string;
  /** C2PA manifest if available */
  c2paManifest?: C2PAManifest;
  /** Whether C2PA manifest exists */
  hasC2PA: boolean;
  /** Provenance confidence (0-1) */
  provenanceConfidence: number;
  /** Creation timestamp */
  createdAt: string;
  /** Last verified timestamp */
  lastVerifiedAt?: string;
  /** Provenance chain (for non-C2PA content) */
  provenanceChain?: ProvenanceLink[];
}

export interface ProvenanceLink {
  /** Link ID */
  id: string;
  /** Source URL or identifier */
  source: string;
  /** Observation timestamp */
  observedAt: string;
  /** Platform/channel */
  platform?: string;
  /** Observer (system or user) */
  observer: string;
  /** Confidence score */
  confidence: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Claim Graph Types
// ============================================================================

export interface Claim {
  /** Unique claim ID */
  id: string;
  /** Canonical text of the claim */
  canonicalText: string;
  /** Original text (if different from canonical) */
  originalText?: string;
  /** Language */
  language: string;
  /** Source type */
  sourceType: ClaimSource;
  /** Source URL/identifier */
  sourceUrl?: string;
  /** First observed timestamp */
  firstObservedAt: string;
  /** Last observed timestamp */
  lastObservedAt: string;
  /** Current verdict */
  verdict: ClaimVerdict;
  /** Verdict confidence (0-1) */
  verdictConfidence: number;
  /** Evidence IDs supporting the verdict */
  evidenceIds: string[];
  /** Related claim IDs (similar or contradicting) */
  relatedClaimIds: string[];
  /** Narrative IDs this claim belongs to */
  narrativeIds: string[];
  /** Actor IDs who made this claim */
  actorIds: string[];
  /** Channel IDs where claim appeared */
  channelIds: string[];
  /** Embedding vector for semantic search */
  embedding?: number[];
  /** Extracted entities */
  entities: ClaimEntity[];
  /** Metadata */
  metadata: Record<string, unknown>;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

export interface ClaimEntity {
  /** Entity text */
  text: string;
  /** Entity type (PERSON, ORG, LOCATION, DATE, etc.) */
  type: string;
  /** Start offset in canonical text */
  startOffset: number;
  /** End offset */
  endOffset: number;
  /** Linked entity ID (if resolved) */
  linkedEntityId?: string;
  /** Confidence */
  confidence: number;
}

export interface Evidence {
  /** Unique evidence ID */
  id: string;
  /** Evidence type */
  type: EvidenceType;
  /** Title/description */
  title: string;
  /** Content or URL */
  content: string;
  /** Source URL */
  sourceUrl?: string;
  /** Source credibility (0-1) */
  sourceCredibility: number;
  /** Content credential if available */
  contentCredentialId?: string;
  /** Claim IDs this evidence supports/refutes */
  claimIds: string[];
  /** Whether this evidence supports or refutes the claims */
  supportsVerdict: ClaimVerdict;
  /** Verification status */
  verified: boolean;
  /** Verifier (user or system) */
  verifiedBy?: string;
  /** Verification timestamp */
  verifiedAt?: string;
  /** Verification notes */
  verificationNotes?: string;
  /** Captured timestamp */
  capturedAt: string;
  /** Created timestamp */
  createdAt: string;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export interface Narrative {
  /** Unique narrative ID */
  id: string;
  /** Narrative name */
  name: string;
  /** Description */
  description: string;
  /** Canonical summary */
  summary: string;
  /** Status */
  status: NarrativeStatus;
  /** First detected timestamp */
  firstDetectedAt: string;
  /** Peak activity timestamp */
  peakAt?: string;
  /** Claim IDs in this narrative */
  claimIds: string[];
  /** Parent narrative ID (for forks/mutations) */
  parentNarrativeId?: string;
  /** Child narrative IDs */
  childNarrativeIds: string[];
  /** Actor IDs promoting this narrative */
  actorIds: string[];
  /** Channel IDs where narrative appears */
  channelIds: string[];
  /** Audience segment IDs */
  audienceIds: string[];
  /** Keywords and hashtags */
  keywords: string[];
  /** Velocity metrics */
  velocity: NarrativeVelocity;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

export interface NarrativeVelocity {
  /** Current spread rate (claims/hour) */
  spreadRate: number;
  /** Acceleration (change in spread rate) */
  acceleration: number;
  /** Total reach estimate */
  estimatedReach: number;
  /** Cross-platform presence count */
  platformCount: number;
  /** Language count */
  languageCount: number;
  /** Geographic regions */
  regions: string[];
}

export interface Actor {
  /** Unique actor ID */
  id: string;
  /** Display name */
  name: string;
  /** Actor type (INDIVIDUAL, ORGANIZATION, BOT, UNKNOWN) */
  type: 'INDIVIDUAL' | 'ORGANIZATION' | 'BOT' | 'UNKNOWN';
  /** Platform accounts */
  accounts: ActorAccount[];
  /** Credibility score (0-1) */
  credibilityScore: number;
  /** Influence score (0-1) */
  influenceScore: number;
  /** Coordination score (likelihood of coordinated behavior) */
  coordinationScore: number;
  /** Claim IDs made by this actor */
  claimIds: string[];
  /** Narrative IDs promoted by this actor */
  narrativeIds: string[];
  /** Known affiliations */
  affiliations: string[];
  /** First activity timestamp */
  firstActivityAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
  /** Created timestamp */
  createdAt: string;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export interface ActorAccount {
  /** Platform */
  platform: string;
  /** Account ID on platform */
  platformAccountId: string;
  /** Username/handle */
  username: string;
  /** Profile URL */
  profileUrl?: string;
  /** Follower count */
  followerCount?: number;
  /** Account creation date */
  accountCreatedAt?: string;
  /** Is verified on platform */
  isVerified: boolean;
  /** Last observed */
  lastObservedAt: string;
}

export interface Channel {
  /** Unique channel ID */
  id: string;
  /** Channel name */
  name: string;
  /** Platform */
  platform: string;
  /** Channel type (PROFILE, GROUP, PAGE, FORUM, WEBSITE, etc.) */
  type: string;
  /** URL */
  url?: string;
  /** Audience size estimate */
  audienceSize?: number;
  /** Credibility score */
  credibilityScore: number;
  /** Claim IDs that appeared in this channel */
  claimIds: string[];
  /** Narrative IDs present in this channel */
  narrativeIds: string[];
  /** Actor IDs active in this channel */
  actorIds: string[];
  /** Is this channel part of known content laundering path */
  isLaunderingNode: boolean;
  /** Created timestamp */
  createdAt: string;
  /** Metadata */
  metadata: Record<string, unknown>;
}

export interface Audience {
  /** Unique audience ID */
  id: string;
  /** Audience segment name */
  name: string;
  /** Description */
  description: string;
  /** Estimated size */
  estimatedSize: number;
  /** Demographics */
  demographics?: Record<string, unknown>;
  /** Geographic regions */
  regions: string[];
  /** Susceptibility indicators */
  vulnerabilityFactors: string[];
  /** Narrative IDs targeting this audience */
  narrativeIds: string[];
  /** Created timestamp */
  createdAt: string;
}

// ============================================================================
// Campaign Detection Types
// ============================================================================

export interface CoordinationSignal {
  /** Signal ID */
  id: string;
  /** Signal type */
  type: CoordinationSignalType;
  /** Detection timestamp */
  detectedAt: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Description */
  description: string;
  /** Involved actor IDs */
  actorIds: string[];
  /** Involved claim IDs */
  claimIds: string[];
  /** Involved channel IDs */
  channelIds: string[];
  /** Supporting data */
  evidence: CoordinationEvidence;
  /** Campaign ID if attributed */
  campaignId?: string;
}

export interface CoordinationEvidence {
  /** Temporal synchrony data */
  temporalPattern?: {
    /** Timestamps of coordinated activity */
    timestamps: string[];
    /** Synchrony score */
    synchronyScore: number;
    /** Average delay between posts */
    avgDelayMs: number;
  };
  /** Content fingerprint data */
  contentFingerprint?: {
    /** Hash of similar content */
    contentHash: string;
    /** Similarity scores between pieces */
    similarityScores: number[];
    /** N-gram overlap */
    ngramOverlap: number;
  };
  /** Network anomaly data */
  networkAnomaly?: {
    /** Graph metrics */
    clusteringCoefficient: number;
    /** Betweenness centrality */
    betweennessCentrality: number;
    /** Unusual connection patterns */
    anomalyScore: number;
  };
  /** Content laundering path */
  launderingPath?: {
    /** Ordered list of channels in the path */
    channelPath: string[];
    /** Time to mainstream (minutes) */
    timeToMainstream: number;
  };
}

export interface Campaign {
  /** Campaign ID */
  id: string;
  /** Campaign name (auto-generated or analyst-assigned) */
  name: string;
  /** Description */
  description: string;
  /** Threat level */
  threatLevel: CampaignThreatLevel;
  /** Status */
  status: 'ACTIVE' | 'SUSPECTED' | 'CONFIRMED' | 'MITIGATED' | 'ARCHIVED';
  /** First detected timestamp */
  firstDetectedAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
  /** Narrative IDs in this campaign */
  narrativeIds: string[];
  /** Actor IDs attributed to this campaign */
  actorIds: string[];
  /** Channel IDs used in this campaign */
  channelIds: string[];
  /** Coordination signal IDs */
  coordinationSignalIds: string[];
  /** Claim IDs */
  claimIds: string[];
  /** Audience IDs targeted */
  targetAudienceIds: string[];
  /** Tactics, techniques, and procedures */
  ttps: string[];
  /** Attribution confidence (0-1) */
  attributionConfidence: number;
  /** Suspected origin/sponsor */
  suspectedOrigin?: string;
  /** Response playbook IDs */
  responsePlaybookIds: string[];
  /** Incident ID if escalated */
  incidentId?: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** Metrics */
  metrics: CampaignMetrics;
}

export interface CampaignMetrics {
  /** Total claims */
  totalClaims: number;
  /** Total actors */
  totalActors: number;
  /** Total channels */
  totalChannels: number;
  /** Estimated reach */
  estimatedReach: number;
  /** Cross-platform spread */
  platformSpread: number;
  /** Language diversity */
  languageCount: number;
  /** Coordination score */
  coordinationScore: number;
  /** Velocity (activity/hour) */
  velocity: number;
  /** Engagement rate */
  engagementRate: number;
}

// ============================================================================
// Response Operations Types
// ============================================================================

export interface ResponsePlaybook {
  /** Playbook ID */
  id: string;
  /** Playbook name */
  name: string;
  /** Description */
  description: string;
  /** Status */
  status: PlaybookStatus;
  /** Campaign ID this playbook addresses */
  campaignId: string;
  /** Incident ID if part of incident */
  incidentId?: string;
  /** Assignee user ID */
  assigneeId?: string;
  /** Actions in this playbook */
  actions: ResponseAction[];
  /** Priority (1-5, 1 is highest) */
  priority: number;
  /** Due date */
  dueAt?: string;
  /** Created by user ID */
  createdBy: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

export interface ResponseAction {
  /** Action ID */
  id: string;
  /** Action type */
  type: ResponseActionType;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Status */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  /** Generated artifact */
  artifact?: ResponseArtifact;
  /** Assignee */
  assigneeId?: string;
  /** Completed at */
  completedAt?: string;
  /** Completed by */
  completedBy?: string;
  /** Notes */
  notes?: string;
}

export interface ResponseArtifact {
  /** Artifact ID */
  id: string;
  /** Artifact type */
  type: ResponseActionType;
  /** Title */
  title: string;
  /** Content (markdown or structured) */
  content: string;
  /** Target audience (legal, PR, ops, etc.) */
  targetAudience: string;
  /** Citations */
  citations: ArtifactCitation[];
  /** Confidence score */
  confidenceScore: number;
  /** Generated by (system or user ID) */
  generatedBy: string;
  /** Generated timestamp */
  generatedAt: string;
  /** Approved by user ID */
  approvedBy?: string;
  /** Approved timestamp */
  approvedAt?: string;
  /** Export formats available */
  exportFormats: string[];
}

export interface ArtifactCitation {
  /** Citation ID */
  id: string;
  /** Reference text */
  referenceText: string;
  /** Source type */
  sourceType: 'CLAIM' | 'EVIDENCE' | 'EXTERNAL';
  /** Source ID (claim or evidence ID) */
  sourceId?: string;
  /** External URL */
  externalUrl?: string;
  /** Confidence */
  confidence: number;
}

export interface VerifiedBriefing extends ResponseArtifact {
  /** Executive summary */
  executiveSummary: string;
  /** Key findings */
  keyFindings: string[];
  /** Claim verdicts included */
  claimVerdicts: Array<{
    claimId: string;
    claimText: string;
    verdict: ClaimVerdict;
    confidence: number;
  }>;
  /** Recommended actions */
  recommendedActions: string[];
  /** Risk assessment */
  riskAssessment: {
    level: CampaignThreatLevel;
    factors: string[];
    mitigations: string[];
  };
}

export interface TakedownPacket extends ResponseArtifact {
  /** Platform */
  platform: string;
  /** Violation type */
  violationType: string;
  /** URLs to report */
  urls: string[];
  /** Account IDs to report */
  accountIds: string[];
  /** Evidence bundle ID */
  evidenceBundleId: string;
  /** Legal basis */
  legalBasis?: string;
  /** Contact information */
  contactInfo?: string;
}

// ============================================================================
// Incident Management Types
// ============================================================================

export interface CogSecIncident {
  /** Incident ID */
  id: string;
  /** Incident name */
  name: string;
  /** Description */
  description: string;
  /** Status */
  status: IncidentStatus;
  /** Severity (1-5, 1 is highest) */
  severity: number;
  /** Campaign IDs */
  campaignIds: string[];
  /** Playbook IDs */
  playbookIds: string[];
  /** Lead analyst user ID */
  leadAnalystId?: string;
  /** Team member user IDs */
  teamMemberIds: string[];
  /** Investigation ID (link to main investigation) */
  investigationId?: string;
  /** Timeline events */
  timeline: IncidentTimelineEvent[];
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** Resolved timestamp */
  resolvedAt?: string;
}

export interface IncidentTimelineEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: 'DETECTION' | 'ESCALATION' | 'ACTION' | 'UPDATE' | 'RESOLUTION' | 'NOTE';
  /** Description */
  description: string;
  /** Actor user ID */
  actorId?: string;
  /** Timestamp */
  timestamp: string;
  /** Related entity IDs */
  relatedEntityIds?: string[];
}

// ============================================================================
// Governance & Audit Types
// ============================================================================

export interface CogSecAuditLog {
  /** Log ID */
  id: string;
  /** Action type */
  action: string;
  /** Resource type */
  resourceType: 'CLAIM' | 'EVIDENCE' | 'NARRATIVE' | 'CAMPAIGN' | 'PLAYBOOK' | 'INCIDENT';
  /** Resource ID */
  resourceId: string;
  /** User ID */
  userId: string;
  /** Tenant ID */
  tenantId?: string;
  /** Previous state (JSON) */
  previousState?: Record<string, unknown>;
  /** New state (JSON) */
  newState?: Record<string, unknown>;
  /** Justification/notes */
  justification?: string;
  /** Timestamp */
  timestamp: string;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
}

export interface VerificationAppeal {
  /** Appeal ID */
  id: string;
  /** Claim ID being appealed */
  claimId: string;
  /** Current verdict being challenged */
  currentVerdict: ClaimVerdict;
  /** Requested verdict */
  requestedVerdict: ClaimVerdict;
  /** Appellant user ID */
  appellantId: string;
  /** Reason for appeal */
  reason: string;
  /** Supporting evidence */
  supportingEvidence: string[];
  /** Status */
  status: AppealStatus;
  /** Reviewer user ID */
  reviewerId?: string;
  /** Review notes */
  reviewNotes?: string;
  /** Resolution */
  resolution?: 'UPHELD' | 'OVERTURNED' | 'PARTIALLY_UPHELD';
  /** Created timestamp */
  createdAt: string;
  /** Resolved timestamp */
  resolvedAt?: string;
}

export interface GovernancePolicy {
  /** Policy ID */
  id: string;
  /** Policy name */
  name: string;
  /** Description */
  description: string;
  /** Policy type */
  type: 'VERIFICATION' | 'ACTION' | 'ESCALATION' | 'RETENTION' | 'ACCESS';
  /** Policy rules (JSON) */
  rules: Record<string, unknown>;
  /** Is active */
  isActive: boolean;
  /** Version */
  version: number;
  /** Created by */
  createdBy: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

// ============================================================================
// Evaluation & Metrics Types
// ============================================================================

export interface CogSecMetrics {
  /** Metrics ID */
  id: string;
  /** Time period start */
  periodStart: string;
  /** Time period end */
  periodEnd: string;
  /** Detection metrics */
  detection: DetectionMetrics;
  /** Claim verification metrics */
  verification: VerificationMetrics;
  /** Response metrics */
  response: ResponseMetrics;
  /** Operator efficiency metrics */
  operatorEfficiency: OperatorMetrics;
  /** Generated timestamp */
  generatedAt: string;
}

export interface DetectionMetrics {
  /** Time to detect campaign start (p50, ms) */
  timeToDetectP50: number;
  /** Time to detect campaign start (p95, ms) */
  timeToDetectP95: number;
  /** Campaigns detected */
  campaignsDetected: number;
  /** Coordination signals detected */
  signalsDetected: number;
  /** False positive rate */
  falsePositiveRate: number;
}

export interface VerificationMetrics {
  /** Claim-level precision */
  claimPrecision: number;
  /** Claim-level recall */
  claimRecall: number;
  /** Citation correctness */
  citationCorrectness: number;
  /** False attribution rate */
  falseAttributionRate: number;
  /** Average verification time (ms) */
  avgVerificationTimeMs: number;
  /** Claims verified */
  claimsVerified: number;
}

export interface ResponseMetrics {
  /** Narrative containment rate */
  narrativeContainmentRate: number;
  /** Average growth rate reduction (%) */
  avgGrowthRateReduction: number;
  /** Cross-channel spread reduction (%) */
  crossChannelSpreadReduction: number;
  /** Playbooks executed */
  playbooksExecuted: number;
  /** Takedowns submitted */
  takedownsSubmitted: number;
  /** Takedown success rate */
  takedownSuccessRate: number;
}

export interface OperatorMetrics {
  /** Analyst minutes per resolved incident */
  minutesPerIncident: number;
  /** Claims reviewed per analyst hour */
  claimsPerAnalystHour: number;
  /** Playbooks generated per incident */
  playbooksPerIncident: number;
  /** Average incident resolution time (ms) */
  avgResolutionTimeMs: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function createClaim(
  canonicalText: string,
  sourceType: ClaimSource,
  language = 'en',
): Claim {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    canonicalText,
    language,
    sourceType,
    firstObservedAt: now,
    lastObservedAt: now,
    verdict: 'UNVERIFIED',
    verdictConfidence: 0,
    evidenceIds: [],
    relatedClaimIds: [],
    narrativeIds: [],
    actorIds: [],
    channelIds: [],
    entities: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function createEvidence(
  type: EvidenceType,
  title: string,
  content: string,
): Evidence {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    type,
    title,
    content,
    sourceCredibility: 0.5,
    claimIds: [],
    supportsVerdict: 'UNVERIFIED',
    verified: false,
    capturedAt: now,
    createdAt: now,
    metadata: {},
  };
}

export function createNarrative(name: string, description: string): Narrative {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name,
    description,
    summary: description,
    status: 'EMERGING',
    firstDetectedAt: now,
    claimIds: [],
    childNarrativeIds: [],
    actorIds: [],
    channelIds: [],
    audienceIds: [],
    keywords: [],
    velocity: {
      spreadRate: 0,
      acceleration: 0,
      estimatedReach: 0,
      platformCount: 0,
      languageCount: 1,
      regions: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createCampaign(name: string, threatLevel: CampaignThreatLevel): Campaign {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name,
    description: '',
    threatLevel,
    status: 'SUSPECTED',
    firstDetectedAt: now,
    lastActivityAt: now,
    narrativeIds: [],
    actorIds: [],
    channelIds: [],
    coordinationSignalIds: [],
    claimIds: [],
    targetAudienceIds: [],
    ttps: [],
    attributionConfidence: 0,
    responsePlaybookIds: [],
    createdAt: now,
    updatedAt: now,
    metrics: {
      totalClaims: 0,
      totalActors: 0,
      totalChannels: 0,
      estimatedReach: 0,
      platformSpread: 0,
      languageCount: 0,
      coordinationScore: 0,
      velocity: 0,
      engagementRate: 0,
    },
  };
}
