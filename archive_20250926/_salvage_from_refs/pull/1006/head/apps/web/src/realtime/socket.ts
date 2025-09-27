import { io, Socket } from 'socket.io-client'
import {
  RT_NS,
  EVT,
  GraphMutatePayload,
  PresencePayload,
} from '@intelgraph/contracts/src/realtime'

let sock: Socket | null = null
export function getSocket() {
  if (!sock)
    sock = io(`${location.origin}${RT_NS.COLLAB}`, {
      path: '/ws',
      withCredentials: true,
    })
  return sock
}

export { EVT, GraphMutatePayload, PresencePayload }
