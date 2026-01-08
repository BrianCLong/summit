/**
 * CompanyOS Identity Fabric - Unified Identity Model
 *
 * This module defines the canonical identity model for all CompanyOS components.
 * It supports multi-tenancy, white-labeling, and IC-grade access control.
 *
 * @module identity-fabric/identity
 */

// ============================================================================
// CORE IDENTITY TYPES
// ============================================================================

/**
 * Principal types in the identity system.
 * Every entity that can authenticate or be authorized is a Principal.
 */
export type PrincipalType =
  | "human" // Human user with interactive session
  | "service" // Service account (machine-to-machine)
  | "agent" // AI agent or automated process
  | "workload"; // SPIFFE-identified workload

/**
 * Data classification levels for IC-grade access control.
 * Follows common intelligence community classification schemes.
 */
export type ClassificationLevel =
  | "unclassified"
  | "cui" // Controlled Unclassified Information
  | "confidential"
  | "secret"
  | "top-secret"
  | "top-secret-sci"; // Top Secret / Sensitive Compartmented Information

/**
 * Trust levels for device and session verification.
 */
export type TrustLevel =
  | "untrusted" // Unknown or unverified device
  | "basic" // Password-only authentication
  | "standard" // MFA verified
  | "high" // Hardware token or biometric
  | "maximum"; // Hardware token + biometric + trusted device

/**
 * Residency classes for data sovereignty compliance.
 */
export type ResidencyClass =
  | "standard" // No special restrictions
  | "restricted" // Requires export approval
  | "sovereign"; // Strict geographic restrictions

// ============================================================================
// IDENTITY ENTITY DEFINITIONS
// ============================================================================

/**
 * Base identity interface that all principals implement.
 */
