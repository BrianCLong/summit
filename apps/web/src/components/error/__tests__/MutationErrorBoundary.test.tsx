import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MutationErrorBoundary } from '../MutationErrorBoundary';
import { reportError } from '@/telemetry/metrics';

// Mock dependencies
vi.mock('@/telemetry/metrics', () => ({
  reportError: vi.fn(),
  generateErrorFingerprint: vi.fn(() => 'test-fingerprint'),
  categorizeError: vi.fn(() => 'mutation'),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Component that throws
const ThrowingComponent = () => {
  throw new Error('Mutation failed');
};

const SafeComponent = () => <div>Operation successful</div>;

describe('MutationErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <MutationErrorBoundary operationName="user update">
        <SafeComponent />
      </MutationErrorBoundary>
    );

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('shows mutation-specific error UI when error occurs', () => {
    render(
      <MutationErrorBoundary operationName="bulk user update">
        <ThrowingComponent />
      </MutationErrorBoundary>
    );

    expect(screen.getByText('Operation Failed')).toBeInTheDocument();
    expect(
      screen.getByText(/The bulk user update could not be completed/i)
    ).toBeInTheDocument();
  });

  it('disables automatic retry for mutations', () => {
    render(
      <MutationErrorBoundary operationName="user update">
        <ThrowingComponent />
      </MutationErrorBoundary>
    );

    // Should still have a manual "Try Again" button
    const tryAgainButton = screen.getByRole('button', { name: /try again/i });
    expect(tryAgainButton).toBeInTheDocument();

    // Should NOT show retry count (no auto-retry)
    expect(tryAgainButton).not.toHaveTextContent(/\d+\/\d+/);
  });

  it('shows data consistency warning', () => {
    render(
      <MutationErrorBoundary operationName="data update">
        <ThrowingComponent />
      </MutationErrorBoundary>
    );

    expect(screen.getByText(/Important: Please verify your data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/check if your changes were partially saved/i)
    ).toBeInTheDocument();
  });

  it('provides safe navigation back to workspace', () => {
    render(
      <MutationErrorBoundary operationName="admin action">
        <ThrowingComponent />
      </MutationErrorBoundary>
    );

    const backButton = screen.getByRole('button', { name: /back to safety/i });
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('reports errors with high severity', () => {
    render(
      <MutationErrorBoundary operationName="critical update">
        <ThrowingComponent />
      </MutationErrorBoundary>
    );

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      'high',
      expect.objectContaining({
        operationName: 'critical update',
        boundaryType: 'mutation',
      })
    );
  });

  it('shows possible causes for mutation failures', () => {
    render(
      <MutationErrorBoundary operationName="update">
        <ThrowingComponent />
      </MutationErrorBoundary>
    );

    expect(screen.getByText(/Possible causes:/i)).toBeInTheDocument();
    expect(screen.getByText(/Network connection issue/i)).toBeInTheDocument();
    expect(screen.getByText(/Permission or authorization error/i)).toBeInTheDocument();
  });

  it('allows custom error handling', () => {
    const onError = vi.fn();

    render(
      <MutationErrorBoundary
        operationName="test operation"
        onError={onError}
      >
        <ThrowingComponent />
      </MutationErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });
});
