import { io, Socket } from 'socket.io-client'
import { create } from 'zustand'

// Types (should match backend)
export interface PresenceInfo {
  userId: string
  username?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  lastSeen: number
  metadata?: Record<string, unknown>
}

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  error: string | null
  connect: (token: string, url?: string) => void
  disconnect: () => void
}

// Socket store for global access
export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  error: null,

  connect: (token: string, url?: string) => {
    const { socket } = get()
    if (socket?.connected) return

    const socketUrl =
      url || import.meta.env.VITE_WS_URL || 'http://localhost:3001'

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      set({ isConnected: true, error: null })
    })

    newSocket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason)
      set({ isConnected: false })
    })

    newSocket.on('connect_error', err => {
      console.error('Socket connection error:', err)
      set({ error: err.message })
    })

    set({ socket: newSocket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },
}))

// Helper to get socket instance
export const getSocket = (): Socket | null => useSocketStore.getState().socket
