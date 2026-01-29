import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvestigatorWorkbench } from '../InvestigatorWorkbench'

// Mock GraphCanvas since it uses D3 and specialized DOM APIs
vi.mock('@/graphs/GraphCanvas', () => {
  const React = require('react')
  return {
    GraphCanvas: React.forwardRef(({ entities, onNodeDrop }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        exportAsPNG: vi.fn().mockResolvedValue(new Blob()),
        exportAsSVG: vi.fn().mockReturnValue('<svg>...</svg>'),
        exportAsJSON: vi.fn().mockReturnValue('{}')
      }))

      return (
        <div
           data-testid="graph-canvas"
           onDrop={(e) => {
             // Simulate drop logic
             const type = 'PERSON' // Simplified for test
             onNodeDrop(type, 100, 100)
           }}
        >
          {entities.map((e: any) => (
            <div key={e.id} data-testid={`node-${e.id}`}>{e.name}</div>
          ))}
        </div>
      )
    })
  }
})

// Mock UI components
vi.mock('@/components/ui/Slider', () => ({
  Slider: ({ onValueChange }: any) => (
    <input
      type="range"
      data-testid="timeline-slider"
      onChange={(e) => onValueChange([parseInt(e.target.value), 100])}
    />
  )
}))

describe('InvestigatorWorkbench', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock createObjectURL
    global.URL.createObjectURL = vi.fn()
    global.URL.revokeObjectURL = vi.fn()
  })

  it('renders the workbench correctly', () => {
    render(<InvestigatorWorkbench />)
    expect(screen.getByTestId('investigator-workbench')).toBeDefined()
    expect(screen.getByText('Entity Palette')).toBeDefined()
    expect(screen.getByText('Timeline Filter')).toBeDefined()
  })

  it('displays initial entities', () => {
    render(<InvestigatorWorkbench />)
    expect(screen.getByTestId('node-e1')).toBeDefined()
    expect(screen.getByTestId('node-e2')).toBeDefined()
  })

  it('can add new entities via simulation', () => {
    render(<InvestigatorWorkbench />)

    // In a real test we'd simulate drag and drop events, but here we rely on the mock's simplified behavior
    // or trigger the internal state change if we could access it.
    // However, since we mocked the child component to call onNodeDrop, we can simulate an interaction there?
    // Actually, our mock GraphCanvas renders a div we can interact with.

    const canvas = screen.getByTestId('graph-canvas')
    fireEvent.drop(canvas) // This triggers the mock onNodeDrop

    // Check if a new node appeared (our mock renders nodes)
    // The simplified mock logic adds "New PERSON"
    expect(screen.getByText('New PERSON')).toBeDefined()
  })

  it('renders export buttons', () => {
      render(<InvestigatorWorkbench />)
      expect(screen.getByText('Export PNG')).toBeDefined()
      expect(screen.getByText('Export SVG')).toBeDefined()
      expect(screen.getByText('Export JSON')).toBeDefined()
  })
})
