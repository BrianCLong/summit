import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);

    fireEvent.click(screen.getByText('Click Me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders loading spinner when loading prop is true', () => {
    render(<Button loading>Loading...</Button>);

    // Check for spinner (it has animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();

    // Check if button is disabled
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renders with correct variant classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.firstChild).toHaveClass('bg-destructive');
  });

  it('renders as child component when asChild is true', () => {
    const { container } = render(
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>
    );
    // Should render an anchor tag, not a button
    expect(container.querySelector('a')).toBeInTheDocument();
    expect(container.querySelector('button')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('href', '/link');
  });
});
