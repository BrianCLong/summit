import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export interface MaestroRunStatusUpdate {
  runId: string
  status?: string
  timestamp?: number
}

interface UseMaestroRunSocketOptions {
  runId?: string | null
  onStatus?: (update: MaestroRunStatusUpdate) => void
}

export function useMaestroRunSocket({
  runId,
  onStatus,
}: UseMaestroRunSocketOptions) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const socket = io('/realtime', {
      path: '/socket.io',
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      if (runId) {
        socket.emit('maestro:subscribe_run', { runId })
      }
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('maestro:status_change', (payload: MaestroRunStatusUpdate) => {
      if (!runId || payload.runId !== runId) return
      onStatus?.(payload)
    })

    socket.on('maestro:run_update', (payload: MaestroRunStatusUpdate) => {
      if (!runId || payload.runId !== runId) return
      onStatus?.(payload)
    })

    return () => {
      if (runId) {
        socket.emit('maestro:unsubscribe_run', { runId })
      }
      socket.disconnect()
    }
  }, [runId, onStatus])

  return { connected }
}
