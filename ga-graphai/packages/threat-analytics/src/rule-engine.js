"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionRuleEngine = void 0;
class DetectionRuleEngine {
    rules;
    constructor(rules = []) {
        this.rules = rules;
    }
    register(rule) {
        this.rules.push(rule);
    }
    evaluate(context) {
        const hits = [];
        for (const rule of this.rules) {
            if (rule.condition(context)) {
                hits.push(rule);
            }
        }
        return hits;
    }
}
exports.DetectionRuleEngine = DetectionRuleEngine;
