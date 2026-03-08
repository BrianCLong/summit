"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suppressionService = exports.SuppressionService = void 0;
class SuppressionService {
    rules = [];
    constructor() {
        // Initialize with empty list or load from DB in real implementation
    }
    addRule(rule) {
        this.rules.push(rule);
    }
    removeRule(ruleId) {
        this.rules = this.rules.filter(r => r.id !== ruleId);
    }
    isSuppressed(ruleId, entityKey, timestamp = Date.now()) {
        return this.rules.some(s => {
            const inWindow = timestamp >= s.startTime && timestamp <= s.endTime;
            if (!inWindow)
                return false;
            const ruleMatch = !s.targetRuleId || s.targetRuleId === ruleId;
            const keyMatch = !s.targetEntityKey || s.targetEntityKey === entityKey;
            return ruleMatch && keyMatch;
        });
    }
    getRules() {
        return [...this.rules];
    }
}
exports.SuppressionService = SuppressionService;
exports.suppressionService = new SuppressionService();
