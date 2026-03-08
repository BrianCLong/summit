"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any -- jest-dom matchers require type assertions */
/**
 * Route Smoke Tests with Console Error Detection
 *
 * This test suite ensures critical routes render without console errors,
 * meeting GA stability requirements.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const globals_1 = require("@jest/globals");
const react_2 = require("@testing-library/react");
const react_router_dom_1 = require("react-router-dom");
const react_redux_1 = require("react-redux");
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
const store_1 = __importDefault(require("../store"));
const apollo_1 = require("../services/apollo");
const intelgraphTheme_1 = require("../theme/intelgraphTheme");
const AuthContext_1 = require("../context/AuthContext");
const ReleaseReadinessRoute_1 = __importDefault(require("../routes/ReleaseReadinessRoute"));
// Mock apollo client to bypass import.meta check in js file
globals_1.jest.mock('../services/apollo', () => ({
    apolloClient: {
        query: globals_1.jest.fn(),
        mutate: globals_1.jest.fn(),
        readQuery: globals_1.jest.fn(),
        writeQuery: globals_1.jest.fn(),
    },
}));
// Mock fetch for API calls
global.fetch = globals_1.jest.fn();
// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});
// Mock navigator.clipboard
Object.assign(navigator, {
    clipboard: {
        writeText: globals_1.jest.fn().mockResolvedValue(undefined),
    },
});
// Console error/warn tracking
let consoleErrors = [];
let consoleWarns = [];
const originalError = console.error;
const originalWarn = console.warn;
(0, globals_1.beforeAll)(() => {
    // Intercept console.error and console.warn
    console.error = (...args) => {
        consoleErrors.push(args);
        // Still log to see what's happening in tests
        originalError.apply(console, args);
    };
    console.warn = (...args) => {
        consoleWarns.push(args);
        originalWarn.apply(console, args);
    };
});
(0, globals_1.afterAll)(() => {
    // Restore original console methods
    console.error = originalError;
    console.warn = originalWarn;
});
(0, globals_1.beforeEach)(() => {
    // Reset console trackers
    consoleErrors = [];
    consoleWarns = [];
    // Clear localStorage
    localStorageMock.clear();
    // Reset fetch mock
    global.fetch.mockClear();
    // Set up default auth token
    localStorageMock.setItem('token', 'mock-jwt-token');
});
(0, globals_1.afterEach)(() => {
    globals_1.jest.clearAllTimers();
    globals_1.jest.useRealTimers();
});
// Helper to render a route with all necessary providers
const renderWithProviders = (ui, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return (0, react_2.render)(<react_redux_1.Provider store={store_1.default}>
      <client_1.ApolloProvider client={apollo_1.apolloClient}>
        <material_1.ThemeProvider theme={(0, intelgraphTheme_1.getIntelGraphTheme)()}>
          <AuthContext_1.AuthProvider>
            <react_router_dom_1.BrowserRouter>
              {ui}
            </react_router_dom_1.BrowserRouter>
          </AuthContext_1.AuthProvider>
        </material_1.ThemeProvider>
      </client_1.ApolloProvider>
    </react_redux_1.Provider>);
};
(0, globals_1.describe)('Route Smoke Tests - Console Error Detection', () => {
    (0, globals_1.describe)('Release Readiness Route', () => {
        (0, globals_1.it)('renders without console errors when loading', async () => {
            // Mock API responses
            const mockSummary = {
                generatedAt: new Date().toISOString(),
                versionOrCommit: 'abc123',
                checks: [
                    {
                        id: 'test-check-1',
                        name: 'Test Check',
                        status: 'pass',
                        lastRunAt: new Date().toISOString(),
                        evidenceLinks: ['docs/test.md'],
                    },
                ],
            };
            const mockEvidence = {
                controls: [
                    {
                        id: 'GOV-01',
                        name: 'Test Control',
                        description: 'Test description',
                        enforcementPoint: 'Test',
                        evidenceArtifact: 'test.md',
                    },
                ],
                evidence: [
                    {
                        controlId: 'GOV-01',
                        controlName: 'Test Control',
                        evidenceType: 'Document',
                        location: 'docs/test.md',
                        verificationCommand: 'ls -l docs/test.md',
                    },
                ],
            };
            global.fetch.mockImplementation((url) => {
                if (url.includes('/ops/release-readiness/summary')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockSummary,
                    });
                }
                if (url.includes('/ops/release-readiness/evidence-index')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockEvidence,
                    });
                }
                return Promise.reject(new Error('Unknown URL'));
            });
            renderWithProviders(<react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/ops/release-readiness" element={<ReleaseReadinessRoute_1.default />}/>
        </react_router_dom_1.Routes>, { route: '/ops/release-readiness' });
            // Wait for initial render
            await (0, react_2.waitFor)(() => {
                (0, globals_1.expect)(react_2.screen.queryByText(/Loading release readiness data/i)).not.toBeInTheDocument();
            }, { timeout: 3000 });
            // Check for console errors (filter out expected warnings from libraries)
            const actualErrors = consoleErrors.filter((err) => 
            // Filter out known library warnings
            !err[0]?.toString().includes('Warning: ReactDOM.render') &&
                !err[0]?.toString().includes('Warning: useLayoutEffect') &&
                !err[0]?.toString().includes('Not implemented: HTMLFormElement.prototype.submit') &&
                !err[0]?.toString().includes('ReactDOMTestUtils.act'));
            (0, globals_1.expect)(actualErrors).toHaveLength(0);
        });
        (0, globals_1.it)('renders without console errors when showing cached data', async () => {
            // Set up cached data
            const cachedSummary = {
                generatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                versionOrCommit: 'cached123',
                checks: [],
            };
            const cachedEvidence = {
                controls: [],
                evidence: [],
            };
            localStorageMock.setItem('release-readiness-summary', JSON.stringify(cachedSummary));
            localStorageMock.setItem('release-readiness-evidence', JSON.stringify(cachedEvidence));
            localStorageMock.setItem('release-readiness-timestamp', (Date.now() - 10 * 60 * 1000).toString());
            // Mock API to fail (offline simulation)
            global.fetch.mockRejectedValue(new Error('Network error'));
            renderWithProviders(<react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/ops/release-readiness" element={<ReleaseReadinessRoute_1.default />}/>
        </react_router_dom_1.Routes>, { route: '/ops/release-readiness' });
            // Should show cached data
            await (0, react_2.waitFor)(() => {
                (0, globals_1.expect)(react_2.screen.queryByText(/Loading release readiness data/i)).not.toBeInTheDocument();
            });
            // Check for console errors
            const actualErrors = consoleErrors.filter((err) => !err[0]?.toString().includes('Warning: ReactDOM.render') &&
                !err[0]?.toString().includes('Warning: useLayoutEffect') &&
                !err[0]?.toString().includes('Not implemented: HTMLFormElement.prototype.submit') &&
                !err[0]?.toString().includes('Network error') // Expected error from fetch
            );
            (0, globals_1.expect)(actualErrors).toHaveLength(0);
        });
        (0, globals_1.it)('renders without console errors in error state', async () => {
            // Mock API to fail
            global.fetch.mockRejectedValue(new Error('API Error'));
            renderWithProviders(<react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/ops/release-readiness" element={<ReleaseReadinessRoute_1.default />}/>
        </react_router_dom_1.Routes>, { route: '/ops/release-readiness' });
            // Wait for error state
            await (0, react_2.waitFor)(() => {
                (0, globals_1.expect)(react_2.screen.queryByText(/Loading release readiness data/i)).not.toBeInTheDocument();
            });
            // Check for console errors (allow the expected API error)
            const actualErrors = consoleErrors.filter((err) => !err[0]?.toString().includes('Warning: ReactDOM.render') &&
                !err[0]?.toString().includes('Warning: useLayoutEffect') &&
                !err[0]?.toString().includes('Not implemented: HTMLFormElement.prototype.submit') &&
                !err[0]?.toString().includes('API Error') &&
                !err[0]?.toString().includes('Failed to load from cache'));
            (0, globals_1.expect)(actualErrors).toHaveLength(0);
        });
        (0, globals_1.it)('handles tab switching without console errors', async () => {
            const mockSummary = {
                generatedAt: new Date().toISOString(),
                versionOrCommit: 'abc123',
                checks: [],
            };
            const mockEvidence = {
                controls: [],
                evidence: [],
            };
            global.fetch.mockImplementation((url) => {
                if (url.includes('/ops/release-readiness/summary')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockSummary,
                    });
                }
                if (url.includes('/ops/release-readiness/evidence-index')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockEvidence,
                    });
                }
                return Promise.reject(new Error('Unknown URL'));
            });
            renderWithProviders(<react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/ops/release-readiness" element={<ReleaseReadinessRoute_1.default />}/>
        </react_router_dom_1.Routes>, { route: '/ops/release-readiness' });
            await (0, react_2.waitFor)(() => {
                (0, globals_1.expect)(react_2.screen.queryByText(/Loading release readiness data/i)).not.toBeInTheDocument();
            });
            // Clear errors from initial render
            consoleErrors = [];
            // Click Evidence Explorer tab (if visible)
            const evidenceTab = react_2.screen.queryByText('Evidence Explorer');
            if (evidenceTab) {
                evidenceTab.click();
                // Wait a bit for re-render
                await (0, react_2.waitFor)(() => {
                    (0, globals_1.expect)(evidenceTab).toBeInTheDocument();
                });
            }
            // No new console errors
            (0, globals_1.expect)(consoleErrors).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Route Mounting - No Runaway Effects', () => {
        (0, globals_1.it)('does not create runaway intervals or timers', async () => {
            globals_1.jest.useFakeTimers();
            const mockSummary = {
                generatedAt: new Date().toISOString(),
                versionOrCommit: 'abc123',
                checks: [],
            };
            const mockEvidence = {
                controls: [],
                evidence: [],
            };
            global.fetch.mockImplementation((url) => {
                if (url.includes('/ops/release-readiness/summary')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockSummary,
                    });
                }
                if (url.includes('/ops/release-readiness/evidence-index')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => mockEvidence,
                    });
                }
                return Promise.reject(new Error('Unknown URL'));
            });
            const { unmount } = renderWithProviders(<react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/ops/release-readiness" element={<ReleaseReadinessRoute_1.default />}/>
        </react_router_dom_1.Routes>, { route: '/ops/release-readiness' });
            // Fast-forward time
            globals_1.jest.advanceTimersByTime(10000);
            // Fetch should only be called once (initial load, no polling)
            await (0, react_2.waitFor)(() => {
                (0, globals_1.expect)(global.fetch.mock.calls.length).toBeLessThanOrEqual(2); // summary + evidence
            });
            unmount();
            globals_1.jest.useRealTimers();
        });
    });
});
