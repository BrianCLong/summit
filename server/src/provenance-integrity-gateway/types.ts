/**
 * Provenance & Integrity Gateway (PIG) - Type Definitions
 *
 * Core types for the content provenance verification, signing, and integrity system.
 * Implements C2PA (Coalition for Content Provenance and Authenticity) standards
 * for verifying and signing media content with cryptographic credentials.
 *
 * @see https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
 */

import type { SignatureBundle } from '../security/crypto/types.js';

// =============================================================================
// C2PA Content Credentials Types
// =============================================================================

/**
 * C2PA Manifest - The root structure containing provenance information
 * @see C2PA Specification Section 8
 */
export interface C2PAManifest {
  /** Unique identifier for this manifest (JUMBF label) */
  manifestId: string;

  /** URI reference to the manifest store */
  manifestStoreUri?: string;

  /** The claim that makes assertions about the asset */
  claim: C2PAClaim;

  /** Signature information validating the claim */
  signature: C2PASignature;

  /** Chain of credentials (for nested manifests) */
  credentialChain?: C2PACredential[];

  /** Validation status after verification */
  validationStatus?: C2PAValidationStatus;
}

/**
 * C2PA Claim - Assertions about the content
 */
export interface C2PAClaim {
  /** Claim generator tool identifier */
  claimGenerator: string;

  /** Title of the asset */
  title?: string;

  /** Format of the asset (MIME type) */
  format: string;

  /** Instance ID (XMP identifier) */
  instanceId: string;

  /** Assertions made about this content */
  assertions: C2PAAssertion[];

  /** References to ingredient manifests */
  ingredients?: C2PAIngredient[];

  /** Actions performed on the asset */
  actions?: C2PAAction[];

  /** Redacted assertions (hashes of removed claims) */
  redactedAssertions?: string[];

  /** Claim creation timestamp */
  signatureDate: string;
}

/**
 * C2PA Assertion - Individual claim about the content
 */
export interface C2PAAssertion {
  /** Assertion label (e.g., 'c2pa.actions', 'stds.exif') */
  label: string;

  /** Assertion data */
  data: Record<string, unknown>;

  /** Hash of the assertion for integrity */
  hash?: string;

  /** Whether this assertion was validated */
  validated?: boolean;
}

/**
 * C2PA Ingredient - Reference to source content
 */
export interface C2PAIngredient {
  /** Title of the ingredient */
  title: string;

  /** URI to the ingredient */
  uri?: string;

  /** Format of the ingredient */
  format: string;

  /** Instance ID of the ingredient */
  instanceId: string;

  /** Document ID linking related versions */
  documentId?: string;

  /** Hash of the ingredient content */
  hash: string;

  /** Reference to ingredient's manifest */
  manifestRef?: string;

  /** Relationship to this asset */
  relationship: 'parentOf' | 'componentOf' | 'inputTo';

  /** Thumbnail of the ingredient */
  thumbnail?: C2PAThumbnail;
}

/**
 * C2PA Action - Describes operations performed on content
 */
export interface C2PAAction {
  /** Action type (e.g., 'c2pa.created', 'c2pa.edited', 'c2pa.converted') */
  action: string;

  /** When the action was performed */
  when?: string;

  /** Software that performed the action */
  softwareAgent?: string;

  /** Parameters of the action */
  parameters?: Record<string, unknown>;

  /** Changes made by this action */
  changes?: C2PAChange[];

  /** Actor who performed the action */
  actors?: C2PAActor[];
}

/**
 * C2PA Actor - Entity that performed an action
 */
export interface C2PAActor {
  /** Actor type (human, organization, or machine) */
  type: 'human' | 'organization' | 'machine';

  /** Actor identifier */
  identifier?: string;

  /** Credential proving identity */
  credential?: C2PACredential;
}

/**
 * C2PA Change - Specific modification made to content
 */
export interface C2PAChange {
  /** Region affected by change */
  region?: C2PARegion;

  /** Description of the change */
  description?: string;
}

/**
 * C2PA Region - Area of content affected by an action
 */
export interface C2PARegion {
  /** Region type */
  type: 'spatial' | 'temporal' | 'both';

  /** Spatial bounds (for images/video) */
  spatial?: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: 'pixel' | 'percent';
  };

  /** Temporal bounds (for audio/video) */
  temporal?: {
    start: number;
    end: number;
    unit: 'second' | 'frame';
  };
}

