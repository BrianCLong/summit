import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AlertsPage from '@/pages/AlertsPage'

const refetchMock = vi.fn()
let hasError = true

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  )
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: () => false,
}))

vi.mock('@/hooks/useGraphQL', () => ({
  useAlerts: () => ({
    data: hasError
      ? null
      : {
          alerts: [
            {
              id: 'alert-1',
              title: 'Test alert',
              description: 'Alert description',
              severity: 'high',
              status: 'open',
              createdAt: new Date().toISOString(),
            },
          ],
        },
    loading: false,
    error: hasError ? new Error('Network error') : null,
    refetch: refetchMock.mockImplementation(() => {
      hasError = false
      return Promise.resolve()
    }),
  }),
  useAlertUpdates: () => ({ data: null }),
  useUpdateAlertStatus: () => [vi.fn()],
}))

describe('AlertsPage retry behavior', () => {
  afterEach(() => {
    hasError = true
    refetchMock.mockClear()
  })

  it('retries and restores the alert list', async () => {
    const user = userEvent.setup()
    render(<AlertsPage />)

    const retryButton = await screen.findByRole('button', { name: /retry/i })
    await user.click(retryButton)

    expect(refetchMock).toHaveBeenCalled()
    expect(await screen.findByText(/test alert/i)).toBeInTheDocument()
  })
})
