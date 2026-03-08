"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantHealthBundleService = exports.TenantHealthBundleService = void 0;
const SupportPolicyGate_js_1 = require("./SupportPolicyGate.js");
const support_js_1 = require("../../policies/support.js");
const TenantService_js_1 = require("../TenantService.js");
const redact_js_1 = require("../../redaction/redact.js");
const errors_js_1 = require("../../lib/errors.js");
const HEALTH_BUNDLE_ALLOWED_FIELDS = [
    'tenant',
    'health',
    'compliance',
    'evidence',
    'generatedAt',
    'id',
    'name',
    'slug',
    'tier',
    'status',
    'residency',
    'region',
    'signals',
    'supportTicketsOpen',
    'supportTicketsCritical',
    'latestIncidentAt',
    'policySnapshot',
    'security',
    'features',
    'lifecycle',
    'receiptIds',
    'provenanceEntryIds',
    'source',
];
const HEALTH_BUNDLE_REDACTION_POLICY = {
    rules: ['pii', 'financial', 'sensitive'],
    allowedFields: HEALTH_BUNDLE_ALLOWED_FIELDS,
    redactionMask: '[REDACTED]',
};
class TenantHealthBundleService {
    static instance;
    tenantService = TenantService_js_1.TenantService.getInstance();
    redactionService = new redact_js_1.RedactionService();
    static getInstance() {
        if (!TenantHealthBundleService.instance) {
            TenantHealthBundleService.instance = new TenantHealthBundleService();
        }
        return TenantHealthBundleService.instance;
    }
    async exportBundle(params) {
        const { actor, tenantId, reason } = params;
        const policyDecision = await (0, SupportPolicyGate_js_1.enforceSupportPolicy)({
            actor,
            policy: support_js_1.SUPPORT_HEALTH_BUNDLE_POLICY,
            action: 'support:health:export',
            resource: {
                id: tenantId,
                type: 'TenantHealthBundle',
            },
            justification: reason,
        });
        const tenant = await this.tenantService.getTenant(tenantId);
        if (!tenant) {
            throw new errors_js_1.AppError('Tenant not found.', 404, 'TENANT_NOT_FOUND');
        }
        const generatedAt = new Date().toISOString();
        const bundle = {
            generatedAt,
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                tier: tenant.tier,
                status: tenant.status,
                residency: tenant.residency,
                region: tenant.region,
            },
            health: {
                status: tenant.status === 'active' ? 'HEALTHY' : 'DEGRADED',
                signals: {
                    supportTicketsOpen: 0,
                    supportTicketsCritical: 0,
                    latestIncidentAt: null,
                },
            },
            compliance: {
                policySnapshot: {
                    security: tenant.config?.security || {},
                    features: tenant.config?.features || {},
                    lifecycle: tenant.config?.lifecycle || {},
                },
            },
            evidence: {
                source: 'TenantHealthBundleService',
                receiptIds: [policyDecision.policyDecisionId],
                provenanceEntryIds: [],
            },
        };
        const redactedBundle = await this.redactionService.redactObject(bundle, HEALTH_BUNDLE_REDACTION_POLICY, tenantId, { actorId: actor.id, policyId: policyDecision.policyId });
        return {
            bundle: redactedBundle,
            policyDecision,
            redaction: {
                policyId: 'support-health-bundle-redaction-v1',
                appliedAt: generatedAt,
                mask: HEALTH_BUNDLE_REDACTION_POLICY.redactionMask,
            },
        };
    }
}
exports.TenantHealthBundleService = TenantHealthBundleService;
exports.tenantHealthBundleService = TenantHealthBundleService.getInstance();
