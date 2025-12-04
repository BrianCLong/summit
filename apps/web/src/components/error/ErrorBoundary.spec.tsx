import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { reportError } from '@/telemetry/metrics';

// Mock dependencies
vi.mock('@/telemetry/metrics', () => ({
  reportError: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Test component that throws error
const ThrowError = ({ message = 'Boom!' }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for test intentional errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Safe Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe Content')).toBeDefined();
  });

  it('renders fallback when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('calls reportError when an error catches', () => {
    render(
      <ErrorBoundary>
        <ThrowError message="Test Error" />
      </ErrorBoundary>
    );
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      'high'
    );
  });

  it('supports custom fallback UI', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Error UI</div>}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom Error UI')).toBeDefined();
  });

  it('supports custom fallback render function', () => {
    render(
      <ErrorBoundary
        fallback={({ error }) => <div>Error: {error.message}</div>}
      >
        <ThrowError message="Custom Message" />
      </ErrorBoundary>
    );
    expect(screen.getByText('Error: Custom Message')).toBeDefined();
  });

  it('allows resetting the error boundary', () => {
    const onReset = vi.fn();
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

    const { rerender } = render(
        <ErrorBoundary
            fallback={({ resetErrorBoundary }) => (
                <button onClick={resetErrorBoundary}>Reset</button>
            )}
            onReset={onReset}
        >
            <ThrowError />
        </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reset'));
    expect(onReset).toHaveBeenCalled();
  });
});
