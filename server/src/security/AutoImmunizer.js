"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoImmunizerService = void 0;
class AutoImmunizerService {
    static instance;
    activeRules = new Map();
    constructor() { }
    static getInstance() {
        if (!AutoImmunizerService.instance) {
            AutoImmunizerService.instance = new AutoImmunizerService();
        }
        return AutoImmunizerService.instance;
    }
    processAuthFailure(ip, userId) {
        // Simple logic: In a real system, this would use a sliding window or TokenBucket
        // For this MVP, we just log it.
        // If we had a state store, we'd increment a counter.
    }
    /**
     * Manually trigger a rule for testing/admin.
     */
    createBlockRule(target, durationSeconds) {
        const rule = {
            id: crypto.randomUUID(),
            target,
            type: 'BLOCK_IP',
            reason: 'Automated Defense Activation',
            expiresAt: new Date(Date.now() + durationSeconds * 1000)
        };
        this.activeRules.set(target, rule);
        console.log(`[AutoImmunizer] Applied rule: Block ${target} until ${rule.expiresAt}`);
        return rule;
    }
    isBlocked(target) {
        const rule = this.activeRules.get(target);
        if (!rule)
            return false;
        if (new Date() > rule.expiresAt) {
            this.activeRules.delete(target);
            return false;
        }
        return true;
    }
}
exports.AutoImmunizerService = AutoImmunizerService;
