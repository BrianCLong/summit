import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';
import { Input } from './input';

// Extend expect with jest-axe
expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('Button should have no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input should have no accessibility violations when labeled', async () => {
    const { container } = render(
      <div>
        <label htmlFor="test-input">Label</label>
        <Input id="test-input" placeholder="Enter text" />
      </div>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Button loading state UX', () => {
    // Standard button: shows spinner + text
    const { container: stdContainer, getByText: getByTextStd } = render(
      <Button loading>Click me</Button>
    );
    expect(getByTextStd('Click me')).toBeDefined();
    const stdSpinner = stdContainer.querySelector('.animate-spin');
    expect(stdSpinner).toBeDefined();
    expect(stdSpinner?.classList.contains('mr-2')).toBe(true);

    // Icon button: shows ONLY spinner (no text, no margin)
    const { container: iconContainer, queryByTestId } = render(
      <Button size="icon" loading>
        <span data-testid="icon-child">Icon</span>
      </Button>
    );
    expect(queryByTestId('icon-child')).toBeNull();
    const iconSpinner = iconContainer.querySelector('.animate-spin');
    expect(iconSpinner).toBeDefined();
    expect(iconSpinner?.classList.contains('mr-2')).toBe(false);
  });
});
