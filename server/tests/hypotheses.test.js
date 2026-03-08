"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const hypotheses_js_1 = require("../src/hypotheses.js");
(0, globals_1.describe)('hypothesis updates', () => {
    const base = {
        id: 'h1',
        statement: 'Test hypothesis',
        prior: 0.2,
        evidence: [],
        posterior: 0.2,
        residualUnknowns: [],
        dissent: [],
    };
    (0, globals_1.it)('updates probability with evidence', () => {
        const e = {
            id: 'e1',
            description: 'supporting',
            likelihoodGivenHypothesis: 0.9,
            likelihoodGivenAlternative: 0.1,
            cited: true,
        };
        const updated = (0, hypotheses_js_1.applyEvidence)(base, e);
        (0, globals_1.expect)(updated.posterior).toBeCloseTo(0.6923, 4);
    });
    (0, globals_1.it)('records dissent', () => {
        const dissenting = (0, hypotheses_js_1.addDissent)(base, 'alternative explanation');
        (0, globals_1.expect)(dissenting.dissent).toContain('alternative explanation');
    });
});
