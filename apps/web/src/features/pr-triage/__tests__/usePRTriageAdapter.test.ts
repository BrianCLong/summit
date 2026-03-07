import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePRTriageAdapter, baseMockPRs } from '../usePRTriageAdapter'
import { defaultPRTriageFilters } from '../types'

describe('usePRTriageAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns all mock PRs with default filters', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    let prs: typeof baseMockPRs = []
    await act(async () => {
      prs = await result.current.list(defaultPRTriageFilters)
    })
    expect(prs.length).toBe(baseMockPRs.length)
  })

  it('filters by status', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    let prs: typeof baseMockPRs = []
    await act(async () => {
      prs = await result.current.list({ ...defaultPRTriageFilters, status: 'merge-ready' })
    })
    expect(prs.every(p => p.status === 'merge-ready')).toBe(true)
    expect(prs.length).toBeGreaterThan(0)
  })

  it('filters by priority', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    let prs: typeof baseMockPRs = []
    await act(async () => {
      prs = await result.current.list({ ...defaultPRTriageFilters, priority: 'critical' })
    })
    expect(prs.every(p => p.priority === 'critical')).toBe(true)
  })

  it('filters by partial assignee name', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    let prs: typeof baseMockPRs = []
    await act(async () => {
      prs = await result.current.list({ ...defaultPRTriageFilters, assignee: 'alex' })
    })
    expect(prs.every(p => p.assignee?.toLowerCase().includes('alex'))).toBe(true)
    expect(prs.length).toBeGreaterThan(0)
  })

  it('get returns the correct PR by id', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    let pr: (typeof baseMockPRs)[number] | undefined
    await act(async () => {
      pr = await result.current.get('pr-101')
    })
    expect(pr?.number).toBe(101)
  })

  it('get returns undefined for unknown id', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    let pr: (typeof baseMockPRs)[number] | undefined
    await act(async () => {
      pr = await result.current.get('pr-unknown')
    })
    expect(pr).toBeUndefined()
  })

  it('act records a decision in decisions list', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    await act(async () => {
      await result.current.act('pr-101', 'approve', { comment: 'LGTM' })
    })
    expect(result.current.decisions.length).toBe(1)
    expect(result.current.decisions[0].action).toBe('approve')
    expect(result.current.decisions[0].comment).toBe('LGTM')
    expect(result.current.decisions[0].prId).toBe('pr-101')
  })

  it('act with assign updates the PR assignee', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    await act(async () => {
      await result.current.act('pr-102', 'assign', { assignedTo: 'new.owner' })
    })
    let prs: typeof baseMockPRs = []
    await act(async () => {
      prs = await result.current.list(defaultPRTriageFilters)
    })
    const pr102 = prs.find(p => p.id === 'pr-102')
    expect(pr102?.assignee).toBe('new.owner')
  })

  it('reset restores original mock data and clears decisions', async () => {
    const { result } = renderHook(() => usePRTriageAdapter())
    await act(async () => {
      await result.current.act('pr-101', 'defer')
    })
    expect(result.current.decisions.length).toBe(1)

    act(() => {
      result.current.reset()
    })

    expect(result.current.decisions.length).toBe(0)
    let prs: typeof baseMockPRs = []
    await act(async () => {
      prs = await result.current.list(defaultPRTriageFilters)
    })
    expect(prs.length).toBe(baseMockPRs.length)
  })

  it('each mock PR has riskChecks with valid riskLevel values', () => {
    const validLevels = new Set(['none', 'low', 'medium', 'high', 'critical'])
    baseMockPRs.forEach(pr => {
      pr.riskChecks.forEach(check => {
        expect(validLevels.has(check.riskLevel)).toBe(true)
      })
    })
  })

  it('each mock PR has at least one diffFile', () => {
    baseMockPRs.forEach(pr => {
      expect(pr.diffFiles.length).toBeGreaterThan(0)
    })
  })

  it('each mock PR has convergence info', () => {
    baseMockPRs.forEach(pr => {
      expect(typeof pr.convergence.mergesCleanly).toBe('boolean')
      expect(typeof pr.convergence.behindByCommits).toBe('number')
      expect(Array.isArray(pr.convergence.deprecatedBranches)).toBe(true)
    })
  })
})
