import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SchedulerBoard from '../SchedulerBoard'
import { vi, describe, it, expect } from 'vitest'

// Mock jQuery to avoid crash in current implementation
vi.mock('jquery', () => {
  const m = {
    on: vi.fn(),
    val: vi.fn(),
    each: vi.fn(),
    text: vi.fn(),
    toggle: vi.fn(),
  }
  const fn = () => m
  // Add static methods/properties if needed, though mostly $(...) is used.
  return {
    default: fn,
    __esModule: true,
  }
})

// Mock EventSource
const mockEventSource = {
  onmessage: null,
  close: vi.fn(),
}

// @ts-ignore
global.EventSource = vi.fn(() => mockEventSource)

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ minuteAhead: 42 }),
  })
) as any

describe('SchedulerBoard', () => {
  it('renders rows and filters them', async () => {
    render(<SchedulerBoard />)

    // Simulate EventSource message
    const mockData = [
      { id: 'run-1', tenant: 'acme', eta: '5m', pool: 'gpu-large', cost: 1.5, preemptSuggestion: true },
      { id: 'run-2', tenant: 'globex', eta: '10m', pool: 'cpu-small', cost: 0.2, preemptSuggestion: false },
    ]

    // Trigger the onmessage callback manually
    const event = { data: JSON.stringify(mockData) }

    // We need to wait for the component to attach the listener
    // Since useEffect runs after render, and we are in the same tick effectively (or slightly after),
    // we should be able to trigger it.
    // However, `mockEventSource.onmessage` is assigned inside useEffect.

    // We can use a small delay or waitFor to ensure useEffect has run?
    // Actually `render` triggers effects.

    if (mockEventSource.onmessage) {
        (mockEventSource as any).onmessage(event)
    } else {
        // Retry a bit later if not attached yet (though usually it is synchronous after render in tests unless suspended)
        // But `render` returns, effects run.
        // Let's wrapping in act? React Testing Library `render` handles this.
    }

    // Re-trigger if needed, or rely on the reference update.
    // Since `mockEventSource` is a singleton in our mock scope,
    // when `SchedulerBoard` sets `.onmessage`, it sets it on our object.

    expect(mockEventSource.onmessage).toBeTruthy()
    ;(mockEventSource as any).onmessage(event)

    // Verify rows are rendered
    expect(await screen.findByText('acme')).toBeInTheDocument()
    expect(screen.getByText('globex')).toBeInTheDocument()
    expect(screen.getByText('$1.50')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument() // Hints

    // Test Filtering
    const input = screen.getByPlaceholderText('filter tenant…')
    fireEvent.change(input, { target: { value: 'acme' } })

    // In the new implementation (React state), this should trigger a re-render with filtered list.
    // In the old implementation (jQuery), this relies on jQuery toggling display:none.
    // Since we mocked jQuery, the old implementation does NOTHING visible to JSDOM (it calls mock toggle).
    // So this assertion `expect(screen.queryByText('globex')).not.toBeInTheDocument()` will FAIL on current code.
    // This is EXPECTED. It confirms that my test validates the NEW behavior.

    await waitFor(() => {
        expect(screen.queryByText('globex')).not.toBeInTheDocument()
    })
    expect(screen.getByText('acme')).toBeInTheDocument()
  })
})
