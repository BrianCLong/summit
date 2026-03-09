import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    const { getByText } = render(
      <EmptyState title="Test Title" description="Test Description" />
    );
    expect(getByText('Test Title')).toBeDefined();
    expect(getByText('Test Description')).toBeDefined();
  });

  it('renders the chart icon when icon="chart"', () => {
    const { container } = render(<EmptyState title="Test" icon="chart" />);
    // BarChart3 was renamed to ChartColumn in lucide-react v0.400+; class reflects new name
    const icon = container.querySelector('.lucide-chart-column');
    expect(icon).not.toBeNull();
  });

  it('renders the activity icon when icon="activity"', () => {
    const { container } = render(<EmptyState title="Test" icon="activity" />);
    const icon = container.querySelector('.lucide-activity');
    expect(icon).not.toBeNull();
  });

  it('icon container has aria-hidden="true"', () => {
    const { container } = render(<EmptyState title="Test" />);
    const iconContainer = container.querySelector('[aria-hidden="true"]');
    expect(iconContainer).not.toBeNull();
    expect(iconContainer?.classList.contains('bg-muted')).toBe(true);
  });
});
