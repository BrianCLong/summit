"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const explainer_js_1 = require("../explainer.js");
(0, globals_1.describe)('buildQueryExplanation', () => {
    const baseCypher = 'MATCH (p:Person)-[:ASSOCIATED_WITH]->(o:Organization) WHERE o.type = $type RETURN p, o';
    (0, globals_1.it)('creates rationale and evidence from core clauses with strong confidence', () => {
        const explanation = (0, explainer_js_1.buildQueryExplanation)(baseCypher, {
            warnings: [],
            estimatedCost: 'low',
        });
        (0, globals_1.expect)(explanation.summary).toBe('Queries the graph for matching entities');
        (0, globals_1.expect)(explanation.rationale).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.stringContaining('Identifying graph pattern 1'),
            'Applying filters to narrow the candidate set.',
            'Selecting outputs relevant to the investigative question.',
            'Parameterizing inputs to keep execution safe and repeatable.',
        ]));
        (0, globals_1.expect)(explanation.evidence).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({ source: 'MATCH clause' }),
            globals_1.expect.objectContaining({ source: 'WHERE clause' }),
            globals_1.expect.objectContaining({ source: 'RETURN clause' }),
            globals_1.expect.objectContaining({ source: 'Parameters', snippet: '$type' }),
        ]));
        (0, globals_1.expect)(explanation.confidence).toBe(0.92);
    });
    (0, globals_1.it)('reduces confidence proportionally when warnings are present', () => {
        const warningExplanation = (0, explainer_js_1.buildQueryExplanation)(baseCypher, {
            warnings: ['warn 1', 'warn 2', 'warn 3'],
            estimatedCost: 'medium',
        });
        (0, globals_1.expect)(warningExplanation.confidence).toBeCloseTo(0.71, 2);
    });
    (0, globals_1.it)('caps the maximum warning penalty to protect confidence floor', () => {
        const highWarningExplanation = (0, explainer_js_1.buildQueryExplanation)(baseCypher, {
            warnings: Array(10).fill('issue'),
            estimatedCost: 'very-high',
        });
        (0, globals_1.expect)(highWarningExplanation.confidence).toBe(0.57);
    });
});
