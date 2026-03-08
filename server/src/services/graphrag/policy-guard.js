"use strict";
/**
 * GraphRAG Policy Guard
 * Enforces policy/access controls and filters evidence based on user permissions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockPolicyEngine = exports.DefaultPolicyEngine = void 0;
exports.filterEvidenceByPolicy = filterEvidenceByPolicy;
exports.applyPolicyToContext = applyPolicyToContext;
exports.canAccessCase = canAccessCase;
exports.createPolicyEngine = createPolicyEngine;
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
// Classification level hierarchy (higher = more restricted)
const CLASSIFICATION_LEVELS = {
    PUBLIC: 0,
    UNCLASSIFIED: 0,
    CONFIDENTIAL: 1,
    RESTRICTED: 2,
    SECRET: 3,
    TS: 4, // Top Secret
    'TS-SCI': 5, // Top Secret - Sensitive Compartmented Information
};
// License types that allow analytic use
const ANALYTICS_ALLOWED_LICENSES = [
    'INGEST',
    'ANALYZE',
    'INTERNAL_USE',
    'FULL_ACCESS',
];
/**
 * Default policy engine implementation
 */
class DefaultPolicyEngine {
    canViewEvidence(params) {
        const { user, metadata } = params;
        // Check classification level
        const evidenceClassification = metadata?.classification;
        if (evidenceClassification) {
            const userLevel = this.getUserClassificationLevel(user);
            const evidenceLevel = CLASSIFICATION_LEVELS[evidenceClassification.toUpperCase()] ?? 0;
            if (userLevel < evidenceLevel) {
                return {
                    allow: false,
                    reason: `Insufficient clearance: user has ${user.classification || 'none'}, evidence requires ${evidenceClassification}`,
                };
            }
        }
        // Check need-to-know tags
        const requiredTags = metadata?.needToKnowTags;
        if (requiredTags && requiredTags.length > 0) {
            const userTags = new Set(user.needToKnowTags || []);
            const hasRequiredTags = requiredTags.some((tag) => userTags.has(tag));
            if (!hasRequiredTags) {
                return {
                    allow: false,
                    reason: `Missing need-to-know tag: requires one of [${requiredTags.join(', ')}]`,
                };
            }
        }
        // Check license restrictions
        const licenseType = metadata?.licenseType;
        if (licenseType && !ANALYTICS_ALLOWED_LICENSES.includes(licenseType)) {
            return {
                allow: false,
                reason: `License type "${licenseType}" does not allow analytic use`,
            };
        }
        // Check tenant isolation
        const evidenceTenantId = metadata?.tenantId;
        if (evidenceTenantId && user.tenantId && evidenceTenantId !== user.tenantId) {
            return {
                allow: false,
                reason: 'Evidence belongs to a different tenant',
            };
        }
        return { allow: true, reason: 'Access granted' };
    }
    canViewClaim(params) {
        // Claims inherit policy from their evidence
        // For now, use same logic as evidence
        return this.canViewEvidence({
            user: params.user,
            evidenceId: params.claimId,
            metadata: params.metadata,
        });
    }
    getUserClassificationLevel(user) {
        // Check clearances first (array of classifications user can access)
        if (user.clearances && user.clearances.length > 0) {
            return Math.max(...user.clearances.map((c) => CLASSIFICATION_LEVELS[c.toUpperCase()] ?? 0));
        }
        // Fall back to single classification field
        if (user.classification) {
            return CLASSIFICATION_LEVELS[user.classification.toUpperCase()] ?? 0;
        }
        // Default to lowest level
        return 0;
    }
}
exports.DefaultPolicyEngine = DefaultPolicyEngine;
/**
 * Filter evidence snippets based on user policy
 */
function filterEvidenceByPolicy(evidenceSnippets, user, policyEngine) {
    const allowed = [];
    const filtered = [];
    const filterReasons = new Map();
    for (const snippet of evidenceSnippets) {
        const decision = policyEngine.canViewEvidence({
            user,
            evidenceId: snippet.evidenceId,
            metadata: {
                classification: snippet.classification,
                licenseType: snippet.licenseId,
                needToKnowTags: snippet.metadata?.needToKnowTags,
                tenantId: snippet.metadata?.tenantId,
            },
        });
        if (decision.allow) {
            allowed.push(snippet);
        }
        else {
            filtered.push(snippet);
            filterReasons.set(snippet.evidenceId, decision.reason);
        }
    }
    if (filtered.length > 0) {
        logger_js_1.default.info({
            message: 'Evidence filtered by policy',
            userId: user.userId,
            allowedCount: allowed.length,
            filteredCount: filtered.length,
        });
    }
    return { allowed, filtered, filterReasons };
}
/**
 * Apply policy filtering to entire graph context
 */
function applyPolicyToContext(context, user, policyEngine) {
    const { allowed, filtered } = filterEvidenceByPolicy(context.evidenceSnippets, user, policyEngine);
    const filteredContext = {
        nodes: context.nodes, // Nodes are not filtered (just structure)
        edges: context.edges,
        evidenceSnippets: allowed,
    };
    return {
        filteredContext,
        policyDecisions: {
            filteredEvidenceCount: filtered.length,
            allowedEvidenceCount: allowed.length,
        },
    };
}
/**
 * Check if user has access to case
 */
function canAccessCase(user, caseId) {
    // Check if user is member of case
    if (user.cases && Array.isArray(user.cases)) {
        return user.cases.includes(caseId);
    }
    // If no case membership tracking, allow access (rely on other controls)
    return true;
}
/**
 * Mock policy engine for testing
 */
class MockPolicyEngine {
    allowAll = true;
    deniedIds = new Set();
    setAllowAll(allow) {
        this.allowAll = allow;
    }
    denyEvidence(evidenceId) {
        this.deniedIds.add(evidenceId);
    }
    clearDenied() {
        this.deniedIds.clear();
    }
    canViewEvidence(params) {
        if (this.deniedIds.has(params.evidenceId)) {
            return { allow: false, reason: 'Explicitly denied for testing' };
        }
        if (!this.allowAll) {
            return { allow: false, reason: 'Policy engine set to deny all' };
        }
        return { allow: true, reason: 'Allowed by mock policy' };
    }
    canViewClaim(params) {
        return { allow: this.allowAll, reason: 'Mock claim policy' };
    }
}
exports.MockPolicyEngine = MockPolicyEngine;
function createPolicyEngine() {
    if (process.env.NODE_ENV === 'test') {
        return new MockPolicyEngine();
    }
    return new DefaultPolicyEngine();
}
