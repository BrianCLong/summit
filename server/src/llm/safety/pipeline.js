"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safetyPipeline = exports.SafetyPipeline = void 0;
class SafetyPipeline {
    // In-memory policy store for now
    policies = new Map();
    setPolicy(policy) {
        this.policies.set(policy.tenantId, policy);
    }
    async preCheck(request) {
        const policy = this.policies.get(request.tenantId);
        // 1. Basic Content Safety (Regex based for now)
        this.checkForInjection(request);
        if (!policy)
            return; // No policy, allow default
        // 2. Policy Enforcement
        // Check cost limits if known ahead of time (hard to do exactly without running)
        // Check allowed models is done at routing time usually, but could be enforced here if model was pre-selected
    }
    async postCheck(request, result) {
        const policy = this.policies.get(request.tenantId);
        // 1. PII Redaction (Mock)
        // result.content = this.redactPii(result.content);
        // 2. Cost enforcement
        if (policy?.maxCostPerRequestUsd && result.usage?.costUsd) {
            if (result.usage.costUsd > policy.maxCostPerRequestUsd) {
                console.warn(`[Safety] Request exceeded cost limit for tenant ${request.tenantId}`);
                // Could emit event or throw, but response is already generated.
            }
        }
    }
    checkForInjection(request) {
        const fullText = request.messages.map(m => m.content).join('\n');
        const forbiddenPatterns = [
            /ignore previous instructions/i,
            /system override/i
        ];
        for (const pattern of forbiddenPatterns) {
            if (pattern.test(fullText)) {
                throw new Error('Safety: Potential prompt injection detected.');
            }
        }
    }
}
exports.SafetyPipeline = SafetyPipeline;
exports.safetyPipeline = new SafetyPipeline();
