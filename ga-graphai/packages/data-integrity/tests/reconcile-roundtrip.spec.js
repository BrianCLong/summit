"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('reconciliation', () => {
    (0, vitest_1.it)('produces deterministic drift report', () => {
        const report = (0, index_js_1.reconcile)('case-1', { name: 'graph', count: 3, ids: ['a', 'b', 'c'], checksums: { a: '1', b: '2', c: '3' } }, { name: 'doc', count: 2, ids: ['a', 'c'], checksums: { a: '1', c: '999' } }, { seed: 1, sampleSize: 2 });
        (0, vitest_1.expect)(report.missingInB).toEqual(['b']);
        (0, vitest_1.expect)(report.stale).toContain('c');
    });
});
(0, vitest_1.describe)('roundtrip verifier', () => {
    (0, vitest_1.it)('fails closed with actionable mismatch list', () => {
        const bundle = [
            { id: '1', type: 'entity', payload: { __hash: 'bad', name: 'Alice' }, references: ['missing'] },
            { id: '2', type: 'entity', payload: { __hash: 'bad', name: 'Bob' } },
        ];
        const report = (0, index_js_1.verifyRoundtrip)(bundle, { expectedCount: 3 });
        (0, vitest_1.expect)(report.ok).toBe(false);
        (0, vitest_1.expect)(report.mismatches.length).toBeGreaterThan(0);
    });
});
