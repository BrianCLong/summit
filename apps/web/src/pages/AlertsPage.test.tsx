import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AlertsPage from './AlertsPage'
import type { Alert } from '@/types'

// Mock hooks
vi.mock('@/hooks/useGraphQL', () => ({
  useAlerts: vi.fn(),
  useAlertUpdates: vi.fn(),
  useUpdateAlertStatus: vi.fn(),
}))

vi.mock('@/components/common/DemoIndicator', () => ({
  useDemoMode: vi.fn(() => false), // Default to live mode
}))

// Mock UI components to simplify testing
vi.mock('@/components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/Table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
}))

vi.mock('@/components/ui/Skeleton', () => ({
  Skeleton: () => <div>Loading...</div>,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('@/components/ui/SearchBar', () => ({
  SearchBar: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid="search-bar"
    />
  ),
}))

vi.mock('@/components/panels/KPIStrip', () => ({
  KPIStrip: ({ data }: { data: any[] }) => (
    <div data-testid="kpi-strip">
      {data.map((kpi) => (
        <div key={kpi.id} data-testid={`kpi-${kpi.id}`}>
          {kpi.title}: {kpi.value}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div>Connected</div>,
}))

vi.mock('@/components/common/DataIntegrityNotice', () => ({
  DataIntegrityNotice: () => null,
}))

import { useAlerts, useAlertUpdates, useUpdateAlertStatus } from '@/hooks/useGraphQL'

describe('AlertsPage', () => {
  const mockAlertsData: Alert[] = [
    {
      id: '1',
      title: 'Critical Database Error',
      description: 'Connection failed',
      severity: 'critical',
      status: 'open',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      source: 'Database',
      metadata: {},
    },
    {
      id: '2',
      title: 'High CPU Usage',
      description: 'Server overload',
      severity: 'high',
      status: 'investigating',
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      source: 'Server',
      metadata: {},
    },
    {
      id: '3',
      title: 'Login Failure',
      description: 'Repeated attempts',
      severity: 'medium',
      status: 'resolved',
      createdAt: '2023-01-03T00:00:00Z',
      updatedAt: '2023-01-03T00:00:00Z',
      source: 'Auth',
      metadata: {},
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAlerts as any).mockReturnValue({
      data: { alerts: mockAlertsData },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    ;(useAlertUpdates as any).mockReturnValue({ data: null })
    ;(useUpdateAlertStatus as any).mockReturnValue([vi.fn()])
  })

  it('renders alerts list correctly', () => {
    render(<AlertsPage />)

    expect(screen.getByText('Critical Database Error')).toBeInTheDocument()
    expect(screen.getByText('High CPU Usage')).toBeInTheDocument()
    expect(screen.getByText('Login Failure')).toBeInTheDocument()

    // Check KPIs
    expect(screen.getByTestId('kpi-critical')).toHaveTextContent('Critical Alerts: 1')
    expect(screen.getByTestId('kpi-active')).toHaveTextContent('Active Alerts: 1') // Only 'open' status
    expect(screen.getByTestId('kpi-resolved')).toHaveTextContent('Resolved Today: 1')
  })

  it('filters alerts by search query', async () => {
    render(<AlertsPage />)

    const searchInput = screen.getByTestId('search-bar')
    fireEvent.change(searchInput, { target: { value: 'CPU' } })

    await waitFor(() => {
      expect(screen.queryByText('Critical Database Error')).not.toBeInTheDocument()
      expect(screen.getByText('High CPU Usage')).toBeInTheDocument()
    })
  })

  it('filters alerts by severity', async () => {
    render(<AlertsPage />)

    // Find severity select (it's the first select usually, but let's find by text label or role)
    // The component renders: <span className="text-sm font-medium">Severity:</span> <select ...>
    // We can use getAllByRole('combobox') if select is used
    const selects = screen.getAllByRole('combobox')
    const severitySelect = selects[0] // Assuming first one is Severity based on order in JSX

    fireEvent.change(severitySelect, { target: { value: 'critical' } })

    await waitFor(() => {
      expect(screen.getByText('Critical Database Error')).toBeInTheDocument()
      expect(screen.queryByText('High CPU Usage')).not.toBeInTheDocument()
    })
  })

  it('filters alerts by status', async () => {
    render(<AlertsPage />)

    const selects = screen.getAllByRole('combobox')
    const statusSelect = selects[1] // Assuming second one is Status

    fireEvent.change(statusSelect, { target: { value: 'resolved' } })

    await waitFor(() => {
      expect(screen.queryByText('Critical Database Error')).not.toBeInTheDocument() // status: open
      expect(screen.getByText('Login Failure')).toBeInTheDocument() // status: resolved
    })
  })

  it('displays loading state', () => {
    ;(useAlerts as any).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<AlertsPage />)
    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0)
  })

  it('displays error state', () => {
    ;(useAlerts as any).mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    })

    render(<AlertsPage />)
    expect(screen.getByText('Failed to load alerts')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })
})
