import React, { createContext, useContext, useRef, useCallback } from 'react'

type StateGetter = () => any
type StateRestorer = (data: any) => void

interface Handler {
  get: StateGetter
  restore: StateRestorer
}

interface SnapshotContextType {
  register: (id: string, handler: Handler) => () => void
  captureAll: () => Record<string, any>
  restoreAll: (data: Record<string, any>) => void
}

const SnapshotContext = createContext<SnapshotContextType | null>(null)

export function SnapshotProvider({ children }: { children: React.ReactNode }) {
  const handlers = useRef<Map<string, Handler>>(new Map())

  const register = useCallback((id: string, handler: Handler) => {
    handlers.current.set(id, handler)
    return () => {
      handlers.current.delete(id)
    }
  }, [])

  const captureAll = useCallback(() => {
    const data: Record<string, any> = {}
    handlers.current.forEach((handler, id) => {
      try {
        data[id] = handler.get()
      } catch (e) {
        console.error(`Failed to capture snapshot for ${id}`, e)
      }
    })
    return data
  }, [])

  const restoreAll = useCallback((data: Record<string, any>) => {
    Object.entries(data).forEach(([id, componentState]) => {
      const handler = handlers.current.get(id)
      if (handler) {
        try {
          handler.restore(componentState)
        } catch (e) {
          console.error(`Failed to restore snapshot for ${id}`, e)
        }
      }
    })
  }, [])

  return (
    <SnapshotContext.Provider value={{ register, captureAll, restoreAll }}>
      {children}
    </SnapshotContext.Provider>
  )
}

export function useSnapshotContext() {
  const ctx = useContext(SnapshotContext)
  if (!ctx) {
    throw new Error('useSnapshotContext must be used within a SnapshotProvider')
  }
  return ctx
}

export function useSnapshotHandler(
  id: string,
  get: StateGetter,
  restore: StateRestorer
) {
  const { register } = useSnapshotContext()

  // We use a ref to keep track of the latest get/restore functions
  // without triggering re-registration on every render
  const currentHandler = useRef({ get, restore })

  React.useEffect(() => {
    currentHandler.current = { get, restore }
  }, [get, restore])

  React.useEffect(() => {
    return register(id, {
      get: () => currentHandler.current.get(),
      restore: (data) => currentHandler.current.restore(data),
    })
  }, [id, register])
}
