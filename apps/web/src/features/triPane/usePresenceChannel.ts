import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import throttle from 'lodash/throttle'

type CursorPosition = {
  x: number
  y: number
}

export type PresenceChannelSelection = {
  pane: 'graph' | 'timeline' | 'map'
  id: string
  label?: string
}

export type PresenceChannelMember = {
  userId: string
  userName: string
  workspaceId: string
  channel: string
  status: 'online' | 'away'
  lastActive: number
  cursor?: CursorPosition
  selection?: string
}

type PresenceChannelOptions = {
  workspaceId: string
  channel: string
  userId: string
  userName: string
  token?: string
  url?: string
}

type PresenceChannelUpdate = {
  cursor?: CursorPosition
  selection?: PresenceChannelSelection
  status?: 'online' | 'away'
}

const defaultSocketUrl = () =>
  import.meta.env.VITE_WS_URL || window.location.origin

export const usePresenceChannel = ({
  workspaceId,
  channel,
  userId,
  userName,
  token,
  url,
}: PresenceChannelOptions) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [members, setMembers] = useState<Map<string, PresenceChannelMember>>(
    new Map()
  )
  const pendingSelection = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!workspaceId || !channel || !userId) return

    const socketUrl = url ?? defaultSocketUrl()
    const nextSocket = io(`${socketUrl}/collaboration`, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined,
    })

    setSocket(nextSocket)

    const handleConnect = () => {
      setIsConnected(true)
      nextSocket.emit('presence:channel:join', {
        workspaceId,
        channel,
        userId,
        userName,
      })
    }

    const handleDisconnect = () => {
      setIsConnected(false)
      setMembers(new Map())
    }

    const handleSnapshot = (payload: {
      workspaceId: string
      channel: string
      members: PresenceChannelMember[]
    }) => {
      if (payload.workspaceId !== workspaceId || payload.channel !== channel) {
        return
      }
      const next = new Map<string, PresenceChannelMember>()
      payload.members.forEach(member => {
        next.set(member.userId, member)
      })
      setMembers(next)
    }

    const handleJoined = (payload: PresenceChannelMember) => {
      if (payload.workspaceId !== workspaceId || payload.channel !== channel) {
        return
      }
      setMembers(prev => {
        const next = new Map(prev)
        next.set(payload.userId, payload)
        return next
      })
    }

    const handleLeft = (payload: {
      userId: string
      workspaceId: string
      channel: string
    }) => {
      if (payload.workspaceId !== workspaceId || payload.channel !== channel) {
        return
      }
      setMembers(prev => {
        const next = new Map(prev)
        next.delete(payload.userId)
        return next
      })
    }

    const handleUpdate = (payload: PresenceChannelMember) => {
      if (payload.workspaceId !== workspaceId || payload.channel !== channel) {
        return
      }
      setMembers(prev => {
        const next = new Map(prev)
        next.set(payload.userId, payload)
        return next
      })
    }

    nextSocket.on('connect', handleConnect)
    nextSocket.on('disconnect', handleDisconnect)
    nextSocket.on('presence:channel:snapshot', handleSnapshot)
    nextSocket.on('presence:channel:joined', handleJoined)
    nextSocket.on('presence:channel:left', handleLeft)
    nextSocket.on('presence:channel:update', handleUpdate)

    return () => {
      nextSocket.emit('presence:channel:leave')
      nextSocket.off('connect', handleConnect)
      nextSocket.off('disconnect', handleDisconnect)
      nextSocket.off('presence:channel:snapshot', handleSnapshot)
      nextSocket.off('presence:channel:joined', handleJoined)
      nextSocket.off('presence:channel:left', handleLeft)
      nextSocket.off('presence:channel:update', handleUpdate)
      nextSocket.disconnect()
    }
  }, [workspaceId, channel, userId, userName, token, url])

  const emitPresenceUpdate = useMemo(
    () =>
      throttle((update: PresenceChannelUpdate) => {
        if (!socket || !isConnected) return
        const selection = update.selection
          ? JSON.stringify(update.selection)
          : pendingSelection.current

        if (selection) {
          pendingSelection.current = selection
        }

        socket.emit('presence:channel:update', {
          workspaceId,
          channel,
          cursor: update.cursor,
          selection,
          status: update.status,
        })
      }, 80),
    [socket, isConnected, workspaceId, channel]
  )

  useEffect(() => {
    return () => {
      emitPresenceUpdate.cancel()
    }
  }, [emitPresenceUpdate])

  const cursors = useMemo(
    () =>
      Array.from(members.values())
        .filter(member => member.userId !== userId && member.cursor)
        .map(member => ({
          userId: member.userId,
          x: member.cursor!.x,
          y: member.cursor!.y,
          username: member.userName,
        })),
    [members, userId]
  )

  return {
    isConnected,
    members,
    cursors,
    emitPresenceUpdate,
  }
}
