import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import GettingStartedPage from '@/pages/GettingStartedPage';

// Mock the telemetry module
vi.mock('@/telemetry/metrics', () => ({
  getFunnelProgress: vi.fn(() => ({})),
  trackFunnelMilestone: vi.fn(),
}));

// Wrapper component for router context
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('GettingStartedPage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the page title and description', async () => {
    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Getting Started')).toBeDefined();
      expect(
        screen.getByText(/Complete these steps to unlock the full potential/i)
      ).toBeDefined();
    });
  });

  it('displays all milestone steps', async () => {
    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Your Account')).toBeDefined();
      expect(screen.getByText('Connect a Data Source')).toBeDefined();
      expect(screen.getByText('Import Your Data')).toBeDefined();
      expect(screen.getByText('Explore Entities')).toBeDefined();
      expect(screen.getByText('Analyze Relationships')).toBeDefined();
    });
  });

  it('shows correct progress when no milestones completed', async () => {
    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('0 of 5 steps completed')).toBeDefined();
      expect(screen.getByText('0%')).toBeDefined();
    });
  });

  it('calculates progress correctly when milestones are completed', async () => {
    // Set up completed milestones in localStorage
    localStorage.setItem(
      'funnel_progress',
      JSON.stringify({
        signup_complete: {
          completed: true,
          timestamp: new Date().toISOString(),
          route: '/signup',
        },
        data_source_connected: {
          completed: true,
          timestamp: new Date().toISOString(),
          route: '/data/sources',
        },
      })
    );

    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('2 of 5 steps completed')).toBeDefined();
      expect(screen.getByText('40%')).toBeDefined();
    });
  });

  it('displays completion state when all milestones done', async () => {
    // Set all milestones as completed
    const allCompleted = {
      signup_complete: {
        completed: true,
        timestamp: new Date().toISOString(),
        route: '/signup',
      },
      data_source_connected: {
        completed: true,
        timestamp: new Date().toISOString(),
        route: '/data/sources',
      },
      data_ingested: {
        completed: true,
        timestamp: new Date().toISOString(),
        route: '/data/sources',
      },
      entities_explored: {
        completed: true,
        timestamp: new Date().toISOString(),
        route: '/explore',
      },
      relationships_analyzed: {
        completed: true,
        timestamp: new Date().toISOString(),
        route: '/explore',
      },
    };

    localStorage.setItem('funnel_progress', JSON.stringify(allCompleted));

    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Setup Complete!')).toBeDefined();
      expect(
        screen.getByText(/You've completed all the essential setup steps/i)
      ).toBeDefined();
    });
  });

  it('shows "Continue Setup" button with next milestone', async () => {
    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      const continueButton = screen.getByText('Continue Setup');
      expect(continueButton).toBeDefined();
    });
  });

  it('displays milestone status badges correctly', async () => {
    localStorage.setItem(
      'funnel_progress',
      JSON.stringify({
        signup_complete: {
          completed: true,
          timestamp: new Date().toISOString(),
          route: '/signup',
        },
      })
    );

    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      const completedBadges = screen.getAllByText('Completed');
      expect(completedBadges.length).toBeGreaterThan(0);
    });
  });

  it('has proper accessibility attributes', async () => {
    render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeDefined();
      expect(progressBar.getAttribute('aria-label')).toBe('Setup progress');
    });
  });

  it('listens to funnel_updated events', async () => {
    const { rerender } = render(
      <RouterWrapper>
        <GettingStartedPage />
      </RouterWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('0 of 5 steps completed')).toBeDefined();
    });

    // Simulate a funnel update
    localStorage.setItem(
      'funnel_progress',
      JSON.stringify({
        signup_complete: {
          completed: true,
          timestamp: new Date().toISOString(),
          route: '/signup',
        },
      })
    );

    // Dispatch the event
    window.dispatchEvent(new Event('funnel_updated'));

    // Wait for the component to update
    await waitFor(() => {
      expect(screen.getByText('1 of 5 steps completed')).toBeDefined();
    });
  });
});
