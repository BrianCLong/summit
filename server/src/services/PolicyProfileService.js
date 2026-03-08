"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyProfileService = exports.PolicyProfileService = void 0;
const database_js_1 = require("../config/database.js");
const ledger_js_1 = require("../provenance/ledger.js");
const TenantService_js_1 = require("./TenantService.js");
const crypto_1 = require("crypto");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const TenantService_js_2 = require("./TenantService.js");
// Hardcoded Profiles (Prototypes)
const BASELINE_PROFILE = {
    id: 'baseline',
    version: '1.0.0',
    regoPackage: 'tenant.baseline',
    entrypoints: ['allow'],
    guardrails: {
        defaultDeny: true,
        requirePurpose: false,
        requireJustification: false,
    },
    crossTenant: {
        mode: 'deny',
        allow: [],
        requireAgreements: true,
    },
    rules: [
        {
            id: 'allow-public-read',
            effect: 'allow',
            priority: 10,
            conditions: {
                actions: ['read'],
                environments: ['production', 'staging', 'dev'],
            },
        },
    ],
};
const STRICT_PROFILE = {
    id: 'strict',
    version: '1.0.0',
    regoPackage: 'tenant.strict',
    entrypoints: ['allow'],
    guardrails: {
        defaultDeny: true,
        requirePurpose: true,
        requireJustification: true,
    },
    crossTenant: {
        mode: 'deny',
        allow: [],
        requireAgreements: true,
    },
    rules: [
        {
            id: 'allow-internal-read',
            effect: 'allow',
            priority: 10,
            conditions: {
                actions: ['read'],
                subjectTenants: [], // Must match resource tenant (implicit in engine usually, but explicit here)
            },
        },
    ],
};
const CUSTOM_PROFILE = {
    id: 'custom',
    version: '0.0.1',
    regoPackage: 'tenant.custom',
    entrypoints: ['allow'],
    guardrails: {
        defaultDeny: true,
        requirePurpose: false,
        requireJustification: false,
    },
    crossTenant: {
        mode: 'allowlist',
        allow: [],
        requireAgreements: true,
    },
    rules: [],
};
const PROFILES = {
    baseline: BASELINE_PROFILE,
    strict: STRICT_PROFILE,
    custom: CUSTOM_PROFILE,
};
class PolicyProfileService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PolicyProfileService.instance) {
            PolicyProfileService.instance = new PolicyProfileService();
        }
        return PolicyProfileService.instance;
    }
    getProfiles() {
        return [
            {
                id: 'baseline',
                name: 'Baseline Security',
                description: 'Standard protection suitable for most non-sensitive workloads.',
                guardrails: BASELINE_PROFILE.guardrails,
            },
            {
                id: 'strict',
                name: 'Strict Compliance',
                description: 'High-security mode requiring purpose and justification for all actions.',
                guardrails: STRICT_PROFILE.guardrails,
            },
            {
                id: 'custom',
                name: 'Custom Configuration',
                description: 'Fully customizable policy profile.',
                guardrails: CUSTOM_PROFILE.guardrails,
            },
        ];
    }
    getProfile(id) {
        return PROFILES[id] || null;
    }
    async applyProfile(tenantId, profileId, actorId) {
        const profile = this.getProfile(profileId);
        if (!profile) {
            throw new Error(`Policy profile '${profileId}' not found`);
        }
        const tenant = await TenantService_js_1.tenantService.getTenant(tenantId);
        if (!tenant) {
            throw new Error(`Tenant '${tenantId}' not found`);
        }
        // Resolve the bundle
        // In a real system, we might merge with existing overlays.
        // For now, we just create a new bundle based on the profile.
        const newBundle = {
            tenantId: tenantId,
            baseProfile: profile,
            overlays: [], // Reset overlays or keep them? For "Apply Profile", usually implies resetting base.
            metadata: {
                issuedAt: new Date().toISOString(),
                source: `partner-console:apply-profile:${profileId}`,
            },
        };
        const pool = (0, database_js_1.getPostgresPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Update settings and config
            // storing the selection in settings.policy_profile
            // storing the resolved bundle in settings.policy_bundle (since config column doesn't exist yet per plan discussion)
            const { settings: newSettings } = (0, TenantService_js_2.buildSettingsWithHistory)(tenant.settings || {}, {
                policy_profile: profileId,
                policy_bundle: newBundle,
            }, actorId, 'policy_profile_applied');
            await client.query('UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2', [newSettings, tenantId]);
            // Record specifically as TENANT_POLICY_APPLIED
            await ledger_js_1.provenanceLedger.appendEntry({
                tenantId,
                timestamp: new Date(),
                actionType: 'TENANT_POLICY_APPLIED',
                resourceType: 'PolicyProfile',
                resourceId: profileId,
                actorId,
                actorType: 'user',
                payload: {
                    mutationType: 'UPDATE',
                    entityId: profileId,
                    entityType: 'PolicyProfile',
                },
                metadata: {
                    bundleHash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(newBundle)).digest('hex'),
                },
            });
            await client.query('COMMIT');
            logger_js_1.default.info(`Applied policy profile '${profileId}' to tenant ${tenantId}`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Failed to apply policy profile', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.PolicyProfileService = PolicyProfileService;
exports.policyProfileService = PolicyProfileService.getInstance();
