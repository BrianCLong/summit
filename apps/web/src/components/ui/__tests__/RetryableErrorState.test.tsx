import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RetryableErrorState } from '../RetryableErrorState'

describe('RetryableErrorState', () => {
  it('renders with default props', () => {
    render(<RetryableErrorState />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Unable to load data')).toBeInTheDocument()
  })

  it('displays custom error message', () => {
    const errorMessage = 'Network connection failed'
    render(
      <RetryableErrorState
        error={new Error(errorMessage)}
        title="Connection Error"
        description="Please check your network"
      />
    )

    expect(screen.getByText('Connection Error')).toBeInTheDocument()
    expect(screen.getByText('Please check your network')).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<RetryableErrorState onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /try again/i })
    await user.click(retryButton)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onNavigateHome when home button is clicked', async () => {
    const user = userEvent.setup()
    const onNavigateHome = vi.fn()

    render(<RetryableErrorState onNavigateHome={onNavigateHome} />)

    const homeButton = screen.getByRole('button', { name: /go home/i })
    await user.click(homeButton)

    expect(onNavigateHome).toHaveBeenCalledTimes(1)
  })

  it('shows error details when showDetails is true', () => {
    const error = new Error('Detailed error message')
    render(<RetryableErrorState error={error} showDetails={true} />)

    expect(screen.getByText(/detailed error message/i)).toBeInTheDocument()
  })

  it('hides error details when showDetails is false', () => {
    const error = new Error('Detailed error message')
    render(<RetryableErrorState error={error} showDetails={false} />)

    expect(screen.queryByText(/detailed error message/i)).not.toBeInTheDocument()
  })

  it('has proper ARIA attributes for accessibility', () => {
    render(<RetryableErrorState />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  })

  it('renders icon with aria-hidden', () => {
    const { container } = render(<RetryableErrorState />)

    const icon = container.querySelector('svg[aria-hidden="true"]')
    expect(icon).toBeInTheDocument()
  })

  it('handles string error', () => {
    render(<RetryableErrorState error="Simple error message" />)

    expect(screen.getByText('Unable to load data')).toBeInTheDocument()
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<RetryableErrorState onRetry={onRetry} />)

    const retryButton = screen.getByRole('button', { name: /try again/i })

    // Tab to focus the button
    await user.tab()
    await user.tab() // May need two tabs if home button is present

    // Press Enter to activate
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled()
    })
  })
})
