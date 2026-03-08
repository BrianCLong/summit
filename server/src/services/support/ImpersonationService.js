"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportImpersonationService = exports.SupportImpersonationService = void 0;
const crypto_1 = require("crypto");
const SupportPolicyGate_js_1 = require("./SupportPolicyGate.js");
const support_js_1 = require("../../policies/support.js");
const impersonation_receipts_js_1 = require("../../provenance/impersonation-receipts.js");
const errors_js_1 = require("../../lib/errors.js");
class SupportImpersonationService {
    static instance;
    sessions = new Map();
    defaultDurationMs = 60 * 60 * 1000;
    static getInstance() {
        if (!SupportImpersonationService.instance) {
            SupportImpersonationService.instance = new SupportImpersonationService();
        }
        return SupportImpersonationService.instance;
    }
    async startImpersonation(params) {
        const { actor, targetUserId, targetTenantId, reason, ticketId } = params;
        const policyDecision = await (0, SupportPolicyGate_js_1.enforceSupportPolicy)({
            actor,
            policy: support_js_1.SUPPORT_IMPERSONATION_POLICY,
            action: 'support:impersonate',
            resource: {
                id: targetUserId,
                type: 'SupportImpersonation',
                targetTenantId,
            },
            justification: reason,
        });
        const sessionId = (0, crypto_1.randomUUID)();
        const startedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + this.defaultDurationMs).toISOString();
        const session = {
            id: sessionId,
            startedAt,
            expiresAt,
            actor,
            target: {
                userId: targetUserId,
                tenantId: targetTenantId,
            },
            reason,
            ticketId,
            active: true,
        };
        this.sessions.set(sessionId, session);
        const receipt = await (0, impersonation_receipts_js_1.recordImpersonationReceipt)({
            action: 'start',
            sessionId,
            actor,
            target: session.target,
            justification: reason,
            policy: {
                id: policyDecision.policyId,
                decisionId: policyDecision.policyDecisionId,
                allow: policyDecision.allow,
            },
            metadata: {
                ticketId,
            },
        });
        return {
            session,
            receipt,
            policyDecision,
        };
    }
    async stopImpersonation(params) {
        const { actor, sessionId, reason } = params;
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new errors_js_1.AppError('Impersonation session not found.', 404, 'IMPERSONATION_NOT_FOUND');
        }
        const policyDecision = await (0, SupportPolicyGate_js_1.enforceSupportPolicy)({
            actor,
            policy: support_js_1.SUPPORT_IMPERSONATION_POLICY,
            action: 'support:impersonate',
            resource: {
                id: sessionId,
                type: 'SupportImpersonation',
                targetTenantId: session.target.tenantId,
            },
            justification: reason,
        });
        session.active = false;
        const receipt = await (0, impersonation_receipts_js_1.recordImpersonationReceipt)({
            action: 'stop',
            sessionId,
            actor,
            target: session.target,
            justification: reason,
            policy: {
                id: policyDecision.policyId,
                decisionId: policyDecision.policyDecisionId,
                allow: policyDecision.allow,
            },
            metadata: {
                ticketId: session.ticketId,
                endedAt: new Date().toISOString(),
            },
        });
        return {
            session,
            receipt,
            policyDecision,
        };
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
}
exports.SupportImpersonationService = SupportImpersonationService;
exports.supportImpersonationService = SupportImpersonationService.getInstance();
