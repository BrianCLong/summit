"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewDecisionEngine = void 0;
const DEFAULT_RULES = {
    entity: { allowed: ['approve', 'reject', 'needs-more-info', 'escalate'], requireReason: true },
    relationship: { allowed: ['approve', 'reject', 'needs-more-info', 'escalate'], requireReason: true },
    event: { allowed: ['approve', 'reject', 'needs-more-info', 'escalate'], requireReason: true },
    quarantine: { allowed: ['approve', 'reject', 'needs-more-info', 'escalate'], requireReason: true },
};
class ReviewDecisionEngine {
    rules;
    constructor(rules = DEFAULT_RULES) {
        this.rules = rules;
    }
    validateAction(type, action, reasonCode) {
        const rule = this.rules[type] ?? DEFAULT_RULES[type];
        if (rule && !rule.allowed.includes(action)) {
            throw new Error(`action_not_allowed:${action}`);
        }
        if (rule?.requireReason && !reasonCode) {
            throw new Error('reason_required');
        }
    }
    applyDecision(item, decision) {
        this.validateAction(item.type, decision.action, decision.reasonCode);
        if (item.lastDecision) {
            if (item.lastDecision.correlationId === decision.correlationId) {
                return { item, decision: item.lastDecision, idempotent: true };
            }
            throw new Error('decision_already_recorded');
        }
        const decidedAt = decision.decidedAt ?? new Date().toISOString();
        const resolved = {
            ...item,
            status: 'decided',
            lastDecision: { ...decision, decidedAt },
        };
        return { item: resolved, decision: resolved.lastDecision, idempotent: false };
    }
}
exports.ReviewDecisionEngine = ReviewDecisionEngine;
