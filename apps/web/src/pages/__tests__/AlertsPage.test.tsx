import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AlertsPage from '@/pages/AlertsPage'

const mockRefetch = vi.fn()
const mockAlerts = [] as const
const mockAlertsData = { alerts: mockAlerts }

vi.mock('@/hooks/useGraphQL', () => ({
  useAlerts: () => ({
    data: mockAlertsData,
    loading: false,
    error: null,
    refetch: mockRefetch,
  }),
  useAlertUpdates: () => ({ data: null }),
  useUpdateAlertStatus: () => [vi.fn()],
}))

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: () => false,
}))

vi.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => null,
}))

describe('AlertsPage', () => {
  it('shows empty state quick actions when there are no alerts', async () => {
    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('No alerts found')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Clear Filters' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Review cases' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Explore investigations' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Connect data source' })
    ).toBeInTheDocument()
  })
})