/**
 * C2PA Thumbnail - Preview image reference
 */
export interface C2PAThumbnail {
  /** Format of thumbnail */
  format: string;

  /** Identifier or hash */
  identifier: string;
}

/**
 * C2PA Credential - Identity credential for signing
 */
export interface C2PACredential {
  /** Type of credential */
  type: 'x509' | 'vc' | 'cawg';

  /** Certificate chain (for x509) */
  certificateChain?: string[];

  /** Verifiable Credential (for vc type) */
  verifiableCredential?: Record<string, unknown>;

  /** CAWG identity assertion */
  cawgIdentity?: {
    provider: string;
    identifier: string;
    verified: boolean;
  };
}

/**
 * C2PA Signature - Cryptographic signature of the claim
 */
export interface C2PASignature {
  /** Signature algorithm */
  algorithm: string;

  /** Signature value (base64) */
  value: string;

  /** Signing certificate */
  certificate: string;

  /** Certificate chain */
  certificateChain?: string[];

  /** Timestamp from TSA */
  timestamp?: string;

  /** OCSP response for revocation check */
  ocspResponse?: string;
}

/**
 * C2PA Validation Status
 */
export interface C2PAValidationStatus {
  /** Overall validation result */
  valid: boolean;

  /** Validation timestamp */
  validatedAt: string;

  /** Individual validation codes */
  codes: C2PAValidationCode[];

  /** Trust level achieved */
  trustLevel: 'none' | 'self-signed' | 'anchored' | 'verified';

  /** Certificate validation details */
  certificateInfo?: {
    issuer: string;
    subject: string;
    validFrom: string;
    validTo: string;
    revoked: boolean;
  };
}

/**
 * C2PA Validation Code - Specific validation result
 */
export interface C2PAValidationCode {
  /** Validation code */
  code: string;

  /** Human-readable explanation */
  explanation: string;

  /** URL to documentation */
  url?: string;

  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** Whether this is a success indicator */
  success: boolean;
}

// =============================================================================
// Signed Asset Types
// =============================================================================

/**
 * Official signed asset - Content authenticated by the organization
 */
export interface SignedAsset {
  /** Unique asset identifier */
  id: string;

  /** Tenant that owns this asset */
  tenantId: string;

  /** Asset title */
  title: string;

  /** Asset description */
  description?: string;

  /** Type of official content */
  assetType: OfficialAssetType;

  /** Content hash (SHA-256) */
  contentHash: string;

  /** MIME type of content */
  mimeType: string;

  /** File size in bytes */
  fileSize: number;

  /** Storage location */
  storageUri: string;

  /** CDN URL if published */
  publicUrl?: string;

  /** Version number */
  version: number;

  /** Previous version ID (for version chain) */
  previousVersionId?: string;

  /** Cryptographic signature bundle */
  signature: SignatureBundle;

  /** C2PA manifest (for media assets) */
  c2paManifest?: C2PAManifest;

  /** Revocation information */
  revocation?: AssetRevocation;

  /** Distribution channels where published */
  distributions?: AssetDistribution[];

  /** Creation metadata */
  createdAt: Date;
  createdBy: string;

  /** Last update metadata */
  updatedAt: Date;
  updatedBy: string;

  /** Publication status */
  status: AssetStatus;

  /** Classification level */
  classification?: string;

  /** Expiration date */
  expiresAt?: Date;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Types of official content that can be signed
 */
export type OfficialAssetType =
  | 'press_release'
  | 'official_statement'
  | 'executive_video'
  | 'incident_update'
  | 'social_card'
  | 'policy_document'
  | 'media_kit'
  | 'brand_asset'
  | 'certification'
  | 'report'
  | 'other';

/**
 * Asset publication status
 */
export type AssetStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'published'
  | 'revoked'
  | 'expired'
  | 'superseded';

/**
 * Asset revocation information
 */
export interface AssetRevocation {
  /** Revocation timestamp */
  revokedAt: Date;

  /** Who revoked the asset */
  revokedBy: string;

  /** Reason for revocation */
  reason: RevocationReason;

  /** Detailed explanation */
  explanation?: string;

  /** Replacement asset ID (if superseded) */
  replacementId?: string;

