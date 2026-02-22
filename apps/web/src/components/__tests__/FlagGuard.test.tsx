import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlagGuard } from '../FlagGuard'
import * as AuthContext from '@/contexts/AuthContext'
import * as RbacHooks from '@/hooks/useRbac'

// Mocking the hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('@/hooks/useRbac', () => ({
  useRbacMultiple: vi.fn(),
}))

// Mock DisabledOverlay to simplify test
vi.mock('../DisabledOverlay', () => ({
  DisabledOverlay: ({ children }: { children: any }) => <div data-testid="disabled-overlay">{children}</div>
}))

describe('FlagGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders children when user has all permissions', () => {
    (AuthContext.useAuth as any).mockReturnValue({ user: { id: '1' }, loading: false })
    (RbacHooks.useRbacMultiple as any).mockReturnValue({ hasAllPermissions: true, loading: false })

    render(
      <FlagGuard required={[{ resource: 'test', action: 'read' }]}>
        <div data-testid="child">Child Content</div>
      </FlagGuard>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.queryByTestId('disabled-overlay')).not.toBeInTheDocument()
  })

  test('renders DisabledOverlay when user misses permissions and no fallback', () => {
    (AuthContext.useAuth as any).mockReturnValue({ user: { id: '1' }, loading: false })
    (RbacHooks.useRbacMultiple as any).mockReturnValue({ hasAllPermissions: false, loading: false })

    render(
      <FlagGuard required={[{ resource: 'test', action: 'read' }]}>
        <div data-testid="child">Child Content</div>
      </FlagGuard>
    )

    expect(screen.getByTestId('disabled-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('child')).toBeInTheDocument() // It wraps children
  })

  test('renders fallback when user misses permissions and fallback provided', () => {
    (AuthContext.useAuth as any).mockReturnValue({ user: { id: '1' }, loading: false })
    (RbacHooks.useRbacMultiple as any).mockReturnValue({ hasAllPermissions: false, loading: false })

    render(
      <FlagGuard
        required={[{ resource: 'test', action: 'read' }]}
        fallback={<div data-testid="fallback">Fallback</div>}
      >
        <div data-testid="child">Child Content</div>
      </FlagGuard>
    )

    expect(screen.getByTestId('fallback')).toBeInTheDocument()
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
    expect(screen.queryByTestId('disabled-overlay')).not.toBeInTheDocument()
  })
})
