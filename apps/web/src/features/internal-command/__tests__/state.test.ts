import { describe, expect, it } from 'vitest'
import { deriveChecklistStatus, initialState, statusReducer } from '../state'
import type { StatusAction } from '../types'

describe('deriveChecklistStatus', () => {
  it('returns red when checklist missing', () => {
    expect(deriveChecklistStatus(undefined)).toBe('red')
    expect(deriveChecklistStatus([])).toBe('red')
  })

  it('returns red when any item is red', () => {
    expect(
      deriveChecklistStatus([
        {
          id: '1',
          name: 'test',
          status: 'green',
          evidence: { label: 'a', url: '#' },
        },
        {
          id: '2',
          name: 'bad',
          status: 'red',
          evidence: { label: 'b', url: '#' },
        },
      ])
    ).toBe('red')
  })

  it('returns yellow when no red but at least one yellow', () => {
    expect(
      deriveChecklistStatus([
        {
          id: '1',
          name: 'test',
          status: 'green',
          evidence: { label: 'a', url: '#' },
        },
        {
          id: '2',
          name: 'warn',
          status: 'yellow',
          evidence: { label: 'b', url: '#' },
        },
      ])
    ).toBe('yellow')
  })

  it('returns green when all pass', () => {
    expect(
      deriveChecklistStatus([
        {
          id: '1',
          name: 'ok',
          status: 'green',
          evidence: { label: 'a', url: '#' },
        },
      ])
    ).toBe('green')
  })
})

describe('statusReducer', () => {
  it('fails closed on fetch failure and escalates banner', () => {
    const action: StatusAction = {
      type: 'FETCH_FAILURE',
      key: 'ci',
      error: 'network error',
    }
    const state = statusReducer(initialState, action)
    expect(state.statuses.ci?.status).toBe('red')
    expect(state.banner.level).toBe('red')
  })

  it('derives GA status from checklist payloads', () => {
    const action: StatusAction = {
      type: 'FETCH_SUCCESS',
      key: 'ga',
      payload: {
        system: 'GA',
        status: 'green',
        summary: 'ignore status field',
        updatedAt: new Date().toISOString(),
        evidence: [],
        checklist: [
          {
            id: '1',
            name: 'ok',
            status: 'green',
            evidence: { label: 'a', url: '#' },
          },
          {
            id: '2',
            name: 'warning',
            status: 'yellow',
            evidence: { label: 'b', url: '#' },
          },
        ],
      },
    }
    const state = statusReducer(initialState, action)
    expect(state.statuses.ga?.status).toBe('yellow')
  })
})
