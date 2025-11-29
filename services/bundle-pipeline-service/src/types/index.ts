/**
 * Evidence Bundle & Briefing Pipeline - Core Type Definitions
 * Provides comprehensive type safety for all bundle and briefing operations
 */

import { z } from 'zod';

// ============================================================================
// Classification & Security
// ============================================================================

export type ClassificationLevel =
  | 'UNCLASSIFIED'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP_SECRET'
  | 'SCI';

export type SensitivityMarking =
  | 'FOUO'
  | 'LES'
  | 'NOFORN'
  | 'ORCON'
  | 'RELTO'
  | 'PROPIN';

export type LicenseType =
  | 'FOIA_EXEMPT'
  | 'PROPRIETARY'
  | 'PUBLIC_DOMAIN'
  | 'RESTRICTED'
  | 'COURT_ORDER'
  | 'WARRANT_REQUIRED'
  | 'INTERNAL_USE_ONLY';

// ============================================================================
// Evidence & Claims
// ============================================================================

export interface EvidenceItem {
  id: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'data' | 'testimony' | 'artifact';
  title: string;
  description?: string;
  sourceUri: string;
  contentHash: string;
  mimeType: string;
  sizeBytes: number;
  collectedAt: string;
  collectedBy: string;
  chainOfCustodyHash: string;
  classificationLevel: ClassificationLevel;
  sensitivityMarkings: SensitivityMarking[];
  licenseType: LicenseType;
  metadata: Record<string, unknown>;
}

export interface ClaimItem {
  id: string;
  statement: string;
  confidence: number; // 0-1
  source: 'human' | 'ai' | 'system' | 'external';
  createdBy: string;
  createdAt: string;
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  status: 'draft' | 'pending_review' | 'approved' | 'disputed' | 'retracted';
  provenanceHash: string;
  entityRefs: EntityReference[];
  tags: string[];
}

export interface EntityReference {
  entityId: string;
  entityType: string;
  role: string;
  confidence: number;
}

// ============================================================================
// Bundle Models
// ============================================================================

export interface BundleManifest {
  version: string;
  bundleId: string;
  bundleType: 'evidence' | 'claim' | 'briefing';
  createdAt: string;
  createdBy: string;
  rootHash: string;
  itemHashes: Array<{
    itemId: string;
    itemType: string;
    contentHash: string;
    path: string;
  }>;
  provenanceChainId: string;
  signatures: BundleSignature[];
}

export interface BundleSignature {
  signerId: string;
  signerRole: string;
  algorithm: 'ed25519' | 'rsa-sha256';
  signature: string;
  signedAt: string;
  keyId: string;
}

export interface EvidenceBundle {
  id: string;
  caseId: string;
  tenantId: string;
  title: string;
  description?: string;

  // Content
  evidenceItems: EvidenceItem[];
  relatedEntityIds: string[];

  // Security & Compliance
  classificationLevel: ClassificationLevel;
  sensitivityMarkings: SensitivityMarking[];
  licenseRestrictions: LicenseRestriction[];
  legalHolds: LegalHoldReference[];
  warrantMetadata?: WarrantMetadata;

  // Provenance
  manifest: BundleManifest;
  provenanceChainId: string;
  chainOfCustodyEvents: ChainOfCustodyEvent[];

  // Lifecycle
  status: BundleStatus;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  publishedAt?: string;
  expiresAt?: string;

  // Approvals
  approvals: ApprovalRecord[];
  requiredApprovals: number;

  metadata: Record<string, unknown>;
}

export interface ClaimBundle {
  id: string;
  caseId: string;
  tenantId: string;
  title: string;
  description?: string;

  // Content
  claims: ClaimItem[];
  supportingEvidenceBundleIds: string[];
  relatedEntityIds: string[];

  // Analysis
  overallConfidence: number;
  conflictingClaimsCount: number;
  assessmentSummary?: string;

  // Security & Compliance
  classificationLevel: ClassificationLevel;
  sensitivityMarkings: SensitivityMarking[];

  // Provenance
  manifest: BundleManifest;
  provenanceChainId: string;

  // Lifecycle
  status: BundleStatus;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  publishedAt?: string;

  // Approvals
  approvals: ApprovalRecord[];
  requiredApprovals: number;

  metadata: Record<string, unknown>;
}

export interface BriefingPackage {
  id: string;
  caseId: string;
  tenantId: string;
  title: string;
  briefingType: BriefingType;

  // Content Sources
  evidenceBundleIds: string[];
  claimBundleIds: string[];
  additionalSources: ExternalSource[];

  // Generated Content
  executiveSummary: string;
  narrativeSections: NarrativeSection[];
  keyFindings: KeyFinding[];
  recommendations: Recommendation[];
  annexes: Annex[];

