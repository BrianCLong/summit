/**
 * HealthScoreCard Component Tests
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { HealthScoreCard } from '../HealthScoreCard';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('HealthScoreCard', () => {
  const defaultProps = {
    score: 87,
    trend: 'UP' as const,
    change: 3,
    components: [
      { name: 'Support', score: 92, status: 'HEALTHY' as const },
      { name: 'Revenue', score: 85, status: 'WARNING' as const },
      { name: 'Product', score: 88, status: 'HEALTHY' as const },
      { name: 'Team', score: 83, status: 'WARNING' as const },
    ],
  };

  it('should render the health score', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} />);

    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('should render the title', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} />);

    expect(screen.getByText('Operational Health Score')).toBeInTheDocument();
  });

  it('should render all component scores', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} />);

    expect(screen.getByText('Support:')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('Revenue:')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('Product:')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('Team:')).toBeInTheDocument();
    expect(screen.getByText('83')).toBeInTheDocument();
  });

  it('should display positive change with plus sign', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} />);

    expect(screen.getByText('+3 from yesterday')).toBeInTheDocument();
  });

  it('should display negative change', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} change={-5} trend="DOWN" />);

    expect(screen.getByText('-5 from yesterday')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} isLoading />);

    // Should not show the score when loading
    expect(screen.queryByText('87')).not.toBeInTheDocument();
  });

  it('should handle zero score', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} score={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle empty components array', () => {
    renderWithTheme(<HealthScoreCard {...defaultProps} components={[]} />);

    expect(screen.getByText('87')).toBeInTheDocument();
  });
});
