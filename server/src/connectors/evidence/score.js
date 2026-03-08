"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreEvidence = scoreEvidence;
const rules_js_1 = require("./rules.js");
function scoreEvidence(data, rules = rules_js_1.ALL_RULES) {
    let totalScore = 0;
    let totalWeight = 0;
    const missing = [];
    const details = {};
    for (const rule of rules) {
        const passed = rule.evaluate(data);
        details[rule.id] = passed;
        totalWeight += rule.weight;
        if (passed) {
            totalScore += rule.weight;
        }
        else {
            missing.push(rule.id);
        }
    }
    // Normalize score to 0-1 range if totalWeight > 0
    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    return {
        score: normalizedScore,
        missing,
        details,
    };
}
