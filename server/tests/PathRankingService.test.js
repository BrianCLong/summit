"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PathRankingService_js_1 = require("../src/services/PathRankingService.js");
(0, globals_1.describe)('PathRankingService', () => {
    (0, globals_1.it)('v2 ranking improves top1 path alignment', () => {
        const paths = [
            { from: 'A', to: 'B', relId: 'r1', type: 'WEAK' },
            { from: 'A', to: 'C', relId: 'r2', type: 'STRONG' },
        ];
        const edgeWeights = { WEAK: 0.5, STRONG: 1 };
        const nodeCentrality = { A: 1, B: 0.2, C: 0.9 };
        const baseline = (0, PathRankingService_js_1.rankPaths)(paths, {
            edgeWeights,
            nodeCentrality,
            strategy: 'v1',
        });
        const v2 = (0, PathRankingService_js_1.rankPaths)(paths, {
            edgeWeights,
            nodeCentrality,
            strategy: 'v2',
        });
        (0, globals_1.expect)(baseline[0].path.relId).toBe('r1');
        (0, globals_1.expect)(v2[0].path.relId).toBe('r2');
        const baselineAcc = baseline[0].path.relId === 'r2' ? 1 : 0;
        const v2Acc = v2[0].path.relId === 'r2' ? 1 : 0;
        (0, globals_1.expect)(v2Acc - baselineAcc).toBeGreaterThanOrEqual(0.15);
        (0, globals_1.expect)(v2[0].score_breakdown).toHaveProperty('edgeType');
    });
});
