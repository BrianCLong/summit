import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CanvasGraphRenderer } from '../CanvasGraphRenderer'
import type { Entity, Relationship, GraphLayout } from '@/types'

// Mock Entity and Relationship data
const MOCK_ENTITIES: Entity[] = [
  { id: '1', name: 'Test', type: 'PERSON', confidence: 1, properties: {}, createdAt: '', updatedAt: '' }
]
const MOCK_RELATIONSHIPS: Relationship[] = []
const MOCK_LAYOUT: GraphLayout = { type: 'force', settings: {} }

describe('CanvasGraphRenderer', () => {
  it('renders a canvas element', () => {
    const { container } = render(
      <CanvasGraphRenderer
        entities={MOCK_ENTITIES}
        relationships={MOCK_RELATIONSHIPS}
        layout={MOCK_LAYOUT}
      />
    )
    expect(container.querySelector('canvas')).toBeDefined()
  })
})
