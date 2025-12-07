
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AnalystConsole } from '../AnalystConsole'
import { generateMockDataset } from '../mockData'

// Mock the context provider since it's used internally
jest.mock('../AnalystViewContext', () => ({
  AnalystViewProvider: ({ children }: any) => <div>{children}</div>,
  useAnalystView: () => ({
    state: {
      timeWindow: { from: '2023-01-01', to: '2023-01-31' },
      filters: {},
      selection: { selectedEntityIds: [], selectedEventIds: [], selectedLocationIds: [] }
    },
    resetSelection: jest.fn(),
    resetAll: jest.fn()
  }),
  createDefaultViewState: () => ({
    timeWindow: { from: '2023-01-01', to: '2023-01-31' },
    filters: {},
    selection: { selectedEntityIds: [], selectedEventIds: [], selectedLocationIds: [] }
  })
}))

describe('AnalystConsole', () => {
  const mockData = generateMockDataset({
    entityCount: 5,
    linkCount: 5,
    eventCount: 5,
    locationCount: 2
  })

  it('renders the console shell', () => {
    render(
      <AnalystConsole
        entities={mockData.entities}
        links={mockData.links}
        events={mockData.events}
        locations={mockData.locations}
      />
    )

    expect(screen.getByText('Analyst Console')).toBeInTheDocument()
    expect(screen.getByText('Graph')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Map')).toBeInTheDocument()
  })

  it('renders with empty data', () => {
    render(
      <AnalystConsole
        entities={[]}
        links={[]}
        events={[]}
        locations={[]}
      />
    )

    expect(screen.getByText('Analyst Console')).toBeInTheDocument()
    // Should show empty state indicators or at least not crash
    expect(screen.getByText('0 entities')).toBeInTheDocument()
  })
})
