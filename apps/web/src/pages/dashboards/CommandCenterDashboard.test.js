"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const test_utils_1 = require("../../test-utils");
const vitest_1 = require("vitest");
const CommandCenterDashboard_1 = __importDefault(require("./CommandCenterDashboard"));
const precisionResponse = {
    data: [
        { date: '2025-01-01', metric_name: 'precision', value: 0.93 },
        { date: '2025-01-01', metric_name: 'recall', value: 0.87 },
    ],
};
const rollbackResponse = {
    data: [{ date: '2025-01-01', rollbacks: 2, total_deployments: 10 }],
};
const conflictResponse = {
    data: [{ conflict_reason: 'Conflicting metric values', count: 3 }],
};
const guardrailResponse = {
    datasetId: 'baseline',
    passed: true,
    metrics: { precision: 0.92, recall: 0.88, totalPairs: 10 },
    thresholds: { minPrecision: 0.9, minRecall: 0.85, matchThreshold: 0.8 },
    evaluatedAt: '2025-01-01T00:00:00Z',
    latestOverride: null,
};
const mockFetch = vitest_1.vi.fn((url) => {
    const target = url.toString();
    if (target.includes('/api/ga-core-metrics/er-ops/precision-recall')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(precisionResponse),
        });
    }
    if (target.includes('/api/ga-core-metrics/er-ops/rollbacks')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(rollbackResponse),
        });
    }
    if (target.includes('/api/ga-core-metrics/er-ops/conflicts')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(conflictResponse),
        });
    }
    if (target.includes('/api/er/guardrails/status')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(guardrailResponse),
        });
    }
    return Promise.resolve({ ok: false });
});
(0, vitest_1.beforeEach)(() => {
    global.fetch = mockFetch;
    global.ResizeObserver = class {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
});
(0, vitest_1.afterEach)(() => {
    vitest_1.vi.resetAllMocks();
});
(0, vitest_1.describe)('CommandCenterDashboard', () => {
    vitest_1.it.skip('renders ER ops panel with charts', async () => {
        (0, test_utils_1.render)(<CommandCenterDashboard_1.default />);
        await (0, test_utils_1.waitFor)(() => {
            (0, vitest_1.expect)(test_utils_1.screen.getByText('ER Ops')).toBeInTheDocument();
            (0, vitest_1.expect)(test_utils_1.screen.getByText('Precision vs Recall')).toBeInTheDocument();
            (0, vitest_1.expect)(test_utils_1.screen.getByText('Conflict Reasons')).toBeInTheDocument();
            (0, vitest_1.expect)(test_utils_1.screen.getByText(/Rollback rate: 20\.0%/)).toBeInTheDocument();
        });
    });
});