  /** Revocation signature */
  revocationSignature: SignatureBundle;

  /** Propagation status to channels */
  propagationStatus?: PropagationStatus[];
}

/**
 * Reasons for asset revocation
 */
export type RevocationReason =
  | 'compromised'
  | 'superseded'
  | 'error'
  | 'policy_violation'
  | 'expired'
  | 'unauthorized'
  | 'legal_request'
  | 'other';

/**
 * Asset distribution record
 */
export interface AssetDistribution {
  /** Distribution channel */
  channel: DistributionChannel;

  /** Channel-specific identifier */
  channelId?: string;

  /** URL where published */
  url?: string;

  /** When distributed */
  distributedAt: Date;

  /** Distribution status */
  status: 'active' | 'revoked' | 'pending' | 'failed';

  /** Last verification timestamp */
  lastVerifiedAt?: Date;

  /** Verification result */
  verificationResult?: 'intact' | 'modified' | 'removed' | 'unknown';
}

/**
 * Supported distribution channels
 */
export type DistributionChannel =
  | 'website'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'email'
  | 'press_wire'
  | 'api'
  | 'other';

/**
 * Propagation status for revocations
 */
export interface PropagationStatus {
  /** Distribution channel */
  channel: DistributionChannel;

  /** Propagation status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  /** Timestamp of propagation attempt */
  attemptedAt?: Date;

  /** Timestamp of successful propagation */
  completedAt?: Date;

  /** Error message if failed */
  error?: string;
}

// =============================================================================
// Content Verification Types
// =============================================================================

/**
 * Content verification request
 */
export interface ContentVerificationRequest {
  /** Content to verify (file path or buffer) */
  content: string | Buffer;

  /** Original filename */
  filename: string;

  /** MIME type */
  mimeType: string;

  /** Expected content hash (optional) */
  expectedHash?: string;

  /** Verification options */
  options?: VerificationOptions;
}

/**
 * Verification options
 */
export interface VerificationOptions {
  /** Whether to validate C2PA manifest if present */
  validateC2PA?: boolean;

  /** Whether to check for tampering indicators */
  checkTampering?: boolean;

  /** Whether to extract and verify metadata */
  verifyMetadata?: boolean;

  /** Whether to check against known organization assets */
  checkOfficialAssets?: boolean;

  /** Whether to run deepfake detection */
  detectDeepfake?: boolean;

  /** Trust anchors for certificate validation */
  trustAnchors?: string[];

  /** Whether to allow self-signed certificates */
  allowSelfSigned?: boolean;
}

/**
 * Content verification result
 */
export interface ContentVerificationResult {
  /** Unique verification ID */
  verificationId: string;

  /** Overall verification status */
  status: VerificationStatus;

  /** Content hash computed during verification */
  contentHash: string;

  /** C2PA validation result */
  c2paValidation?: C2PAValidationStatus;

  /** C2PA manifest if found */
  c2paManifest?: C2PAManifest;

  /** Whether credentials were stripped */
  credentialsStripped: boolean;

  /** Tampering detection result */
  tamperingResult?: TamperingResult;

  /** Deepfake detection result */
  deepfakeResult?: DeepfakeDetectionResult;

  /** Match against official assets */
  officialAssetMatch?: OfficialAssetMatch;

  /** Verification timestamp */
  verifiedAt: Date;

  /** Warnings and info messages */
  messages: VerificationMessage[];

  /** Risk score (0-100) */
  riskScore: number;

  /** Recommended actions */
  recommendations: string[];
}

/**
 * Verification status
 */
export type VerificationStatus =
  | 'verified'           // Valid C2PA credentials present
  | 'unverified'         // No credentials present
  | 'invalid'            // Credentials present but invalid
  | 'stripped'           // Credentials were removed
  | 'tampered'           // Content appears modified
  | 'suspicious'         // Potential deepfake or impersonation
  | 'official_match'     // Matches official organization asset
  | 'official_mismatch'; // Modified version of official asset

/**
 * Verification message
 */
export interface VerificationMessage {
  /** Message type */
  type: 'error' | 'warning' | 'info';

  /** Message code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Tampering detection result
 */
export interface TamperingResult {
  /** Whether tampering was detected */
  tampered: boolean;

  /** Confidence score (0-1) */
  confidence: number;

