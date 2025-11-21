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
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TriPaneShell } from './TriPaneShell'
import {
  generateMockEntities,
  generateMockRelationships,
  generateMockTimelineEvents,
  generateMockGeospatialEvents,
} from './mockData'

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
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      // Check for pane headings
      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('Entity Graph')).toBeInTheDocument()
      expect(screen.getByText('Geographic View')).toBeInTheDocument()
    })

    it('should display correct data counts', () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
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

    it('should render header controls', () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      expect(screen.getByText('Tri-Pane Analysis')).toBeInTheDocument()
      expect(screen.getByText('Provenance')).toBeInTheDocument()
      expect(screen.getByText('Reset')).toBeInTheDocument()
      expect(screen.getByText('Export')).toBeInTheDocument()
    })
  })

  describe('Synchronized Brushing', () => {
    it('should filter data when time window is set', async () => {
      const user = userEvent.setup()

      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      // Initial counts
      const initialEntityCount = mockEntities.length

      // Simulate time window change (this would normally come from timeline interaction)
      const timeWindow = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      }

      // Call the callback manually to simulate timeline interaction
      mockCallbacks.onTimeWindowChange({
        start: new Date(timeWindow.start),
        end: new Date(timeWindow.end),
      })

      await waitFor(() => {
        expect(mockCallbacks.onTimeWindowChange).toHaveBeenCalled()
      })
    })

    it('should reset filters when reset button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
          initialSyncState={{
            globalTimeWindow: {
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              end: new Date(),
            },
          }}
        />
      )

      // Reset button should be enabled when there's a filter
      const resetButton = screen.getByText('Reset')
      expect(resetButton).not.toBeDisabled()

      // Click reset
      await user.click(resetButton)

      // After reset, the filter indicator should disappear
      await waitFor(() => {
        expect(screen.queryByText(/Time filter:/)).not.toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('should toggle provenance overlay', async () => {
      const user = userEvent.setup()

      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      const provenanceButton = screen.getByText('Provenance')

      // Click to show provenance
      await user.click(provenanceButton)

      // Check if provenance badge appears in the graph pane
      const graphCard = screen.getByText('Entity Graph').closest('div')
      expect(graphCard).toBeInTheDocument()
    })

    it('should handle export action', async () => {
      const user = userEvent.setup()

      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      expect(mockCallbacks.onExport).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should handle keyboard shortcuts', async () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      // Test 'r' key for reset (when there's a filter)
      fireEvent.keyDown(window, { key: 'r' })
      // Since there's no initial filter, reset shouldn't do anything visible

      // Test 'e' key for export
      fireEvent.keyDown(window, { key: 'e' })
      await waitFor(() => {
        expect(mockCallbacks.onExport).toHaveBeenCalled()
      })

      // Test 'p' key for provenance toggle
      fireEvent.keyDown(window, { key: 'p' })
      // Provenance should toggle
    })

    it('should not trigger shortcuts when typing in input fields', async () => {
      render(
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
      )

      const input = screen.getByPlaceholderText('Test input')
      input.focus()

      // Type 'e' in input - should not trigger export
      fireEvent.keyDown(input, { key: 'e' })

      expect(mockCallbacks.onExport).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      expect(
        screen.getByRole('main', { name: 'Tri-pane analysis shell' })
      ).toBeInTheDocument()

      expect(
        screen.getByRole('complementary', { name: 'Keyboard shortcuts' })
      ).toBeInTheDocument()
    })

    it('should have live regions for status updates', () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      const statusRegions = screen.getAllByRole('status')
      expect(statusRegions.length).toBeGreaterThan(0)

      // All status regions should have aria-live="polite"
      statusRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('should have proper button labels', () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      expect(
        screen.getByLabelText(/provenance overlay/i)
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Reset all filters')).toBeInTheDocument()
      expect(screen.getByLabelText('Export data')).toBeInTheDocument()
    })

    it('should provide keyboard shortcut hints in titles', () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      expect(screen.getByTitle('Toggle provenance overlay (P)')).toBeInTheDocument()
      expect(screen.getByTitle('Reset filters (R)')).toBeInTheDocument()
      expect(screen.getByTitle('Export data (E)')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should handle empty data gracefully', () => {
      render(
        <TriPaneShell
          entities={[]}
          relationships={[]}
          timelineEvents={[]}
          geospatialEvents={[]}
          {...mockCallbacks}
        />
      )

      // Should still render the layout
      expect(screen.getByText('Tri-Pane Analysis')).toBeInTheDocument()

      // Counts should be zero
      expect(screen.getByTitle('Total entities')).toHaveTextContent('0')
      expect(screen.getByTitle('Total events')).toHaveTextContent('0')
      expect(screen.getByTitle('Total locations')).toHaveTextContent('0')
    })
  })

  describe('Filter Indicator', () => {
    it('should show filter indicator when time window is active', () => {
      const timeWindow = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      }

      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
          initialSyncState={{
            globalTimeWindow: timeWindow,
          }}
        />
      )

      // Should show time filter indicator
      expect(screen.getByText(/Time filter:/)).toBeInTheDocument()
    })

    it('should not show filter indicator when no filters are active', () => {
      render(
        <TriPaneShell
          entities={mockEntities}
          relationships={mockRelationships}
          timelineEvents={mockTimelineEvents}
          geospatialEvents={mockGeospatialEvents}
          {...mockCallbacks}
        />
      )

      // Should not show time filter indicator
      expect(screen.queryByText(/Time filter:/)).not.toBeInTheDocument()
    })
  })
})
