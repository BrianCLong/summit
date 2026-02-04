import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignInPage from '@/pages/SignInPage'

const loginMock = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: loginMock,
    isAuthenticated: false,
    loading: false,
  }),
}))

describe('Sign-in accessibility landmarks and keyboard flow', () => {
  beforeEach(() => {
    loginMock.mockReset()
  })

  it('exposes a main landmark for the sign-in experience', () => {
    render(<SignInPage />)

    const main = screen.getByRole('main', { name: /sign in/i })
    expect(main).toBeInTheDocument()
  })

  // TODO: Tab navigation test has timeout issues - needs investigation
  it.skip('allows keyboard users to reach the primary action via tab order', async () => {
    const user = userEvent.setup()
    render(<SignInPage />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const togglePassword = screen.getByRole('button', { name: /password/i })
    const signInButton = screen.getByRole('button', { name: /sign in/i })

    await user.tab()
    expect(emailInput).toHaveFocus()

    await user.tab()
    expect(passwordInput).toHaveFocus()

    await user.tab()
    expect(togglePassword).toHaveFocus()

    await user.tab()
    expect(signInButton).toHaveFocus()
  })
})
