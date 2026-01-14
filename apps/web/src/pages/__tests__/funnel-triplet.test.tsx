import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@/test-utils'
import ExplorePage from '@/pages/ExplorePage'
import AlertsPage from '@/pages/AlertsPage'
import {
  useAlerts,
  useAlertUpdates,
  useEntities,
  useEntityUpdates,
  useUpdateAlertStatus,
} from '@/hooks/useGraphQL'
import { useDemoMode } from '@/components/common/DemoIndicator'

vi.mock('@/telemetry/metrics', () => ({
  trackFirstRunEvent: vi.fn(),
  trackGoldenPathStep: vi.fn(),
}))

vi.mock('@/hooks/useGraphQL', () => ({
  useAlerts: vi.fn(),
  useAlertUpdates: vi.fn(),
  useEntities: vi.fn(),
  useEntityUpdates: vi.fn(),
  useUpdateAlertStatus: vi.fn(),
}))

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: vi.fn(),
}))

const mockUseAlerts = vi.mocked(useAlerts)
const mockUseAlertUpdates = vi.mocked(useAlertUpdates)
const mockUseEntities = vi.mocked(useEntities)
const mockUseEntityUpdates = vi.mocked(useEntityUpdates)
const mockUseUpdateAlertStatus = vi.mocked(useUpdateAlertStatus)
const mockUseDemoMode = vi.mocked(useDemoMode)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAlertUpdates.mockReturnValue({ data: undefined })
  mockUseEntityUpdates.mockReturnValue({ data: undefined })
  mockUseUpdateAlertStatus.mockReturnValue([vi.fn()])
})

describe('funnel triplet states', () => {
  it('renders an error state for Explore when graph data fails', async () => {
    mockUseDemoMode.mockReturnValue(false)
    mockUseEntities.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Failed to load graph data')).toBeVisible()
    const backLink = screen.getByRole('link', { name: /back to setup/i })
    expect(backLink).toHaveAttribute('href', '/setup')
  })

  it('renders an empty state for Explore when no entities are available', async () => {
    mockUseDemoMode.mockReturnValue(true)
    mockUseEntities.mockReturnValue({
      data: { entities: [] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <ExplorePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('No entities found')).toBeVisible()
  })

  it('renders a loading state for Alerts when fetching data', async () => {
    mockUseDemoMode.mockReturnValue(false)
    mockUseAlerts.mockReturnValue({
      data: { alerts: [] },
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Loading alerts')).toBeVisible()
  })

  it('renders an empty state for Alerts when filters remove all results', async () => {
    mockUseDemoMode.mockReturnValue(false)
    mockUseAlerts.mockReturnValue({
      data: { alerts: [] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('No alerts found')).toBeVisible()
  })
})
