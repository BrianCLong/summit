/**
 * Core Federation Types
 *
 * Defines the data contracts for cross-org intel exchange.
 * All sharing is policy-bound and audited.
 */

import { z } from 'zod';

/**
 * Classification levels for data sharing
 */
export enum ClassificationLevel {
  UNCLASSIFIED = 'UNCLASSIFIED',
  CUI = 'CUI', // Controlled Unclassified Information
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
}

/**
 * Jurisdiction/region for data sovereignty
 */
export enum Jurisdiction {
  US = 'US',
  EU = 'EU',
  UK = 'UK',
  FVEY = 'FVEY', // Five Eyes
  NATO = 'NATO',
  GLOBAL = 'GLOBAL',
}

/**
 * Types of objects that can be shared
 */
export enum ShareableObjectType {
  ENTITY = 'ENTITY',
  RELATIONSHIP = 'RELATIONSHIP',
  CASE = 'CASE',
  ALERT = 'ALERT',
  IOC = 'IOC', // Indicator of Compromise
  DOCUMENT = 'DOCUMENT',
  ANALYSIS = 'ANALYSIS',
}

/**
 * Sharing patterns/models
 */
export enum SharingMode {
  PUSH = 'PUSH', // Sender pushes to receiver
  PULL = 'PULL', // Receiver queries from sender
  SUBSCRIPTION = 'SUBSCRIPTION', // Real-time push on events
}

/**
 * License terms for shared data
 */
export enum LicenseType {
  TLP_WHITE = 'TLP:WHITE', // Public sharing
  TLP_GREEN = 'TLP:GREEN', // Community sharing
  TLP_AMBER = 'TLP:AMBER', // Limited distribution
  TLP_RED = 'TLP:RED', // No distribution
  CUSTOM = 'CUSTOM',
}

/**
 * Status of a sharing agreement
 */
export enum AgreementStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

/**
 * Represents an organization that can participate in federation
 */
export interface FederationPartner {
  id: string;
  name: string;
  organizationId: string; // Maps to internal org/tenant
  jurisdiction: Jurisdiction;
  publicKey: string; // For message signing/verification
  certificateFingerprint?: string; // For mTLS
  endpointUrl: string; // Federation endpoint
  contactEmail: string;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Policy constraints for data sharing
 */
export interface SharingPolicyConstraints {
  // Classification constraints
  maxClassificationLevel: ClassificationLevel;
  allowedJurisdictions: Jurisdiction[];

  // Object type constraints
  allowedObjectTypes: ShareableObjectType[];

  // Field-level constraints
  redactionRules?: RedactionRule[];

  // License terms
  licenseType: LicenseType;
  customLicenseTerms?: string;

  // Usage constraints
  allowDownstreamSharing: boolean; // Can recipient reshare?
  retentionPeriodDays?: number; // Max retention

  // Additional constraints
  requiresApproval?: boolean; // Manual approval per share
  notificationEmail?: string; // Notify on share
}

/**
 * Rules for redacting/transforming data
 */
export interface RedactionRule {
  field: string; // JSONPath or field name
  action: 'redact' | 'pseudonymize' | 'hash' | 'remove';
  replacement?: string; // For redact/pseudonymize
  condition?: string; // Optional condition (e.g., "classification > SECRET")
}

/**
 * A formal sharing agreement between two partners
 */
export interface SharingAgreement {
  id: string;
  name: string;
  description?: string;

  // Parties
  sourcePartnerId: string; // Who shares
  targetPartnerId: string; // Who receives

  // Policy
  policyConstraints: SharingPolicyConstraints;

  // Operational
  sharingMode: SharingMode;
  channels?: string[]; // FederationChannel IDs

  // Status
  status: AgreementStatus;
  effectiveDate?: Date;
  expirationDate?: Date;

  // Governance
  approvedBy?: string;
  approvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Communication channel for federation
 */
export interface FederationChannel {
  id: string;
  name: string;
  agreementId: string;

  // Transport
  protocol: 'https' | 'stix-taxii' | 'kafka';
  endpointUrl: string;

  // Security
  tlsEnabled: boolean;
  mutualTlsRequired: boolean;
  signMessages: boolean;

  // Operational
  status: 'active' | 'inactive';
  lastUsedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Reference to a shared object with mapping
 */
export interface SharedObjectRef {
  id: string; // Unique share ref ID

  // Original object
  sourceObjectId: string; // Original ID in source system
  sourceObjectType: ShareableObjectType;
  sourceOrganizationId: string;

