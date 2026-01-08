import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'
import '@testing-library/jest-dom'

// Mock component that throws
const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test Explosion')
  }
  return <div>Safe Component</div>
}

describe('ErrorBoundary', () => {
  // Mock console.error to avoid noise in test output
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })

  afterAll(() => {
    console.error = originalError
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary componentName="TestComp">
        <div>Content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('renders fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary componentName="TestComp">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/TestComp/i)).toBeInTheDocument()
    expect(screen.getByText('Test Explosion')).toBeInTheDocument()
  })

  it('provides a retry button that resets the state', () => {
    const { rerender } = render(
      <ErrorBoundary componentName="TestComp">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Try Again')).toBeInTheDocument()

    // Rerender with safe prop so retry works
    rerender(
      <ErrorBoundary componentName="TestComp">
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )

    fireEvent.click(screen.getByText('Try Again'))
    expect(screen.getByText('Safe Component')).toBeInTheDocument()
  })
})
