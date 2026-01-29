import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { PromptActivityMonitor } from '../SymphonyOperatorConsole'

const createMockFetch = () =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ history: [] }),
  })

describe('PromptActivityMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('pauses polling when the Prompts tab is inactive', async () => {
    const mockFetch = createMockFetch()
    global.fetch = mockFetch as unknown as typeof fetch

    render(<PromptActivityMonitor active={false} />)

    vi.advanceTimersByTime(6000)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // TODO: Test has async timing issues causing "window is not defined" error
  test.skip('starts polling when the Prompts tab becomes active', async () => {
    const mockFetch = createMockFetch()
    global.fetch = mockFetch as unknown as typeof fetch

    const { rerender } = render(<PromptActivityMonitor active={false} />)

    rerender(<PromptActivityMonitor active={true} />)

    await vi.runAllTimersAsync()
    expect(mockFetch).toHaveBeenCalled()

    vi.advanceTimersByTime(5000)
    await vi.runAllTimersAsync()
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
