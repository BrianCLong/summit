import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import SignupPage from './SignupPage'

describe('SignupPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders sign up form correctly', () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )

    const passwordInput = screen.getByLabelText(/^password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Find toggle button - initially it should be 'Show password'
    // This will fail initially because there is no aria-label
    const toggleButton = screen.getByRole('button', { name: /show password/i })

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(toggleButton).toHaveAccessibleName(/hide password/i)

    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(toggleButton).toHaveAccessibleName(/show password/i)
  })

  it('shows loading state on submit', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})) // pending promise

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'User' } })
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } })

    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)

    // Wait for loading state
    // Currently implementation changes text to "Creating Account..."
    expect(await screen.findByRole('button', { name: /creating account/i })).toBeInTheDocument()
    // Button should be disabled (via aria-busy/disabled attribute check)
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })
})
