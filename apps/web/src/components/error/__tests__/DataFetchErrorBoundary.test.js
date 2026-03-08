"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const DataFetchErrorBoundary_1 = require("../DataFetchErrorBoundary");
const metrics_1 = require("@/telemetry/metrics");
// Mock dependencies
vitest_1.vi.mock('@/telemetry/metrics', () => ({
    reportError: vitest_1.vi.fn(),
    generateErrorFingerprint: vitest_1.vi.fn(() => 'test-fingerprint'),
    categorizeError: vitest_1.vi.fn(() => 'data_fetch'),
}));
// Component that throws
const ThrowingComponent = () => {
    throw new Error('Data fetch failed');
};
const SafeComponent = () => <div>Data loaded successfully</div>;
describe('DataFetchErrorBoundary', () => {
    beforeEach(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => {
        vitest_1.vi.restoreAllMocks();
    });
    it('renders children when no error occurs', () => {
        (0, react_2.render)(<DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <SafeComponent />
      </DataFetchErrorBoundary_1.DataFetchErrorBoundary>);
        expect(react_2.screen.getByText('Data loaded successfully')).toBeInTheDocument();
    });
    it('shows data-specific error UI when error occurs', () => {
        (0, react_2.render)(<DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <ThrowingComponent />
      </DataFetchErrorBoundary_1.DataFetchErrorBoundary>);
        expect(react_2.screen.getByText('Data Loading Failed')).toBeInTheDocument();
        expect(react_2.screen.getByText(/We couldn't load data from Test Dashboard/i)).toBeInTheDocument();
    });
    it('enables retry by default', () => {
        (0, react_2.render)(<DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <ThrowingComponent />
      </DataFetchErrorBoundary_1.DataFetchErrorBoundary>);
        const retryButton = react_2.screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
        expect(retryButton).not.toBeDisabled();
    });
    it('shows helpful user guidance', () => {
        (0, react_2.render)(<DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <ThrowingComponent />
      </DataFetchErrorBoundary_1.DataFetchErrorBoundary>);
        expect(react_2.screen.getByText(/What you can do:/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Wait a moment and try again/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Check your network connection/i)).toBeInTheDocument();
    });
    it('allows custom error handling', () => {
        const onError = vitest_1.vi.fn();
        (0, react_2.render)(<DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Test Dashboard" onError={onError}>
        <ThrowingComponent />
      </DataFetchErrorBoundary_1.DataFetchErrorBoundary>);
        expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    });
    it('passes additional context to telemetry', () => {
        const context = { chartType: 'timeseries' };
        (0, react_2.render)(<DataFetchErrorBoundary_1.DataFetchErrorBoundary dataSourceName="Analytics" context={context}>
        <ThrowingComponent />
      </DataFetchErrorBoundary_1.DataFetchErrorBoundary>);
        expect(metrics_1.reportError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object), 'medium', expect.objectContaining({
            dataSourceName: 'Analytics',
            boundaryType: 'data_fetch',
            chartType: 'timeseries',
        }));
    });
});
