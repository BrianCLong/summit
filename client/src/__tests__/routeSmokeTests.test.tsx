/* eslint-disable @typescript-eslint/no-explicit-any -- jest-dom matchers require type assertions */
/**
 * Route Smoke Tests with Console Error Detection
 *
 * This test suite ensures critical routes render without console errors,
 * meeting GA stability requirements.
 */

import React from 'react';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from '@mui/material';
import store from '../store';
import { apolloClient } from '../services/apollo';
import { getIntelGraphTheme } from '../theme/intelgraphTheme';
import { AuthProvider } from '../context/AuthContext';
import ReleaseReadinessRoute from '../routes/ReleaseReadinessRoute';
import App from '../App.router.jsx';

// Mock apollo client to bypass import.meta check in js file
jest.mock('../services/apollo', () => ({
  apolloClient: {
    query: jest.fn(),
    mutate: jest.fn(),
    readQuery: jest.fn(),
    writeQuery: jest.fn(),
  },
}));

jest.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { role: 'ADMIN' },
    loading: false,
    hasRole: () => true,
    hasPermission: () => true,
  }),
}));

jest.mock('../context/AuthContext.jsx', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { role: 'ADMIN' },
    loading: false,
    hasRole: () => true,
    hasPermission: () => true,
  }),
}));

jest.mock('../hooks/useFeatureFlag', () => ({
  FeatureFlagProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFeatureFlag: () => false,
}));

// Mock fetch for API calls
global.fetch = jest.fn() as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined as any),
  },
});

// Console error/warn tracking
let consoleErrors: any[] = [];
let consoleWarns: any[] = [];

const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Intercept console.error and console.warn
  console.error = (...args: any[]) => {
    const message = args[0]?.toString?.() ?? '';
    if (
      message.includes('ReactDOMTestUtils.act') ||
      message.includes('not wrapped in act')
    ) {
      originalError.apply(console, args);
      return;
    }
    consoleErrors.push(args);
    // Still log to see what's happening in tests
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    consoleWarns.push(args);
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalError;
  console.warn = originalWarn;
});

beforeEach(() => {
  // Reset console trackers
  consoleErrors = [];
  consoleWarns = [];

  // Clear localStorage
  localStorageMock.clear();

  // Reset fetch mock
  (global.fetch as any).mockClear();

  // Set up default auth token
  localStorageMock.setItem('token', 'mock-jwt-token');
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Helper to render a route with all necessary providers
const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);

  return render(
    <Provider store={store}>
      <ApolloProvider client={apolloClient}>
        <ThemeProvider theme={getIntelGraphTheme()}>
          <AuthProvider>
            <BrowserRouter>
              {ui}
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </ApolloProvider>
    </Provider>
  );
};

const renderAppAt = (route: string) => {
  window.history.pushState({}, 'Test page', route);
  return render(<App />);
};

const mockFetchOk = () => {
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({}),
  });
};

const appRouterSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'App.router.jsx'),
  'utf8'
);

