import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterDecisionPanel } from '@/components/maestro/RouterDecisionPanel'

const mockDecision = {
  id: 'decision-1',
  runId: 'run-1',
  nodeId: 'node-1',
  selectedModel: 'gpt-4o-mini',
  candidates: [
    {
      model: 'gpt-4o-mini',
      score: 0.93,
      reason: 'Best overall fit',
    },
  ],
  timestamp: new Date().toISOString(),
  canOverride: true,
}

describe('RouterDecisionPanel override dialog', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDecision,
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns focus to the trigger after closing with Escape', async () => {
    const user = userEvent.setup()
    render(<RouterDecisionPanel runId="run-1" nodeId="node-1" />)

    const overrideButton = await screen.findByRole('button', {
      name: /override/i,
    })
    overrideButton.focus()

    await user.click(overrideButton)

    const dialog = screen.getByRole('dialog', {
      name: /override router decision/i,
    })
    expect(dialog).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(
      screen.queryByRole('dialog', { name: /override router decision/i })
    ).not.toBeInTheDocument()
    expect(overrideButton).toHaveFocus()
  })
})
