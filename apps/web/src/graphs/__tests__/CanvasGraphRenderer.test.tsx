import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { CanvasGraphRenderer } from '../CanvasGraphRenderer'
import type { Entity, Relationship, GraphLayout } from '@/types'

// Mock Worker API for jsdom environment
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
}

const originalWorker = globalThis.Worker
beforeAll(() => {
  globalThis.Worker = MockWorker as unknown as typeof Worker
})
afterAll(() => {
  globalThis.Worker = originalWorker
})

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
