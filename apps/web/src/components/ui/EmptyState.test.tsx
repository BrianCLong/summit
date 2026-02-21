import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { EmptyState } from './EmptyState'

// Extend expect with jest-axe
expect.extend(toHaveNoViolations)

describe('EmptyState Accessibility', () => {
  it('should have no accessibility violations with default props', async () => {
    const { container } = render(
      <EmptyState title="No items" description="Try adding some items." />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have aria-hidden="true" on the icon container', () => {
    const { container } = render(
      <EmptyState icon="search" title="No results" />
    )
    // The icon is inside a div with bg-muted
    const iconContainer = container.querySelector('.bg-muted')
    expect(iconContainer).toBeDefined()
    expect(iconContainer?.getAttribute('aria-hidden')).toBe('true')
  })

  it('should render custom icon with aria-hidden="true" on container', () => {
    const CustomIcon = () => <svg data-testid="custom-icon" />
    const { container, getByTestId } = render(
      <EmptyState icon={<CustomIcon />} title="Custom Icon" />
    )
    const iconContainer = container.querySelector('.bg-muted')
    expect(iconContainer).toBeDefined()
    expect(iconContainer?.getAttribute('aria-hidden')).toBe('true')
    expect(getByTestId('custom-icon')).toBeDefined()
  })
})
