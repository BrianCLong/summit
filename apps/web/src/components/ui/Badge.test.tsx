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
})
