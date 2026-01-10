import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SystemHealthDashboard from '../SystemHealthDashboard';

// Mock fetch globally
global.fetch = jest.fn();

const mockSummaryResponse = {
  generatedAt: '2024-01-10T12:00:00Z',
  commitOrVersion: 'test-v1.0.0',
  invariants: {
    enforced: true,
    lastViolationAt: null,
    activePolicies: 5,
    recentViolations24h: 0,
  },
  killSwitch: {
    state: 'normal',
    lastTripAt: null,
    reason: null,
  },
  policy: {
    denials24h: 3,
    topRules: [
      { ruleId: 'rule-1', count: 2 },
      { ruleId: 'rule-2', count: 1 },
    ],
  },
  verification: {
    lastRunAt: '2024-01-10T11:00:00Z',
    gates: [
      { id: 'chaos', name: 'Chaos Testing', status: 'pass' },
      { id: 'adversarial', name: 'Adversarial Tests', status: 'pass' },
      { id: 'invariants', name: 'Invariant Verification', status: 'pass' },
      { id: 'tenant-isolation', name: 'Tenant Isolation', status: 'pass' },
    ],
  },
};

const mockEventsResponse = {
  events: [
    {
      id: 'evt-1',
      timestamp: '2024-01-10T11:30:00Z',
      type: 'policy_denial',
      severity: 'warn',
      summary: 'Test policy denial',
      details: { ruleId: 'rule-1' },
    },
    {
      id: 'evt-2',
      timestamp: '2024-01-10T11:00:00Z',
      type: 'invariant_violation',
      severity: 'error',
      summary: 'Test invariant violation',
      details: { rule: 'test-rule' },
    },
  ],
  total: 2,
  filters: {
    since: null,
    limit: 50,
    type: null,
    severity: null,
  },
};

