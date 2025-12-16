/**
 * CompanyOS Tenant Types
 *
 * Implements A1: Tenant Lifecycle Management
 */

// ============================================================================
// Enums
// ============================================================================

export enum TenantStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETION_REQUESTED = 'DELETION_REQUESTED',
  DELETED = 'DELETED',
}

export enum TenantTier {
  STARTER = 'STARTER',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TenantAdminRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  BILLING_ADMIN = 'BILLING_ADMIN',
  SECURITY_REVIEWER = 'SECURITY_REVIEWER',
}

export enum AuditEventCategory {
  TENANT_LIFECYCLE = 'tenant_lifecycle',
  USER_MANAGEMENT = 'user_management',
  FEATURE_FLAGS = 'feature_flags',
  SECURITY = 'security',
  BILLING = 'billing',
  DATA_ACCESS = 'data_access',
  CONFIGURATION = 'configuration',
}

export enum AuditEventOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
}

// ============================================================================
// Tenant Interfaces
// ============================================================================

export interface TenantQuotas {
  apiCallsPerHour: number;
  storageGb: number;
  usersMax: number;
  exportCallsPerDay: number;
}

export interface TenantFeatures {
  copilotEnabled?: boolean;
  advancedAnalytics?: boolean;
  customIntegrations?: boolean;
  ssoEnabled?: boolean;
  auditLogExport?: boolean;
  apiAccessEnabled?: boolean;
  [key: string]: boolean | undefined;
}

export interface Tenant {
  id: string;
  externalId: string;
  name: string;
  displayName?: string;
  status: TenantStatus;
  tier: TenantTier;

  // Region and residency
  region: string;
  residencyClass: string;
  allowedRegions: string[];

  // Configuration
  features: TenantFeatures;
  quotas: TenantQuotas;

  // Contact information
  primaryContactEmail?: string;
  primaryContactName?: string;
  billingEmail?: string;

  // Metadata
  metadata: Record<string, unknown>;
  tags: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  suspendedAt?: Date;
  deletionRequestedAt?: Date;
  deletedAt?: Date;

  // Created by
  createdBy: string;
}

export interface TenantStatusTransition {
  id: string;
  tenantId: string;
  fromStatus?: TenantStatus;
  toStatus: TenantStatus;
  reason?: string;
  performedBy: string;
  performedAt: Date;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export interface TenantAdmin {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  displayName?: string;
  role: TenantAdminRole;
  status: string;
  invitedAt: Date;
  acceptedAt?: Date;
  invitedBy: string;
  metadata: Record<string, unknown>;
}

export interface TenantOnboarding {
  id: string;
  tenantId: string;

  // Checklist steps
  stepMetadataComplete: boolean;
  stepAdminAssigned: boolean;
  stepFeaturesConfigured: boolean;
  stepQuotasSet: boolean;
  stepWelcomeSent: boolean;
  stepVerified: boolean;

  // Step timestamps
  metadataCompletedAt?: Date;
  adminAssignedAt?: Date;
  featuresConfiguredAt?: Date;
  quotasSetAt?: Date;
  welcomeSentAt?: Date;
  verifiedAt?: Date;

  // Overall
  startedAt: Date;
  completedAt?: Date;
  completedBy?: string;

  // Onboarding bundle
  onboardingBundle: OnboardingBundle;
}

export interface OnboardingBundle {
  tenant: Partial<Tenant>;
  admins: Array<{ email: string; role: TenantAdminRole; displayName?: string }>;
  features: TenantFeatures;
  quotas: TenantQuotas;
  createdAt: string;
  version: string;
}

// ============================================================================
// Audit Event Interfaces
// ============================================================================

export interface AuditEvent {
  id: string;
  eventType: string;
  eventCategory: AuditEventCategory;
  eventAction: string;

  // Actor
  actorId?: string;
  actorEmail?: string;
  actorType: string;
  actorRoles?: string[];

  // Tenant
  tenantId?: string;

  // Resource
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;

  // Details
  description?: string;
  details: Record<string, unknown>;

  // Request context
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;

  // Outcome
  outcome: AuditEventOutcome;
  errorMessage?: string;

  // Timestamps
  occurredAt: Date;
  recordedAt: Date;

