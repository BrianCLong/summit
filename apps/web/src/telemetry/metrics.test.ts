import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trackFirstRunEvent } from './metrics'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => 'uuid-1234'),
  })
})

describe('trackFirstRunEvent', () => {
  it('sends a privacy-safe telemetry payload', async () => {
    await trackFirstRunEvent('first_run_milestone_started', {
      milestoneId: 'connect_data_source',
      status: 'in_progress',
      source: 'setup_page',
    })

    expect(fetch).toHaveBeenCalled()
    const fetchMock = vi.mocked(fetch)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)

    expect(body.event).toBe('first_run_milestone_started')
    expect(body.labels).toEqual({
      milestoneId: 'connect_data_source',
      status: 'in_progress',
      source: 'setup_page',
    })
    expect(body.payload).toBeUndefined()
  })
})
