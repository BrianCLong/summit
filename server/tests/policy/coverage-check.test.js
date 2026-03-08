"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('evaluateCoverage', () => {
    (0, globals_1.test)('passes when all changed files meet the threshold', async () => {
        const coverageModule = require('../../../scripts/ci/coverage-check.cjs');
        const summary = {
            total: {},
            'apps/server/src/service.ts': createCoverageEntry(92),
            'client/src/view.tsx': createCoverageEntry(90),
        };
        const result = coverageModule.evaluateCoverage(summary, ['apps/server/src/service.ts', 'client/src/view.tsx'], 0.85);
        (0, globals_1.expect)(result.passed).toBe(true);
        (0, globals_1.expect)(result.details[0]).toContain('meet or exceed 85% coverage');
    });
    (0, globals_1.test)('fails when any metric drops below the threshold', async () => {
        const coverageModule = require('../../../scripts/ci/coverage-check.cjs');
        const summary = {
            total: {},
            'apps/server/src/controller.ts': {
                statements: { pct: 80 },
                branches: { pct: 90 },
                functions: { pct: 88 },
                lines: { pct: 89 },
            },
        };
        const result = coverageModule.evaluateCoverage(summary, ['apps/server/src/controller.ts'], 0.85);
        (0, globals_1.expect)(result.passed).toBe(false);
        (0, globals_1.expect)(result.details).toContainEqual(globals_1.expect.stringContaining('apps/server/src/controller.ts: statements coverage 80.0% is below required 85'));
    });
});
function createCoverageEntry(pct) {
    return {
        statements: { pct },
        branches: { pct },
        functions: { pct },
        lines: { pct },
    };
}