  /** Indicators found */
  indicators: TamperingIndicator[];

  /** Analysis method used */
  analysisMethod: string;
}

/**
 * Tampering indicator
 */
export interface TamperingIndicator {
  /** Type of indicator */
  type: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high';

  /** Description of the indicator */
  description: string;

  /** Region where detected (if applicable) */
  region?: C2PARegion;
}

/**
 * Match against official organization asset
 */
export interface OfficialAssetMatch {
  /** Whether a match was found */
  matched: boolean;

  /** Matched asset ID */
  assetId?: string;

  /** Match type */
  matchType?: 'exact' | 'near_duplicate' | 'derivative';

  /** Similarity score (0-1) */
  similarity?: number;

  /** Differences detected */
  differences?: AssetDifference[];

  /** Whether the official asset is still valid */
  officialAssetValid?: boolean;
}

/**
 * Difference between verified content and official asset
 */
export interface AssetDifference {
  /** Type of difference */
  type: 'metadata' | 'content' | 'format' | 'crop' | 'overlay' | 'other';

  /** Description of the difference */
  description: string;

  /** Region affected (if applicable) */
  region?: C2PARegion;

  /** Severity of the difference */
  severity: 'minor' | 'significant' | 'major';
}

// =============================================================================
// Deepfake Detection Types
// =============================================================================

/**
 * Deepfake detection result
 */
export interface DeepfakeDetectionResult {
  /** Whether deepfake was detected */
  isDeepfake: boolean;

  /** Confidence score (0-1) */
  confidence: number;

  /** Detection method used */
  method: string;

  /** Model version */
  modelVersion: string;

  /** Specific indicators */
  indicators: DeepfakeIndicator[];

  /** Face analysis (for videos/images with faces) */
  faceAnalysis?: FaceAnalysisResult[];

  /** Audio analysis (for audio/video) */
  audioAnalysis?: AudioAnalysisResult;

  /** Analysis timestamp */
  analyzedAt: Date;
}

/**
 * Deepfake indicator
 */
export interface DeepfakeIndicator {
  /** Indicator type */
  type: 'face_swap' | 'lip_sync' | 'audio_mismatch' | 'artifact' | 'temporal_inconsistency' | 'other';

  /** Confidence for this indicator (0-1) */
  confidence: number;

  /** Description */
  description: string;

  /** Region affected */
  region?: C2PARegion;

  /** Frame range (for video) */
  frameRange?: { start: number; end: number };
}

/**
 * Face analysis result for deepfake detection
 */
export interface FaceAnalysisResult {
  /** Face bounding box */
  boundingBox: { x: number; y: number; width: number; height: number };

  /** Face ID (for tracking across frames) */
  faceId: string;

  /** Manipulation likelihood (0-1) */
  manipulationScore: number;

  /** Specific issues detected */
  issues: string[];
}

/**
 * Audio analysis result
 */
export interface AudioAnalysisResult {
  /** Whether audio appears synthetic */
  synthetic: boolean;

  /** Confidence score (0-1) */
  confidence: number;

  /** Voice consistency score */
  voiceConsistency: number;

  /** Audio-video sync score (for video) */
  avSyncScore?: number;

  /** Issues detected */
  issues: string[];
}

// =============================================================================
// Impersonation Detection Types
// =============================================================================

/**
 * Impersonation detection request
 */
export interface ImpersonationDetectionRequest {
  /** Content to analyze */
  content: string | Buffer;

  /** Content filename */
  filename: string;

  /** MIME type */
  mimeType: string;

  /** Organization/entity to check impersonation of */
  targetEntity?: string;

  /** Specific persons to check */
  targetPersons?: string[];

  /** Detection options */
  options?: ImpersonationDetectionOptions;
}

/**
 * Impersonation detection options
 */
export interface ImpersonationDetectionOptions {
  /** Check for logo impersonation */
  checkLogos?: boolean;

  /** Check for visual style impersonation */
  checkVisualStyle?: boolean;

  /** Check for voice impersonation */
  checkVoice?: boolean;

  /** Check for face impersonation */
  checkFace?: boolean;

  /** Check for writing style impersonation */
  checkWritingStyle?: boolean;

  /** Sensitivity threshold (0-1) */
  sensitivityThreshold?: number;
}

/**
 * Impersonation detection result
 */
export interface ImpersonationDetectionResult {
  /** Whether impersonation was detected */
  impersonationDetected: boolean;

