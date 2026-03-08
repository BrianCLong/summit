"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionContractRegistry = void 0;
exports.applyRedactionRules = applyRedactionRules;
class ActionContractRegistry {
    contracts = new Map();
    register(contract) {
        this.contracts.set(contract.toolName, contract);
    }
    get(toolName) {
        return this.contracts.get(toolName);
    }
    list() {
        return Array.from(this.contracts.values());
    }
}
exports.ActionContractRegistry = ActionContractRegistry;
function applyRedactionRules(value, rules = []) {
    if (rules.length === 0) {
        return value;
    }
    const cloned = JSON.parse(JSON.stringify(value));
    for (const rule of rules) {
        const replacement = rule.replacement ?? '[REDACTED]';
        const segments = rule.path.split('.').filter(Boolean);
        if (segments.length === 0) {
            continue;
        }
        let target = cloned;
        for (let i = 0; i < segments.length - 1; i += 1) {
            const key = segments[i];
            const next = target?.[key];
            if (next && typeof next === 'object') {
                target = next;
            }
            else {
                target = undefined;
                break;
            }
        }
        if (target) {
            const lastKey = segments[segments.length - 1];
            if (lastKey in target) {
                target[lastKey] = replacement;
            }
        }
    }
    return cloned;
}