  // Presentation
  slideDecks?: SlideDeck[];
  visualizations: Visualization[];

  // Security & Compliance
  classificationLevel: ClassificationLevel;
  sensitivityMarkings: SensitivityMarking[];
  redactionLog: RedactionLogEntry[];

  // Provenance
  manifest: BundleManifest;
  provenanceChainId: string;
  citationIndex: CitationEntry[];

  // Lifecycle
  status: BundleStatus;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  publishedAt?: string;
  distributionList: string[];

  // Approvals
  approvals: ApprovalRecord[];
  requiredApprovals: number;
  fourEyesRequired: boolean;

  // Delivery
  deliveryChannels: DeliveryChannel[];
  deliveryStatus: DeliveryStatus[];

  metadata: Record<string, unknown>;
}

// ============================================================================
// Supporting Types
// ============================================================================

export type BundleStatus =
  | 'draft'
  | 'assembling'
  | 'pending_review'
  | 'pending_approval'
  | 'approved'
  | 'published'
  | 'superseded'
  | 'retracted'
  | 'archived';

export type BriefingType =
  | 'situation_report'
  | 'intelligence_assessment'
  | 'case_summary'
  | 'executive_brief'
  | 'threat_report'
  | 'risk_assessment'
  | 'daily_digest'
  | 'custom';

export interface LicenseRestriction {
  licenseType: LicenseType;
  scope: 'full_bundle' | 'specific_items';
  affectedItemIds?: string[];
  restrictions: string[];
  expiresAt?: string;
}

export interface LegalHoldReference {
  holdId: string;
  caseId: string;
  reason: string;
  appliedAt: string;
  appliedBy: string;
  scope: 'full' | 'partial';
  affectedItemIds?: string[];
}

export interface WarrantMetadata {
  warrantId: string;
  issueDate: string;
  issuingAuthority: string;
  scope: string;
  expiresAt?: string;
  restrictions: string[];
}