  /** Overall confidence (0-1) */
  confidence: number;

  /** Impersonation findings */
  findings: ImpersonationFinding[];

  /** Target entities that appear to be impersonated */
  impersonatedEntities: ImpersonatedEntity[];

  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Recommended response */
  recommendedResponse: string;

  /** Analysis timestamp */
  analyzedAt: Date;
}

/**
 * Individual impersonation finding
 */
export interface ImpersonationFinding {
  /** Type of impersonation */
  type: 'logo' | 'brand_visual' | 'voice' | 'face' | 'writing_style' | 'domain' | 'handle';

  /** What was found */
  description: string;

  /** Confidence (0-1) */
  confidence: number;

  /** Evidence details */
  evidence: Record<string, unknown>;

  /** Region where found (if applicable) */
  region?: C2PARegion;
}

/**
 * Impersonated entity details
 */
export interface ImpersonatedEntity {
  /** Entity name */
  name: string;

  /** Entity type */
  type: 'organization' | 'person' | 'brand';

  /** Similarity score (0-1) */
  similarity: number;

  /** Aspects being impersonated */
  impersonatedAspects: string[];

  /** Known legitimate identifiers */
  legitimateIdentifiers?: string[];
}

// =============================================================================
// Truth Bundle Types
// =============================================================================

/**
 * Truth bundle - Response packet for impersonation/deepfake incidents
 */
export interface TruthBundle {
  /** Unique bundle identifier */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Bundle creation timestamp */
  createdAt: Date;

  /** Who created the bundle */
  createdBy: string;

  /** Incident this bundle responds to */
  incident: TruthBundleIncident;

  /** Original official asset (signed) */
  originalAsset: SignedAsset;

  /** The fraudulent/altered content analyzed */
  fraudulentContent: FraudulentContentRecord;

  /** Diff highlights between original and fraudulent */
  diffHighlights: DiffHighlight[];

  /** Timeline of events */
  timeline: TimelineEvent[];

  /** Distribution map of fraudulent content */
  distributionMap: DistributionMapEntry[];

  /** Recommended communications response */
  recommendedResponse: ResponseRecommendation;

  /** Bundle signature */
  signature: SignatureBundle;

  /** Status of the bundle */
  status: 'draft' | 'published' | 'archived';

  /** External references */
  externalReferences?: ExternalReference[];
}

/**
 * Incident that triggered the truth bundle
 */
export interface TruthBundleIncident {
  /** Incident ID */
  id: string;

  /** Incident type */
  type: 'deepfake' | 'impersonation' | 'manipulation' | 'forgery';

  /** When discovered */
  discoveredAt: Date;

  /** How discovered */
  discoveryMethod: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Impact assessment */
  impactAssessment?: string;
}

/**
 * Record of the fraudulent content
 */
export interface FraudulentContentRecord {
  /** Content hash */
  contentHash: string;

  /** Storage location (for evidence) */
  storageUri: string;

  /** First known appearance */
  firstSeenAt: Date;

  /** Where first seen */
  firstSeenLocation: string;

  /** MIME type */
  mimeType: string;

  /** File size */
  fileSize: number;

  /** Extracted metadata */
  metadata: Record<string, unknown>;

  /** Detection results */
  detectionResults: {
    deepfake?: DeepfakeDetectionResult;
    impersonation?: ImpersonationDetectionResult;
    tampering?: TamperingResult;
  };
}

/**
 * Visual diff between original and fraudulent content
 */
export interface DiffHighlight {
  /** Type of difference */
  type: 'visual' | 'audio' | 'text' | 'metadata';

  /** Description of the difference */
  description: string;

  /** Region affected */
  region?: C2PARegion;

  /** Visual representation URL (for visual diffs) */
  visualUrl?: string;

  /** Severity of the difference */
  severity: 'minor' | 'moderate' | 'significant' | 'critical';

  /** Technical details */
  technicalDetails?: Record<string, unknown>;
}

/**
 * Timeline event in the incident
 */
export interface TimelineEvent {
  /** Event timestamp */
  timestamp: Date;

  /** Event type */
  type: string;

  /** Event description */
  description: string;

  /** Source of the event */
  source: string;

