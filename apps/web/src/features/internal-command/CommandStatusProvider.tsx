/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import React from 'react'
import type { PropsWithChildren } from 'react'
import { initialState, statusEndpoints, statusReducer } from './state'
import type { StatusKey, StatusResponse, StatusState } from './types'

export interface CommandStatusContextValue {
  state: StatusState
  refresh: () => void
}

const CommandStatusContext = React.createContext<
  CommandStatusContextValue | undefined
>(undefined)

const fetchStatus = async (
  key: StatusKey,
  signal?: AbortSignal
): Promise<StatusResponse> => {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('auth_token')
      : undefined
  const response = await fetch(statusEndpoints[key], {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    throw new Error(`Failed to load ${key} status (${response.status})`)
  }
  const data = await response.json()
  return data as StatusResponse
}

export function CommandStatusProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = React.useReducer(statusReducer, initialState)

  const load = React.useCallback(() => {
    const controller = new AbortController()
    dispatch({ type: 'FETCH_START' })(
      Object.keys(statusEndpoints) as StatusKey[]
    ).forEach(async key => {
      try {
        const payload = await fetchStatus(key, controller.signal)
        dispatch({ type: 'FETCH_SUCCESS', key, payload })
      } catch (error) {
        dispatch({
          type: 'FETCH_FAILURE',
          key,
          error: (error as Error)?.message || 'Unknown error',
        })
      }
    })

    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    const abort = load()
    return abort
  }, [load])

  const value = React.useMemo(() => ({ state, refresh: load }), [state, load])

  return (
    <CommandStatusContext.Provider value={value}>
      {children}
    </CommandStatusContext.Provider>
  )
}

export const useCommandStatusContext = () => {
  const ctx = React.useContext(CommandStatusContext)
  if (!ctx) {
    throw new Error(
      'useCommandStatusContext must be used within CommandStatusProvider'
    )
  }
  return ctx
}