describe('SystemHealthDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSummaryResponse),
        });
      }
      if (url.includes('/events')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockEventsResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Happy Path', () => {
    it('should render loading state initially', () => {
      render(<SystemHealthDashboard />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render summary after loading', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      expect(screen.getByText(/Status: OK/i)).toBeInTheDocument();
    });

    it('should display invariants status', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Invariants')).toBeInTheDocument();
      });

      expect(screen.getByText('Enforced')).toBeInTheDocument();
      expect(screen.getByText(/Active Policies: 5/i)).toBeInTheDocument();
    });

    it('should display kill switch status', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Kill Switch')).toBeInTheDocument();
      });

      expect(screen.getByText('Normal')).toBeInTheDocument();
    });

    it('should display policy denials', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Policy Denials')).toBeInTheDocument();
      });

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('rule-1')).toBeInTheDocument();
    });

    it('should display verification gates', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Verification Gates')).toBeInTheDocument();
      });

      expect(screen.getByText('Chaos Testing')).toBeInTheDocument();
      expect(screen.getByText('Adversarial Tests')).toBeInTheDocument();
    });

    it('should render events in timeline tab', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      // Switch to events tab
      const eventsTab = screen.getByRole('tab', { name: /Events Timeline/i });
      fireEvent.click(eventsTab);

      await waitFor(() => {
        expect(screen.getByText('Test policy denial')).toBeInTheDocument();
      });

      expect(screen.getByText('Test invariant violation')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show error when API fails without cache', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('should retry fetching when retry button is clicked', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });

      // Mock successful response for retry
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSummaryResponse),
          });
        }
        if (url.includes('/events')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEventsResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });
    });
  });

  describe('Offline/Cache Behavior', () => {
    it('should show cached data when API fails', async () => {
      // Set up cache
      localStorage.setItem('systemHealthSummary', JSON.stringify(mockSummaryResponse));
      localStorage.setItem('systemHealthEvents', JSON.stringify(mockEventsResponse.events));
      localStorage.setItem('systemHealthLastFetch', '2024-01-10T10:00:00Z');

      (global.fetch as jest.Mock).mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Offline - Showing Cached Data')).toBeInTheDocument();
      });

      expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
    });
  });

  describe('Kill Switch States', () => {
    it('should show warning status when kill switch is in soft mode', async () => {
      const modifiedSummary = {
        ...mockSummaryResponse,
        killSwitch: {
          state: 'soft' as const,
          lastTripAt: '2024-01-10T11:00:00Z',
          reason: 'Safe mode enabled',
        },
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(modifiedSummary),
          });
        }
        if (url.includes('/events')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEventsResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Status: Warning/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Soft')).toBeInTheDocument();
      expect(screen.getByText('Safe mode enabled')).toBeInTheDocument();
    });

    it('should show critical status when kill switch is in hard mode', async () => {
      const modifiedSummary = {
        ...mockSummaryResponse,
        killSwitch: {
          state: 'hard' as const,
          lastTripAt: '2024-01-10T11:00:00Z',
          reason: 'Global kill switch activated',
        },
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(modifiedSummary),
          });
        }
        if (url.includes('/events')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEventsResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Global kill switch activated')).toBeInTheDocument();
      });

      expect(screen.getByText('Hard')).toBeInTheDocument();
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by type', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      // Switch to events tab
      const eventsTab = screen.getByRole('tab', { name: /Events Timeline/i });
      fireEvent.click(eventsTab);

      await waitFor(() => {
        expect(screen.getByText('Test policy denial')).toBeInTheDocument();
        expect(screen.getByText('Test invariant violation')).toBeInTheDocument();
      });

      // Open type filter
      const typeFilter = screen.getByLabelText('Event Type');
      fireEvent.mouseDown(typeFilter);

      // Select invariant_violation
      const violationOption = await screen.findByText('Invariant Violations');
      fireEvent.click(violationOption);

      // Should only show invariant violation event
      await waitFor(() => {
        expect(screen.queryByText('Test policy denial')).not.toBeInTheDocument();
        expect(screen.getByText('Test invariant violation')).toBeInTheDocument();
      });
    });

    it('should filter events by severity', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      // Switch to events tab
      const eventsTab = screen.getByRole('tab', { name: /Events Timeline/i });
      fireEvent.click(eventsTab);

      await waitFor(() => {
        expect(screen.getByText('Test policy denial')).toBeInTheDocument();
      });

      // Open severity filter
      const severityFilter = screen.getByLabelText('Severity');
      fireEvent.mouseDown(severityFilter);

      // Select error
      const errorOption = await screen.findByText('Error');
      fireEvent.click(errorOption);

      // Should only show error events
      await waitFor(() => {
        expect(screen.queryByText('Test policy denial')).not.toBeInTheDocument();
        expect(screen.getByText('Test invariant violation')).toBeInTheDocument();
      });
    });
  });

  describe('Event Details Expansion', () => {
    it('should expand event details when clicking expand button', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      // Switch to events tab
      const eventsTab = screen.getByRole('tab', { name: /Events Timeline/i });
      fireEvent.click(eventsTab);

      await waitFor(() => {
        expect(screen.getByText('Test policy denial')).toBeInTheDocument();
      });

      // Find and click expand button
      const expandButtons = screen.getAllByRole('button', { name: '' });
      const expandButton = expandButtons.find(btn => btn.querySelector('svg'));
      if (expandButton) {
        fireEvent.click(expandButton);

        // Should show details
        await waitFor(() => {
          expect(screen.getByText('Details:')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      const fetchCallCount = (global.fetch as jest.Mock).mock.calls.length;

      // Click refresh button
      const refreshButton = screen.getByRole('button', { name: '' }).closest('button');
      if (refreshButton) {
        fireEvent.click(refreshButton);

        await waitFor(() => {
          expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(fetchCallCount);
        });
      }
    });
  });

  describe('No Console Errors', () => {
    it('should not produce console errors during render', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not produce console warnings during render', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no events exist', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSummaryResponse),
          });
        }
        if (url.includes('/events')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ events: [], total: 0, filters: {} }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health & Invariants')).toBeInTheDocument();
      });

      // Switch to events tab
      const eventsTab = screen.getByRole('tab', { name: /Events Timeline/i });
      fireEvent.click(eventsTab);

      await waitFor(() => {
        expect(screen.getByText('No events found')).toBeInTheDocument();
      });
    });
  });
});