  /** Additional data */
  data?: Record<string, unknown>;
}

/**
 * Distribution map entry showing where fraudulent content appeared
 */
export interface DistributionMapEntry {
  /** Platform/channel */
  platform: string;

  /** URL where found */
  url: string;

  /** When first observed */
  firstObserved: Date;

  /** When last observed */
  lastObserved: Date;

  /** Current status */
  status: 'active' | 'removed' | 'flagged' | 'unknown';

  /** Estimated reach/views */
  estimatedReach?: number;

  /** Account/profile that shared it */
  sharedBy?: string;

  /** Engagement metrics */
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
  };
}

/**
 * Recommended response actions
 */
export interface ResponseRecommendation {
  /** Urgency level */
  urgency: 'routine' | 'priority' | 'urgent' | 'emergency';

  /** Recommended actions */
  actions: RecommendedAction[];

  /** Suggested statement template */
  statementTemplate?: string;

  /** Suggested social media response */
  socialMediaResponse?: string;

  /** Suggested press statement */
  pressStatement?: string;

  /** Legal considerations */
  legalConsiderations?: string[];

  /** Stakeholders to notify */
  stakeholdersToNotify?: string[];
}

/**
 * Individual recommended action
 */
export interface RecommendedAction {
  /** Action priority */
  priority: number;

  /** Action description */
  action: string;

  /** Action category */
  category: 'communications' | 'legal' | 'technical' | 'executive';

  /** Suggested timeline */
  suggestedTimeline?: string;

  /** Responsible party */
  responsibleParty?: string;
}

/**
 * External reference in truth bundle
 */
export interface ExternalReference {
  /** Reference type */
  type: 'report' | 'ticket' | 'legal_filing' | 'press_coverage' | 'other';

  /** Reference identifier */
  identifier: string;

  /** Reference URL */
  url?: string;

  /** Reference title */
  title?: string;
}

// =============================================================================
// Governance & Audit Types
// =============================================================================

/**
 * PIG governance configuration
 */
export interface PIGGovernanceConfig {
  /** Tenant ID */
  tenantId: string;

  /** Whether inbound verification is required */
  requireInboundVerification: boolean;

  /** Whether outbound signing is required */
  requireOutboundSigning: boolean;

  /** Asset types that require signing */
  requiredSigningTypes: OfficialAssetType[];

  /** Approval workflow for publishing */
  approvalWorkflow: ApprovalWorkflow;

  /** Revocation policy */
  revocationPolicy: RevocationPolicy;

  /** Deepfake detection thresholds */
  deepfakeThresholds: DeepfakeThresholds;

  /** Impersonation monitoring config */
  impersonationMonitoring: ImpersonationMonitoringConfig;

  /** Audit retention period (days) */
  auditRetentionDays: number;

  /** NIST AI RMF alignment settings */
  nistRmfAlignment?: NISTRMFSettings;
}

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflow {
  /** Whether approval is required */
  enabled: boolean;

  /** Minimum approvers required */
  minApprovers: number;

  /** Roles that can approve */
  approverRoles: string[];

  /** Auto-approve for certain asset types */
  autoApproveTypes?: OfficialAssetType[];

  /** Approval timeout (hours) */
  timeoutHours: number;
}

/**
 * Revocation policy configuration
 */
export interface RevocationPolicy {
  /** Whether immediate revocation is allowed */
  allowImmediateRevocation: boolean;

  /** Require explanation for revocation */
  requireExplanation: boolean;

  /** Auto-propagate revocations to channels */
  autoPropagateRevocations: boolean;

  /** Channels to propagate to */
  propagationChannels: DistributionChannel[];

  /** Retention period for revoked assets (days) */
  revokedAssetRetentionDays: number;
}

/**
 * Deepfake detection thresholds
 */
export interface DeepfakeThresholds {
  /** Confidence threshold for flagging */
  flagThreshold: number;

  /** Confidence threshold for blocking */
  blockThreshold: number;

  /** Whether to auto-flag detected deepfakes */
  autoFlag: boolean;

  /** Whether to auto-block detected deepfakes */
  autoBlock: boolean;
}

/**
 * Impersonation monitoring configuration
 */
export interface ImpersonationMonitoringConfig {
  /** Whether monitoring is enabled */
  enabled: boolean;