  // Retention
  retentionDays: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateTenantInput {
  externalId: string;
  name: string;
  displayName?: string;
  tier?: TenantTier;
  region?: string;
  residencyClass?: string;
  allowedRegions?: string[];
  features?: Partial<TenantFeatures>;
  quotas?: Partial<TenantQuotas>;
  primaryContactEmail?: string;
  primaryContactName?: string;
  billingEmail?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateTenantInput {
  name?: string;
  displayName?: string;
  tier?: TenantTier;
  features?: Partial<TenantFeatures>;
  quotas?: Partial<TenantQuotas>;
  primaryContactEmail?: string;
  primaryContactName?: string;
  billingEmail?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface ActivateTenantInput {
  reason?: string;
}

export interface SuspendTenantInput {
  reason: string;
}

export interface RequestTenantDeletionInput {
  reason: string;
  confirmationToken?: string;
}

export interface AssignTenantAdminInput {
  email: string;
  displayName?: string;
  role?: TenantAdminRole;
}

export interface AuditEventFilter {
  tenantId?: string;
  actorId?: string;
  eventType?: string;
  eventCategory?: AuditEventCategory;
  resourceType?: string;
  resourceId?: string;
  outcome?: AuditEventOutcome;
  fromDate?: Date;
  toDate?: Date;
  searchQuery?: string;
}

export interface TenantFilter {
  status?: TenantStatus;
  tier?: TenantTier;
  region?: string;
  searchQuery?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface TenantLifecycleResult {
  success: boolean;
  tenant: Tenant;
  transition?: TenantStatusTransition;
  message: string;
}

export interface OnboardingResult {
  success: boolean;
  tenant: Tenant;
  onboarding: TenantOnboarding;
  bundle: OnboardingBundle;
  nextSteps: string[];
}

export interface PaginatedAuditEvents {
  events: AuditEvent[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedTenants {
  tenants: Tenant[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_QUOTAS: Record<TenantTier, TenantQuotas> = {
  [TenantTier.STARTER]: {
    apiCallsPerHour: 1000,
    storageGb: 10,
    usersMax: 5,
    exportCallsPerDay: 5,
  },
  [TenantTier.BRONZE]: {
    apiCallsPerHour: 5000,
    storageGb: 50,
    usersMax: 25,
    exportCallsPerDay: 20,
  },
  [TenantTier.SILVER]: {
    apiCallsPerHour: 10000,
    storageGb: 100,
    usersMax: 100,
    exportCallsPerDay: 50,
  },
  [TenantTier.GOLD]: {
    apiCallsPerHour: 50000,
    storageGb: 500,
    usersMax: 500,
    exportCallsPerDay: 200,
  },
  [TenantTier.ENTERPRISE]: {
    apiCallsPerHour: 100000,
    storageGb: 2000,
    usersMax: 10000,
    exportCallsPerDay: 1000,
  },
};

export const DEFAULT_FEATURES: Record<TenantTier, TenantFeatures> = {
  [TenantTier.STARTER]: {
    copilotEnabled: false,
    advancedAnalytics: false,
    customIntegrations: false,
    ssoEnabled: false,
    auditLogExport: false,
    apiAccessEnabled: true,
  },
  [TenantTier.BRONZE]: {
    copilotEnabled: true,
    advancedAnalytics: false,
    customIntegrations: false,
    ssoEnabled: false,
    auditLogExport: false,
    apiAccessEnabled: true,
  },
  [TenantTier.SILVER]: {
    copilotEnabled: true,
    advancedAnalytics: true,
    customIntegrations: false,
    ssoEnabled: true,
    auditLogExport: false,
    apiAccessEnabled: true,
  },
  [TenantTier.GOLD]: {
    copilotEnabled: true,
    advancedAnalytics: true,
    customIntegrations: true,
    ssoEnabled: true,
    auditLogExport: true,
    apiAccessEnabled: true,
  },
  [TenantTier.ENTERPRISE]: {
    copilotEnabled: true,
    advancedAnalytics: true,
    customIntegrations: true,
    ssoEnabled: true,
    auditLogExport: true,
    apiAccessEnabled: true,
  },
};

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
  [TenantStatus.PENDING]: [TenantStatus.ACTIVE, TenantStatus.DELETED],
  [TenantStatus.ACTIVE]: [TenantStatus.SUSPENDED, TenantStatus.DELETION_REQUESTED],
  [TenantStatus.SUSPENDED]: [TenantStatus.ACTIVE, TenantStatus.DELETION_REQUESTED],
  [TenantStatus.DELETION_REQUESTED]: [TenantStatus.DELETED, TenantStatus.ACTIVE],
  [TenantStatus.DELETED]: [], // Terminal state
};