describe('Route Smoke Tests - Console Error Detection', () => {
  describe('Release Readiness Route', () => {
    it('renders without console errors when loading', async () => {
      // Mock API responses
      const mockSummary = {
        generatedAt: new Date().toISOString(),
        versionOrCommit: 'abc123',
        checks: [
          {
            id: 'test-check-1',
            name: 'Test Check',
            status: 'pass',
            lastRunAt: new Date().toISOString(),
            evidenceLinks: ['docs/test.md'],
          },
        ],
      };

      const mockEvidence = {
        controls: [
          {
            id: 'GOV-01',
            name: 'Test Control',
            description: 'Test description',
            enforcementPoint: 'Test',
            evidenceArtifact: 'test.md',
          },
        ],
        evidence: [
          {
            controlId: 'GOV-01',
            controlName: 'Test Control',
            evidenceType: 'Document',
            location: 'docs/test.md',
            verificationCommand: 'ls -l docs/test.md',
          },
        ],
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/ops/release-readiness/summary')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSummary,
          });
        }
        if (url.includes('/ops/release-readiness/evidence-index')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockEvidence,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithProviders(
        <Routes>
          <Route path="/ops/release-readiness" element={<ReleaseReadinessRoute />} />
        </Routes>,
        { route: '/ops/release-readiness' }
      );

      // Wait for initial render
      await waitFor(() => {
        (expect(screen.queryByText(/Loading release readiness data/i)) as any).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Check for console errors (filter out expected warnings from libraries)
      const actualErrors = consoleErrors.filter(
        (err) =>
          // Filter out known library warnings
          !err[0]?.toString().includes('Warning: ReactDOM.render') &&
          !err[0]?.toString().includes('Warning: useLayoutEffect') &&
          !err[0]?.toString().includes('Not implemented: HTMLFormElement.prototype.submit') &&
          !err[0]?.toString().includes('ReactDOMTestUtils.act')
      );

      expect(actualErrors).toHaveLength(0);
    });

    it('renders without console errors when showing cached data', async () => {
      // Set up cached data
      const cachedSummary = {
        generatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        versionOrCommit: 'cached123',
        checks: [],
      };

      const cachedEvidence = {
        controls: [],
        evidence: [],
      };

      localStorageMock.setItem('release-readiness-summary', JSON.stringify(cachedSummary));
      localStorageMock.setItem('release-readiness-evidence', JSON.stringify(cachedEvidence));
      localStorageMock.setItem('release-readiness-timestamp', (Date.now() - 10 * 60 * 1000).toString());

      // Mock API to fail (offline simulation)
      (global.fetch as any).mockRejectedValue(new Error('Network error') as any);

      renderWithProviders(
        <Routes>
          <Route path="/ops/release-readiness" element={<ReleaseReadinessRoute />} />
        </Routes>,
        { route: '/ops/release-readiness' }
      );

      // Should show cached data
      await waitFor(() => {
        (expect(screen.queryByText(/Loading release readiness data/i)) as any).not.toBeInTheDocument();
      });

      // Check for console errors
      const actualErrors = consoleErrors.filter(
        (err) =>
          !err[0]?.toString().includes('Warning: ReactDOM.render') &&
          !err[0]?.toString().includes('Warning: useLayoutEffect') &&
          !err[0]?.toString().includes('Not implemented: HTMLFormElement.prototype.submit') &&
          !err[0]?.toString().includes('Network error') // Expected error from fetch
      );

      expect(actualErrors).toHaveLength(0);
    });

    it('renders without console errors in error state', async () => {
      // Mock API to fail
      (global.fetch as any).mockRejectedValue(new Error('API Error') as any);

      renderWithProviders(
        <Routes>
          <Route path="/ops/release-readiness" element={<ReleaseReadinessRoute />} />
        </Routes>,
        { route: '/ops/release-readiness' }
      );

      // Wait for error state
      await waitFor(() => {
        (expect(screen.queryByText(/Loading release readiness data/i)) as any).not.toBeInTheDocument();
      });

      // Check for console errors (allow the expected API error)
      const actualErrors = consoleErrors.filter(
        (err) =>
          !err[0]?.toString().includes('Warning: ReactDOM.render') &&
          !err[0]?.toString().includes('Warning: useLayoutEffect') &&
          !err[0]?.toString().includes('Not implemented: HTMLFormElement.prototype.submit') &&
          !err[0]?.toString().includes('API Error') &&
          !err[0]?.toString().includes('Failed to load from cache')
      );

      expect(actualErrors).toHaveLength(0);
    });

    it('handles tab switching without console errors', async () => {
      const mockSummary = {
        generatedAt: new Date().toISOString(),
        versionOrCommit: 'abc123',
        checks: [],
      };

      const mockEvidence = {
        controls: [],
        evidence: [],
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/ops/release-readiness/summary')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSummary,
          });
        }
        if (url.includes('/ops/release-readiness/evidence-index')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockEvidence,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      renderWithProviders(
        <Routes>
          <Route path="/ops/release-readiness" element={<ReleaseReadinessRoute />} />
        </Routes>,
        { route: '/ops/release-readiness' }
      );

      await waitFor(() => {
        (expect(screen.queryByText(/Loading release readiness data/i)) as any).not.toBeInTheDocument();
      });

      // Clear errors from initial render
      consoleErrors = [];

      // Click Evidence Explorer tab (if visible)
      const evidenceTab = screen.queryByText('Evidence Explorer');
      if (evidenceTab) {
        (evidenceTab as HTMLElement).click();

        // Wait a bit for re-render
        await waitFor(() => {
          (expect(evidenceTab) as any).toBeInTheDocument();
        });
      }

      // No new console errors
      expect(consoleErrors).toHaveLength(0);
    });
  });

  describe('Route audit smoke', () => {
    it('redirects /geoint to /investigations', async () => {
      mockFetchOk();
      renderAppAt('/geoint');

      await waitFor(() => {
        expect(window.location.pathname).toBe('/investigations');
      });
    });

    it('redirects /reports to /investigations', async () => {
      mockFetchOk();
      renderAppAt('/reports');

      await waitFor(() => {
        expect(window.location.pathname).toBe('/investigations');
      });
    });

    it('shows NotFound for removed demo routes', async () => {
      mockFetchOk();
      renderAppAt('/demo');

      expect(await screen.findByText(/404 - Page Not Found/i)).toBeInTheDocument();
    });

    it('shows NotFound for removed wargame route', async () => {
      mockFetchOk();
      renderAppAt('/wargame-dashboard');

      expect(await screen.findByText(/404 - Page Not Found/i)).toBeInTheDocument();
    it('redirects /geoint and /reports to /investigations', () => {
      expect(appRouterSource).toContain('path="/geoint"');
      expect(appRouterSource).toContain('path="/reports"');
      expect(appRouterSource).toContain('Navigate to="/investigations" replace');
    });

    it('removes demo-only routes', () => {
      expect(appRouterSource).not.toMatch(/path="\/demo"/);
      expect(appRouterSource).not.toMatch(/wargame-dashboard/);
    });
  });

  describe('Route Mounting - No Runaway Effects', () => {
    it('does not create runaway intervals or timers', async () => {
      jest.useFakeTimers();

      const mockSummary = {
        generatedAt: new Date().toISOString(),
        versionOrCommit: 'abc123',
        checks: [],
      };

      const mockEvidence = {
        controls: [],
        evidence: [],
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/ops/release-readiness/summary')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockSummary,
          });
        }
        if (url.includes('/ops/release-readiness/evidence-index')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockEvidence,
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const { unmount } = renderWithProviders(
        <Routes>
          <Route path="/ops/release-readiness" element={<ReleaseReadinessRoute />} />
        </Routes>,
        { route: '/ops/release-readiness' }
      );

      // Fast-forward time
      jest.advanceTimersByTime(10000);

      // Fetch should only be called once (initial load, no polling)
      await waitFor(() => {
        expect(((global.fetch as any).mock.calls as any).length).toBeLessThanOrEqual(2); // summary + evidence
      });

      unmount();
      jest.useRealTimers();
    });
  });
});
