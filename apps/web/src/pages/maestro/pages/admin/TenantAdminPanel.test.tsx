import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import TenantAdminPanel from './TenantAdminPanel'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}))

const createJsonResponse = (data: unknown) =>
  Promise.resolve({
    ok: true,
    json: async () => data,
  })

describe('TenantAdminPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders tenant admin sections after loading', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockImplementation((input: RequestInfo) => {
        const url = typeof input === 'string' ? input : input.url
        if (url === '/api/tenants') {
          return createJsonResponse({
            success: true,
            data: [{ id: 't1', name: 'Acme', slug: 'acme' }],
            receipt: {
              id: 'r1',
              action: 'TENANT_LIST_VIEWED',
              tenantId: 't1',
              actorId: 'user-1',
              issuedAt: '2025-01-01T00:00:00Z',
              hash: 'hash',
            },
          })
        }
        if (url === '/api/tenants/t1') {
          return createJsonResponse({
            success: true,
            data: {
              id: 't1',
              name: 'Acme',
              slug: 'acme',
              settings: { policy_profile: 'baseline' },
            },
          })
        }
        if (url === '/api/policy-profiles') {
          return createJsonResponse({
            success: true,
            data: [
              {
                id: 'baseline',
                name: 'Baseline',
                description: 'Baseline',
                guardrails: { requirePurpose: false, requireJustification: false },
              },
            ],
          })
        }
        return createJsonResponse({ success: true, data: [] })
      })

    render(<TenantAdminPanel />)

    expect(
      await screen.findByText('Create tenant (Switchboard)'),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Tenant configuration')).toBeInTheDocument()
      expect(screen.getByText('Policy profile')).toBeInTheDocument()
    })

    fetchSpy.mockRestore()
  })
})