  // Target object
  targetObjectId?: string; // Mapped ID in target system (if imported)
  targetOrganizationId: string;

  // Sharing context
  agreementId: string;
  channelId?: string;

  // Provenance
  sharedAt: Date;
  sharedBy: string; // User or service
  provenanceChain: string[]; // IDs of prov-ledger entries

  // State
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expiresAt?: Date;

  metadata?: Record<string, unknown>;
}

/**
 * A package of data being shared
 */
export interface SharePackage {
  id: string;
  agreementId: string;
  channelId?: string;

  // Objects
  objects: SharedObject[];

  // Metadata
  sharedAt: Date;
  sharedBy: string;
  signature?: string; // Digital signature

  // Provenance
  provenanceLinks: string[]; // Links to prov-ledger
}

/**
 * A single object in a share package
 */
export interface SharedObject {
  id: string; // Original object ID
  type: ShareableObjectType;

  // Data (already redacted/transformed per policy)
  data: Record<string, unknown>;

  // Metadata
  classification: ClassificationLevel;
  jurisdiction: Jurisdiction;
  license: LicenseType;

  // Provenance
  originalId: string;
  sourceOrganization: string;
  createdAt: Date;
  modifiedAt?: Date;

  // Redaction info
  redactedFields?: string[]; // Which fields were redacted
  transformationApplied?: boolean;
}

/**
 * Subscription for real-time federation
 */
export interface FederationSubscription {
  id: string;
  agreementId: string;
  channelId?: string;

  // Filter
  objectTypes: ShareableObjectType[];
  filter?: Record<string, unknown>; // Additional filter criteria

  // Delivery
  webhookUrl?: string;
  callbackToken?: string;

  // Status
  status: 'active' | 'paused' | 'inactive';
  lastDeliveryAt?: Date;
  deliveryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audit log entry for federation operations
 */
export interface FederationAuditLog {
  id: string;
  timestamp: Date;

  // Operation
  operation: 'share_push' | 'share_pull' | 'subscription_deliver' | 'agreement_create' | 'agreement_modify';

  // Context
  agreementId?: string;
  channelId?: string;
  partnerId?: string;
  userId?: string;

  // Details
  objectCount?: number;
  objectTypes?: ShareableObjectType[];

  // Result
  success: boolean;
  errorMessage?: string;

  // Provenance
  provenanceIds?: string[];

  metadata?: Record<string, unknown>;
}

/**
 * Zod schemas for validation
 */

export const FederationPartnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  organizationId: z.string(),
  jurisdiction: z.nativeEnum(Jurisdiction),
  publicKey: z.string(),
  certificateFingerprint: z.string().optional(),
  endpointUrl: z.string().url(),
  contactEmail: z.string().email(),
  status: z.enum(['active', 'suspended', 'inactive']),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const SharingAgreementSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  sourcePartnerId: z.string().uuid(),
  targetPartnerId: z.string().uuid(),
  policyConstraints: z.object({
    maxClassificationLevel: z.nativeEnum(ClassificationLevel),
    allowedJurisdictions: z.array(z.nativeEnum(Jurisdiction)),
    allowedObjectTypes: z.array(z.nativeEnum(ShareableObjectType)),
    redactionRules: z.array(z.object({
      field: z.string(),
      action: z.enum(['redact', 'pseudonymize', 'hash', 'remove']),
      replacement: z.string().optional(),
      condition: z.string().optional(),
    })).optional(),
    licenseType: z.nativeEnum(LicenseType),
    customLicenseTerms: z.string().optional(),
    allowDownstreamSharing: z.boolean(),
    retentionPeriodDays: z.number().optional(),
    requiresApproval: z.boolean().optional(),
    notificationEmail: z.string().email().optional(),
  }),
  sharingMode: z.nativeEnum(SharingMode),
  channels: z.array(z.string().uuid()).optional(),
  status: z.nativeEnum(AgreementStatus),
  effectiveDate: z.date().optional(),
  expirationDate: z.date().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const SharedObjectSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(ShareableObjectType),
  data: z.record(z.unknown()),
  classification: z.nativeEnum(ClassificationLevel),
  jurisdiction: z.nativeEnum(Jurisdiction),
  license: z.nativeEnum(LicenseType),
  originalId: z.string(),
  sourceOrganization: z.string(),
  createdAt: z.date(),
  modifiedAt: z.date().optional(),
  redactedFields: z.array(z.string()).optional(),
  transformationApplied: z.boolean().optional(),
});
