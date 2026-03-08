"use strict";
/**
 * CompanyOS Identity & Policy Fabric
 *
 * Unified identity, authorization, and policy layer for CompanyOS.
 * Provides the backbone for "who can do what, where, and with which data."
 *
 * @module identity-fabric
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.AuthenticationService = exports.BUNDLE_STRUCTURE = exports.PolicyBundleManager = exports.PolicyEvaluationError = exports.PolicyInputBuilder = exports.PolicyDecisionService = exports.IdentityValidationError = exports.TenantAccessDeniedError = exports.TenantNotFoundError = exports.IdentityNotFoundError = exports.InMemoryRoleStore = exports.InMemoryTenantStore = exports.InMemoryIdentityStore = exports.IdentityService = void 0;
exports.createIdentityFabric = createIdentityFabric;
// ============================================================================
// Identity Service Exports
// ============================================================================
var identity_service_js_1 = require("./identity/identity-service.js");
Object.defineProperty(exports, "IdentityService", { enumerable: true, get: function () { return identity_service_js_1.IdentityService; } });
Object.defineProperty(exports, "InMemoryIdentityStore", { enumerable: true, get: function () { return identity_service_js_1.InMemoryIdentityStore; } });
Object.defineProperty(exports, "InMemoryTenantStore", { enumerable: true, get: function () { return identity_service_js_1.InMemoryTenantStore; } });
Object.defineProperty(exports, "InMemoryRoleStore", { enumerable: true, get: function () { return identity_service_js_1.InMemoryRoleStore; } });
Object.defineProperty(exports, "IdentityNotFoundError", { enumerable: true, get: function () { return identity_service_js_1.IdentityNotFoundError; } });
Object.defineProperty(exports, "TenantNotFoundError", { enumerable: true, get: function () { return identity_service_js_1.TenantNotFoundError; } });
Object.defineProperty(exports, "TenantAccessDeniedError", { enumerable: true, get: function () { return identity_service_js_1.TenantAccessDeniedError; } });
Object.defineProperty(exports, "IdentityValidationError", { enumerable: true, get: function () { return identity_service_js_1.IdentityValidationError; } });
// ============================================================================
// Policy Decision Service Exports
// ============================================================================
var policy_decision_service_js_1 = require("./policy/policy-decision-service.js");
Object.defineProperty(exports, "PolicyDecisionService", { enumerable: true, get: function () { return policy_decision_service_js_1.PolicyDecisionService; } });
Object.defineProperty(exports, "PolicyInputBuilder", { enumerable: true, get: function () { return policy_decision_service_js_1.PolicyInputBuilder; } });
Object.defineProperty(exports, "PolicyEvaluationError", { enumerable: true, get: function () { return policy_decision_service_js_1.PolicyEvaluationError; } });
// ============================================================================
// Policy Bundle Manager Exports
// ============================================================================
var bundle_manager_js_1 = require("./policy/bundle-manager.js");
Object.defineProperty(exports, "PolicyBundleManager", { enumerable: true, get: function () { return bundle_manager_js_1.PolicyBundleManager; } });
Object.defineProperty(exports, "BUNDLE_STRUCTURE", { enumerable: true, get: function () { return bundle_manager_js_1.BUNDLE_STRUCTURE; } });
// ============================================================================
// Authentication Service Exports
// ============================================================================
var authentication_service_js_1 = require("./auth/authentication-service.js");
Object.defineProperty(exports, "AuthenticationService", { enumerable: true, get: function () { return authentication_service_js_1.AuthenticationService; } });
// ============================================================================
// Factory Functions
// ============================================================================
const identity_service_js_2 = require("./identity/identity-service.js");
const policy_decision_service_js_2 = require("./policy/policy-decision-service.js");
const bundle_manager_js_2 = require("./policy/bundle-manager.js");
const authentication_service_js_2 = require("./auth/authentication-service.js");
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
function createIdentityFabric(config = {}) {
    const identity = new identity_service_js_2.IdentityService(config.identity, config.stores);
    const policy = new policy_decision_service_js_2.PolicyDecisionService(config.policy);
    const bundles = new bundle_manager_js_2.PolicyBundleManager(config.bundle);
    // Create identity and tenant lookups that delegate to the identity service
    const identityLookup = {
        findUserByEmail: async (email, tenantId) => {
            try {
                const result = await identity.resolveByEmail(email, tenantId);
                return result.identity.type === 'human' ? result.identity : null;
            }
            catch {
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
                return result.identity.type === 'workload' ? result.identity : null;
            }
            catch {
                return null;
            }
        },
        getIdentityById: async (id) => {
            return identity.getIdentityById(id);
        },
        createUser: async (user) => {
            return identity.createUser(user);
        },
    };
    const tenantLookup = {
        getTenant: async (id) => {
            // Would delegate to tenant store
            return null;
        },
    };
    const auth = new authentication_service_js_2.AuthenticationService(config.auth, identityLookup, tenantLookup);
    return { identity, policy, bundles, auth };
}
// ============================================================================
// Version
// ============================================================================
exports.VERSION = '1.0.0';
