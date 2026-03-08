"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('invariants', () => {
    (0, vitest_1.it)('detects duplicate IDs during audit', () => {
        const engine = new index_js_1.InvariantEngine([
            (0, index_js_1.uniquenessRule)('entities'),
        ]);
        const violations = engine.runAudit([
            { id: 'a' },
            { id: 'a' },
            { id: 'b' },
        ]);
        (0, vitest_1.expect)(violations).toHaveLength(1);
        (0, vitest_1.expect)(violations[0].affectedIds).toContain('a');
    });
    (0, vitest_1.it)('blocks boundary write when required relation missing', () => {
        const rule = (0, index_js_1.requiredRelationshipRule)('case', new Set(['case-1']));
        const engine = new index_js_1.InvariantEngine([rule]);
        const violations = engine.runBoundaryChecks({ id: 'missing' });
        (0, vitest_1.expect)(violations[0].severity).toBe('block');
    });
    (0, vitest_1.it)('finds simple cycles in bounded graph', () => {
        const engine = new index_js_1.InvariantEngine([
            (0, index_js_1.cycleRule)([
                { from: 'a', to: 'b' },
                { from: 'b', to: 'c' },
                { from: 'c', to: 'a' },
            ], 'warn'),
        ]);
        const violations = engine.runAudit([]);
        (0, vitest_1.expect)(violations[0].ruleId).toBe('graph-cycle-check');
    });
});
