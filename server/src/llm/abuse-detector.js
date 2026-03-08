"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbuseDetector = void 0;
class AbuseDetector {
    failures = new Map();
    recordFailure(tenantId, windowSeconds) {
        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        const existing = this.failures.get(tenantId) || [];
        const filtered = existing.filter((ts) => now - ts <= windowMs);
        filtered.push(now);
        this.failures.set(tenantId, filtered);
    }
    exceededFailures(tenantId, failureThreshold, windowSeconds) {
        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        const existing = this.failures.get(tenantId) || [];
        const filtered = existing.filter((ts) => now - ts <= windowMs);
        this.failures.set(tenantId, filtered);
        return filtered.length >= failureThreshold;
    }
    checkPromptLimit(tenantId, messages, limit) {
        if (!limit)
            return null;
        const totalLength = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
        if (totalLength > limit) {
            return {
                type: 'prompt_limit_exceeded',
                tenantId,
                reason: `Prompt length ${totalLength} exceeds limit ${limit}`,
            };
        }
        return null;
    }
    detectSuspicious(tenantId, messages, patterns = []) {
        if (!patterns.length)
            return null;
        const combined = messages.map((m) => m.content || '').join('\n');
        for (const pattern of patterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(combined)) {
                return {
                    type: 'suspicious_prompt',
                    tenantId,
                    reason: `Matched pattern: ${pattern}`,
                };
            }
        }
        return null;
    }
}
exports.AbuseDetector = AbuseDetector;
