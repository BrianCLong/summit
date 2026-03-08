"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceAnalyticOnly = enforceAnalyticOnly;
const PROHIBITED_INTENT_PATTERNS = [
    /target\s+audience/i,
    /optimi[sz]e\s+persuasion/i,
    /best\s+message\s+to\s+convince/i,
    /increase\s+conversion\s+by\s+misleading/i,
    /propaganda\s+playbook/i,
    /psychographic\s+targeting/i,
    /how\s+to\s+radicali[sz]e/i,
    /how\s+to\s+manipulate/i,
];
function enforceAnalyticOnly(queryOrPrompt) {
    for (const re of PROHIBITED_INTENT_PATTERNS) {
        if (re.test(queryOrPrompt)) {
            return {
                ok: false,
                reason: 'Blocked: CogBattlespace is analytic/defensive only (detect/measure/explain).',
            };
        }
    }
    return { ok: true };
}