export interface ChainOfCustodyEvent {
  id: string;
  eventType: 'collected' | 'transferred' | 'accessed' | 'modified' | 'exported' | 'verified';
  timestamp: string;
  actorId: string;
  actorRole: string;
  description: string;
  prevHash: string;
  eventHash: string;
  signature: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalRecord {
  id: string;
  approverId: string;
  approverRole: string;
  decision: 'approved' | 'rejected' | 'pending';
  comments?: string;
  decidedAt?: string;
  conditions?: string[];
}

export interface NarrativeSection {
  id: string;
  title: string;
  content: string;
  order: number;
  citations: string[];
  generatedBy: 'human' | 'ai' | 'template';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface KeyFinding {
  id: string;
  summary: string;
  confidence: number;
  supportingClaimIds: string[];
  supportingEvidenceIds: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'immediate' | 'short_term' | 'long_term';
  assignedTo?: string;
  dueDate?: string;
  status: 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
}

export interface Annex {
  id: string;
  title: string;
  type: 'raw_document' | 'extract' | 'log' | 'timeline' | 'network_graph' | 'table' | 'custom';
  contentUri: string;
  contentHash: string;
  mimeType: string;
  sizeBytes: number;
  order: number;
  description?: string;
}

export interface SlideDeck {
  id: string;
  title: string;
  slides: Slide[];
  theme: string;
  createdAt: string;
  format: 'pptx' | 'pdf' | 'html';
  outputUri?: string;
}

export interface Slide {
  id: string;
  order: number;
  title: string;
  layout: 'title' | 'content' | 'two_column' | 'chart' | 'image' | 'bullets';
  content: SlideContent;
  notes?: string;
}

export interface SlideContent {
  heading?: string;
  body?: string;
  bullets?: string[];
  imageUri?: string;
  chartData?: Record<string, unknown>;
  tableData?: string[][];
}

export interface Visualization {
  id: string;
  type: 'network_graph' | 'timeline' | 'heatmap' | 'chart' | 'map' | 'diagram';
  title: string;
  data: Record<string, unknown>;
  config: Record<string, unknown>;
  outputUri?: string;
  format: 'svg' | 'png' | 'pdf' | 'interactive';
}

export interface RedactionLogEntry {
  timestamp: string;
  field: string;
  action: 'redact' | 'mask' | 'remove';
  reason: string;
  authorizedBy: string;
  originalHash?: string;
}

export interface CitationEntry {
  id: string;
  sourceType: 'evidence' | 'claim' | 'external';
  sourceId: string;
  title: string;
  location?: string;
  accessedAt: string;
  verifiedHash?: string;
}

export interface ExternalSource {
  id: string;
  type: 'database' | 'api' | 'file' | 'url';
  uri: string;
  description?: string;
  accessedAt: string;
  contentHash?: string;
}

export interface DeliveryChannel {
  type: 'evidence_store' | 'email' | 'api_webhook' | 'secure_portal' | 'physical';
  config: Record<string, unknown>;
  recipients: string[];
  priority: 'immediate' | 'scheduled' | 'on_demand';
}

export interface DeliveryStatus {
  channelType: string;
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged';
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateEvidenceBundleRequest {
  caseId: string;
  title: string;
  description?: string;
  evidenceIds: string[];
  classificationLevel: ClassificationLevel;
  sensitivityMarkings?: SensitivityMarking[];
  metadata?: Record<string, unknown>;
}

export interface CreateClaimBundleRequest {
  caseId: string;
  title: string;
  description?: string;
  claimIds: string[];
  evidenceBundleIds?: string[];
  classificationLevel: ClassificationLevel;
  sensitivityMarkings?: SensitivityMarking[];
  metadata?: Record<string, unknown>;
}

export interface CreateBriefingPackageRequest {
  caseId: string;
  title: string;
  briefingType: BriefingType;
  evidenceBundleIds?: string[];
  claimBundleIds?: string[];
  templateId?: string;
  includeExecutiveSummary: boolean;
  includeSlideDecks: boolean;
  generateNarrativeWithAI: boolean;
  classificationLevel: ClassificationLevel;
  sensitivityMarkings?: SensitivityMarking[];
  distributionList?: string[];
  deliveryChannels?: DeliveryChannel[];
  scheduleAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BundleApprovalRequest {
  bundleId: string;
  bundleType: 'evidence' | 'claim' | 'briefing';
  decision: 'approved' | 'rejected';
  comments?: string;
  conditions?: string[];
}

export interface PublishBundleRequest {
  bundleId: string;
  bundleType: 'evidence' | 'claim' | 'briefing';
  deliveryChannels?: DeliveryChannel[];
  notifyRecipients: boolean;
}

export interface ScheduleBriefingRequest {
  caseId: string;
  briefingType: BriefingType;
  templateId?: string;
  schedule: ScheduleConfig;
  deliveryChannels: DeliveryChannel[];
  recipients: string[];
}

export interface ScheduleConfig {
  type: 'once' | 'recurring';
  cronExpression?: string;
  runAt?: string;
  timezone: string;
  endAfterOccurrences?: number;
  endAt?: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const ClassificationLevelSchema = z.enum([
  'UNCLASSIFIED',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
  'SCI',
]);

export const SensitivityMarkingSchema = z.enum([
  'FOUO',
  'LES',
  'NOFORN',
  'ORCON',
  'RELTO',
  'PROPIN',
]);

export const BriefingTypeSchema = z.enum([
  'situation_report',
  'intelligence_assessment',
  'case_summary',
  'executive_brief',
  'threat_report',
  'risk_assessment',
  'daily_digest',
  'custom',
]);

export const CreateEvidenceBundleRequestSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string().uuid()).min(1),
  classificationLevel: ClassificationLevelSchema,
  sensitivityMarkings: z.array(SensitivityMarkingSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateClaimBundleRequestSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  claimIds: z.array(z.string().uuid()).min(1),
  evidenceBundleIds: z.array(z.string().uuid()).optional(),
  classificationLevel: ClassificationLevelSchema,
  sensitivityMarkings: z.array(SensitivityMarkingSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateBriefingPackageRequestSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1).max(500),
  briefingType: BriefingTypeSchema,
  evidenceBundleIds: z.array(z.string().uuid()).optional(),
  claimBundleIds: z.array(z.string().uuid()).optional(),
  templateId: z.string().uuid().optional(),
  includeExecutiveSummary: z.boolean().default(true),
  includeSlideDecks: z.boolean().default(false),
  generateNarrativeWithAI: z.boolean().default(false),
  classificationLevel: ClassificationLevelSchema,
  sensitivityMarkings: z.array(SensitivityMarkingSchema).optional(),
  distributionList: z.array(z.string()).optional(),
  deliveryChannels: z.array(z.object({
    type: z.enum(['evidence_store', 'email', 'api_webhook', 'secure_portal', 'physical']),
    config: z.record(z.unknown()),
    recipients: z.array(z.string()),
    priority: z.enum(['immediate', 'scheduled', 'on_demand']),
  })).optional(),
  scheduleAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const BundleApprovalRequestSchema = z.object({
  bundleId: z.string().uuid(),
  bundleType: z.enum(['evidence', 'claim', 'briefing']),
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(5000).optional(),
  conditions: z.array(z.string()).optional(),
});
