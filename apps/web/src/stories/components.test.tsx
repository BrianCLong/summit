/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/input'

expect.extend(toHaveNoViolations)

describe('Components Accessibility', () => {
  it('Button should have no violations', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Input should have no violations', async () => {
    // Input needs a label for accessibility
    const { container } = render(
      <div>
        <label htmlFor="test-input">Label</label>
        <Input id="test-input" placeholder="Enter text" />
      </div>
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
