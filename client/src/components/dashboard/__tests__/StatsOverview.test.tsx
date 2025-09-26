import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import StatsOverview from '../StatsOverview';

describe('StatsOverview', () => {
  it('renders overview stats with descriptive labels', () => {
    render(<StatsOverview />);

    const group = screen.getByRole('group', { name: /overview statistics/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByText(/Total Entities/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Relationships/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Investigations/i)).toBeInTheDocument();
    expect(screen.getByText(/Query Latency/i)).toBeInTheDocument();
  });

  it('meets basic accessibility expectations', async () => {
    const { container } = render(<StatsOverview />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
