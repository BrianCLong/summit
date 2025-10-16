import { useEffect, useRef, useState, useCallback } from 'react'

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
}

export interface WebSocketConfig {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  reconnectAttempts: number
  lastMessage: WebSocketMessage | null
}

export function useWebSocketUpdates(config: WebSocketConfig = {}) {
  const {
    url = process.env.NODE_ENV === 'development'
      ? 'ws://localhost:3001/ws/maestro'
      : `wss://${window.location.host}/ws/maestro`,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
  } = config

  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
    lastMessage: null,
  })

  const [listeners, setListeners] = useState<
    Map<string, Set<(data: any) => void>>
  >(new Map())

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }

    heartbeatRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })
        )
      }
    }, heartbeatInterval)
  }, [heartbeatInterval])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('Maestro WebSocket connected')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        }))
        startHeartbeat()

        // Subscribe to updates on connection
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            topics: [
              'run_updates',
              'approval_requests',
              'router_decisions',
              'system_alerts',
            ],
          })
        )
      }

      ws.onmessage = event => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)

          setState(prev => ({
            ...prev,
            lastMessage: message,
          }))

          // Dispatch to type-specific listeners
          const typeListeners = listeners.get(message.type)
          if (typeListeners) {
            typeListeners.forEach(callback => {
              try {
                callback(message.payload)
              } catch (error) {
                console.error(
                  `Error in WebSocket listener for type ${message.type}:`,
                  error
                )
              }
            })
          }

          // Dispatch to 'all' listeners
          const allListeners = listeners.get('*')
          if (allListeners) {
            allListeners.forEach(callback => {
              try {
                callback(message)
              } catch (error) {
                console.error('Error in WebSocket wildcard listener:', error)
              }
            })
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = error => {
        console.error('Maestro WebSocket error:', error)
        setState(prev => ({
          ...prev,
          error: 'WebSocket connection error',
          isConnecting: false,
        }))
      }

      ws.onclose = event => {
        console.log('Maestro WebSocket disconnected:', event.code, event.reason)
        stopHeartbeat()

        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error:
            event.code === 1000
              ? null
              : `Connection closed: ${event.reason || event.code}`,
        }))

        // Attempt to reconnect if not a clean closure
        if (
          event.code !== 1000 &&
          state.reconnectAttempts < maxReconnectAttempts
        ) {
          setState(prev => ({
            ...prev,
            reconnectAttempts: prev.reconnectAttempts + 1,
          }))

          reconnectTimeoutRef.current = setTimeout(
            () => {
              connect()
            },
            reconnectInterval * Math.pow(1.5, state.reconnectAttempts)
          )
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
        isConnecting: false,
      }))
    }
  }, [
    url,
    state.reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    listeners,
    startHeartbeat,
    stopHeartbeat,
  ])

  const disconnect = useCallback(() => {
    stopHeartbeat()

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
      lastMessage: null,
    })
  }, [stopHeartbeat])

  const send = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    console.warn('WebSocket not connected, cannot send message:', message)
    return false
  }, [])

  const subscribe = useCallback(
    (messageType: string, callback: (data: any) => void) => {
      setListeners(prev => {
        const newListeners = new Map(prev)
        if (!newListeners.has(messageType)) {
          newListeners.set(messageType, new Set())
        }
        newListeners.get(messageType)!.add(callback)
        return newListeners
      })

      // Return unsubscribe function
      return () => {
        setListeners(prev => {
          const newListeners = new Map(prev)
          const typeListeners = newListeners.get(messageType)
          if (typeListeners) {
            typeListeners.delete(callback)
            if (typeListeners.size === 0) {
              newListeners.delete(messageType)
            }
          }
          return newListeners
        })
      }
    },
    []
  )

  // Auto-connect on mount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, []) // Empty dependency to only run on mount/unmount

  return {
    ...state,
    connect,
    disconnect,
    send,
    subscribe,
  }
}

// Specialized hooks for common update types
export function useRunUpdates(runId?: string) {
  const ws = useWebSocketUpdates()
  const [runs, setRuns] = useState<Record<string, any>>({})

  useEffect(() => {
    const unsubscribe = ws.subscribe('run_update', data => {
      if (!runId || data.runId === runId) {
        setRuns(prev => ({
          ...prev,
          [data.runId]: { ...prev[data.runId], ...data },
        }))
      }
    })

    return unsubscribe
  }, [ws, runId])

  return {
    runs: runId ? runs[runId] : runs,
    isConnected: ws.isConnected,
  }
}

export function useApprovalUpdates() {
  const ws = useWebSocketUpdates()
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])

  useEffect(() => {
    const unsubscribeRequests = ws.subscribe('approval_request', data => {
      setPendingApprovals(prev => [...prev, data])
    })

    const unsubscribeResponses = ws.subscribe('approval_response', data => {
      setPendingApprovals(prev =>
        prev.filter(
          approval =>
            !(approval.runId === data.runId && approval.stepId === data.stepId)
        )
      )
    })

    return () => {
      unsubscribeRequests()
      unsubscribeResponses()
    }
  }, [ws])

  return {
    pendingApprovals,
    isConnected: ws.isConnected,
  }
}

export function useSystemAlerts() {
  const ws = useWebSocketUpdates()
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = ws.subscribe('system_alert', data => {
      setAlerts(prev => [data, ...prev.slice(0, 99)]) // Keep last 100 alerts
    })

    return unsubscribe
  }, [ws])

  return {
    alerts,
    isConnected: ws.isConnected,
    clearAlerts: () => setAlerts([]),
  }
}
