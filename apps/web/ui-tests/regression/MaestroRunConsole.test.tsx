import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MaestroRunConsole } from '@/components/MaestroRunConsole'
import React from 'react'

// Mock the hook
vi.mock('@/hooks/useMaestroRun', () => ({
  useMaestroRun: (userId: string) => ({
    state: {
      data: {
        run: {
            id: 'run-123',
            createdAt: '2023-10-27T10:00:00Z',
        },
        costSummary: {
            totalCostUSD: 0.0042,
            totalInputTokens: 1500,
            totalOutputTokens: 200,
            byModel: {
                'gpt-4': { inputTokens: 1000, outputTokens: 100, costUSD: 0.003 },
                'gpt-3.5-turbo': { inputTokens: 500, outputTokens: 100, costUSD: 0.0012 }
            }
        },
        tasks: [
            { id: 'task-1', description: 'Analyze PRs', status: 'succeeded' },
            { id: 'task-2', description: 'Summarize Risks', status: 'running' }
        ],
        results: [
             {
                 task: { id: 'task-1', description: 'Analyze PRs', status: 'succeeded' },
                 artifact: { data: 'Analysis complete. No risks found.' }
             }
        ]
      },
      isRunning: false,
      error: null,
    },
    run: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe('MaestroRunConsole Regression', () => {
  it('renders console with populated data correctly', () => {
    const { container } = render(<MaestroRunConsole userId="test-user" />)
    expect(container).toMatchSnapshot()
  })
})
