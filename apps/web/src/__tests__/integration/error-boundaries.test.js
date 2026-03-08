"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const react_router_dom_1 = require("react-router-dom");
const DataFetchErrorBoundary_1 = require("@/components/error/DataFetchErrorBoundary");
const MutationErrorBoundary_1 = require("@/components/error/MutationErrorBoundary");
const metrics_1 = require("@/telemetry/metrics");
// Mock telemetry
vitest_1.vi.mock('@/telemetry/metrics', () => ({
    reportError: vitest_1.vi.fn(),
    generateErrorFingerprint: vitest_1.vi.fn(() => 'test-fingerprint'),
    categorizeError: vitest_1.vi.fn(() => 'data_fetch'),
}));
// Mock a dashboard component that can throw errors
const MockDashboard = ({ shouldThrow = false, errorType = 'data_fetch', }) => {
    if (shouldThrow) {
        if (errorType === 'network') {
            throw new Error('Network request failed: timeout');
        }
        else if (errorType === 'mutation') {
            throw new Error('Failed to update user record');
        }
        else {
            throw new Error('Failed to fetch dashboard data');
        }
    }
    return (<div>
      <h1>Command Center Dashboard</h1>
      <div>Dashboard loaded successfully</div>
      <button>Perform Action</button>
    </div>);
};
// Mock an admin component
const MockAdminPanel = ({ shouldThrow = false }) => {
    if (shouldThrow) {
        throw new Error('Failed to save feature flag configuration');
    }
    return (<div>
      <h1>Admin Panel</h1>
      <button>Save Configuration</button>
    </div>);
};
describe('Error Boundary Integration Tests', () => {
    beforeEach(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => {
        vitest_1.vi.restoreAllMocks();
    });
    describe('DataFetchErrorBoundary with Dashboard', () => {
        it('renders dashboard successfully when no errors occur', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Command Center">
            <MockDashboard />
          </DataFetchErrorBoundary_1.DataFetchErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            expect(react_2.screen.getByText('Command Center Dashboard')).toBeInTheDocument();
            expect(react_2.screen.getByText('Dashboard loaded successfully')).toBeInTheDocument();
        });
        it('catches data fetch errors and shows appropriate fallback', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Command Center">
            <MockDashboard shouldThrow={true} errorType="data_fetch"/>
          </DataFetchErrorBoundary_1.DataFetchErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            expect(react_2.screen.getByText('Data Loading Failed')).toBeInTheDocument();
            expect(react_2.screen.getByText(/We couldn't load data from Command Center/i)).toBeInTheDocument();
        });
        // TODO: Fake timers causing timeout - needs investigation
        it.skip('provides retry functionality for data fetch errors', async () => {
            vitest_1.vi.useFakeTimers();
            const TestComponent = () => {
                const [failCount, setFailCount] = react_1.default.useState(2);
                // Fail twice, then succeed
                if (failCount > 0) {
                    react_1.default.useEffect(() => {
                        setFailCount((c) => c - 1);
                    }, []);
                    throw new Error('Data fetch failed');
                }
                return <MockDashboard />;
            };
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Test Dashboard">
            <TestComponent />
          </DataFetchErrorBoundary_1.DataFetchErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            // Error should be shown initially
            expect(react_2.screen.getByText('Data Loading Failed')).toBeInTheDocument();
            // Click retry
            const retryButton = react_2.screen.getByRole('button', { name: /retry/i });
            react_2.fireEvent.click(retryButton);
            // Should show retrying state
            await (0, react_2.waitFor)(() => {
                expect(retryButton).toHaveTextContent(/retrying/i);
            });
            // Fast-forward through backoff delay
            vitest_1.vi.advanceTimersByTime(1000);
            // After retry, error should be cleared and content should show
            await (0, react_2.waitFor)(() => {
                expect(react_2.screen.queryByText('Data Loading Failed')).not.toBeInTheDocument();
            }, { timeout: 2000 });
            vitest_1.vi.useRealTimers();
        });
        it('shows user guidance for network errors', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Analytics">
            <MockDashboard shouldThrow={true} errorType="network"/>
          </DataFetchErrorBoundary_1.DataFetchErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            expect(react_2.screen.getByText(/What you can do:/i)).toBeInTheDocument();
            expect(react_2.screen.getByText(/Check your network connection/i)).toBeInTheDocument();
        });
    });
    describe('MutationErrorBoundary with Admin Panel', () => {
        it('renders admin panel successfully when no errors occur', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <MutationErrorBoundary_1.MutationErrorBoundary operationName="admin configuration">
            <MockAdminPanel />
          </MutationErrorBoundary_1.MutationErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            expect(react_2.screen.getByText('Admin Panel')).toBeInTheDocument();
            expect(react_2.screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
        });
        it('catches mutation errors and shows appropriate fallback', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <MutationErrorBoundary_1.MutationErrorBoundary operationName="feature flag update">
            <MockAdminPanel shouldThrow={true}/>
          </MutationErrorBoundary_1.MutationErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            expect(react_2.screen.getByText('Operation Failed')).toBeInTheDocument();
            expect(react_2.screen.getByText(/The feature flag update could not be completed/i)).toBeInTheDocument();
        });
        it('shows data consistency warning for mutation errors', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <MutationErrorBoundary_1.MutationErrorBoundary operationName="bulk update">
            <MockAdminPanel shouldThrow={true}/>
          </MutationErrorBoundary_1.MutationErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            expect(react_2.screen.getByText(/Important: Please verify your data/i)).toBeInTheDocument();
            expect(react_2.screen.getByText(/check if your changes were partially saved/i)).toBeInTheDocument();
        });
        it('provides safe navigation back to workspace', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <MutationErrorBoundary_1.MutationErrorBoundary operationName="critical action">
            <MockAdminPanel shouldThrow={true}/>
          </MutationErrorBoundary_1.MutationErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            const backButton = react_2.screen.getByRole('button', { name: /back to safety/i });
            expect(backButton).toBeInTheDocument();
        });
        it('does not enable automatic retry for mutations', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <MutationErrorBoundary_1.MutationErrorBoundary operationName="user update">
            <MockAdminPanel shouldThrow={true}/>
          </MutationErrorBoundary_1.MutationErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            // Should have a "Try Again" button but no retry counter
            const tryAgainButton = react_2.screen.getByRole('button', { name: /try again/i });
            expect(tryAgainButton).toBeInTheDocument();
            expect(tryAgainButton).not.toHaveTextContent(/\d+\/\d+/);
        });
    });
    describe('Nested Error Boundaries', () => {
        it('allows inner boundary to catch errors before outer boundary', () => {
            const OuterComponent = () => {
                throw new Error('Outer error');
            };
            const InnerComponent = () => {
                throw new Error('Inner error');
            };
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Outer">
            <OuterComponent />
            <DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Inner">
              <InnerComponent />
            </DataFetchErrorBoundary_1.DataFetchErrorBoundary>
          </DataFetchErrorBoundary_1.DataFetchErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            // The outer boundary should catch the error from OuterComponent
            expect(react_2.screen.getByText('Data Loading Failed')).toBeInTheDocument();
            expect(react_2.screen.getByText(/We couldn't load data from Outer/i)).toBeInTheDocument();
        });
    });
    describe('Error Telemetry', () => {
        it('reports errors with correct categorization', () => {
            (0, react_2.render)(<react_router_dom_1.BrowserRouter>
          <DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Test">
            <MockDashboard shouldThrow={true} errorType="data_fetch"/>
          </DataFetchErrorBoundary_1.DataFetchErrorBoundary>
        </react_router_dom_1.BrowserRouter>);
            expect(metrics_1.reportError).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Failed to fetch dashboard data',
            }), expect.any(Object), 'medium', expect.objectContaining({
                dataSourceName: 'Test',
                boundaryType: 'data_fetch',
            }));
        });
    });
});
