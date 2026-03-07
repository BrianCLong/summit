import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GraphCanvas } from '../GraphCanvas'
import type { Entity, Relationship, GraphLayout } from '@/types'

// Mock D3 modules to avoid JSDOM issues with SVG methods if necessary,
// but for now let's see if it mounts with basic stubs.
// Actually, d3-force simulation runs a timer which might need cleanup or mocking.

const MOCK_ENTITIES: Entity[] = [
  {
    id: '1',
    name: 'Test',
    type: 'PERSON',
    confidence: 1,
    properties: {},
    createdAt: '',
    updatedAt: '',
  },
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
