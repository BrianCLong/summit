import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '@/components/ui/Button'
import React from 'react'

describe('Button Regression', () => {
  it('renders default button correctly', () => {
    const { container } = render(<Button>Click me</Button>)
    expect(container).toMatchSnapshot()
  })

  it('renders destructive button correctly', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container).toMatchSnapshot()
  })

  it('renders outline button correctly', () => {
    const { container } = render(<Button variant="outline">Cancel</Button>)
    expect(container).toMatchSnapshot()
  })

  it('renders loading button correctly', () => {
    const { container } = render(<Button loading>Loading</Button>)
    expect(container).toMatchSnapshot()
  })

  it('renders disabled button correctly', () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    expect(container).toMatchSnapshot()
  })
})
