import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import {
  useSearchSessions,
  SEARCH_SESSION_STORAGE_KEY,
} from './useSearchSessions'
import type { FilterState } from '@/types'

const createFilters = (): FilterState => ({
  entityTypes: [],
  relationshipTypes: [],
  dateRange: { start: '', end: '' },
  confidenceRange: { min: 0, max: 1 },
  tags: [],
  sources: [],
})

describe('useSearchSessions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('adds and activates a new session tab', () => {
    const { result } = renderHook(() => useSearchSessions(true, createFilters))

    act(() => {
      result.current.addSession()
    })

    expect(result.current.sessions).toHaveLength(2)
    expect(result.current.activeSessionId).toBe(result.current.sessions[1].id)
  })

  it('closes the active session and falls back to another tab', async () => {
    const { result } = renderHook(() => useSearchSessions(true, createFilters))

    act(() => {
      result.current.addSession()
    })

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2)
    })

    act(() => {
      result.current.selectSession(result.current.sessions[1].id)
    })

    const closingId = result.current.activeSessionId

    act(() => {
      result.current.closeSession(closingId)
    })

    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.activeSessionId).not.toBe(closingId)
  })

  it('restores sessions from local storage', async () => {
    const firstRender = renderHook(() => useSearchSessions(true, createFilters))

    act(() => {
      firstRender.result.current.updateActiveSession({ query: 'malware' })
    })

    await waitFor(() =>
      expect(localStorage.getItem(SEARCH_SESSION_STORAGE_KEY)).not.toBeNull()
    )

    const savedActiveId = firstRender.result.current.activeSessionId
    firstRender.unmount()

    const secondRender = renderHook(() =>
      useSearchSessions(true, createFilters)
    )

    expect(secondRender.result.current.restoredFromStorage).toBe(true)
    expect(secondRender.result.current.activeSessionId).toBe(savedActiveId)
    expect(secondRender.result.current.activeSession?.query).toBe('malware')
  })
})
