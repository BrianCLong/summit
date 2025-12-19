import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../DashboardPage';
import { api } from '../../api';

// Mock the API
jest.mock('../../api', () => ({
  api: {
    dashboard: {
      get: jest.fn(),
    },
  },
}));

describe('DashboardPage', () => {
  it('renders loading state initially', () => {
    (api.dashboard.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders dashboard data correctly', async () => {
    (api.dashboard.get as jest.Mock).mockResolvedValue({
      health: {
        overallScore: 95,
        workstreams: [{ name: 'Core', status: 'healthy', score: 98 }],
        activeAlerts: [],
      },
      stats: {
        activeRuns: 5,
        completedRuns: 10,
        failedRuns: 1,
        tasksPerMinute: 42,
      },
      autonomic: {
        activeLoops: 3,
        totalLoops: 3,
        recentDecisions: ['Scaled up'],
      },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('Core')).toBeInTheDocument();
      expect(screen.getByText('Active Runs')).toBeInTheDocument();
    });
  });

  it('displays error message on failure', async () => {
    (api.dashboard.get as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});
