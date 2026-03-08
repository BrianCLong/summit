"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePlaybookSemantics = validatePlaybookSemantics;
const pgPolicy_1 = require("../policy/pgPolicy");
function containsForbiddenPhrases(text) {
    const lower = text.toLowerCase();
    return pgPolicy_1.DEFAULT_PG_CONTENT_SAFETY.prescriptiveLanguageHeuristics.forbiddenPhrases.filter((phrase) => lower.includes(phrase));
}
function validatePlaybookSemantics(playbook) {
    const violations = [];
    if (playbook?.contentSafety?.analyticOnly !== true) {
        violations.push({
            code: 'PG_SV_ANALYTIC_ONLY_REQUIRED',
            message: 'Playbook must declare contentSafety.analyticOnly=true.',
            path: '/contentSafety/analyticOnly'
        });
    }
    if (playbook?.contentSafety?.forbidPrescriptive !== true) {
        violations.push({
            code: 'PG_SV_FORBID_PRESCRIPTIVE_REQUIRED',
            message: 'Playbook must declare contentSafety.forbidPrescriptive=true.',
            path: '/contentSafety/forbidPrescriptive'
        });
    }
    const fieldsToScan = [
        { path: '/name', value: playbook?.name },
        { path: '/provenance/source', value: playbook?.provenance?.source }
    ];
    if (Array.isArray(playbook?.outcomes)) {
        playbook.outcomes.forEach((outcome, index) => {
            fieldsToScan.push({
                path: `/outcomes/${index}/description`,
                value: outcome?.description
            });
        });
    }
    for (const field of fieldsToScan) {
        if (typeof field.value === 'string') {
            const hits = containsForbiddenPhrases(field.value);
            if (hits.length > 0) {
                violations.push({
                    code: 'PG_SV_PRESCRIPTIVE_LANGUAGE',
                    message: `Potentially prescriptive language detected (${hits.join(', ')}). This package is analytic/defensive only.`,
                    path: field.path
                });
            }
        }
    }
    const allowed = new Set(['detection', 'attribution', 'forecasting', 'training']);
    if (!allowed.has(playbook?.useCase)) {
        violations.push({
            code: 'PG_SV_INVALID_USECASE',
            message: 'useCase must be an allowed analytic/defensive value.',
            path: '/useCase'
        });
    }
    return violations;
}
