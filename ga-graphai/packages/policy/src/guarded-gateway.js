"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = exports.GuardedPolicyGateway = void 0;
const index_js_1 = require("./index.js");
Object.defineProperty(exports, "PolicyEngine", { enumerable: true, get: function () { return index_js_1.PolicyEngine; } });
const DEFAULT_RISK_THRESHOLD = 0.55;
function buildAuditId(request, correlationId) {
    return [
        correlationId ?? `${Date.now()}`,
        request.action,
        request.resource,
    ].join(':');
}
class GuardedPolicyGateway {
    engine;
    riskThreshold;
    auditSink;
    approvalQueue = new Map();
    constructor(options) {
        this.engine = options?.engine ?? new index_js_1.PolicyEngine();
        this.riskThreshold = options?.riskThreshold ?? DEFAULT_RISK_THRESHOLD;
        this.auditSink = options?.auditSink;
    }
    evaluate(request, context) {
        const evaluation = this.engine.evaluate(request);
        if (!evaluation.allowed) {
            const auditRef = buildAuditId(request, context?.correlationId);
            this.emitAudit({
                id: auditRef,
                timestamp: new Date().toISOString(),
                request,
                evaluation,
                requiresApproval: false,
                context,
            });
            return {
                allowed: false,
                requiresApproval: false,
                auditRef,
                evaluation,
                obligations: evaluation.obligations,
            };
        }
        const requiresApproval = this.requiresApproval(evaluation, context);
        const auditRef = buildAuditId(request, context?.correlationId);
        if (requiresApproval) {
            this.approvalQueue.set(auditRef, { approved: false });
        }
        this.emitAudit({
            id: auditRef,
            timestamp: new Date().toISOString(),
            request,
            evaluation,
            requiresApproval,
            context,
            approval: this.approvalQueue.get(auditRef),
        });
        return {
            allowed: evaluation.allowed && (!requiresApproval || this.isApproved(auditRef)),
            requiresApproval,
            auditRef,
            evaluation,
            obligations: evaluation.obligations,
        };
    }
    approve(auditRef, approver, notes) {
        const record = this.approvalQueue.get(auditRef) ?? { approved: false };
        record.approved = true;
        record.approver = approver;
        record.notes = notes;
        record.approvedAt = new Date().toISOString();
        this.approvalQueue.set(auditRef, record);
        this.emitAudit({
            id: auditRef,
            timestamp: record.approvedAt,
            request: { action: 'approval', resource: auditRef, context: { tenantId: '', userId: approver, roles: [] } },
            evaluation: { allowed: true, effect: 'allow', matchedRules: [], reasons: [], obligations: [], trace: [] },
            requiresApproval: false,
            approval: record,
        });
        return record;
    }
    isApproved(auditRef) {
        return this.approvalQueue.get(auditRef)?.approved ?? false;
    }
    requiresApproval(evaluation, context) {
        const riskScore = context?.riskScore ?? 0;
        const hasHighRiskTag = evaluation.matchedRules.some((rule) => rule.includes('high-risk'));
        return hasHighRiskTag || riskScore >= this.riskThreshold;
    }
    emitAudit(entry) {
        if (this.auditSink) {
            this.auditSink(entry);
        }
    }
}
exports.GuardedPolicyGateway = GuardedPolicyGateway;
