// client/src/__tests__/routes.smoke.test.tsx
import React from 'react';
import { act, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock components and contexts
const mockUseAuth = jest.fn();
const mockFeatureFlagContext = {
  flags: {
    'adversarial-defense-ui': { key: 'adversarial-defense-ui', enabled: true },
  },
  isLoading: false,
  refreshFlags: jest.fn(),
  getFlag: jest.fn(),
  getFlagValue: jest.fn(),
};

jest.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../hooks/useFeatureFlag', () => ({
  useFeatureFlag: jest.fn((key) => ({
    enabled: key === 'adversarial-defense-ui',
    value: true,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
  FeatureFlagContext: React.createContext(mockFeatureFlagContext),
  FeatureFlagProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        id: 'test-run-1',
        name: 'Test Run',
        status: 'completed',
        steps: [],
        metrics: {
          totalThreats: 0,
          criticalThreats: 0,
          mitigated: 0,
          inProgress: 0,
          lastUpdated: new Date().toISOString(),
        },
        threats: [],
      }),
  }),
) as jest.Mock;

describe('Route Smoke Tests - Zero Console Errors', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    consoleErrors.length = 0;
    consoleWarnings.length = 0;

    // Spy on console methods and collect errors/warnings
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      const message = args.join(' ');
      // Filter out known React testing library warnings
      if (
        !message.includes('Warning: ReactDOM.render') &&
        !message.includes('Warning: useLayoutEffect') &&
        !message.includes('Not implemented: HTMLFormElement.prototype.submit')
      ) {
        consoleErrors.push(message);
      }
    });

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation((...args) => {
      const message = args.join(' ');
      // Filter out known React testing library warnings
      if (
        !message.includes('Warning: ReactDOM.render') &&
        !message.includes('Warning: useLayoutEffect')
      ) {
        consoleWarnings.push(message);
      }
    });

    mockUseAuth.mockReturnValue({
      user: {
        role: 'ADMIN',
        tenants: ['test-tenant'],
        permissions: ['read_graph', 'write_graph'],
      },
      loading: false,
      hasRole: jest.fn(() => true),
      hasPermission: jest.fn(() => true),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('RunViewer Route', () => {
    it('renders without console errors', async () => {
      // Dynamically import to avoid circular dependencies
      const RunViewer = require('../features/workflows/RunViewer').default;

      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/runs?runId=test-run-1']}>
            <Routes>
              <Route path="/runs" element={<RunViewer />} />
            </Routes>
          </MemoryRouter>,
        );
      });

      // Advance timers to allow initial render and effects
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Check for console errors
      if (consoleErrors.length > 0) {
        console.log('Console Errors:', consoleErrors);
      }
      expect(consoleErrors).toHaveLength(0);
      expect(consoleWarnings).toHaveLength(0);
    });
  });

  describe('AdversarialDashboard Route', () => {
    it('renders without console errors', async () => {
      const AdversarialDashboard = require('../features/security/AdversarialDashboard').default;

      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/security/adversarial']}>
            <Routes>
              <Route path="/security/adversarial" element={<AdversarialDashboard />} />
            </Routes>
          </MemoryRouter>,
        );
      });

      // Advance timers to allow initial render and effects
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Check for console errors
      if (consoleErrors.length > 0) {
        console.log('Console Errors:', consoleErrors);
      }
      expect(consoleErrors).toHaveLength(0);
      expect(consoleWarnings).toHaveLength(0);
    });

    it('handles loading state without errors', async () => {
      const AdversarialDashboard = require('../features/security/AdversarialDashboard').default;

      // Mock slow API response
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      metrics: {
                        totalThreats: 5,
                        criticalThreats: 2,
                        mitigated: 3,
                        inProgress: 2,
                        lastUpdated: new Date().toISOString(),
                      },
                      threats: [],
                    }),
                }),
              500,
            ),
          ),
      );

      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/security/adversarial']}>
            <Routes>
              <Route path="/security/adversarial" element={<AdversarialDashboard />} />
            </Routes>
          </MemoryRouter>,
        );
      });

      // Check errors during loading state
      expect(consoleErrors).toHaveLength(0);
      expect(consoleWarnings).toHaveLength(0);
    });

    it('handles error state without console noise', async () => {
      const AdversarialDashboard = require('../features/security/AdversarialDashboard').default;

      // Mock API error
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/security/adversarial']}>
            <Routes>
              <Route path="/security/adversarial" element={<AdversarialDashboard />} />
            </Routes>
          </MemoryRouter>,
        );
      });

      // Advance to trigger error handling
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Should show error in UI but not spam console
      // (component logs the error with console.error, which is acceptable)
      // We only care about React errors, not intentional error logging
      const reactErrors = consoleErrors.filter(
        (err) => err.includes('Warning:') || err.includes('Error:'),
      );
      expect(reactErrors).toHaveLength(0);
    });
  });

  describe('Network Resilience Primitives', () => {
    it('OfflineBanner renders without errors', async () => {
      const { OfflineBanner } = require('../components/common/OfflineBanner');

      await act(async () => {
        render(<OfflineBanner />);
      });

      expect(consoleErrors).toHaveLength(0);
      expect(consoleWarnings).toHaveLength(0);
    });

    it('useNetworkStatus hook does not cause errors', async () => {
      const { useNetworkStatus } = require('../hooks/useNetworkStatus');

      function TestComponent() {
        const status = useNetworkStatus();
        return <div>Online: {status.isOnline ? 'yes' : 'no'}</div>;
      }

      await act(async () => {
        render(<TestComponent />);
      });

      expect(consoleErrors).toHaveLength(0);
      expect(consoleWarnings).toHaveLength(0);
    });
  });
});
