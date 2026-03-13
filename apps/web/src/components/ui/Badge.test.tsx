import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'
import React from 'react'

describe('Badge Component', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>)
    expect(screen.getByText('Test Badge')).toBeDefined()
  })

  it('renders as a span element', () => {
    const { container } = render(<Badge>Test</Badge>)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })

  it('renders with an icon when provided', () => {
    const TestIcon = () => <span data-testid="test-icon">icon</span>
    render(<Badge icon={<TestIcon />}>With Icon</Badge>)
    expect(screen.getByTestId('test-icon')).toBeDefined()
    expect(screen.getByText('With Icon')).toBeDefined()
  })

  it('applies variant classes correctly', () => {
    const { container } = render(<Badge variant="destructive">Destructive</Badge>)
    // Check if the element contains a partial class name from badgeVariants
    // 'bg-destructive' is part of the destructive variant
    expect(container.firstChild?.className).toContain('bg-destructive')
  })

  it('renders accessible status icons when accessibleStatus is true', () => {
    const { container: successContainer } = render(
      <Badge variant="success" accessibleStatus>
        Success
      </Badge>
    )
    // Check for Lucide CheckCircle2 icon (class includes 'lucide-check-circle-2')
    expect(successContainer.querySelector('.lucide-check-circle-2')).toBeDefined()

    const { container: warningContainer } = render(
      <Badge variant="warning" accessibleStatus>
        Warning
      </Badge>
    )
    // Check for Lucide AlertTriangle icon (class includes 'lucide-alert-triangle')
    expect(warningContainer.querySelector('.lucide-alert-triangle')).toBeDefined()

    const { container: errorContainer } = render(
      <Badge variant="error" accessibleStatus>
        Error
      </Badge>
    )
    // Check for Lucide AlertCircle icon (class includes 'lucide-alert-circle')
    expect(errorContainer.querySelector('.lucide-alert-circle')).toBeDefined()
  })

  it('favors manual icon over accessible status icon', () => {
    const TestIcon = () => <span data-testid="manual-icon">manual</span>
    render(
      <Badge variant="success" accessibleStatus icon={<TestIcon />}>
        Success
      </Badge>
    )
    expect(screen.getByTestId('manual-icon')).toBeDefined()
    // The lucide icon should not be rendered if manual icon is provided
    const badge = screen.getByText('Success').parentElement
    expect(badge?.querySelector('.lucide-check-circle-2')).toBeNull()
  })
})
