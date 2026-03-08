"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DualUseGuard = void 0;
class DualUseGuard {
    static BLOCKED_TERMS = [
        'targeting_list',
        'microtarget_recommendation',
        'optimal_message_for_person',
        'individual_targeting',
        'audience_targeting_output'
    ];
    static validateOutput(output) {
        const violations = [];
        const outputString = JSON.stringify(output);
        // Check keys and string values
        for (const term of this.BLOCKED_TERMS) {
            if (outputString.includes(term)) {
                violations.push(`Detected blocked term: ${term}`);
            }
        }
        return violations;
    }
    static check(output) {
        const violations = this.validateOutput(output);
        if (violations.length > 0) {
            throw new Error(`Dual-Use Violation: ${violations.join(', ')}`);
        }
        return true;
    }
}
exports.DualUseGuard = DualUseGuard;
