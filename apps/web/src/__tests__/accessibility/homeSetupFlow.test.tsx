import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '@/pages/HomePage'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Alex Analyst' },
  }),
}))

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: () => true,
}))

describe('Home setup checklist keyboard flow', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    localStorage.removeItem('activation_progress')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows keyboard users to continue to the next setup step', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<HomePage />)
    await vi.runAllTimersAsync()

    const continueButton = await screen.findByRole('button', {
      name: /continue to create tenant/i,
    })

    for (let i = 0; i < 10; i += 1) {
      if (document.activeElement === continueButton) break
      await user.tab()
    }

    expect(continueButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(navigateMock).toHaveBeenCalledWith('/admin')
  })
})
