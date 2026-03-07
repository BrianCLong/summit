import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { WorkbenchShell } from '../WorkbenchLayout'
import { useWorkbenchStore } from '../../store/viewStore'

// Mock sub-components but keep them interactive-ish
vi.mock('../../canvas/LinkAnalysisCanvas', () => ({
  LinkAnalysisCanvas: ({ nodes }: any) => {
    const { selectEntity } = useWorkbenchStore()
    return (
      <div
        data-testid="canvas"
        onClick={() => {
          // Simulate selecting the first node
          if (nodes.length > 0) selectEntity(nodes[0].id)
        }}
      >
        Canvas with {nodes.length} nodes
      </div>
    )
  },
}))

vi.mock('../../inspector/InspectorPanel', () => ({
  InspectorPanel: () => {
    const { selectedEntityIds } = useWorkbenchStore()
    return (
      <div data-testid="inspector">
        Inspector: {selectedEntityIds.length} selected
      </div>
    )
  },
}))

describe('WorkbenchShell Integration Smoke Test', () => {
  it('integrates components: selection flows from canvas to inspector', async () => {
    // Reset store
    useWorkbenchStore.setState({ selectedEntityIds: [] })

    render(<WorkbenchShell />)

    // Initial state
    expect(screen.getByText('Canvas with 3 nodes')).toBeInTheDocument()
    expect(screen.getByText('Inspector: 0 selected')).toBeInTheDocument()

    // Trigger interaction (click canvas to select node 1)
    const canvas = screen.getByTestId('canvas')
    fireEvent.click(canvas)

    // Verify state propagation
    // The InspectorPanel mock subscribes to the store, so it should update
    expect(screen.getByText('Inspector: 1 selected')).toBeInTheDocument()
  })
})