export interface Identity {
  id: string;
  type: PrincipalType;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Human user identity with full ABAC attribute support.
 */
export interface UserIdentity extends Identity {
  type: "human";
  email: string;
  displayName: string;
  department?: string;
  division?: string;
  location?: string;
  manager?: string;
  clearance: ClassificationLevel;
  caveats: string[]; // SCI compartments, SAPs, etc.
  needToKnow: string[]; // Program/project access
  specialAccess: string[]; // Special access programs
  certifications: string[]; // Required certifications
  otAuthorization: boolean; // Operational Technology access
  groups: string[];
  organizationIds: string[]; // Multi-org membership
  primaryOrganizationId: string;
  lastAuthenticated?: Date;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  deviceTrust: TrustLevel;
  riskScore?: number; // Continuous risk assessment
  sessionContext?: SessionContext;
}

/**
 * Service account identity for machine-to-machine auth.
 */
export interface ServiceIdentity extends Identity {
  type: "service";
  name: string;
  description: string;
  owner: string; // Human owner responsible for service
  ownerEmail: string;
  scopes: string[]; // Authorized API scopes
  allowedOperations: string[];
  maxConcurrentConnections: number;
  rateLimitTier: RateLimitTier;
  expiresAt?: Date;
  rotationPolicy: CredentialRotationPolicy;
  lastRotated?: Date;
  auditLevel: AuditLevel;
  spiffeId?: string; // SPIFFE identity if applicable
}

/**
 * AI Agent identity with additional guardrails.
 */
export interface AgentIdentity extends Identity {
  type: "agent";
  name: string;
  modelId: string; // Underlying AI model
  version: string;
  owner: string;
  capabilities: AgentCapability[];
  restrictions: AgentRestriction[];
  maxTokenBudget: number;
  maxCostPerHour: number;
  requiresHumanApproval: string[]; // Actions needing human approval
  sandboxed: boolean;
  auditLevel: AuditLevel;
  toolWhitelist?: string[];
  toolBlacklist?: string[];
}

/**
 * SPIFFE workload identity for zero-trust networking.
 */
export interface WorkloadIdentity extends Identity {
  type: "workload";
  spiffeId: string; // spiffe://trust-domain/workload/...
  trustDomain: string;
  workloadName: string;
  namespace: string;
  serviceAccount: string;
  podSelector?: Record<string, string>;
  attestationType: AttestationType;
  attestationData: Record<string, unknown>;
  allowedAudiences: string[];
  maxTtl: number;
}

// ============================================================================
// TENANT & ORGANIZATION MODEL
// ============================================================================

/**
 * Tenant represents a top-level isolation boundary.
 * All resources are scoped to exactly one tenant.
 */
export interface Tenant {
  id: string;
  name: string;
  displayName: string;
  slug: string; // URL-safe identifier
  type: TenantType;
  parentTenantId?: string; // For hierarchical tenants
  classification: ClassificationLevel;
  residency: TenantResidency;
  features: string[]; // Enabled feature flags
  quotas: TenantQuotas;
  settings: TenantSettings;
  whiteLabel?: WhiteLabelConfig;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  suspendedAt?: Date;
  suspensionReason?: string;
}

/**
 * Organization represents a logical grouping within a tenant.
 * Supports matrix organizations and cross-functional teams.
 */
export interface Organization {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  parentId?: string; // For org hierarchy
  type: OrganizationType;
  classification: ClassificationLevel;
  regionTags: string[]; // Geographic presence
  costCenter?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

/**
 * Environment represents a deployment context (dev, staging, prod).
 */
export interface Environment {
  id: string;
  tenantId: string;
  name: string;
  type: EnvironmentType;
  region: string;
  classification: ClassificationLevel;
  isolated: boolean;
  allowedPrincipals: string[];
  deniedPrincipals: string[];
  createdAt: Date;
  active: boolean;
}

// ============================================================================
// ROLE & PERMISSION MODEL
// ============================================================================

/**
 * Role assignment binding a principal to a role within a scope.
 */
export interface RoleBinding {
  id: string;
  principalId: string;
  principalType: PrincipalType;
  roleId: string;
  scope: RoleScope;
  tenantId: string;
  organizationId?: string;
  resourceId?: string; // For resource-scoped roles
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  justification?: string;
  approvedBy?: string;
  approvedAt?: Date;
  condition?: RoleCondition;
}

/**
 * Role definition with hierarchical permission inheritance.
 */
export interface Role {
  id: string;
  tenantId: string; // null for global roles
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  inheritsFrom: string[]; // Role hierarchy
  isBuiltIn: boolean;
  isAdmin: boolean;
  requiresMfa: boolean;
  requiresJustification: boolean;
  maxDuration?: number; // Max assignment duration in seconds
  metadata: Record<string, unknown>;
}

/**
 * Scope where a role applies.
 */
export interface RoleScope {
  type: "global" | "tenant" | "organization" | "environment" | "resource";
  tenantId?: string;
  organizationId?: string;
  environmentId?: string;
  resourceType?: string;
  resourceId?: string;
}

/**
 * Conditional role activation.
 */
export interface RoleCondition {
  type: "time" | "location" | "risk" | "approval" | "custom";
  expression: string; // CEL or Rego expression
  parameters: Record<string, unknown>;
}

// ============================================================================
// SESSION & AUTHENTICATION CONTEXT
// ============================================================================

/**
 * Session context captures runtime authentication state.
 */
export interface SessionContext {
  sessionId: string;
  principalId: string;
  principalType: PrincipalType;
  tenantId: string;
  authenticatedAt: Date;
  expiresAt: Date;
  authenticationMethod: AuthenticationMethod;
  authenticationStrength: TrustLevel;
  mfaCompleted: boolean;
  mfaMethod?: MfaMethod;
  stepUpCompleted: boolean;
  stepUpExpiresAt?: Date;
  stepUpScopes?: string[];
  deviceId?: string;
  deviceTrust: TrustLevel;
  ipAddress: string;
  userAgent: string;
  geoLocation?: GeoLocation;
  riskScore: number;
  riskFactors: string[];
  impersonatedBy?: string; // For admin impersonation
  impersonationJustification?: string;
}

/**
 * Geographic location for residency enforcement.
 */
export interface GeoLocation {
  country: string;
  region: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export type TenantType = "standard" | "enterprise" | "government" | "sovereign" | "internal";

export type OrganizationType = "business_unit" | "department" | "team" | "project" | "cost_center";

export type EnvironmentType =
  | "development"
  | "staging"
  | "production"
  | "sandbox"
  | "disaster_recovery";

export type RateLimitTier = "free" | "standard" | "premium" | "enterprise" | "unlimited";

export type AuditLevel = "none" | "basic" | "detailed" | "full" | "forensic";

export type AgentCapability =
  | "read"
  | "write"
  | "delete"
  | "execute"
  | "analyze"
  | "export"
  | "admin";

export type AgentRestriction =
  | "no_pii"
  | "no_secrets"
  | "no_external_calls"
  | "rate_limited"
  | "human_in_loop";

export type AttestationType =
  | "k8s_sat" // Kubernetes service account token
  | "k8s_psat" // Projected service account token
  | "aws_iid" // AWS instance identity document
  | "gcp_iit" // GCP instance identity token
  | "azure_msi" // Azure managed service identity
  | "unix" // Unix process attestation
  | "docker" // Docker container attestation
  | "tpm"; // TPM-based attestation

export type AuthenticationMethod =
  | "password"
  | "sso_oidc"
  | "sso_saml"
  | "api_key"
  | "client_certificate"
  | "spiffe_svid"
  | "workload_identity";

export type MfaMethod = "totp" | "webauthn" | "sms" | "email" | "push" | "hardware_token";

export interface CredentialRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  maxAge: number;
  notifyDaysBefore: number;
}

export interface TenantResidency {
  primaryRegion: string;
  allowedRegions: string[];
  class: ResidencyClass;
  dataClassifications: ClassificationLevel[];
  exportRestrictions: ExportRestrictions;
  sovereigntyRequirements?: SovereigntyRequirements;
}

export interface ExportRestrictions {
  requiresApproval: boolean;
  approvers: string[];
  allowedDestinations: string[];
  blockedDestinations: string[];
  retentionDays: number;
  auditExports: boolean;
}

export interface SovereigntyRequirements {
  mustEncryptAtRest: boolean;
  mustEncryptInTransit: boolean;
  keyResidency: string;
  allowedKeyProviders: string[];
  noForeignAccess: boolean;
  auditToSovereign: boolean;
}

export interface TenantQuotas {
  apiCallsPerHour: number;
  apiCallsPerDay: number;
  storageBytes: number;
  usersMax: number;
  serviceAccountsMax: number;
  agentsMax: number;
  exportCallsPerDay: number;
  concurrentSessions: number;
}

export interface TenantSettings {
  mfaRequired: boolean;
  mfaGracePeriodDays: number;
  sessionTimeoutMinutes: number;
  passwordPolicy: PasswordPolicy;
  loginAttemptLimit: number;
  lockoutDurationMinutes: number;
  ipAllowlist?: string[];
  ipDenylist?: string[];
  enforceBusinessHours: boolean;
  businessHoursTimezone?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  customPolicies?: string[];
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAgeDays: number;
  historyCount: number;
  bannedPatterns: string[];
}

export interface WhiteLabelConfig {
  enabled: boolean;
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  customCss?: string;
  customDomain?: string;
  emailFromName: string;
  emailFromAddress: string;
  supportEmail: string;
  supportUrl: string;
}
