import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import ProvenanceExplorerPage from '../ProvenanceExplorerPage'

// Mock the config
vi.mock('@/config', () => ({
  default: {
    apiBaseUrl: '/api',
    env: 'test',
  },
}))

// Mock the useFeatureFlag hook
vi.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(() => ({
    enabled: true,
    isLoading: false,
    value: true,
    error: null,
    refresh: vi.fn(),
  })),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch
global.fetch = vi.fn()

const mockProvenanceItems = [
  {
    id: 'run-1',
    type: 'run',
    createdAt: '2026-01-01T12:00:00Z',
    actor: 'user-1',
    source: 'test-runbook',
    status: 'success',
    integrity: {
      verified: true,
      signatureValid: true,
    },
    links: {
      runId: 'run-1',
    },
    metadata: {
      artifactCount: 2,
      tenantId: 'test-tenant',
    },
  },
  {
    id: 'run-2',
    type: 'run',
    createdAt: '2026-01-01T13:00:00Z',
    actor: 'user-2',
    source: 'another-runbook',
    status: 'failed',
    integrity: {
      verified: false,
    },
    links: {
      runId: 'run-2',
    },
    metadata: {
      artifactCount: 0,
      tenantId: 'test-tenant',
    },
  },
]

const mockProvenanceDetails = {
  ...mockProvenanceItems[0],
  inputs: [
    { id: 'input-1', type: 'config', hash: 'abc123', source: 's3://bucket/input' },
  ],
  outputs: [
    { id: 'output-1', type: 'receipt', hash: 'def456', destination: 's3://bucket/output' },
  ],
  steps: [
    {
      id: 'step-1',
      name: 'started',
      status: 'completed',
      startedAt: '2026-01-01T12:00:00Z',
      endedAt: '2026-01-01T12:01:00Z',
      duration: 60000,
    },
    {
      id: 'step-2',
      name: 'completed',
      status: 'completed',
      startedAt: '2026-01-01T12:01:00Z',
      endedAt: '2026-01-01T12:02:00Z',
      duration: 60000,
    },
  ],
  hashes: {
    contentHash: 'abc123def456',
  },
  signatures: [],
  policyDecisions: [],
  relatedIds: [],
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('ProvenanceExplorerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    ;(global.fetch as any).mockClear()

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  describe('Happy Path', () => {
    it('should load and display provenance summary', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProvenanceItems,
          pagination: { limit: 50, offset: 0, total: 2, hasMore: false },
        }),
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      // Check header is rendered
      expect(screen.getByText('Provenance Explorer')).toBeInTheDocument()
      expect(
        screen.getByText(/Inspect build and runtime provenance/i)
      ).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      // Check that items are displayed
      expect(screen.getByText('test-runbook')).toBeInTheDocument()
      expect(screen.getByText('another-runbook')).toBeInTheDocument()
      expect(screen.getByText('user-1')).toBeInTheDocument()
      expect(screen.getByText('user-2')).toBeInTheDocument()

      // Check status badges
      expect(screen.getByText('success')).toBeInTheDocument()
      expect(screen.getByText('failed')).toBeInTheDocument()
    })

    it('should filter results and search', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockProvenanceItems[0]],
          pagination: { limit: 50, offset: 0, total: 1, hasMore: false },
        }),
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search by run ID/i)).toBeInTheDocument()
      })

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/Search by run ID/i)
      await user.type(searchInput, 'test-query')

      // Click search button
      const searchButton = screen.getByRole('button', { name: /Search/i })
      await user.click(searchButton)

      // Verify fetch was called with search query
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('q=test-query'),
          expect.any(Object)
        )
      })
    })

    it('should open item details when row is clicked', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockProvenanceItems,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockProvenanceDetails,
          }),
        })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      // Click on a row
      const row = screen.getByText('test-runbook').closest('tr')
      await user.click(row!)

      // Wait for details to load
      await waitFor(() => {
        expect(screen.getByText('Provenance Details')).toBeInTheDocument()
      })

      // Check details are displayed
      expect(screen.getByText('Metadata')).toBeInTheDocument()
      expect(screen.getByText('Inputs')).toBeInTheDocument()
      expect(screen.getByText('Outputs')).toBeInTheDocument()
      expect(screen.getByText('Steps')).toBeInTheDocument()
    })

    it('should export evidence pack', async () => {
      const user = userEvent.setup()
      const mockBlob = new Blob(['mock data'], { type: 'application/json' })

      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockProvenanceItems,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => mockBlob,
        })

      // Mock URL.createObjectURL
      global.URL.createObjectURL = vi.fn(() => 'mock-url')
      global.URL.revokeObjectURL = vi.fn()

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      // Select an item
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // First data row checkbox

      // Click export button
      const exportButton = screen.getByRole('button', { name: /Export Evidence Pack/i })
      await user.click(exportButton)

      // Verify fetch was called with correct payload
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/ops/provenance/evidence-pack'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('run-1'),
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error when API fails', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load provenance data/i)).toBeInTheDocument()
      })

      // Check retry button is shown
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
    })

    it('should handle API error responses', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument()
      })
    })

    it('should retry on error', async () => {
      const user = userEvent.setup()

      ;(global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockProvenanceItems,
          }),
        })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load provenance data/i)).toBeInTheDocument()
      })

      // Click retry
      const retryButton = screen.getByRole('button', { name: /Retry/i })
      await user.click(retryButton)

      // Should load successfully
      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })
    })
  })

  describe('Offline Behavior', () => {
    it('should show offline badge when offline', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProvenanceItems,
        }),
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false })
      fireEvent(window, new Event('offline'))

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument()
      })
    })

    it('should load cached data when offline', async () => {
      const cachedData = {
        data: mockProvenanceItems,
        timestamp: new Date().toISOString(),
      }
      localStorageMock.setItem('provenance-cache', JSON.stringify(cachedData))

      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false })

      renderWithRouter(<ProvenanceExplorerPage />)

      // Should show cached data
      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      // Should show "Showing cached data" badge
      expect(screen.getByText('Showing cached data')).toBeInTheDocument()
    })

    it('should cache data after successful fetch', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProvenanceItems,
        }),
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      // Check that data was cached
      const cached = localStorageMock.getItem('provenance-cache')
      expect(cached).toBeTruthy()
      const parsedCache = JSON.parse(cached!)
      expect(parsedCache.data).toHaveLength(2)
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no data', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
        }),
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('No provenance found')).toBeInTheDocument()
      })

      expect(
        screen.getByText(/Try adjusting your search filters/i)
      ).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('should show loading indicator while fetching', async () => {
      ;(global.fetch as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      renderWithRouter(<ProvenanceExplorerPage />)

      expect(screen.getByText('Loading provenance data...')).toBeInTheDocument()
    })
  })

  describe('Feature Flag', () => {
    it('should show access denied when feature is disabled', async () => {
      const { useFeatureFlag } = await import('@/hooks/useFeatureFlag')
      ;(useFeatureFlag as any).mockReturnValueOnce({
        enabled: false,
        isLoading: false,
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      expect(
        screen.getByText(/Provenance Explorer is not enabled/i)
      ).toBeInTheDocument()
    })

    it('should show loading when feature flag is loading', async () => {
      const { useFeatureFlag } = await import('@/hooks/useFeatureFlag')
      ;(useFeatureFlag as any).mockReturnValueOnce({
        enabled: false,
        isLoading: true,
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Console Error Prevention', () => {
    it('should not log console errors on successful render', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProvenanceItems,
        }),
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProvenanceItems,
        }),
      })

      renderWithRouter(<ProvenanceExplorerPage />)

      await waitFor(() => {
        expect(screen.getByText('run-1')).toBeInTheDocument()
      })

      // Check for checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      // Check for buttons
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument()
    })
  })
})
