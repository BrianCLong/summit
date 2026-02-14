import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import SchedulerBoard from '../SchedulerBoard'

// Global EventSource mock setup
let eventSourceInstance: any;

global.EventSource = class EventSource {
    onmessage: ((event: MessageEvent) => void) | null = null;
    close = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
    constructor(url: string) {
        eventSourceInstance = this;
    }
} as any;

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ minuteAhead: 5 }),
  })
) as any

describe('SchedulerBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eventSourceInstance = null
  })

  it('renders queue items and filters them', async () => {
    render(<SchedulerBoard />)

    // Wait for the component to mount and set up the EventSource listener
    await waitFor(() => expect(eventSourceInstance).toBeTruthy())

    // Simulate incoming data
    const queueData = [
      { id: '1', tenant: 'TenantA', eta: '10:00', pool: 'pool-1', cost: 10, preemptSuggestion: false },
      { id: '2', tenant: 'TenantB', eta: '10:05', pool: 'pool-2', cost: 20, preemptSuggestion: true },
    ]

    // Simulate receiving data via onmessage
    if (eventSourceInstance) {
        const event = { data: JSON.stringify(queueData) } as MessageEvent;
        if (eventSourceInstance.onmessage) {
            // Need to wrap in act? render and fireEvent handle it usually.
            // Since this is outside react lifecycle event, strictly speaking yes,
            // but for now let's try direct call.
            eventSourceInstance.onmessage(event);
        }
    }

    // Verify items are rendered
    await waitFor(() => {
      expect(screen.getByText('TenantA')).toBeInTheDocument()
      expect(screen.getByText('TenantB')).toBeInTheDocument()
    })

    // Test filtering
    const filterInput = screen.getByPlaceholderText('filter tenant…')
    fireEvent.input(filterInput, { target: { value: 'TenantA' } })

    // Verify filtering behavior
    // TenantA should be visible
    const rowA = screen.getByText('TenantA').closest('tr');
    expect(rowA).toBeVisible()

    // TenantB should be hidden (current impl) or removed (future impl)
    const rowBText = screen.queryByText('TenantB');

    if (rowBText) {
       const rowB = rowBText.closest('tr');
       // If it exists, it must be hidden.
       // Note: expect(element).not.toBeVisible() passes if display: none.
       expect(rowB).not.toBeVisible();
    } else {
       // If it doesn't exist (future implementation), that's also correct filtering.
       expect(rowBText).not.toBeInTheDocument();
    }
  })
})
