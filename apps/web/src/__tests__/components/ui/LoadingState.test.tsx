import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingState } from '@/components/ui/LoadingState';

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('renders with custom message', () => {
    render(<LoadingState message="Loading data sources..." />);
    expect(screen.getByText('Loading data sources...')).toBeDefined();
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingState message="Loading content" />);
    const container = screen.getByRole('status');
    expect(container).toBeDefined();
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(container.getAttribute('aria-busy')).toBe('true');
  });

  it('includes screen reader text', () => {
    render(<LoadingState message="Loading alerts" />);
    const srText = screen.getByText('Loading alerts', { selector: '.sr-only' });
    expect(srText).toBeDefined();
  });

  it('applies small size variant', () => {
    const { container } = render(<LoadingState size="sm" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-4 w-4');
  });

  it('applies medium size variant', () => {
    const { container } = render(<LoadingState size="md" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-8 w-8');
  });

  it('applies large size variant', () => {
    const { container } = render(<LoadingState size="lg" />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('h-12 w-12');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />);
    expect(container.firstChild?.className).toContain('custom-class');
  });

  it('renders in centered mode by default', () => {
    const { container } = render(<LoadingState />);
    expect(container.firstChild?.className).toContain('min-h-[200px]');
  });

  it('can disable centered mode', () => {
    const { container } = render(<LoadingState centered={false} />);
    expect(container.firstChild?.className).not.toContain('min-h-[200px]');
  });

  it('renders full page variant when specified', () => {
    const { container } = render(<LoadingState fullPage />);
    const wrapper = container.querySelector('.flex.h-screen');
    expect(wrapper).toBeDefined();
  });
});
