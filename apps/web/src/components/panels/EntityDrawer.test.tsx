import { render, screen } from '@testing-library/react'
import { EntityDrawer } from './EntityDrawer'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TooltipProvider } from '@/components/ui/Tooltip'

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user', tenantId: 'test-tenant' } }),
}))

// Mock fetch for comments
global.fetch = vi.fn()

describe('EntityDrawer', () => {
  const mockEntity = {
    id: '123',
    type: 'PERSON',
    name: 'John Doe',
    confidence: 0.9,
    properties: { location: 'New York' },
    createdAt: '2023-01-01',
    updatedAt: '2023-01-02',
    tags: ['vip'],
  }

  const defaultProps = {
    data: [mockEntity],
    open: true,
    onOpenChange: vi.fn(),
    selectedEntityId: '123',
    relationships: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  it('renders action buttons with accessible labels', () => {
    render(
      <TooltipProvider>
        <EntityDrawer {...defaultProps} />
      </TooltipProvider>
    )

    // These tests are EXPECTED TO FAIL initially until we add aria-labels
    expect(screen.getByRole('button', { name: /Edit entity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete entity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export entity/i })).toBeInTheDocument()
  })
})
