"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverPolicies = discoverPolicies;
exports.mergePolicies = mergePolicies;
exports.explainDecision = explainDecision;
exports.diffPolicies = diffPolicies;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const policy_engine_1 = require("./policy-engine");
function discoverPolicies(policiesDir) {
    if (!fs_1.default.existsSync(policiesDir)) {
        throw new Error(`Policy directory not found: ${policiesDir}`);
    }
    return fs_1.default
        .readdirSync(policiesDir)
        .filter((file) => file.endsWith('.json'))
        .sort()
        .map((file) => {
        const full = path_1.default.join(policiesDir, file);
        return {
            id: path_1.default.basename(file, '.json'),
            path: full,
            policy: (0, policy_engine_1.loadPolicy)(full),
        };
    });
}
function mergePolicies(policies) {
    const combined = { version: 'v1', rules: [] };
    for (const { policy, id } of policies) {
        const rules = policy.rules.map((rule) => ({ ...rule, id: rule.id || id }));
        combined.rules.push(...rules);
    }
    return combined;
}
function explainDecision(policy, ctx) {
    return (0, policy_engine_1.evaluate)(policy, ctx);
}
function diffPolicies(left, right) {
    const leftRules = new Map(left.rules.map((r) => [r.id, r]));
    const rightRules = new Map(right.rules.map((r) => [r.id, r]));
    const removed = [];
    const added = [];
    const changed = [];
    for (const id of leftRules.keys()) {
        if (!rightRules.has(id)) {
            removed.push(id);
        }
        else if (JSON.stringify(leftRules.get(id)) !== JSON.stringify(rightRules.get(id))) {
            changed.push(id);
        }
    }
    for (const id of rightRules.keys()) {
        if (!leftRules.has(id)) {
            added.push(id);
        }
    }
    return { added, removed, changed };
}
