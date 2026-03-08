"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const ErrorBoundary_1 = require("./ErrorBoundary");
const metrics_1 = require("@/telemetry/metrics");
// Mock dependencies
vitest_1.vi.mock('@/telemetry/metrics', () => ({
    reportError: vitest_1.vi.fn(),
}));
vitest_1.vi.mock('react-router-dom', () => ({
    useNavigate: () => vitest_1.vi.fn(),
}));
// Test component that throws error
const ThrowError = ({ message = 'Boom!' }) => {
    throw new Error(message);
};
(0, vitest_1.describe)('ErrorBoundary', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Suppress console.error for test intentional errors
        vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
    });
    (0, vitest_1.it)('renders children when no error occurs', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(react_2.screen.getByText('Safe Content')).toBeDefined();
    });
    (0, vitest_1.it)('renders fallback when an error occurs', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary>
        <ThrowError />
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(react_2.screen.getByText('Something went wrong')).toBeDefined();
    });
    (0, vitest_1.it)('calls reportError when an error catches', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary>
        <ThrowError message="Test Error"/>
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(metrics_1.reportError).toHaveBeenCalledWith(vitest_1.expect.any(Error), vitest_1.expect.any(Object), 'high', vitest_1.expect.objectContaining({
            retryCount: 0,
            route: vitest_1.expect.any(String),
        }));
    });
    (0, vitest_1.it)('supports custom fallback UI', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <ThrowError />
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(react_2.screen.getByText('Custom Error UI')).toBeDefined();
    });
    (0, vitest_1.it)('supports custom fallback render function', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary fallback={({ error }) => <div>Error: {error.message}</div>}>
        <ThrowError message="Custom Message"/>
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(react_2.screen.getByText('Error: Custom Message')).toBeDefined();
    });
    (0, vitest_1.it)('allows resetting the error boundary', () => {
        const onReset = vitest_1.vi.fn();
        const TestComponent = () => {
            // Just a simple component that renders a button
            // In a real scenario, this would be a stateful component that throws based on state
            // For testing "reset", we rely on the fact that ErrorBoundary unmounts the children when error state is active
            // and remounts them when reset is called.
            return <div>Resetted Content</div>;
        };
        // We need a wrapper to control the throwing
        // But ErrorBoundary handles the state.
        // Let's rely on the fallback's "Try Again" button logic if we can access it.
        // But we are rendering a custom fallback with a button that calls resetErrorBoundary.
        const { rerender } = (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary fallback={({ resetErrorBoundary }) => (<button onClick={resetErrorBoundary}>Reset</button>)} onReset={onReset}>
            <ThrowError />
        </ErrorBoundary_1.ErrorBoundary>);
        react_2.fireEvent.click(react_2.screen.getByText('Reset'));
        (0, vitest_1.expect)(onReset).toHaveBeenCalled();
    });
});
