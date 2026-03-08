"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const InternalCommandDashboard_1 = __importDefault(require("./InternalCommandDashboard"));
const AuthContext_1 = require("@/contexts/AuthContext");
const vitest_1 = require("vitest");
const react_2 = __importDefault(require("react"));
// Mock fetch
global.fetch = vitest_1.vi.fn((url) => {
    if (url.toString().includes('/api/internal')) {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                status: 'green',
                details: {
                    checklist: { governance: true },
                    activeAgents: { 'tier-1': 1 },
                    openPRs: { 'tier-1': 1 },
                    isolationViolations: 0,
                    eventIngestionRate: 100,
                    evidenceBundleCompleteness: 1.0,
                    lastTier4Approval: new Date().toISOString(),
                    killSwitchStatus: 'inactive',
                    budgetUsagePercent: 50,
                    topRiskScores: [],
                    ciPassRate: 1.0,
                    governanceFailures24h: 0,
                    currentTrain: 'stable',
                    lastReleaseHash: 'abcdef',
                    zkProtocolVersion: 'v1',
                    streamLagMs: 10,
                    featureFreshnessMs: 10
                },
                message: 'Mocked'
            }),
        });
    }
    return Promise.resolve({ ok: false });
});
(0, vitest_1.describe)('InternalCommandDashboard', () => {
    (0, vitest_1.it)('renders dashboard shell and panels', async () => {
        (0, react_1.render)(<AuthContext_1.AuthProvider>
        <InternalCommandDashboard_1.default />
      </AuthContext_1.AuthProvider>);
        // Check for header
        (0, vitest_1.expect)(react_1.screen.getByText('SUMMIT COMMAND DASHBOARD')).toBeInTheDocument();
        // Check for panel loading/content
        // Wait for async fetch
        await (0, react_1.waitFor)(() => {
            // Governance Panel Title
            (0, vitest_1.expect)(react_1.screen.getByText('Governance')).toBeInTheDocument();
            // GA Readiness Panel Title
            (0, vitest_1.expect)(react_1.screen.getByText('GA Readiness')).toBeInTheDocument();
        });
    });
});
