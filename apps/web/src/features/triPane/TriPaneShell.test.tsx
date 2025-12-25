/**
 * TriPaneShell Component Tests
 *
 * Tests for the tri-pane analysis shell including:
 * - Layout rendering
 * - Synchronized brushing
 * - Keyboard navigation
 * - Accessibility features
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TriPaneShell } from './TriPaneShell'
import {
  generateMockEntities,
  generateMockRelationships,
  generateMockTimelineEvents,
  generateMockGeospatialEvents,
} from './mockData'
import { SnapshotProvider } from '@/features/snapshots/SnapshotContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { TooltipProvider } from '@/components/ui/Tooltip'

// Mock sub-components
vi.mock('@/graphs/GraphCanvas', () => ({
    GraphCanvas: () => <div data-testid="graph-canvas">Graph Canvas</div>
}));

vi.mock('./MapPane', () => ({
    MapPane: () => <div data-testid="map-pane">Map Pane</div>
}));

vi.mock('@/components/panels/TimelineRail', () => ({
    TimelineRail: () => <div data-testid="timeline-rail">Timeline Rail</div>
}));

// We mock TimelineBrush but we'll expose a way to trigger its change
const mockOnTimeRangeChange = vi.fn();
vi.mock('./TimelineBrush', () => ({
    TimelineBrush: ({ onTimeRangeChange }: { onTimeRangeChange: any }) => (
        <div data-testid="timeline-brush">
            Timeline Brush
            <button
                data-testid="trigger-brush-change"
                onClick={() => {
                    onTimeRangeChange({
                        start: new Date(Date.now() - 86400000).toISOString(),
                        end: new Date().toISOString()
                    })
                }}
            >
                Trigger Brush
            </button>
        </div>
    )
}));

vi.mock('@/features/annotations/AnnotationPanel', () => ({
  default: () => <div data-testid="annotation-panel">Annotation Panel</div>
}));

vi.mock('@/components/CollaborationPanel', () => ({
    CollaborationPanel: () => <div data-testid="collaboration-panel">Collaboration Panel</div>
}));

// Mock hook
vi.mock('@/lib/yjs/useCollaboration', () => ({
    useCollaboration: () => ({
        doc: {},
        users: [],
        isConnected: true,
        isSynced: true
    })
}));

vi.mock('@/lib/yjs/useGraphSync', () => ({
    useGraphSync: (doc: any, entities: any) => ({
        entities,
        relationships: [],
        updateEntityPosition: vi.fn()
    })
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
        <TooltipProvider>
            <SnapshotProvider>
                {children}
            </SnapshotProvider>
        </TooltipProvider>
    </AuthProvider>
);

describe('TriPaneShell', () => {
  // Mock data
  const mockEntities = generateMockEntities(10)
  const mockRelationships = generateMockRelationships(mockEntities, 15)
  const mockTimelineEvents = generateMockTimelineEvents(mockEntities, 20)
  const mockGeospatialEvents = generateMockGeospatialEvents(10)

  // Mock callbacks
  const mockCallbacks = {
    onEntitySelect: vi.fn(),
    onEventSelect: vi.fn(),
    onLocationSelect: vi.fn(),
    onTimeWindowChange: vi.fn(),
    onSyncStateChange: vi.fn(),
    onExport: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Layout and Rendering', () => {
    it('should render all three panes', () => {
      render(
        <Wrapper>
            <TriPaneShell
              entities={mockEntities}
              relationships={mockRelationships}
              timelineEvents={mockTimelineEvents}
              geospatialEvents={mockGeospatialEvents}
              {...mockCallbacks}
            />
        </Wrapper>
      )

      expect(screen.getByTestId('timeline-rail')).toBeInTheDocument()
      expect(screen.getByTestId('graph-canvas')).toBeInTheDocument()
      expect(screen.getByTestId('map-pane')).toBeInTheDocument()
    })

    it('should display correct data counts', () => {
      render(
        <Wrapper>
            <TriPaneShell
              entities={mockEntities}
              relationships={mockRelationships}
              timelineEvents={mockTimelineEvents}
              geospatialEvents={mockGeospatialEvents}
              {...mockCallbacks}
            />
        </Wrapper>
      )

      // Check entity count badge
      expect(screen.getByTitle('Total entities')).toHaveTextContent(
        mockEntities.length.toString()
      )

      // Check events count badge
      expect(screen.getByTitle('Total events')).toHaveTextContent(
        mockTimelineEvents.length.toString()
      )

      // Check locations count badge
      expect(screen.getByTitle('Total locations')).toHaveTextContent(
        mockGeospatialEvents.length.toString()
      )
    })
  })

  describe('User Interactions', () => {
    it('should handle export action', async () => {
      const user = userEvent.setup()

      render(
        <Wrapper>
            <TriPaneShell
              entities={mockEntities}
              relationships={mockRelationships}
              timelineEvents={mockTimelineEvents}
              geospatialEvents={mockGeospatialEvents}
              {...mockCallbacks}
            />
        </Wrapper>
      )

      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      expect(mockCallbacks.onExport).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should handle keyboard shortcuts', async () => {
      render(
        <Wrapper>
            <TriPaneShell
              entities={mockEntities}
              relationships={mockRelationships}
              timelineEvents={mockTimelineEvents}
              geospatialEvents={mockGeospatialEvents}
              {...mockCallbacks}
            />
        </Wrapper>
      )

      // Test 'e' key for export
      fireEvent.keyDown(window, { key: 'e' })
      await waitFor(() => {
        expect(mockCallbacks.onExport).toHaveBeenCalled()
      })
    })

     it('should not trigger shortcuts when typing in input fields', async () => {
      render(
        <Wrapper>
          <div>
            <input type="text" placeholder="Test input" />
            <TriPaneShell
              entities={mockEntities}
              relationships={mockRelationships}
              timelineEvents={mockTimelineEvents}
              geospatialEvents={mockGeospatialEvents}
              {...mockCallbacks}
            />
          </div>
        </Wrapper>
      )

      const input = screen.getByPlaceholderText('Test input')
      input.focus()

      // Type 'e' in input - should not trigger export
      fireEvent.keyDown(input, { key: 'e' })

      expect(mockCallbacks.onExport).not.toHaveBeenCalled()
    })
  })

  describe('Synchronized Brushing', () => {
    it('should filter data when time window is set via brush', async () => {
      const user = userEvent.setup()

      render(
        <Wrapper>
            <TriPaneShell
              entities={mockEntities}
              relationships={mockRelationships}
              timelineEvents={mockTimelineEvents}
              geospatialEvents={mockGeospatialEvents}
              {...mockCallbacks}
            />
        </Wrapper>
      )

      // Find the trigger button in the mocked TimelineBrush
      const trigger = screen.getByTestId('trigger-brush-change')
      await user.click(trigger)

      await waitFor(() => {
          expect(mockCallbacks.onTimeWindowChange).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <Wrapper>
            <TriPaneShell
              entities={mockEntities}
              relationships={mockRelationships}
              timelineEvents={mockTimelineEvents}
              geospatialEvents={mockGeospatialEvents}
              {...mockCallbacks}
            />
        </Wrapper>
      )

      expect(
        screen.getByRole('main', { name: 'Tri-pane analysis shell' })
      ).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should handle empty data gracefully', () => {
      render(
        <Wrapper>
            <TriPaneShell
              entities={[]}
              relationships={[]}
              timelineEvents={[]}
              geospatialEvents={[]}
              {...mockCallbacks}
            />
        </Wrapper>
      )

      // Should still render the layout
      expect(screen.getByText('Tri-Pane Analysis')).toBeInTheDocument()

      // Counts should be zero
      expect(screen.getByTitle('Total entities')).toHaveTextContent('0')
      expect(screen.getByTitle('Total events')).toHaveTextContent('0')
      expect(screen.getByTitle('Total locations')).toHaveTextContent('0')
    })
  })
})
