import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { ORSet, LWWRegister } from '../lib/crdt'

// Use a known environment variable for WS URL or default
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

interface UserCursor {
  connectionId: string
  userId: string
  x: number
  y: number
  username?: string
  lastUpdate: number
}

export interface Annotation {
  id: string
  text: string
  x: number
  y: number
  author: string
  createdAt: number
}

interface CollaborationState {
  cursors: Map<string, UserCursor>
  annotations: ORSet<Annotation>
  filter: LWWRegister<any>
}

export function useCollaborativeWorkspace(
  roomId: string,
  userId: string,
  username?: string
) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [cursors, setCursors] = useState<Map<string, UserCursor>>(new Map())

  // CRDTs - using refs to maintain state across renders without causing re-renders themselves until we explicitly sync
  // However, for React to update, we need state. We'll use refs for the CRDT instances and state for their values.
  const annotationsRef = useRef<ORSet<Annotation>>(
    new ORSet<Annotation>(userId)
  )
  const filterRef = useRef<LWWRegister<any>>(new LWWRegister<any>(userId, {}))

  const [annotations, setAnnotations] = useState<Set<Annotation>>(new Set())
  const [filter, setFilter] = useState<any>({})

  // Initialize socket
  useEffect(() => {
    // In a real app, you might want to reuse a socket from a context
    const newSocket = io(WS_URL, {
      transports: ['websocket'],
      auth: {
        // In a real app, token would go here
      },
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      newSocket.emit('room:join', { room: roomId })
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [roomId])

  // Handle incoming events
  useEffect(() => {
    if (!socket) return

    const handleCursorUpdate = (data: {
      connectionId: string
      userId: string
      x: number
      y: number
      username?: string
    }) => {
      // Don't show own cursor
      if (data.userId === userId) return

      setCursors(prev => {
        const next = new Map(prev)
        next.set(data.connectionId, {
          ...data,
          lastUpdate: Date.now(),
        })
        return next
      })
    }

    const handleAnnotationAdd = (data: { annotation: any }) => {
      // Ideally we receive the CRDT op or the full object.
      // For simplicity, we assume we receive the annotation object and add it to our CRDT.
      // In a full CRDT sync, we'd exchange state vectors.
      // Here we trust the broadcast event.
      annotationsRef.current.add(data.annotation)
      setAnnotations(annotationsRef.current.value)
    }

    const handleAnnotationRemove = (data: { annotationId: string }) => {
      // Find the annotation object by ID (CRDT set stores objects)
      // This is a limitation of this simple Set CRDT, we need the object reference.
      // We'll iterate to find it.
      const set = annotationsRef.current.value
      let target: Annotation | undefined
      for (const item of set) {
        if (item.id === data.annotationId) {
          target = item
          break
        }
      }
      if (target) {
        annotationsRef.current.remove(target)
        setAnnotations(annotationsRef.current.value)
      }
    }

    const handleFilterUpdate = (data: { filter: any }) => {
      filterRef.current.set(data.filter)
      setFilter(filterRef.current.value)
    }

    socket.on('collaboration:cursor_update', handleCursorUpdate)
    socket.on('collaboration:annotation_add', handleAnnotationAdd)
    socket.on('collaboration:annotation_remove', handleAnnotationRemove)
    socket.on('collaboration:filter_update', handleFilterUpdate)

    return () => {
      socket.off('collaboration:cursor_update', handleCursorUpdate)
      socket.off('collaboration:annotation_add', handleAnnotationAdd)
      socket.off('collaboration:annotation_remove', handleAnnotationRemove)
      socket.off('collaboration:filter_update', handleFilterUpdate)
    }
  }, [socket, userId])

  // Actions
  const sendCursorMove = useCallback(
    (x: number, y: number) => {
      if (socket && isConnected) {
        socket.emit('collaboration:cursor_move', {
          room: roomId,
          x,
          y,
          username,
        })
      }
    },
    [socket, isConnected, roomId, username]
  )

  const addAnnotation = useCallback(
    (annotation: Annotation) => {
      annotationsRef.current.add(annotation)
      setAnnotations(annotationsRef.current.value)
      if (socket && isConnected) {
        socket.emit('collaboration:annotation_add', {
          room: roomId,
          annotation,
        })
      }
    },
    [socket, isConnected, roomId]
  )

  const removeAnnotation = useCallback(
    (annotationId: string) => {
      const set = annotationsRef.current.value
      let target: Annotation | undefined
      for (const item of set) {
        if (item.id === annotationId) {
          target = item
          break
        }
      }
      if (target) {
        annotationsRef.current.remove(target)
        setAnnotations(annotationsRef.current.value)
        if (socket && isConnected) {
          socket.emit('collaboration:annotation_remove', {
            room: roomId,
            annotationId,
          })
        }
      }
    },
    [socket, isConnected, roomId]
  )

  const updateFilter = useCallback(
    (newFilter: any) => {
      filterRef.current.set(newFilter)
      setFilter(filterRef.current.value)
      if (socket && isConnected) {
        socket.emit('collaboration:filter_update', {
          room: roomId,
          filter: newFilter,
        })
      }
    },
    [socket, isConnected, roomId]
  )

  return {
    isConnected,
    cursors,
    annotations,
    filter,
    sendCursorMove,
    addAnnotation,
    removeAnnotation,
    updateFilter,
  }
}
