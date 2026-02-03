import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DataFetchErrorBoundary } from '../DataFetchErrorBoundary';
import { reportError } from '@/telemetry/metrics';

// Mock dependencies
vi.mock('@/telemetry/metrics', () => ({
  reportError: vi.fn(),
  generateErrorFingerprint: vi.fn(() => 'test-fingerprint'),
  categorizeError: vi.fn(() => 'data_fetch'),
}));

// Component that throws
const ThrowingComponent = () => {
  throw new Error('Data fetch failed');
};

const SafeComponent = () => <div>Data loaded successfully</div>;

describe('DataFetchErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <SafeComponent />
      </DataFetchErrorBoundary>
    );

    expect(screen.getByText('Data loaded successfully')).toBeInTheDocument();
  });

  it('shows data-specific error UI when error occurs', () => {
    render(
      <DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <ThrowingComponent />
      </DataFetchErrorBoundary>
    );

    expect(screen.getByText('Data Loading Failed')).toBeInTheDocument();
    expect(
      screen.getByText(/We couldn't load data from Test Dashboard/i)
    ).toBeInTheDocument();
  });

  it('enables retry by default', () => {
    render(
      <DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <ThrowingComponent />
      </DataFetchErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).not.toBeDisabled();
  });

  it('shows helpful user guidance', () => {
    render(
      <DataFetchErrorBoundary dataSourceName="Test Dashboard">
        <ThrowingComponent />
      </DataFetchErrorBoundary>
    );

    expect(screen.getByText(/What you can do:/i)).toBeInTheDocument();
    expect(screen.getByText(/Wait a moment and try again/i)).toBeInTheDocument();
    expect(screen.getByText(/Check your network connection/i)).toBeInTheDocument();
  });

  it('allows custom error handling', () => {
    const onError = vi.fn();

    render(
      <DataFetchErrorBoundary
        dataSourceName="Test Dashboard"
        onError={onError}
      >
        <ThrowingComponent />
      </DataFetchErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('passes additional context to telemetry', () => {
    const context = { chartType: 'timeseries' };

    render(
      <DataFetchErrorBoundary
        dataSourceName="Analytics"
        context={context}
      >
        <ThrowingComponent />
      </DataFetchErrorBoundary>
    );

    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
      'medium',
      expect.objectContaining({
        dataSourceName: 'Analytics',
        boundaryType: 'data_fetch',
        chartType: 'timeseries',
      })
    );
  });
});
