import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AlertsPage from '@/pages/AlertsPage'
import ReportsPage from '@/pages/ReportsPage'

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
  useDemoMode: () => true,
}))

vi.mock('@/hooks/useGraphQL', () => ({
  useAlerts: () => ({
    data: { alerts: [] },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useAlertUpdates: () => ({ data: null }),
  useUpdateAlertStatus: () => [vi.fn()],
}))

describe('Top-page accessibility labels', () => {
  it('exposes labeled filters on the alerts page', () => {
    render(<AlertsPage />)

    expect(screen.getByLabelText(/severity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /search alerts/i })).toBeInTheDocument()
  })

  it('exposes labeled filters on the reports page', async () => {
    vi.useFakeTimers()
    render(<ReportsPage />)
    await vi.runAllTimersAsync()

    expect(screen.getByRole('button', { name: /new report/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /search reports/i })).toBeInTheDocument()
    vi.useRealTimers()
  })
})
