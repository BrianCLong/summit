"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePolicy = parsePolicy;
exports.evaluateMerge = evaluateMerge;
exports.mergeEntities = mergeEntities;
function parsePolicy(policyStr) {
    const lines = policyStr.split('\n');
    const rules = [];
    let currentRule = null;
    for (const line of lines) {
        if (line.trim().startsWith('- id:')) {
            if (currentRule)
                rules.push(currentRule);
            currentRule = { id: line.split(':')[1].trim(), fields: [] };
        }
        else if (line.trim().startsWith('type:')) {
            if (currentRule)
                currentRule.type = line.split(':')[1].trim().replace(/["']/g, '');
        }
        else if (line.trim().startsWith('fields:')) {
            if (currentRule) {
                const fieldStr = line.split(':')[1].trim().replace(/[\[\]]/g, '');
                currentRule.fields = fieldStr.split(',').map((f) => f.trim().replace(/["']/g, ''));
            }
        }
    }
    if (currentRule)
        rules.push(currentRule);
    return { rules };
}
function evaluateMerge(e1, e2, policy) {
    for (const rule of policy.rules) {
        if (rule.type === 'exact_match') {
            for (const field of rule.fields) {
                if (e1[field] === undefined || e2[field] === undefined)
                    return false;
                if (e1[field] !== e2[field])
                    return false;
            }
            return true;
        }
    }
    return false;
}
function mergeEntities(e1, e2, policyVersion) {
    return {
        event: 'MERGE_EVENT',
        policy: policyVersion,
        surviving: { ...e1, ...e2 },
        discarded: [e1.id, e2.id]
    };
}
