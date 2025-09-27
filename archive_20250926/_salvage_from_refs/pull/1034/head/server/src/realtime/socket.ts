import { Server, Socket } from 'socket.io';
import { verifyToken } from '../lib/auth.js'; // Assuming auth.ts has verifyToken
import pino from 'pino';

const logger = pino();

let connections = 0;
let presenceDisabled = false;
const maxConnections = Number(process.env.PRESENCE_MAX_CONNECTIONS || 10000);

let ioInstance: Server | null = null;

interface UserSocket extends Socket {
  user?: any; // Define a more specific user type if available
}

export function initSocket(httpServer: any): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  });

  // Namespace for realtime graph/AI
  const ns = io.of('/realtime');
  
  ns.use(async (socket: UserSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const user = await verifyToken(token); // Use the verifyToken from auth.ts
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch (e: any) { 
      logger.error({ error: e.message }, 'Socket.IO authentication error');
      next(new Error('Unauthorized')); 
    }
  });

  ns.on('connection', (socket: UserSocket) => {
    logger.info(`Realtime connected ${socket.id}`);
    connections += 1;
    if (connections > maxConnections && !presenceDisabled) {
      presenceDisabled = true;
      ns.emit('presence_disabled', { reason: 'load_shed', maxConnections });
    }
    if (!presenceDisabled) {
      // announce join
      ns.emit('presence:join', { userId: socket.user?.id, sid: socket.id, ts: Date.now() });
    }
    socket.on('join_ai_entity', ({ entityId }: { entityId: string }) => {
      // add any RBAC validation here if required
      if (!entityId) return;
      socket.join(`ai:entity:${entityId}`);
    });
    socket.on('leave_ai_entity', ({ entityId }: { entityId: string }) => {
      if (!entityId) return;
      socket.leave(`ai:entity:${entityId}`);
    });
    socket.on('disconnect', () => {
      connections = Math.max(0, connections - 1);
      if (presenceDisabled && connections < Math.floor(maxConnections * 0.9)) {
        presenceDisabled = false;
        ns.emit('presence_enabled', { reason: 'load_normalized' });
      }
      if (!presenceDisabled) {
        ns.emit('presence:leave', { userId: socket.user?.id, sid: socket.id, ts: Date.now() });
      }
      logger.info(`Realtime disconnect ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): Server | null { return ioInstance; }