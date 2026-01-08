import { useEffect, useRef, useState, useCallback } from 'react'
import { useSocketStore, PresenceInfo } from '../lib/socket'
import throttle from 'lodash/throttle'

interface UseCollaborationOptions {
  room: string
  username?: string
  onMessage?: (message: any) => void
}

interface CursorPosition {
  x: number
  y: number
  userId: string
  username?: string
}

export function useCollaboration({
  room,
  username,
  onMessage,
}: UseCollaborationOptions) {
  const { socket, isConnected } = useSocketStore()
  const [presence, setPresence] = useState<PresenceInfo[]>([])
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({})
  const [joined, setJoined] = useState(false)

  // Use ref for callback to avoid stale closures and re-subscriptions
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  // Throttled cursor emitter
  // Note: Consumers should prefer emitting relative coordinates (0-1)
  // rather than absolute pixels to handle different screen sizes.
  const emitCursorMove = useCallback(
    throttle((x: number, y: number) => {
      if (socket && isConnected && joined) {
        socket.emit('collaboration:cursor_move', { room, x, y, username })
      }
    }, 50), // 50ms throttle = 20fps
    [socket, isConnected, joined, room, username]
  )

  useEffect(() => {
    if (!socket || !isConnected) return

    // Join room
    socket.emit(
      'room:join',
      { room, metadata: { username } },
      (response: any) => {
        if (response?.success) {
          setJoined(true)
          // Query initial presence
          socket.emit(
            'query:presence',
            { room },
            (res: { presence: PresenceInfo[] }) => {
              if (res?.presence) {
                setPresence(res.presence)
              }
            }
          )
        }
      }
    )

    // Listeners
    const handlePresenceUpdate = (data: {
      room: string
      presence: PresenceInfo[]
    }) => {
      if (data.room === room) {
        setPresence(data.presence)

        // Cleanup cursors for users who are no longer present
        const activeUserIds = new Set(data.presence.map(p => p.userId))
        setCursors(prev => {
          const next = { ...prev }
          let changed = false
          Object.keys(next).forEach(userId => {
            if (!activeUserIds.has(userId)) {
              delete next[userId]
              changed = true
            }
          })
          return changed ? next : prev
        })
      }
    }

    const handleCursorUpdate = (data: {
      userId: string
      x: number
      y: number
      username?: string
    }) => {
      setCursors(prev => ({
        ...prev,
        [data.userId]: {
          userId: data.userId,
          x: data.x,
          y: data.y,
          username: data.username,
        },
      }))
    }

    const handleMessage = (data: any) => {
      if (onMessageRef.current) {
        onMessageRef.current(data)
      }
    }

    socket.on('presence:update', handlePresenceUpdate)
    socket.on('collaboration:cursor_update', handleCursorUpdate)
    socket.on('room:message', handleMessage)

    return () => {
      socket.off('presence:update', handlePresenceUpdate)
      socket.off('collaboration:cursor_update', handleCursorUpdate)
      socket.off('room:message', handleMessage)
      socket.emit('room:leave', { room })
      setJoined(false)
    }
  }, [socket, isConnected, room, username])

  return {
    presence,
    cursors: Object.values(cursors),
    joined,
    emitCursorMove,
  }
}
