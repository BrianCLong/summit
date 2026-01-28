import { render, screen, fireEvent } from '@testing-library/react'
import { TimelineRail } from './TimelineRail'
import { vi, describe, it, expect } from 'vitest'
import * as React from 'react'

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any

// Mock Tooltip components
vi.mock('@/components/ui/Tooltip', () => {
  const React = require('react')
  return {
    TooltipProvider: ({ children }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'tooltip-provider' },
        children
      ),
    Tooltip: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'tooltip' }, children),
    TooltipTrigger: ({ children }: any) =>
      React.createElement(
        'div',
        { 'data-testid': 'tooltip-trigger' },
        children
      ),
    TooltipContent: ({ children }: any) =>
      React.createElement('div', { role: 'tooltip', hidden: true }, children),
  }
})

const mockEvents = [
  {
    id: '1',
    timestamp: '2023-01-01T10:00:00Z',
    type: 'entity_created',
    title: 'Entity Created',
    description: 'A new entity was created',
    metadata: {},
  },
  {
    id: '2',
    timestamp: '2023-01-01T12:00:00Z',
    type: 'alert_triggered',
    title: 'Alert Triggered',
    description: 'An alert was triggered',
    metadata: {},
  },
]

const defaultProps = {
  data: mockEvents,
  totalTimeRange: {
    start: new Date('2023-01-01T00:00:00Z'),
    end: new Date('2023-01-01T23:59:59Z'),
  },
  currentTime: new Date('2023-01-01T12:00:00Z'),
  onCurrentTimeChange: vi.fn(),
  onTimeRangeChange: vi.fn(),
  onEventSelect: vi.fn(),
}

describe('TimelineRail', () => {
  it('renders correctly', () => {
    render(<TimelineRail {...defaultProps} />)
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('has accessible navigation buttons', () => {
    render(<TimelineRail {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: /Previous time period/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Next time period/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Toggle filters/i })
    ).toBeInTheDocument()
  })

  it('has accessible playback controls', () => {
    render(<TimelineRail {...defaultProps} />)

    expect(
      screen.getByRole('button', { name: /Restart playback/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Start playback/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Playback speed/i })
    ).toBeInTheDocument()
  })

  it('toggles play/pause label', () => {
    render(<TimelineRail {...defaultProps} />)
    const playButton = screen.getByRole('button', { name: /Start playback/i })
    fireEvent.click(playButton)

    expect(
      screen.getByRole('button', { name: /Pause playback/i })
    ).toBeInTheDocument()
  })

  it('has accessible filter inputs when filters are shown', () => {
    render(<TimelineRail {...defaultProps} />)

    const filterButton = screen.getByRole('button', { name: /Toggle filters/i })
    fireEvent.click(filterButton)

    expect(screen.getByLabelText(/Start time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/End time/i)).toBeInTheDocument()
  })
})
