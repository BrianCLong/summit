/**
 * CompanyOS GraphQL Schema Extensions
 *
 * Implements:
 * - A1: Tenant Lifecycle Management mutations
 * - A2: Tenant Onboarding types
 * - A3: Audit Log Viewer queries
 */

export const companyOSTenantTypeDefs = `
  # ============================================================================
  # TENANT LIFECYCLE ENUMS
  # ============================================================================

  enum TenantStatus {
    PENDING
    ACTIVE
    SUSPENDED
    DELETION_REQUESTED
    DELETED
  }

  enum TenantTier {
    STARTER
    BRONZE
    SILVER
    GOLD
    ENTERPRISE
  }

  enum TenantAdminRole {
    ADMIN
    OWNER
    BILLING_ADMIN
    SECURITY_REVIEWER
  }

  enum AuditEventCategory {
    TENANT_LIFECYCLE
    USER_MANAGEMENT
    FEATURE_FLAGS
    SECURITY
    BILLING
    DATA_ACCESS
    CONFIGURATION
  }

  enum AuditEventOutcome {
    SUCCESS
    FAILURE
    DENIED
  }

  # ============================================================================
  # TENANT TYPES
  # ============================================================================

  type TenantQuotas {
    apiCallsPerHour: Int!
    storageGb: Int!
    usersMax: Int!
    exportCallsPerDay: Int!
  }

  type TenantFeatures {
    copilotEnabled: Boolean
    advancedAnalytics: Boolean
    customIntegrations: Boolean
    ssoEnabled: Boolean
    auditLogExport: Boolean
    apiAccessEnabled: Boolean
  }

  type Tenant {
    id: ID!
    externalId: String!
    name: String!
    displayName: String
    status: TenantStatus!
    tier: TenantTier!

    # Region and residency
    region: String!
    residencyClass: String!
    allowedRegions: [String!]!

    # Configuration
    features: TenantFeatures!
    quotas: TenantQuotas!

    # Contact information
    primaryContactEmail: String
    primaryContactName: String
    billingEmail: String

    # Metadata
    metadata: JSON
    tags: [String!]!

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    activatedAt: DateTime
    suspendedAt: DateTime
    deletionRequestedAt: DateTime
    deletedAt: DateTime

    # Created by
    createdBy: String!

    # Computed fields
    adminCount: Int
    onboardingComplete: Boolean
  }

  type TenantStatusTransition {
    id: ID!
    tenantId: ID!
    fromStatus: TenantStatus
    toStatus: TenantStatus!
    reason: String
    performedBy: String!
    performedAt: DateTime!
    metadata: JSON
    ipAddress: String
    correlationId: String
  }

  type TenantAdmin {
    id: ID!
    tenantId: ID!
    userId: String!
    email: String!
    displayName: String
    role: TenantAdminRole!
    status: String!
    invitedAt: DateTime!
    acceptedAt: DateTime
    invitedBy: String!
  }

  # ============================================================================
  # ONBOARDING TYPES (A2)
  # ============================================================================

  type TenantOnboarding {
    id: ID!
    tenantId: ID!

    # Checklist steps
    stepMetadataComplete: Boolean!
    stepAdminAssigned: Boolean!
    stepFeaturesConfigured: Boolean!
    stepQuotasSet: Boolean!
    stepWelcomeSent: Boolean!
    stepVerified: Boolean!

    # Step timestamps
    metadataCompletedAt: DateTime
    adminAssignedAt: DateTime
    featuresConfiguredAt: DateTime
    quotasSetAt: DateTime
    welcomeSentAt: DateTime
    verifiedAt: DateTime

    # Overall
    startedAt: DateTime!
    completedAt: DateTime
    completedBy: String

    # Bundle
    onboardingBundle: JSON
  }

  type OnboardingResult {
    success: Boolean!
    tenant: Tenant!
    onboarding: TenantOnboarding!
    bundle: JSON!
    nextSteps: [String!]!
  }

  type TenantLifecycleResult {
    success: Boolean!
    tenant: Tenant!
    transition: TenantStatusTransition
    message: String!
  }

  # ============================================================================
  # AUDIT TYPES (A3)
  # ============================================================================

  type AuditEvent {
    id: ID!
    eventType: String!
    eventCategory: AuditEventCategory!
    eventAction: String!

    # Actor
    actorId: String
    actorEmail: String
    actorType: String!
    actorRoles: [String!]

    # Tenant
    tenantId: ID

    # Resource
    resourceType: String
    resourceId: String
    resourceName: String

    # Details
    description: String
    details: JSON

    # Request context
    ipAddress: String
    userAgent: String
    requestId: String
    correlationId: String

    # Outcome
    outcome: AuditEventOutcome!
    errorMessage: String

    # Timestamps
    occurredAt: DateTime!
    recordedAt: DateTime!
  }

  type PaginatedAuditEvents {
    events: [AuditEvent!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type PaginatedTenants {
    tenants: [Tenant!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type AuditEventCounts {
    eventType: String!
    count: Int!
  }

  # ============================================================================
  # RATE LIMITING TYPES (B2)
  # ============================================================================

  type RateLimitStatus {
    allowed: Boolean!
    remaining: Int!
    limit: Int!
    resetAt: DateTime!
    retryAfter: Int
  }

  type RateLimitMetrics {
    tenantId: String!
    endpoint: String!
    blockedCount: Int!
    allowedCount: Int!
    lastBlocked: DateTime
  }

  # ============================================================================
  # INPUT TYPES
  # ============================================================================

  input CreateTenantInput {
    externalId: String!
    name: String!
    displayName: String
    tier: TenantTier
    region: String
    residencyClass: String
    allowedRegions: [String!]
    features: TenantFeaturesInput
    quotas: TenantQuotasInput
    primaryContactEmail: String
    primaryContactName: String
    billingEmail: String
    metadata: JSON
    tags: [String!]
  }

  input TenantFeaturesInput {
    copilotEnabled: Boolean
    advancedAnalytics: Boolean
    customIntegrations: Boolean
    ssoEnabled: Boolean
    auditLogExport: Boolean
    apiAccessEnabled: Boolean
  }

  input TenantQuotasInput {
    apiCallsPerHour: Int
    storageGb: Int
    usersMax: Int
    exportCallsPerDay: Int
  }

  input UpdateTenantInput {
    name: String
    displayName: String
    tier: TenantTier
    features: TenantFeaturesInput
    quotas: TenantQuotasInput
    primaryContactEmail: String
    primaryContactName: String
    billingEmail: String
    metadata: JSON
    tags: [String!]
  }

  input ActivateTenantInput {
    reason: String
  }

  input SuspendTenantInput {
    reason: String!
  }

  input RequestTenantDeletionInput {
    reason: String!
    confirmationToken: String
  }

  input AssignTenantAdminInput {
    email: String!
    displayName: String
    role: TenantAdminRole
  }

  input StartOnboardingInput {
    tenant: CreateTenantInput!
    admins: [AssignTenantAdminInput!]!
  }

  input TenantFilter {
    status: TenantStatus
    tier: TenantTier
    region: String
    searchQuery: String
  }

  input AuditEventFilter {
    tenantId: ID
    actorId: String
    eventType: String
    eventCategory: AuditEventCategory
    resourceType: String
    resourceId: String
    outcome: AuditEventOutcome
    fromDate: DateTime
    toDate: DateTime
    searchQuery: String
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  extend type Query {
    # Tenant queries
    tenant(id: ID!): Tenant
    tenantByExternalId(externalId: String!): Tenant
    tenants(filter: TenantFilter, limit: Int = 25, offset: Int = 0): PaginatedTenants!

    # Tenant admin queries
    tenantAdmins(tenantId: ID!): [TenantAdmin!]!

    # Onboarding queries
    tenantOnboarding(tenantId: ID!): TenantOnboarding

    # Status transition history
    tenantStatusTransitions(tenantId: ID!): [TenantStatusTransition!]!

    # Audit queries (A3)
    auditEvents(filter: AuditEventFilter, limit: Int = 50, offset: Int = 0): PaginatedAuditEvents!
    auditEvent(id: ID!): AuditEvent
    auditEventsByCorrelation(correlationId: String!): [AuditEvent!]!
    auditEventCounts(tenantId: ID, fromDate: DateTime, toDate: DateTime): [AuditEventCounts!]!

    # Rate limit queries (B2)
    rateLimitStatus(tenantId: ID!, endpoint: String!): RateLimitStatus!
    rateLimitMetrics(tenantId: ID): [RateLimitMetrics!]!
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  extend type Mutation {
    # Tenant CRUD
    createTenant(input: CreateTenantInput!): TenantLifecycleResult!
    updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!

    # Tenant lifecycle (A1)
    activateTenant(id: ID!, input: ActivateTenantInput): TenantLifecycleResult!
    suspendTenant(id: ID!, input: SuspendTenantInput!): TenantLifecycleResult!
    requestTenantDeletion(id: ID!, input: RequestTenantDeletionInput!): TenantLifecycleResult!
    completeTenantDeletion(id: ID!): TenantLifecycleResult!

    # Onboarding (A2)
    startTenantOnboarding(input: StartOnboardingInput!): OnboardingResult!
    completeTenantOnboarding(tenantId: ID!): OnboardingResult!

    # Admin management
    assignTenantAdmin(tenantId: ID!, input: AssignTenantAdminInput!): TenantAdmin!
    removeTenantAdmin(tenantId: ID!, adminId: ID!): Boolean!

    # Rate limit management (B2)
    resetRateLimit(tenantId: ID!, endpoint: String): Boolean!
  }
`;