  /** Platforms to monitor */
  platforms: string[];

  /** Keywords to watch */
  keywords: string[];

  /** Domains to watch */
  domains: string[];

  /** Executives/persons to monitor */
  monitoredPersons: MonitoredPerson[];

  /** Alert thresholds */
  alertThreshold: number;

  /** Notification settings */
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    webhookUrl?: string;
  };
}

/**
 * Person being monitored for impersonation
 */
export interface MonitoredPerson {
  /** Person name */
  name: string;

  /** Title/role */
  title: string;

  /** Official social handles */
  officialHandles: { platform: string; handle: string }[];

  /** Voice signature ID (for audio matching) */
  voiceSignatureId?: string;

  /** Face encoding ID (for visual matching) */
  faceEncodingId?: string;
}

/**
 * NIST AI RMF alignment settings
 */
export interface NISTRMFSettings {
  /** Risk category mappings */
  riskCategories: { [key: string]: string };

  /** Control mappings */
  controls: { [key: string]: string[] };

  /** Measurement frequencies */
  measurementFrequency: 'daily' | 'weekly' | 'monthly';

  /** Report generation settings */
  reportSettings: {
    generateAutomatically: boolean;
    recipients: string[];
    format: 'pdf' | 'html' | 'json';
  };
}

// =============================================================================
// Narrative Conflict Types
// =============================================================================

/**
 * Narrative cluster - Group of related content spreading a narrative
 */
export interface NarrativeCluster {
  /** Cluster ID */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** Primary narrative theme */
  theme: string;

  /** Keywords associated with this narrative */
  keywords: string[];

  /** Sentiment (-1 to 1) */
  sentiment: number;

  /** Content items in this cluster */
  contentItems: NarrativeContentItem[];

  /** First detected timestamp */
  firstDetected: Date;

  /** Last activity timestamp */
  lastActivity: Date;

  /** Velocity (growth rate) */
  velocity: number;

  /** Estimated reach */
  estimatedReach: number;

  /** Risk assessment */
  riskAssessment: NarrativeRiskAssessment;

  /** Related entities (organizations, people) */
  relatedEntities: string[];

  /** Source analysis */
  sourceAnalysis: SourceAnalysis;

  /** Status */
  status: 'active' | 'declining' | 'dormant' | 'resolved';
}

/**
 * Individual content item in a narrative cluster
 */
export interface NarrativeContentItem {
  /** Item ID */
  id: string;

  /** URL where found */
  url: string;

  /** Platform */
  platform: string;

  /** Content snippet/summary */
  snippet: string;

  /** Timestamp */
  timestamp: Date;

  /** Author/account */
  author: string;

  /** Engagement metrics */
  engagement: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  };

  /** Verification status */
  verificationStatus?: VerificationStatus;

  /** Content hash */
  contentHash?: string;
}

/**
 * Narrative risk assessment
 */
export interface NarrativeRiskAssessment {
  /** Overall risk score (0-100) */
  overallScore: number;

  /** Risk category */
  category: 'low' | 'medium' | 'high' | 'critical';

  /** Risk factors */
  factors: RiskFactor[];

  /** Potential impact areas */
  impactAreas: string[];

  /** Whether this appears to be coordinated */
  coordinatedBehavior: boolean;

  /** DSA systemic risk indicators (EU compliance) */
  dsaSystemicRisk?: DSASystemicRisk;
}

/**
 * Individual risk factor
 */
export interface RiskFactor {
  /** Factor name */
  name: string;

  /** Factor weight (0-1) */
  weight: number;

  /** Factor score (0-100) */
  score: number;

  /** Explanation */
  explanation: string;
}

/**
 * DSA systemic risk assessment (EU compliance)
 */
export interface DSASystemicRisk {
  /** Whether systemic risk is indicated */
  indicated: boolean;

  /** Risk type per DSA Article 34 */
  riskTypes: DSARiskType[];

  /** Mitigation measures applied */
  mitigationMeasures: string[];

  /** Report reference */
  reportReference?: string;
}

/**
 * DSA risk types per Article 34
 */
export type DSARiskType =
  | 'illegal_content_dissemination'
  | 'fundamental_rights_negative_effects'
  | 'civic_discourse_negative_effects'
  | 'electoral_processes_negative_effects'
  | 'public_security_negative_effects'
  | 'public_health_negative_effects'
  | 'minors_protection_negative_effects'
  | 'gender_based_violence'
  | 'mental_health_negative_effects';

