import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeDefined();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button.className).toContain('bg-destructive');
  });

  it('handles loading state for standard buttons', () => {
    render(<Button loading>Submit</Button>);
    const button = screen.getByRole('button', { name: /submit/i });

    // Should be disabled
    expect(button).toHaveProperty('disabled', true);

    // Should be aria-busy
    expect(button.getAttribute('aria-busy')).toBe('true');

    // Text should be visible (not sr-only)
    expect(screen.getByText('Submit')).not.toHaveClass('sr-only');
  });

  it('handles loading state for icon buttons', () => {
    render(
      <Button size="icon" loading aria-label="Delete Item">
        <span data-testid="icon">Icon</span>
      </Button>
    );
    const button = screen.getByRole('button', { name: /delete item/i });

    // Should be disabled
    expect(button).toHaveProperty('disabled', true);

    // Should be aria-busy
    expect(button.getAttribute('aria-busy')).toBe('true');

    // Children should be wrapped in sr-only
    const iconSpan = screen.getByTestId('icon');
    expect(iconSpan.parentElement).toHaveClass('sr-only');
  });

  it('handles asChild loading state correctly (does NOT hide children)', () => {
    // When asChild is true, we expect behavior to be preserved (children visible, no spinner injected by Button)
    render(
      <Button asChild size="icon" loading aria-label="Link Button">
        <a href="/link">Link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: /link/i });

    // Should be visible
    expect(link).toBeVisible();
    expect(link).not.toHaveClass('sr-only');

    // Since asChild=true, Button component passes aria-busy to the child
    expect(link.getAttribute('aria-busy')).toBe('true');
  });
});
