/**
 * ActiveSituations Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { ActiveSituations } from '../ActiveSituations';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('ActiveSituations', () => {
  const mockSituations = [
    {
      id: '1',
      title: 'Payment Processing',
      priority: 'P1' as const,
      severity: 'CRITICAL' as const,
      eventCount: 3,
      startedAt: new Date(Date.now() - 23 * 60 * 1000),
      owner: { id: '1', name: 'mike' },
    },
    {
      id: '2',
      title: 'Support Volume Spike',
      priority: 'P2' as const,
      severity: 'WARNING' as const,
      eventCount: 12,
      startedAt: new Date(Date.now() - 45 * 60 * 1000),
    },
  ];

  it('should render the title with situation count', () => {
    renderWithTheme(
      <ActiveSituations
        situations={mockSituations}
        onSituationClick={() => {}}
      />
    );

    expect(screen.getByText(/Active Situations \(2\)/)).toBeInTheDocument();
  });

  it('should render all situations', () => {
    renderWithTheme(
      <ActiveSituations
        situations={mockSituations}
        onSituationClick={() => {}}
      />
    );

    expect(screen.getByText('Payment Processing')).toBeInTheDocument();
    expect(screen.getByText('Support Volume Spike')).toBeInTheDocument();
  });

  it('should display priority chips', () => {
    renderWithTheme(
      <ActiveSituations
        situations={mockSituations}
        onSituationClick={() => {}}
      />
    );

    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  it('should display event counts', () => {
    renderWithTheme(
      <ActiveSituations
        situations={mockSituations}
        onSituationClick={() => {}}
      />
    );

    expect(screen.getByText(/3 related events/)).toBeInTheDocument();
    expect(screen.getByText(/12 related events/)).toBeInTheDocument();
  });

  it('should display owner when assigned', () => {
    renderWithTheme(
      <ActiveSituations
        situations={mockSituations}
        onSituationClick={() => {}}
      />
    );

    expect(screen.getByText(/Assigned: @mike/)).toBeInTheDocument();
  });

  it('should call onSituationClick when clicking a situation', () => {
    const handleClick = vi.fn();

    renderWithTheme(
      <ActiveSituations
        situations={mockSituations}
        onSituationClick={handleClick}
      />
    );

    // Click on the View button
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    expect(handleClick).toHaveBeenCalledWith('1');
  });

  it('should render empty state when no situations', () => {
    renderWithTheme(
      <ActiveSituations
        situations={[]}
        onSituationClick={() => {}}
      />
    );

    expect(screen.getByText(/No active situations/)).toBeInTheDocument();
  });

  it('should render loading state', () => {
    renderWithTheme(
      <ActiveSituations
        situations={[]}
        onSituationClick={() => {}}
        isLoading
      />
    );

    // Should not show the empty state when loading
    expect(screen.queryByText(/No active situations/)).not.toBeInTheDocument();
  });

  it('should have create situation button', () => {
    renderWithTheme(
      <ActiveSituations
        situations={mockSituations}
        onSituationClick={() => {}}
      />
    );

    expect(screen.getByText('+ Create Situation')).toBeInTheDocument();
  });
});
