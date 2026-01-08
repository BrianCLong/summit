import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { LinkAnalysisCanvas } from '../LinkAnalysisCanvas'
import { useWorkbenchStore } from '../../store/viewStore'
import type { Entity, Relationship } from '@/types'

// Mock d3
vi.mock('d3', () => {
  // Helper must be inside or hoisted
  const createChainable = () => {
    const chain: any = () => chain
    chain.attr = () => chain
    chain.style = () => chain
    chain.text = () => chain
    chain.on = () => chain
    chain.call = () => chain
    chain.data = () => chain
    chain.join = () => chain
    chain.append = () => chain
    chain.selectAll = () => chain
    chain.remove = () => chain
    return chain
  }

  return {
    select: createChainable(),
    zoom: () => ({
      scaleExtent: () => ({
        on: () => {},
      }),
    }),
    zoomIdentity: {},
    forceSimulation: () => ({
      force: () => ({
        force: () => ({
          force: () => ({
            force: () => ({
              on: () => {},
              stop: () => {},
            }),
          }),
        }),
      }),
      alphaTarget: () => ({ restart: () => {} }),
    }),
    forceLink: () => ({
      id: () => ({
        distance: () => {},
      }),
    }),
    forceManyBody: () => ({
      strength: () => {},
    }),
    forceCenter: () => {},
    forceCollide: () => {},
    drag: () => ({
      on: () => ({
        on: () => ({
          on: () => {},
        }),
      }),
    }),
  }
})

const mockEntities: Entity[] = [
  {
    id: '1',
    name: 'John Doe',
    type: 'PERSON',
    confidence: 0.9,
    properties: {},
    createdAt: '',
    updatedAt: '',
  },
  {
    id: '2',
    name: 'Acme Corp',
    type: 'ORGANIZATION',
    confidence: 0.95,
    properties: {},
    createdAt: '',
    updatedAt: '',
  },
]

const mockEdges: Relationship[] = [
  {
    id: 'e1',
    sourceId: '1',
    targetId: '2',
    type: 'WORKS_FOR',
    confidence: 0.9,
    properties: {},
    createdAt: '',
    direction: 'OUTGOING',
  },
]

describe('LinkAnalysisCanvas', () => {
  it('renders without crashing', () => {
    render(<LinkAnalysisCanvas nodes={mockEntities} edges={mockEdges} />)
  })
})
