"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const vitest_1 = require("vitest");
const ErrorBoundary_1 = require("../ErrorBoundary");
require("@testing-library/jest-dom");
// Mock component that throws
const Bomb = ({ shouldThrow }) => {
    if (shouldThrow) {
        throw new Error('Test Explosion');
    }
    return <div>Safe Component</div>;
};
(0, vitest_1.describe)('ErrorBoundary', () => {
    // Mock console.error to avoid noise in test output
    const originalError = console.error;
    (0, vitest_1.beforeAll)(() => {
        console.error = vitest_1.vi.fn();
    });
    (0, vitest_1.afterAll)(() => {
        console.error = originalError;
    });
    (0, vitest_1.it)('renders children when no error occurs', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary>
        <div>Content</div>
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(react_2.screen.getByText('Content')).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders fallback UI when an error occurs', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary>
        <Bomb shouldThrow={true}/>
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(react_2.screen.getByText(/Something went wrong/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/Reload Page/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_2.screen.getByText(/Go Home/i)).toBeInTheDocument();
    });
    (0, vitest_1.it)('renders custom fallback when provided', () => {
        (0, react_2.render)(<ErrorBoundary_1.ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <Bomb shouldThrow={true}/>
      </ErrorBoundary_1.ErrorBoundary>);
        (0, vitest_1.expect)(react_2.screen.getByText('Custom Error UI')).toBeInTheDocument();
    });
});
