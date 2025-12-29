import React from 'react'
import { render, screen, waitFor, act } from '../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CommandCenterDashboard from './CommandCenterDashboard'

const precisionResponse = {
  data: [
    { date: '2025-01-01', metric_name: 'precision', value: 0.93 },
    { date: '2025-01-01', metric_name: 'recall', value: 0.87 },
  ],
}

const rollbackResponse = {
  data: [{ date: '2025-01-01', rollbacks: 2, total_deployments: 10 }],
}

const conflictResponse = {
  data: [{ conflict_reason: 'Conflicting metric values', count: 3 }],
}

const mockFetch = vi.fn((url: RequestInfo | URL) => {
  const target = url.toString()
  if (target.includes('/api/ga-core-metrics/er-ops/precision-recall')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(precisionResponse),
    })
  }
  if (target.includes('/api/ga-core-metrics/er-ops/rollbacks')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(rollbackResponse),
    })
  }
  if (target.includes('/api/ga-core-metrics/er-ops/conflicts')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(conflictResponse),
    })
  }
  return Promise.resolve({ ok: false })
})

beforeEach(() => {
  vi.useFakeTimers()
  global.fetch = mockFetch as any
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('CommandCenterDashboard', () => {
  it('renders ER ops panel with charts', async () => {
    render(<CommandCenterDashboard />)

    await act(async () => {
      vi.runAllTimers()
    })

    await waitFor(() => {
      expect(screen.getByText('ER Ops')).toBeInTheDocument()
      expect(screen.getByText('Precision vs Recall')).toBeInTheDocument()
      expect(screen.getByText('Conflict Reasons')).toBeInTheDocument()
    })
  })
})
