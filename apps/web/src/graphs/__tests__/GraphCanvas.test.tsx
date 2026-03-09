import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GraphCanvas } from '../GraphCanvas'
import type { Entity, Relationship, GraphLayout } from '@/types'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', name: 'Test User', permissions: [], role: 'viewer' }, loading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/hooks/useRbac', () => ({
  useRbac: () => ({ hasPermission: true, loading: false }),
  useRbacMultiple: () => ({ hasAllPermissions: true, loading: false }),
}))

const MOCK_ENTITIES: Entity[] = [
  { id: '1', name: 'Test', type: 'PERSON', confidence: 1, properties: {}, createdAt: '', updatedAt: '' }
]
const MOCK_RELATIONSHIPS: Relationship[] = []
const MOCK_LAYOUT: GraphLayout = { type: 'force', settings: {} }

describe('GraphCanvas', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <GraphCanvas
        entities={MOCK_ENTITIES}
        relationships={MOCK_RELATIONSHIPS}
        layout={MOCK_LAYOUT}
      />
    )
    expect(container.querySelector('svg')).toBeDefined()
  })
})
