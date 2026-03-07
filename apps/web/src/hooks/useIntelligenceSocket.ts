import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface IntelligenceItem {
  id: string
  timestamp: number
  source: string
  type: 'social' | 'darkweb' | 'news' | 'signal'
  content: string
  metadata: Record<string, any>
  threatScore: number
  targetId?: string
}

export interface IntelligenceAlert {
  id: string
  timestamp: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  items: string[]
  status: 'active' | 'investigating' | 'resolved'
}

export function useIntelligenceSocket(targetId: string = 'global') {
  const [items, setItems] = useState<IntelligenceItem[]>([])
  const [alerts, setAlerts] = useState<IntelligenceAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Reset state when target changes
    setItems([])
    setAlerts([])

    // Initialize socket connection
    const socket = io('/realtime', {
      path: '/socket.io', // Ensure this matches server config if needed, default is /socket.io
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Connected to Intelligence Realtime Stream')
      setIsConnected(true)
      socket.emit('intelligence:subscribe', { targetId })
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from Intelligence Realtime Stream')
      setIsConnected(false)
    })

    socket.on('intelligence:item', (item: IntelligenceItem) => {
      setItems(prev => [item, ...prev].slice(0, 100)) // Keep last 100 items
    })

    socket.on('intelligence:alert', (alert: IntelligenceAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50)) // Keep last 50 alerts
    })

    return () => {
      socket.emit('intelligence:unsubscribe', { targetId })
      socket.disconnect()
    }
  }, [targetId])

  const clearItems = useCallback(() => setItems([]), [])
  const clearAlerts = useCallback(() => setAlerts([]), [])

  return {
    items,
    alerts,
    isConnected,
    clearItems,
    clearAlerts,
  }
}
