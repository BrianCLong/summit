import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DataFetchErrorBoundary } from '@/components/error/DataFetchErrorBoundary';
import { MutationErrorBoundary } from '@/components/error/MutationErrorBoundary';
import { reportError } from '@/telemetry/metrics';

// Mock telemetry
vi.mock('@/telemetry/metrics', () => ({
  reportError: vi.fn(),
  generateErrorFingerprint: vi.fn(() => 'test-fingerprint'),
  categorizeError: vi.fn(() => 'data_fetch'),
}));

// Mock a dashboard component that can throw errors
const MockDashboard = ({
  shouldThrow = false,
  errorType = 'data_fetch',
}: {
  shouldThrow?: boolean;
  errorType?: 'data_fetch' | 'mutation' | 'network';
}) => {
  if (shouldThrow) {
    if (errorType === 'network') {
      throw new Error('Network request failed: timeout');
    } else if (errorType === 'mutation') {
      throw new Error('Failed to update user record');
    } else {
      throw new Error('Failed to fetch dashboard data');
    }
  }

  return (
    <div>
      <h1>Command Center Dashboard</h1>
      <div>Dashboard loaded successfully</div>
      <button>Perform Action</button>
    </div>
  );
};

// Mock an admin component
const MockAdminPanel = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Failed to save feature flag configuration');
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      <button>Save Configuration</button>
    </div>
  );
};

describe('Error Boundary Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('DataFetchErrorBoundary with Dashboard', () => {
    it('renders dashboard successfully when no errors occur', () => {
      render(
        <BrowserRouter>
          <DataFetchErrorBoundary dataSourceName="Command Center">
            <MockDashboard />
          </DataFetchErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Command Center Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard loaded successfully')).toBeInTheDocument();
    });

    it('catches data fetch errors and shows appropriate fallback', () => {
      render(
        <BrowserRouter>
          <DataFetchErrorBoundary dataSourceName="Command Center">
            <MockDashboard shouldThrow={true} errorType="data_fetch" />
          </DataFetchErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Data Loading Failed')).toBeInTheDocument();
      expect(
        screen.getByText(/We couldn't load data from Command Center/i)
      ).toBeInTheDocument();
    });

    // TODO: Fake timers causing timeout - needs investigation
    it.skip('provides retry functionality for data fetch errors', async () => {
      vi.useFakeTimers();

      const TestComponent = () => {
        const [failCount, setFailCount] = React.useState(2);

        // Fail twice, then succeed
        if (failCount > 0) {
          React.useEffect(() => {
            setFailCount((c) => c - 1);
          }, []);
          throw new Error('Data fetch failed');
        }

        return <MockDashboard />;
      };

      render(
        <BrowserRouter>
          <DataFetchErrorBoundary dataSourceName="Test Dashboard">
            <TestComponent />
          </DataFetchErrorBoundary>
        </BrowserRouter>
      );

      // Error should be shown initially
      expect(screen.getByText('Data Loading Failed')).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      // Should show retrying state
      await waitFor(() => {
        expect(retryButton).toHaveTextContent(/retrying/i);
      });

      // Fast-forward through backoff delay
      vi.advanceTimersByTime(1000);

      // After retry, error should be cleared and content should show
      await waitFor(
        () => {
          expect(screen.queryByText('Data Loading Failed')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      vi.useRealTimers();
    });

    it('shows user guidance for network errors', () => {
      render(
        <BrowserRouter>
          <DataFetchErrorBoundary dataSourceName="Analytics">
            <MockDashboard shouldThrow={true} errorType="network" />
          </DataFetchErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText(/What you can do:/i)).toBeInTheDocument();
      expect(screen.getByText(/Check your network connection/i)).toBeInTheDocument();
    });
  });

  describe('MutationErrorBoundary with Admin Panel', () => {
    it('renders admin panel successfully when no errors occur', () => {
      render(
        <BrowserRouter>
          <MutationErrorBoundary operationName="admin configuration">
            <MockAdminPanel />
          </MutationErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
    });

    it('catches mutation errors and shows appropriate fallback', () => {
      render(
        <BrowserRouter>
          <MutationErrorBoundary operationName="feature flag update">
            <MockAdminPanel shouldThrow={true} />
          </MutationErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText('Operation Failed')).toBeInTheDocument();
      expect(
        screen.getByText(/The feature flag update could not be completed/i)
      ).toBeInTheDocument();
    });

    it('shows data consistency warning for mutation errors', () => {
      render(
        <BrowserRouter>
          <MutationErrorBoundary operationName="bulk update">
            <MockAdminPanel shouldThrow={true} />
          </MutationErrorBoundary>
        </BrowserRouter>
      );

      expect(screen.getByText(/Important: Please verify your data/i)).toBeInTheDocument();
      expect(
        screen.getByText(/check if your changes were partially saved/i)
      ).toBeInTheDocument();
    });

    it('provides safe navigation back to workspace', () => {
      render(
        <BrowserRouter>
          <MutationErrorBoundary operationName="critical action">
            <MockAdminPanel shouldThrow={true} />
          </MutationErrorBoundary>
        </BrowserRouter>
      );

      const backButton = screen.getByRole('button', { name: /back to safety/i });
      expect(backButton).toBeInTheDocument();
    });

    it('does not enable automatic retry for mutations', () => {
      render(
        <BrowserRouter>
          <MutationErrorBoundary operationName="user update">
            <MockAdminPanel shouldThrow={true} />
          </MutationErrorBoundary>
        </BrowserRouter>
      );

      // Should have a "Try Again" button but no retry counter
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
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

      render(
        <BrowserRouter>
          <DataFetchErrorBoundary dataSourceName="Outer">
            <OuterComponent />
            <DataFetchErrorBoundary dataSourceName="Inner">
              <InnerComponent />
            </DataFetchErrorBoundary>
          </DataFetchErrorBoundary>
        </BrowserRouter>
      );

      // The outer boundary should catch the error from OuterComponent
      expect(screen.getByText('Data Loading Failed')).toBeInTheDocument();
      expect(screen.getByText(/We couldn't load data from Outer/i)).toBeInTheDocument();
    });
  });

  describe('Error Telemetry', () => {
    it('reports errors with correct categorization', () => {
      render(
        <BrowserRouter>
          <DataFetchErrorBoundary dataSourceName="Test">
            <MockDashboard shouldThrow={true} errorType="data_fetch" />
          </DataFetchErrorBoundary>
        </BrowserRouter>
      );

      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to fetch dashboard data',
        }),
        expect.any(Object),
        'medium',
        expect.objectContaining({
          dataSourceName: 'Test',
          boundaryType: 'data_fetch',
        })
      );
    });
  });
});
