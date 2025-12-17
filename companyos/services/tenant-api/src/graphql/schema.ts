/**
 * CompanyOS Tenant API - GraphQL Schema
 */

export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  # ============================================================================
  # TENANT TYPES
  # ============================================================================

  type Tenant {
    id: ID!
    name: String!
    slug: String!
    description: String
    dataRegion: String!
    classification: DataClassification!
    status: TenantStatus!
    isActive: Boolean!
    settings: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String
    updatedBy: String

    # Related data
    features: [TenantFeature!]!
    effectiveFlags: EffectiveFeatureFlags!
  }

  enum TenantStatus {
    pending
    active
    suspended
    archived
  }

  enum DataClassification {
    unclassified
    cui
    secret
    top_secret
  }

  type TenantFeature {
    id: ID!
    tenantId: ID!
    flagName: String!
    enabled: Boolean!
    config: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    updatedBy: String
  }

  type EffectiveFeatureFlags {
    aiCopilotAccess: Boolean!
    billingEnabled: Boolean!
    advancedAnalytics: Boolean!
    exportEnabled: Boolean!
    apiAccess: Boolean!
    ssoEnabled: Boolean!
    customBranding: Boolean!
    auditLogExport: Boolean!
    raw: JSON!
  }

  # ============================================================================
  # AUDIT TYPES
  # ============================================================================

  type AuditEvent {
    id: ID!
    tenantId: ID
    eventType: String!
    action: String!
    actorId: String
    actorEmail: String
    actorIp: String
    resourceType: String!
    resourceId: String
    changes: JSON!
    metadata: JSON!
    createdAt: DateTime!
  }

  type AuditEventConnection {
    events: [AuditEvent!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # ============================================================================
  # TENANT CONNECTION & PAGINATION
  # ============================================================================

  type TenantConnection {
    tenants: [Tenant!]!
    totalCount: Int!
    pageInfo: PageInfo!
  }

  # ============================================================================
  # INPUTS
  # ============================================================================

  input CreateTenantInput {
    name: String!
    slug: String!
    description: String
    dataRegion: String
    classification: DataClassification
    settings: JSON
  }

  input UpdateTenantInput {
    name: String
    description: String
    dataRegion: String
    classification: DataClassification
    status: TenantStatus
    settings: JSON
  }

  input SetFeatureFlagInput {
    tenantId: ID!
    flagName: String!
    enabled: Boolean!
    config: JSON
  }

  input AuditEventFilter {
    tenantId: ID
    eventType: String
    action: String
    actorId: String
    startDate: DateTime
    endDate: DateTime
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  type Query {
    # Tenant queries
    tenant(id: ID!): Tenant
    tenantBySlug(slug: String!): Tenant
    tenants(
      status: TenantStatus
      limit: Int = 50
      offset: Int = 0
    ): TenantConnection!

    # Feature flag queries
    tenantFeatures(tenantId: ID!): [TenantFeature!]!
    effectiveFeatureFlags(tenantId: ID!): EffectiveFeatureFlags!

    # Audit queries
    auditEvents(
      filter: AuditEventFilter
      limit: Int = 100
      offset: Int = 0
    ): AuditEventConnection!

    # Health check
    _health: HealthCheck!
  }

  type HealthCheck {
    status: String!
    timestamp: DateTime!
    version: String!
    services: JSON!
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  type Mutation {
    # Tenant mutations
    createTenant(input: CreateTenantInput!): Tenant!
    updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!
    deleteTenant(id: ID!): Boolean!

    # Feature flag mutations
    setFeatureFlag(input: SetFeatureFlagInput!): TenantFeature!
    enableFeatureFlag(tenantId: ID!, flagName: String!): TenantFeature!
    disableFeatureFlag(tenantId: ID!, flagName: String!): TenantFeature!
  }
`;
