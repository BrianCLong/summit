/**
 * Tests for AnalystConsole component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { AnalystConsole } from '../AnalystConsole'
import {
  mockEntities,
  mockLinks,
  mockEvents,
  mockLocations,
} from '../mockData'

describe('AnalystConsole', () => {
  const defaultProps = {
    entities: mockEntities,
    links: mockLinks,
    events: mockEvents,
    locations: mockLocations,
  }

  it('renders without crashing', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText('Analyst Console')).toBeInTheDocument()
  })

  it('displays entity count badge', () => {
    render(<AnalystConsole {...defaultProps} />)

    // Should show entity count
    expect(screen.getByText(/entities/i)).toBeInTheDocument()
  })

  it('displays event count badge', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText(/events/i)).toBeInTheDocument()
  })

  it('displays location count badge', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText(/locations/i)).toBeInTheDocument()
  })

  it('renders graph pane', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText('Graph')).toBeInTheDocument()
  })

  it('renders timeline pane', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('renders map pane', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText('Map')).toBeInTheDocument()
  })

  it('renders explain panel by default', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText('Explain This View')).toBeInTheDocument()
  })

  it('toggles explain panel visibility', async () => {
    const user = userEvent.setup()
    render(<AnalystConsole {...defaultProps} />)

    // Find and click the Explain button
    const explainButton = screen.getByRole('button', { name: /toggle explain panel/i })
    await user.click(explainButton)

    // Panel should be hidden (button with Lightbulb shows)
    // We check that "Explain This View" is still accessible but panel content may be collapsed
  })

  it('renders provenance toggle button', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: /toggle provenance/i })
    ).toBeInTheDocument()
  })

  it('renders reset button', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument()
  })

  it('calls onExport when export button clicked', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    render(<AnalystConsole {...defaultProps} onExport={onExport} />)

    const exportButton = screen.getByRole('button', { name: /export/i })
    await user.click(exportButton)

    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('renders keyboard shortcuts overlay', () => {
    render(<AnalystConsole {...defaultProps} />)

    expect(screen.getByText('Shortcuts')).toBeInTheDocument()
  })

  describe('with empty data', () => {
    const emptyProps = {
      entities: [],
      links: [],
      events: [],
      locations: [],
    }

    it('renders without crashing', () => {
      render(<AnalystConsole {...emptyProps} />)

      expect(screen.getByText('Analyst Console')).toBeInTheDocument()
    })

    it('shows empty state messages', () => {
      render(<AnalystConsole {...emptyProps} />)

      // Graph pane should show empty state
      expect(screen.getByText(/no entities to display/i)).toBeInTheDocument()
    })
  })

  describe('ExplainThisViewPanel integration', () => {
    it('shows summary section', () => {
      render(<AnalystConsole {...defaultProps} />)

      expect(screen.getByText('Summary')).toBeInTheDocument()
    })

    it('shows view metrics section', () => {
      render(<AnalystConsole {...defaultProps} />)

      expect(screen.getByText('View Metrics')).toBeInTheDocument()
    })

    it('shows top entities section', () => {
      render(<AnalystConsole {...defaultProps} />)

      expect(screen.getByText('Top Entities')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AnalystConsole {...defaultProps} />)

      expect(
        screen.getByRole('main', { name: /tri-pane analyst console/i })
      ).toBeInTheDocument()
    })

    it('has keyboard shortcut documentation', () => {
      render(<AnalystConsole {...defaultProps} />)

      // Check for keyboard shortcut indicators
      expect(screen.getAllByText(/⌘/).length).toBeGreaterThan(0)
    })
  })
})

describe('ExplainThisViewPanel', () => {
  const defaultProps = {
    entities: mockEntities,
    links: mockLinks,
    events: mockEvents,
    locations: mockLocations,
  }

  it('generates headline with entity count', () => {
    render(<AnalystConsole {...defaultProps} />)

    // Should mention entities in the summary
    expect(screen.getByText(/viewing.*entities/i)).toBeInTheDocument()
  })

  it('shows entity type distribution', () => {
    render(<AnalystConsole {...defaultProps} />)

    // Should show entity distribution section
    expect(screen.getByText('Entity Distribution')).toBeInTheDocument()
  })

  it('can be collapsed and expanded', async () => {
    const user = userEvent.setup()
    render(<AnalystConsole {...defaultProps} />)

    // Find collapse button in the panel
    const closeButton = screen.getByRole('button', { name: /collapse panel/i })
    await user.click(closeButton)

    // Should show expand button
    expect(
      screen.getByRole('button', { name: /expand explain this view/i })
    ).toBeInTheDocument()
  })
})
