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

const guardrailResponse = {
  datasetId: 'baseline',
  passed: true,
  metrics: { precision: 0.92, recall: 0.88, totalPairs: 10 },
  thresholds: { minPrecision: 0.9, minRecall: 0.85, matchThreshold: 0.8 },
  evaluatedAt: '2025-01-01T00:00:00Z',
  latestOverride: null,
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
  if (target.includes('/api/er/guardrails/status')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(guardrailResponse),
    })
  }
  return Promise.resolve({ ok: false })
})

beforeEach(() => {
  global.fetch = mockFetch as any
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('CommandCenterDashboard', () => {
  it.skip('renders ER ops panel with charts', async () => {
    render(<CommandCenterDashboard />)

    await waitFor(() => {
      expect(screen.getByText('ER Ops')).toBeInTheDocument()
      expect(screen.getByText('Precision vs Recall')).toBeInTheDocument()
      expect(screen.getByText('Conflict Reasons')).toBeInTheDocument()
      expect(screen.getByText(/Rollback rate: 20\.0%/)).toBeInTheDocument()
    })
  })
})
