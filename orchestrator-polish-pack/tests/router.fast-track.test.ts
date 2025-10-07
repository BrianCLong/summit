// Minimal illustrative test using Vitest
import { describe, it, expect } from 'vitest'
import { route } from '../src/router/route' // adjust import

describe('router fast-track', () => {
  it('prefers Perplexity when requires_browsing=true', async () => {
    const res = await route({ text: 'who is CEO of...', requires_browsing: true })
    expect(res.provider).toBe('perplexity')
  })
  it('denies when estimated cost exceeds per-brief budget', async () => {
    const res = await route({ text: 'generate massive', estimated_cost_usd: 5, budget_per_brief_usd: 0.75 })
    expect(res.decision).toBe('deny')
  })
})