/**
 * Source analysis for a narrative
 */
export interface SourceAnalysis {
  /** Source distribution */
  sourceDistribution: { source: string; percentage: number }[];

  /** Geographic distribution */
  geoDistribution: { country: string; percentage: number }[];

  /** Account age distribution */
  accountAgeDistribution: { range: string; percentage: number }[];

  /** Bot/automation indicators */
  automationIndicators: {
    suspectedBotPercentage: number;
    coordinatedPostingPatterns: boolean;
    unusualEngagementPatterns: boolean;
  };

  /** Amplification patterns */
  amplificationPatterns: {
    superSpreadersCount: number;
    averageRepostDepth: number;
  };
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Sign asset request
 */
export interface SignAssetRequest {
  /** Asset title */
  title: string;

  /** Asset description */
  description?: string;

  /** Asset type */
  assetType: OfficialAssetType;

  /** Content (file path or buffer) */
  content: string | Buffer;

  /** Original filename */
  filename: string;

  /** MIME type */
  mimeType: string;

  /** Classification level */
  classification?: string;

  /** Expiration date */
  expiresAt?: Date;

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Distribution channels to publish to */
  distributeToChannels?: DistributionChannel[];

  /** Whether to skip approval workflow */
  skipApproval?: boolean;
}

/**
 * Sign asset response
 */
export interface SignAssetResponse {
  /** Created asset */
  asset: SignedAsset;

  /** Approval status (if workflow enabled) */
  approvalStatus?: 'pending' | 'approved' | 'auto_approved';

  /** Distribution results */
  distributionResults?: { channel: DistributionChannel; success: boolean; url?: string; error?: string }[];
}

/**
 * Revoke asset request
 */
export interface RevokeAssetRequest {
  /** Asset ID to revoke */
  assetId: string;

  /** Revocation reason */
  reason: RevocationReason;

  /** Detailed explanation */
  explanation?: string;

  /** Replacement asset ID (if superseding) */
  replacementId?: string;

  /** Whether to propagate to distribution channels */
  propagateRevocation?: boolean;
}

/**
 * Revoke asset response
 */
export interface RevokeAssetResponse {
  /** Updated asset */
  asset: SignedAsset;

  /** Propagation results */
  propagationResults?: PropagationStatus[];
}

/**
 * Generate truth bundle request
 */
export interface GenerateTruthBundleRequest {
  /** Official asset ID */
  originalAssetId: string;

  /** Fraudulent content (file or URL) */
  fraudulentContent: string | Buffer;

  /** Fraudulent content source URL */
  fraudulentContentUrl?: string;

  /** Incident type */
  incidentType: 'deepfake' | 'impersonation' | 'manipulation' | 'forgery';

  /** Incident severity */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Additional context */
  context?: string;

  /** Whether to auto-generate response recommendations */
  generateRecommendations?: boolean;
}

/**
 * Generate truth bundle response
 */
export interface GenerateTruthBundleResponse {
  /** Generated truth bundle */
  bundle: TruthBundle;

  /** Analysis results */
  analysisResults: {
    deepfake?: DeepfakeDetectionResult;
    impersonation?: ImpersonationDetectionResult;
    tampering?: TamperingResult;
    officialMatch?: OfficialAssetMatch;
  };
}

// =============================================================================
// PIG Service Events
// =============================================================================

/**
 * Events emitted by the PIG service
 */
export interface PIGEvents {
  'asset:signed': { asset: SignedAsset };
  'asset:revoked': { asset: SignedAsset; revocation: AssetRevocation };
  'asset:published': { asset: SignedAsset; channel: DistributionChannel; url: string };
  'content:verified': { result: ContentVerificationResult };
  'deepfake:detected': { result: DeepfakeDetectionResult; content: { hash: string; filename: string } };
  'impersonation:detected': { result: ImpersonationDetectionResult; content: { hash: string; filename: string } };
  'truthbundle:generated': { bundle: TruthBundle };
  'narrative:detected': { cluster: NarrativeCluster };
  'narrative:escalated': { cluster: NarrativeCluster; reason: string };
  'revocation:propagated': { assetId: string; status: PropagationStatus[] };
}
