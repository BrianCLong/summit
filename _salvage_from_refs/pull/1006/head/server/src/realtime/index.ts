import { Server } from 'socket.io';
import { createAdapter } from './adapter.js';
import {
  RT_NS,
  EVT,
  PresencePayload,
  GraphMutatePayload,
} from '../../../packages/contracts/src/realtime.js';

export function attachRealtime(httpServer: import('http').Server) {
  const io = new Server(httpServer, {
    path: '/ws',
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
      credentials: true,
    },
  });
  io.adapter(createAdapter());

  const collab = io.of(RT_NS.COLLAB);
  collab.on('connection', (socket) => {
    socket.on(EVT.PRESENCE, (msg: PresencePayload) => socket.broadcast.emit(EVT.PRESENCE, msg));
    socket.on(EVT.GRAPH_MUT, (msg: GraphMutatePayload) =>
      socket.broadcast.emit(EVT.GRAPH_MUT, msg),
    );
  });
  return io;
}
