"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.denyByDefaultBundle = exports.PolicyEngine = void 0;
const node_crypto_1 = require("node:crypto");
class PolicyEngine {
    bundle;
    decisions = [];
    constructor(bundle) {
        this.bundle = bundle;
    }
    updateBundle(bundle) {
        this.bundle = bundle;
    }
    getDecisionLog() {
        return [...this.decisions];
    }
    evaluate(request, traceId = (0, node_crypto_1.randomUUID)()) {
        const matchedRule = this.findMatchingRule(request);
        const decision = matchedRule?.effect ?? this.bundle.fallbackEffect ?? 'deny';
        this.decisions.push({
            traceId,
            timestamp: new Date().toISOString(),
            request,
            decision,
            ruleId: matchedRule?.id,
        });
        return decision === 'allow';
    }
    findMatchingRule(request) {
        return this.bundle.rules.find((rule) => rule.role === request.role &&
            rule.resource === request.resource &&
            rule.action === request.action &&
            (rule.tenant ? rule.tenant === request.tenant : true) &&
            (rule.region ? rule.region === request.region : true) &&
            (rule.maxClassification
                ? this.classificationRank(request.classification) <=
                    this.classificationRank(rule.maxClassification)
                : true));
    }
    classificationRank(level) {
        const order = [
            'public',
            'internal',
            'confidential',
            'secret',
        ];
        return order.indexOf(level);
    }
}
exports.PolicyEngine = PolicyEngine;
exports.denyByDefaultBundle = {
    version: '1.0.0',
    rules: [],
    fallbackEffect: 'deny',
};
