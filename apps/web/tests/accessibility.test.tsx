import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, beforeAll, vi } from 'vitest'
import * as matchers from 'vitest-axe/matchers'
import { axe } from 'vitest-axe'
import 'vitest-axe/extend-expect'
import { BrowserRouter } from 'react-router-dom'
import { Navigation } from '../src/components/Navigation'
import { Layout } from '../src/components/Layout'
import { TooltipProvider } from '../src/components/ui/Tooltip'

expect.extend(matchers)

// Mock Auth Context
const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  permissions: ['*'],
  tenantId: 'tenant-1'
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    loading: false,
    logout: vi.fn(),
  }),
}))

vi.mock('@/contexts/SearchContext', () => ({
  useSearch: () => ({
    openSearch: vi.fn(),
  }),
}))

vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => ({
    hasPermission: true,
  }),
}))


describe('Accessibility Checks', () => {
  it('Navigation should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <TooltipProvider>
          <Navigation user={mockUser} />
        </TooltipProvider>
      </BrowserRouter>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('Layout structure should have no accessibility violations', async () => {
     const { container } = render(
      <BrowserRouter>
        <TooltipProvider>
          <Layout />
        </TooltipProvider>
      </BrowserRouter>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
