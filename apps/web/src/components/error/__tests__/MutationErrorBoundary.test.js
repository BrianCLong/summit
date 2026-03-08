"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const MutationErrorBoundary_1 = require("../MutationErrorBoundary");
const metrics_1 = require("@/telemetry/metrics");
// Mock dependencies
vitest_1.vi.mock('@/telemetry/metrics', () => ({
    reportError: vitest_1.vi.fn(),
    generateErrorFingerprint: vitest_1.vi.fn(() => 'test-fingerprint'),
    categorizeError: vitest_1.vi.fn(() => 'mutation'),
}));
// Mock react-router-dom
const mockNavigate = vitest_1.vi.fn();
vitest_1.vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));
// Component that throws
const ThrowingComponent = () => {
    throw new Error('Mutation failed');
};
const SafeComponent = () => <div>Operation successful</div>;
describe('MutationErrorBoundary', () => {
    beforeEach(() => {
        vitest_1.vi.clearAllMocks();
        vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    afterEach(() => {
        vitest_1.vi.restoreAllMocks();
    });
    it('renders children when no error occurs', () => {
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="user update">
        <SafeComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        expect(react_2.screen.getByText('Operation successful')).toBeInTheDocument();
    });
    it('shows mutation-specific error UI when error occurs', () => {
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="bulk user update">
        <ThrowingComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        expect(react_2.screen.getByText('Operation Failed')).toBeInTheDocument();
        expect(react_2.screen.getByText(/The bulk user update could not be completed/i)).toBeInTheDocument();
    });
    it('disables automatic retry for mutations', () => {
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="user update">
        <ThrowingComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        // Should still have a manual "Try Again" button
        const tryAgainButton = react_2.screen.getByRole('button', { name: /try again/i });
        expect(tryAgainButton).toBeInTheDocument();
        // Should NOT show retry count (no auto-retry)
        expect(tryAgainButton).not.toHaveTextContent(/\d+\/\d+/);
    });
    it('shows data consistency warning', () => {
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="data update">
        <ThrowingComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        expect(react_2.screen.getByText(/Important: Please verify your data/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/check if your changes were partially saved/i)).toBeInTheDocument();
    });
    it('provides safe navigation back to workspace', () => {
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="admin action">
        <ThrowingComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        const backButton = react_2.screen.getByRole('button', { name: /back to safety/i });
        expect(backButton).toBeInTheDocument();
        react_2.fireEvent.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    it('reports errors with high severity', () => {
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="critical update">
        <ThrowingComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        expect(metrics_1.reportError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object), 'high', expect.objectContaining({
            operationName: 'critical update',
            boundaryType: 'mutation',
        }));
    });
    it('shows possible causes for mutation failures', () => {
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="update">
        <ThrowingComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        expect(react_2.screen.getByText(/Possible causes:/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Network connection issue/i)).toBeInTheDocument();
        expect(react_2.screen.getByText(/Permission or authorization error/i)).toBeInTheDocument();
    });
    it('allows custom error handling', () => {
        const onError = vitest_1.vi.fn();
        (0, react_2.render)(<MutationErrorBoundary_1.MutationErrorBoundary operationName="test operation" onError={onError}>
        <ThrowingComponent />
      </MutationErrorBoundary_1.MutationErrorBoundary>);
        expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    });
});
