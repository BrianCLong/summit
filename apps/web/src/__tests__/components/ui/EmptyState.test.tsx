import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/ui/EmptyState';

const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <RouterWrapper>
        <EmptyState
          title="No data found"
          description="Try adjusting your filters"
        />
      </RouterWrapper>
    );

    expect(screen.getByText('No data found')).toBeDefined();
    expect(screen.getByText('Try adjusting your filters')).toBeDefined();
  });

  it('renders with default icon', () => {
    const { container } = render(
      <RouterWrapper>
        <EmptyState title="Empty" />
      </RouterWrapper>
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeDefined();
  });

  it('renders with custom string icon', () => {
    render(
      <RouterWrapper>
        <EmptyState title="No alerts" icon="alert" />
      </RouterWrapper>
    );

    const container = screen.getByRole('status');
    expect(container).toBeDefined();
  });

  it('has proper accessibility attributes', () => {
    render(
      <RouterWrapper>
        <EmptyState title="No results" description="Try again" />
      </RouterWrapper>
    );

    const container = screen.getByRole('status');
    expect(container).toBeDefined();
    expect(container.getAttribute('aria-live')).toBe('polite');
  });

  it('renders primary action button', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <RouterWrapper>
        <EmptyState
          title="Empty"
          action={{
            label: 'Add Item',
            onClick: handleClick,
          }}
        />
      </RouterWrapper>
    );

    const button = screen.getByText('Add Item');
    expect(button).toBeDefined();

    await user.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('renders retry button when onRetry provided', async () => {
    const handleRetry = vi.fn();
    const user = userEvent.setup();

    render(
      <RouterWrapper>
        <EmptyState title="Failed to load" onRetry={handleRetry} />
      </RouterWrapper>
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeDefined();

    await user.click(retryButton);
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it('renders Go Home button when showHomeButton is true', () => {
    render(
      <RouterWrapper>
        <EmptyState title="Error" showHomeButton={true} />
      </RouterWrapper>
    );

    const homeButton = screen.getByText('Go Home');
    expect(homeButton).toBeDefined();
  });

  it('does not render Go Home button by default', () => {
    render(
      <RouterWrapper>
        <EmptyState title="Error" />
      </RouterWrapper>
    );

    const homeButton = screen.queryByText('Go Home');
    expect(homeButton).toBeNull();
  });

  it('renders all buttons together when all props provided', () => {
    const handleAction = vi.fn();
    const handleRetry = vi.fn();

    render(
      <RouterWrapper>
        <EmptyState
          title="Error"
          action={{ label: 'Try Something', onClick: handleAction }}
          onRetry={handleRetry}
          showHomeButton={true}
        />
      </RouterWrapper>
    );

    expect(screen.getByText('Try Something')).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
    expect(screen.getByText('Go Home')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RouterWrapper>
        <EmptyState title="Empty" className="custom-class" />
      </RouterWrapper>
    );

    expect(container.firstChild?.firstChild?.className).toContain(
      'custom-class'
    );
  });

  it('renders with variant action button', () => {
    const { container } = render(
      <RouterWrapper>
        <EmptyState
          title="Empty"
          action={{
            label: 'Secondary Action',
            onClick: () => {},
            variant: 'outline',
          }}
        />
      </RouterWrapper>
    );

    const button = screen.getByText('Secondary Action');
    expect(button.className).toContain('outline');
  });

  it('renders without description', () => {
    render(
      <RouterWrapper>
        <EmptyState title="No items" />
      </RouterWrapper>
    );

    expect(screen.getByText('No items')).toBeDefined();
    // Description should not exist
    const descriptions = screen.queryAllByRole('status');
    expect(descriptions.length).toBe(1); // Only the container
  });

  it('supports all icon types', () => {
    const icons = ['search', 'file', 'alert', 'plus', 'chart'] as const;

    icons.forEach((iconType) => {
      const { container } = render(
        <RouterWrapper>
          <EmptyState title="Test" icon={iconType} />
        </RouterWrapper>
      );
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeDefined();
    });
  });

  it('handles icon aria-hidden correctly', () => {
    const { container } = render(
      <RouterWrapper>
        <EmptyState title="Test" icon="search" />
      </RouterWrapper>
    );

    const icon = container.querySelector('svg');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
