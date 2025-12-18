import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TriPaneShell } from './TriPaneShell'
import { mockEntities, mockRelationships, mockTimelineEvents, mockGeospatialEvents } from './mockData'

// Mock d3 to avoid complexity in unit tests
vi.mock('d3', () => ({
  select: () => ({
    selectAll: () => ({
      remove: vi.fn(),
      data: () => ({
        enter: () => ({
          append: () => ({
            attr: () => ({
              style: () => ({
                call: () => {},
                on: () => {},
                filter: () => ({
                    append: () => ({
                        attr: () => ({ attr: () => ({ attr: () => ({ attr: () => {} }) }) })
                    })
                })
              })
            })
          })
        })
      })
    }),
    append: () => ({
      append: () => ({
         attr: () => ({})
      })
    }),
    call: () => {}
  }),
  forceSimulation: () => ({
    force: () => ({
      strength: () => ({}),
      radius: () => ({}),
      id: () => ({ distance: () => {} })
    }),
    on: () => {},
    stop: () => {}
  }),
  forceLink: () => (() => {}),
  forceManyBody: () => ({ strength: () => {} }),
  forceCenter: () => {},
  forceCollide: () => ({ radius: () => {} }),
  forceRadial: () => {},
  forceY: () => ({ y: () => {} }),
  forceX: () => {},
  zoom: () => ({
      scaleExtent: () => ({
          on: () => {}
      })
  }),
  drag: () => ({
    on: () => {}
  }),
  group: () => new Map()
}))

describe('TriPaneShell', () => {
  const defaultProps = {
    entities: mockEntities,
    relationships: mockRelationships,
    timelineEvents: mockTimelineEvents,
    geospatialEvents: mockGeospatialEvents,
  }

  it('renders all three panes', () => {
    render(<TriPaneShell {...defaultProps} />)

    expect(screen.getByText('Tri-Pane Analysis')).toBeInTheDocument()
    expect(screen.getByText('Entity Graph')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Geographic View')).toBeInTheDocument()
  })

  it('toggles narrative view in timeline', async () => {
    render(<TriPaneShell {...defaultProps} />)

    // Default is List view
    expect(screen.getByTitle('List View')).toHaveAttribute('aria-pressed', 'true') // implicit via variant

    // Switch to Narrative
    const narrativeBtn = screen.getByTitle('Narrative View')
    fireEvent.click(narrativeBtn)

    // Should see narrative specific text or structure (mocked)
    // The component updates internal state. We can check if "Narrative" text appears in header
    expect(screen.getByText('Narrative')).toBeInTheDocument()
  })

  it('toggles overlays', () => {
    render(<TriPaneShell {...defaultProps} />)

    const riskBtn = screen.getByTitle('Toggle Risk Signals (Shift+1)')
    fireEvent.click(riskBtn)
    expect(screen.getByText('Risk Signals')).toBeInTheDocument() // Badge appears in Graph header

    const narrativeBtn = screen.getByTitle('Toggle Narrative Flows (Shift+2)')
    fireEvent.click(narrativeBtn)
    // GraphCanvas receives prop, logic internal to canvas.
    // In this test environment we can't easily check d3 rendering, but we can verify state change didn't crash
  })

  it('opens keyboard shortcuts dialog', () => {
    render(<TriPaneShell {...defaultProps} />)

    const helpBtn = screen.getByTitle('Keyboard Shortcuts (?)')
    fireEvent.click(helpBtn)

    expect(screen.getByText('Keyboard Shortcuts')).toBeVisible()
    expect(screen.getByText('Focus Graph')).toBeVisible()
  })
})
