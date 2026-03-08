"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const App_1 = __importDefault(require("./App"));
const mockSnapshot = {
    generatedAt: '2024-01-01T00:00:00.000Z',
    gaGate: {
        overall: 'pass',
        lastRun: '2024-01-01T00:00:00.000Z',
        details: [{ component: 'package-json', status: 'pass', message: 'ok' }],
    },
    ci: {
        branch: 'main',
        status: 'pass',
        commit: 'abc123',
        updatedAt: '2024-01-01T00:00:00.000Z',
    },
    slo: {
        compliance: 0.99,
        window: '30d',
        errorBudgetRemaining: 0.92,
        burnRate: 0.45,
    },
    llm: {
        aggregate: { tokens: 200000, cost: 50, window: '7d' },
        tenants: [
            { tenantId: 'acme', tokens: 100000, cost: 25, rateLimitStatus: 'pass' },
            { tenantId: 'globex', tokens: 100000, cost: 25, rateLimitStatus: 'warning' },
        ],
    },
    dependencyRisk: {
        level: 'warning',
        issues: 2,
        lastScan: '2024-01-01T00:00:00.000Z',
        topRisks: ['outdated-core'],
    },
    evidence: {
        latestBundle: 'bundle-1',
        status: 'pass',
        artifacts: 3,
        lastGeneratedAt: '2024-01-01T00:00:00.000Z',
    },
    tenants: [
        { tenantId: 'acme', active: true, rateLimit: '5r/s', ingestionCap: '5k/hr', killSwitch: false },
        { tenantId: 'globex', active: true, rateLimit: '3r/s', ingestionCap: '2k/hr', killSwitch: true },
    ],
    incidents: {
        gaGateFailures: [],
        policyDenials: [],
        killSwitchActivations: [],
    },
};
(0, vitest_1.describe)('Command Console dashboard', () => {
    const originalFetch = global.fetch;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.useFakeTimers({ shouldAdvanceTime: true });
        vitest_1.vi.stubEnv('VITE_COMMAND_CONSOLE_ENABLED', 'true');
        global.fetch = vitest_1.vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockSnapshot,
        });
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
        vitest_1.vi.unstubAllEnvs();
        global.fetch = originalFetch;
    });
    (0, vitest_1.it)('renders health and tenant panels', async () => {
        (0, react_1.render)(<App_1.default />);
        await (0, react_1.waitFor)(() => {
            (0, vitest_1.expect)(react_1.screen.getByText(/Summit Command Console/i)).toBeInTheDocument();
        });
        // Use exact match for "GA Gate" to avoid matching "GA Gate Failures"
        (0, vitest_1.expect)(react_1.screen.getByText('GA Gate')).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText(/Tenant & Blast Radius/i)).toBeInTheDocument();
        // Multiple elements contain "acme" so check at least one exists
        (0, vitest_1.expect)(react_1.screen.getAllByText(/acme/).length).toBeGreaterThan(0);
        (0, vitest_1.expect)(react_1.screen.getByText(/LLM Tokens/)).toBeInTheDocument();
    });
    (0, vitest_1.it)('shows a helpful message when disabled', async () => {
        vitest_1.vi.stubEnv('VITE_COMMAND_CONSOLE_ENABLED', 'false');
        (0, react_1.render)(<App_1.default />);
        await (0, react_1.waitFor)(() => {
            (0, vitest_1.expect)(react_1.screen.getByText(/Access blocked/i)).toBeInTheDocument();
        });
    });
});
