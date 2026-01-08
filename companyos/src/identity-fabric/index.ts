/**
 * CompanyOS Identity & Policy Fabric
 *
 * Unified identity, authorization, and policy layer for CompanyOS.
 * Provides the backbone for "who can do what, where, and with which data."
 *
 * @module identity-fabric
 */

// ============================================================================
// Identity Model Exports
// ============================================================================

export type {
  // Core identity types
  Identity,
  UserIdentity,
  ServiceIdentity,
  AgentIdentity,
  WorkloadIdentity,
  PrincipalType,
  ClassificationLevel,
  TrustLevel,
  ResidencyClass,

  // Tenant and organization
  Tenant,
  Organization,
  Environment,
  TenantType,
  OrganizationType,
  EnvironmentType,

  // Role and permission
  RoleBinding,
  Role,
  RoleScope,
  RoleCondition,

  // Session context
  SessionContext,
  GeoLocation,

  // Configuration types
  TenantResidency,
  ExportRestrictions,
  SovereigntyRequirements,
  TenantQuotas,
  TenantSettings,
  PasswordPolicy,
  WhiteLabelConfig,

  // Supporting types
  RateLimitTier,
  AuditLevel,
  AgentCapability,
  AgentRestriction,
  AttestationType,
  AuthenticationMethod,
  MfaMethod,
  CredentialRotationPolicy,
} from "./identity/types.js";

// ============================================================================
// Identity Service Exports
// ============================================================================

export {
  IdentityService,
  InMemoryIdentityStore,
  InMemoryTenantStore,
  InMemoryRoleStore,
  IdentityNotFoundError,
  TenantNotFoundError,
  TenantAccessDeniedError,
  IdentityValidationError,
} from "./identity/identity-service.js";

export type {
  IdentityServiceConfig,
  IdentityResolutionResult,
  IdentityValidationResult,
  IdentityStore,
  TenantStore,
  RoleStore,
  IdentityStores,
} from "./identity/identity-service.js";

// ============================================================================
// Policy Decision Service Exports
// ============================================================================

export {
  PolicyDecisionService,
  PolicyInputBuilder,
  PolicyEvaluationError,
} from "./policy/policy-decision-service.js";

export type {
  PolicyDecisionServiceConfig,
  PolicyInput,
  PolicyDecision,
  PolicyObligation,
  RedactionSpec,
  SubjectContext,
  ResourceContext,
  EnvironmentContext,
  TenantContext,
} from "./policy/policy-decision-service.js";

// ============================================================================
// Policy Bundle Manager Exports
// ============================================================================

export { PolicyBundleManager, BUNDLE_STRUCTURE } from "./policy/bundle-manager.js";

export type {
  PolicyBundle,
  PolicyFile,
  DataFile,
  BundleManifest,
  BundleMetadata,
  BundleDependency,
  BundleSignature,
  BundleManagerConfig,
} from "./policy/bundle-manager.js";

// ============================================================================
// Authentication Service Exports
// ============================================================================

export { AuthenticationService } from "./auth/authentication-service.js";

export type {
  AuthenticationServiceConfig,
  AuthenticationRequest,
  AuthenticationResult,
  AuthenticationCredentials,
  PasswordCredentials,
  OIDCCredentials,
  SAMLCredentials,
  APIKeyCredentials,
  CertificateCredentials,
  SPIFFECredentials,
  ClientInfo,
  AuthTokens,
  MFAChallenge,
  RiskAssessment,
  AuthenticationError,
  StepUpRequest,
  StepUpChallenge,
  StepUpResponse,
  StepUpResult,
  ServiceAuthRequest,
  ServiceAuthResult,
  OIDCProviderConfig,
  SAMLProviderConfig,
  IdentityLookup,
  TenantLookup,
} from "./auth/authentication-service.js";

// ============================================================================
// Factory Functions
// ============================================================================

import {
  IdentityService,
  type IdentityServiceConfig,
  type IdentityStores,
} from "./identity/identity-service.js";
import {
  PolicyDecisionService,
  type PolicyDecisionServiceConfig,
} from "./policy/policy-decision-service.js";
import { PolicyBundleManager, type BundleManagerConfig } from "./policy/bundle-manager.js";
import {
  AuthenticationService,
  type AuthenticationServiceConfig,
  type IdentityLookup,
  type TenantLookup,
} from "./auth/authentication-service.js";

/**
 * Create a fully configured Identity & Policy Fabric.
 */
export interface IdentityFabricConfig {
  identity?: Partial<IdentityServiceConfig>;
  policy?: Partial<PolicyDecisionServiceConfig>;
  bundle?: Partial<BundleManagerConfig>;
  auth?: Partial<AuthenticationServiceConfig>;
  stores?: IdentityStores;
}

export interface IdentityFabric {
  identity: IdentityService;
  policy: PolicyDecisionService;
  bundles: PolicyBundleManager;
  auth: AuthenticationService;
}

/**
 * Create and configure all Identity & Policy Fabric services.
 *
 * @example
 * ```typescript
 * const fabric = createIdentityFabric({
 *   identity: { cacheEnabled: true },
 *   policy: { mode: 'sidecar', opaUrl: 'http://localhost:8181' },
 *   auth: { mfaGracePeriodDays: 7 },
 * });
 *
 * // Resolve identity
 * const resolution = await fabric.identity.resolveIdentity(userId, tenantId);
 *
 * // Check authorization
 * const decision = await fabric.policy.evaluate(policyInput);
 *
 * // Authenticate user
 * const authResult = await fabric.auth.authenticate(request);
 * ```
 */
export function createIdentityFabric(config: IdentityFabricConfig = {}): IdentityFabric {
  const identity = new IdentityService(config.identity, config.stores);
  const policy = new PolicyDecisionService(config.policy);
  const bundles = new PolicyBundleManager(config.bundle);

  // Create identity and tenant lookups that delegate to the identity service
  const identityLookup: IdentityLookup = {
    findUserByEmail: async (email, tenantId) => {
      try {
        const result = await identity.resolveByEmail(email, tenantId);
        return result.identity.type === "human" ? (result.identity as any) : null;
      } catch {
        return null;
      }
    },
    findServiceByAPIKey: async (keyId, keySecret, tenantId) => {
      // Would be implemented with actual API key store
      return null;
    },
    findWorkloadBySpiffeId: async (spiffeId) => {
      try {
        const result = await identity.resolveBySpiffeId(spiffeId);
        return result.identity.type === "workload" ? (result.identity as any) : null;
      } catch {
        return null;
      }
    },
    getIdentityById: async (id) => {
      return identity.getIdentityById(id);
    },
    createUser: async (user) => {
      return identity.createUser(user as any);
    },
  };

  const tenantLookup: TenantLookup = {
    getTenant: async (id) => {
      // Would delegate to tenant store
      return null;
    },
  };

  const auth = new AuthenticationService(config.auth, identityLookup, tenantLookup);

  return { identity, policy, bundles, auth };
}

// ============================================================================
// Version
// ============================================================================

export const VERSION = "1.0.0";
