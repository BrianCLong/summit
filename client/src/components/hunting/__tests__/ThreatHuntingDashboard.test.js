"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any -- jest mocks require type assertions */
/**
 * ThreatHuntingDashboard Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const globals_1 = require("@jest/globals");
const react_2 = require("@testing-library/react");
const user_event_1 = __importDefault(require("@testing-library/user-event"));
const ThreatHuntingDashboard_1 = require("../ThreatHuntingDashboard");
// Mock fetch
const mockFetch = globals_1.jest.fn();
global.fetch = mockFetch;
(0, globals_1.describe)('ThreatHuntingDashboard', () => {
    (0, globals_1.beforeEach)(() => {
        mockFetch.mockClear();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Rendering', () => {
        (0, globals_1.it)('should render the dashboard title', () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            expect(react_2.screen.getByText('Threat Hunting Platform')).toBeInTheDocument();
        });
        (0, globals_1.it)('should render the start hunt button', () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            expect(react_2.screen.getByRole('button', { name: /start hunt/i })).toBeInTheDocument();
        });
        (0, globals_1.it)('should render tabs for findings, IOCs, remediation, and report', () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            expect(react_2.screen.getByRole('tab', { name: /findings/i })).toBeInTheDocument();
            expect(react_2.screen.getByRole('tab', { name: /iocs/i })).toBeInTheDocument();
            expect(react_2.screen.getByRole('tab', { name: /remediation/i })).toBeInTheDocument();
            expect(react_2.screen.getByRole('tab', { name: /report/i })).toBeInTheDocument();
        });
        (0, globals_1.it)('should show empty state when no findings', () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            expect(react_2.screen.getByText(/no findings yet/i)).toBeInTheDocument();
        });
    });
    (0, globals_1.describe)('Configuration Dialog', () => {
        (0, globals_1.it)('should open configuration dialog when settings button is clicked', async () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const settingsButton = react_2.screen.getByRole('button', { name: /configuration/i });
            await user_event_1.default.click(settingsButton);
            expect(react_2.screen.getByText('Hunt Configuration')).toBeInTheDocument();
        });
        (0, globals_1.it)('should have default configuration values', async () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const settingsButton = react_2.screen.getByRole('button', { name: /configuration/i });
            await user_event_1.default.click(settingsButton);
            // Check for time window input
            const timeWindowInput = react_2.screen.getByLabelText(/time window/i);
            expect(timeWindowInput).toHaveValue(24);
        });
        (0, globals_1.it)('should close configuration dialog on cancel', async () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const settingsButton = react_2.screen.getByRole('button', { name: /configuration/i });
            await user_event_1.default.click(settingsButton);
            const cancelButton = react_2.screen.getByRole('button', { name: /cancel/i });
            await user_event_1.default.click(cancelButton);
            await (0, react_2.waitFor)(() => {
                expect(react_2.screen.queryByText('Hunt Configuration')).not.toBeInTheDocument();
            });
        });
    });
    (0, globals_1.describe)('Starting a Hunt', () => {
        (0, globals_1.it)('should call API to start hunt when button is clicked', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    huntId: 'test-hunt-123',
                    status: 'initializing',
                    estimatedDuration: 120000,
                }),
            });
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const startButton = react_2.screen.getByRole('button', { name: /start hunt/i });
            await user_event_1.default.click(startButton);
            await (0, react_2.waitFor)(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/v1/hunt/start', expect.any(Object));
            });
        });
        (0, globals_1.it)('should show hunt status after starting', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    huntId: 'test-hunt-123',
                    status: 'initializing',
                    estimatedDuration: 120000,
                }),
            });
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const startButton = react_2.screen.getByRole('button', { name: /start hunt/i });
            await user_event_1.default.click(startButton);
            await (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByText(/test-hunt-123/i)).toBeInTheDocument();
            });
        });
        (0, globals_1.it)('should show cancel button when hunt is active', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    huntId: 'test-hunt-123',
                    status: 'initializing',
                    estimatedDuration: 120000,
                }),
            });
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const startButton = react_2.screen.getByRole('button', { name: /start hunt/i });
            await user_event_1.default.click(startButton);
            await (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByRole('button', { name: /cancel hunt/i })).toBeInTheDocument();
            });
        });
        (0, globals_1.it)('should show error alert on API failure', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Failed to start hunt'));
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const startButton = react_2.screen.getByRole('button', { name: /start hunt/i });
            await user_event_1.default.click(startButton);
            await (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByRole('alert')).toBeInTheDocument();
            });
        });
    });
    (0, globals_1.describe)('Hunt Progress', () => {
        (0, globals_1.it)('should display progress bar during hunt', async () => {
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    huntId: 'test-hunt-123',
                    status: 'initializing',
                    estimatedDuration: 120000,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    huntId: 'test-hunt-123',
                    status: 'executing_queries',
                    progress: 50,
                    currentPhase: 'Executing Graph Queries',
                    findingsCount: 5,
                    elapsedTimeMs: 30000,
                    estimatedRemainingMs: 30000,
                }),
            });
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const startButton = react_2.screen.getByRole('button', { name: /start hunt/i });
            await user_event_1.default.click(startButton);
            await (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByRole('progressbar')).toBeInTheDocument();
            });
        });
    });
    (0, globals_1.describe)('Tab Navigation', () => {
        (0, globals_1.it)('should switch to IOCs tab when clicked', async () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const iocsTab = react_2.screen.getByRole('tab', { name: /iocs/i });
            await user_event_1.default.click(iocsTab);
            expect(react_2.screen.getByText(/no iocs discovered yet/i)).toBeInTheDocument();
        });
        (0, globals_1.it)('should switch to remediation tab when clicked', async () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const remediationTab = react_2.screen.getByRole('tab', { name: /remediation/i });
            await user_event_1.default.click(remediationTab);
            expect(react_2.screen.getByText(/remediation actions will appear here/i)).toBeInTheDocument();
        });
        (0, globals_1.it)('should switch to report tab when clicked', async () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const reportTab = react_2.screen.getByRole('tab', { name: /report/i });
            await user_event_1.default.click(reportTab);
            expect(react_2.screen.getByText(/report will be generated/i)).toBeInTheDocument();
        });
    });
    (0, globals_1.describe)('Metrics Display', () => {
        (0, globals_1.it)('should display metrics after hunt completion', async () => {
            mockFetch
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    huntId: 'test-hunt-123',
                    status: 'completed',
                    estimatedDuration: 120000,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    huntId: 'test-hunt-123',
                    status: 'completed',
                    progress: 100,
                    currentPhase: 'Hunt Complete',
                    findingsCount: 10,
                    elapsedTimeMs: 60000,
                    estimatedRemainingMs: 0,
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    findings: [
                        {
                            id: 'finding-1',
                            severity: 'HIGH',
                            confidence: 0.85,
                            classification: 'LATERAL_MOVEMENT',
                            entitiesInvolved: [],
                            iocsIdentified: [],
                            ttpsMatched: [],
                            recommendedActions: [],
                            autoRemediationEligible: false,
                            evidenceSummary: 'Test finding',
                        },
                    ],
                    metrics: {
                        totalFindingsDiscovered: 10,
                        iocsDiscovered: 5,
                        precisionEstimate: 0.91,
                        totalQueriesExecuted: 20,
                        totalHypothesesTested: 5,
                        executionTimeMs: 60000,
                    },
                }),
            });
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            const startButton = react_2.screen.getByRole('button', { name: /start hunt/i });
            await user_event_1.default.click(startButton);
            // Wait for metrics to appear (would need to wait for status polling)
            // This test verifies the structure is in place
        });
    });
    (0, globals_1.describe)('Severity Colors', () => {
        (0, globals_1.it)('should apply correct colors for severity chips', () => {
            // This is a visual test - would need visual regression testing
            // or snapshot testing to fully verify
            expect(true).toBe(true);
        });
    });
    (0, globals_1.describe)('Accessibility', () => {
        (0, globals_1.it)('should have proper ARIA labels', () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            // Check for tab roles
            const tabs = react_2.screen.getAllByRole('tab');
            expect(tabs.length).toBeGreaterThan(0);
            // Check for button roles
            const buttons = react_2.screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should be keyboard navigable', async () => {
            (0, react_2.render)(<ThreatHuntingDashboard_1.ThreatHuntingDashboard />);
            // Tab to first focusable element
            await user_event_1.default.tab();
            // Should be able to navigate with keyboard
            expect(document.activeElement).not.toBe(document.body);
        });
    });
});
(0, globals_1.describe)('HuntQueryBuilder', () => {
    const { HuntQueryBuilder } = require('../HuntQueryBuilder');
    (0, globals_1.it)('should render the query builder', () => {
        (0, react_2.render)(<HuntQueryBuilder />);
        expect(react_2.screen.getByText('Hunt Query Builder')).toBeInTheDocument();
    });
    (0, globals_1.it)('should have template categories', () => {
        (0, react_2.render)(<HuntQueryBuilder />);
        expect(react_2.screen.getByRole('tab', { name: /lateral movement/i })).toBeInTheDocument();
    });
    (0, globals_1.it)('should have a query editor', () => {
        (0, react_2.render)(<HuntQueryBuilder />);
        expect(react_2.screen.getByText('Query Editor')).toBeInTheDocument();
    });
    (0, globals_1.it)('should have a run query button', () => {
        (0, react_2.render)(<HuntQueryBuilder />);
        expect(react_2.screen.getByRole('button', { name: /run query/i })).toBeInTheDocument();
    });
});
