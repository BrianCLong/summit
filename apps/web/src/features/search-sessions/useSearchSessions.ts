import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FilterState } from '@/types'

export const SEARCH_SESSION_STORAGE_KEY = 'intelgraph.searchSessions'
export const SEARCH_SESSION_STORAGE_VERSION = 1

export interface SearchSession {
  id: string
  name: string
  query: string
  filters: FilterState
  timeWindow: { start: string; end: string }
  selectedEntityId?: string
  lastUpdated: string
  stale?: boolean
}

interface StoredSearchSessionState {
  version: number
  activeSessionId: string
  sessions: SearchSession[]
}

interface UseSearchSessionsResult {
  sessions: SearchSession[]
  activeSession?: SearchSession
  activeSessionId: string
  restoredFromStorage: boolean
  addSession: () => void
  closeSession: (id: string) => void
  selectSession: (id: string) => void
  duplicateSession: (id: string) => void
  resetSession: (id: string) => void
  updateActiveSession: (updates: Partial<SearchSession>) => void
  importSession: (raw: string) => boolean
  exportSession: (id: string) => string
  markSessionRefreshed: (id: string) => void
}

type SessionState = {
  sessions: SearchSession[]
  activeSessionId: string
  restoredFromStorage: boolean
}

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as Crypto).randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`

const cloneFilters = (filters: FilterState): FilterState => ({
  entityTypes: [...filters.entityTypes],
  relationshipTypes: [...filters.relationshipTypes],
  dateRange: { ...filters.dateRange },
  confidenceRange: { ...filters.confidenceRange },
  tags: [...filters.tags],
  sources: [...filters.sources],
})

const normalizeTimeWindow = (
  timeWindow: SearchSession['timeWindow'] | undefined,
  filters: FilterState
): SearchSession['timeWindow'] => ({
  start: timeWindow?.start ?? filters.dateRange.start ?? '',
  end: timeWindow?.end ?? filters.dateRange.end ?? '',
})

const buildSession = (
  name: string,
  createDefaultFilters: () => FilterState,
  base?: Partial<SearchSession>
): SearchSession => {
  const filters = cloneFilters(base?.filters ?? createDefaultFilters())
  return {
    id: base?.id ?? createSessionId(),
    name,
    query: base?.query ?? '',
    filters,
    timeWindow: normalizeTimeWindow(base?.timeWindow, filters),
    selectedEntityId: base?.selectedEntityId,
    lastUpdated: base?.lastUpdated ?? new Date().toISOString(),
    stale: base?.stale ?? false,
  }
}

const loadFromStorage = (
  persist: boolean,
  createDefaultFilters: () => FilterState
): SessionState => {
  const defaultSession = buildSession('Session 1', createDefaultFilters)

  if (!persist || typeof window === 'undefined') {
    return {
      sessions: [defaultSession],
      activeSessionId: defaultSession.id,
      restoredFromStorage: false,
    }
  }

  const raw = window.localStorage.getItem(SEARCH_SESSION_STORAGE_KEY)
  if (!raw) {
    return {
      sessions: [defaultSession],
      activeSessionId: defaultSession.id,
      restoredFromStorage: false,
    }
  }

  try {
    const parsed = JSON.parse(raw) as StoredSearchSessionState
    if (
      parsed.version !== SEARCH_SESSION_STORAGE_VERSION ||
      !parsed.sessions ||
      parsed.sessions.length === 0
    ) {
      return {
        sessions: [defaultSession],
        activeSessionId: defaultSession.id,
        restoredFromStorage: false,
      }
    }

    const restoredSessions = parsed.sessions.map((session, index) =>
      buildSession(
        session.name ?? `Session ${index + 1}`,
        createDefaultFilters,
        {
          ...session,
          stale: true,
        }
      )
    )

    const activeSessionId =
      parsed.activeSessionId &&
      restoredSessions.some(s => s.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : restoredSessions[0].id

    return {
      sessions: restoredSessions,
      activeSessionId,
      restoredFromStorage: true,
    }
  } catch {
    return {
      sessions: [defaultSession],
      activeSessionId: defaultSession.id,
      restoredFromStorage: false,
    }
  }
}

export function useSearchSessions(
  persist: boolean,
  createDefaultFilters: () => FilterState
): UseSearchSessionsResult {
  const defaultFiltersRef = useRef(createDefaultFilters)
  const [state, setState] = useState<SessionState>(() =>
    loadFromStorage(persist, defaultFiltersRef.current)
  )

  const activeSession = useMemo(
    () => state.sessions.find(session => session.id === state.activeSessionId),
    [state.activeSessionId, state.sessions]
  )

  useEffect(() => {
    if (!persist || typeof window === 'undefined') {
      return
    }
    const payload: StoredSearchSessionState = {
      version: SEARCH_SESSION_STORAGE_VERSION,
      activeSessionId: state.activeSessionId,
      sessions: state.sessions.map(session => ({
        ...session,
        filters: cloneFilters(session.filters),
        timeWindow: { ...session.timeWindow },
      })),
    }
    window.localStorage.setItem(
      SEARCH_SESSION_STORAGE_KEY,
      JSON.stringify(payload)
    )
  }, [persist, state.activeSessionId, state.sessions])

  const selectSession = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      activeSessionId: id,
    }))
  }, [])

  const addSession = useCallback(() => {
    setState(prev => {
      const label = `Session ${prev.sessions.length + 1}`
      const next = buildSession(label, defaultFiltersRef.current)
      return {
        ...prev,
        sessions: [...prev.sessions, next],
        activeSessionId: next.id,
        restoredFromStorage: prev.restoredFromStorage,
      }
    })
  }, [])

  const closeSession = useCallback((id: string) => {
    setState(prev => {
      if (prev.sessions.length === 1) {
        const replacement = buildSession('Session 1', defaultFiltersRef.current)
        return {
          sessions: [replacement],
          activeSessionId: replacement.id,
          restoredFromStorage: prev.restoredFromStorage,
        }
      }

      const remaining = prev.sessions.filter(session => session.id !== id)
      const nextActive =
        prev.activeSessionId === id ? remaining[0].id : prev.activeSessionId

      return {
        ...prev,
        sessions: remaining,
        activeSessionId: nextActive,
      }
    })
  }, [])

  const updateActiveSession = useCallback((updates: Partial<SearchSession>) => {
    setState(prev => {
      const nextSessions = prev.sessions.map(session => {
        if (session.id !== prev.activeSessionId) {
          return session
        }

        const mergedFilters = updates.filters
          ? cloneFilters(updates.filters)
          : session.filters

        return {
          ...session,
          ...updates,
          filters: mergedFilters,
          timeWindow: normalizeTimeWindow(updates.timeWindow, mergedFilters),
          lastUpdated: updates.lastUpdated ?? new Date().toISOString(),
        }
      })

      return { ...prev, sessions: nextSessions }
    })
  }, [])

  const duplicateSession = useCallback((id: string) => {
    setState(prev => {
      const source = prev.sessions.find(session => session.id === id)
      if (!source) {
        return prev
      }
      const copy = buildSession(
        `${source.name} Copy`,
        defaultFiltersRef.current,
        {
          ...source,
          id: undefined,
          stale: false,
        }
      )
      return {
        ...prev,
        sessions: [...prev.sessions, copy],
        activeSessionId: copy.id,
      }
    })
  }, [])

  const resetSession = useCallback((id: string) => {
    setState(prev => {
      const nextSessions = prev.sessions.map(session =>
        session.id === id
          ? buildSession(session.name, defaultFiltersRef.current, {
              id: session.id,
            })
          : session
      )
      return { ...prev, sessions: nextSessions }
    })
  }, [])

  const importSession = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw)
      const sessionPayload: Partial<SearchSession> =
        (parsed as StoredSearchSessionState).sessions?.[0] ||
        parsed.session ||
        parsed

      const imported = buildSession(
        sessionPayload.name || 'Imported Session',
        defaultFiltersRef.current,
        { ...sessionPayload, stale: true }
      )

      setState(prev => ({
        ...prev,
        sessions: [...prev.sessions, imported],
        activeSessionId: imported.id,
      }))
      return true
    } catch (e) {
      console.warn('Failed to import search session', e)
      return false
    }
  }, [])

  const exportSession = useCallback(
    (id: string) => {
      const session = state.sessions.find(s => s.id === id)
      if (!session) {
        return ''
      }
      const payload = {
        version: SEARCH_SESSION_STORAGE_VERSION,
        session,
      }
      const json = JSON.stringify(payload, null, 2)
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        navigator.clipboard.writeText(json).catch(() => {
          /* non-blocking */
        })
      }
      return json
    },
    [state.sessions]
  )

  const markSessionRefreshed = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(session =>
        session.id === id
          ? {
              ...session,
              stale: false,
              lastUpdated: new Date().toISOString(),
            }
          : session
      ),
    }))
  }, [])

  return {
    sessions: state.sessions,
    activeSession,
    activeSessionId: state.activeSessionId,
    restoredFromStorage: state.restoredFromStorage,
    addSession,
    closeSession,
    selectSession,
    duplicateSession,
    resetSession,
    updateActiveSession,
    importSession,
    exportSession,
    markSessionRefreshed,
  }
}
