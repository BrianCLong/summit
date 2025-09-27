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
    logger.info(`Realtime connected ${socket.id} for user ${socket.user?.id}`);
    connections += 1;
    
    if (connections > maxConnections && !presenceDisabled) {
      presenceDisabled = true;
      ns.emit('presence_disabled', { reason: 'load_shed', maxConnections });
    }
    
    if (!presenceDisabled) {
      // Announce user presence
      ns.emit('presence:join', { 
        userId: socket.user?.id, 
        username: socket.user?.username || socket.user?.email,
        sid: socket.id, 
        ts: Date.now() 
      });
    }

    // Graph collaboration events
    socket.on('join_graph', ({ graphId }: { graphId: string }) => {
      if (!graphId) return;
      socket.join(`graph:${graphId}`);
      socket.to(`graph:${graphId}`).emit('user_joined_graph', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        ts: Date.now()
      });
    });

    socket.on('leave_graph', ({ graphId }: { graphId: string }) => {
      if (!graphId) return;
      socket.leave(`graph:${graphId}`);
      socket.to(`graph:${graphId}`).emit('user_left_graph', {
        userId: socket.user?.id,
        ts: Date.now()
      });
    });

    // Live cursor tracking
    socket.on('cursor_move', ({ graphId, position, viewport }: { 
      graphId: string, position: { x: number, y: number }, viewport?: any 
    }) => {
      if (!graphId) return;
      socket.to(`graph:${graphId}`).emit('cursor_update', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        position,
        viewport,
        ts: Date.now()
      });
    });

    // Real-time entity selection
    socket.on('entity_select', ({ graphId, entityId }: { graphId: string, entityId: string }) => {
      if (!graphId || !entityId) return;
      socket.to(`graph:${graphId}`).emit('entity_selected', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        entityId,
        ts: Date.now()
      });
    });

    socket.on('entity_deselect', ({ graphId, entityId }: { graphId: string, entityId: string }) => {
      if (!graphId || !entityId) return;
      socket.to(`graph:${graphId}`).emit('entity_deselected', {
        userId: socket.user?.id,
        entityId,
        ts: Date.now()
      });
    });

    // Real-time entity updates
    socket.on('entity_update', ({ graphId, entityId, changes }: { 
      graphId: string, entityId: string, changes: any 
    }) => {
      if (!graphId || !entityId) return;
      socket.to(`graph:${graphId}`).emit('entity_updated', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        entityId,
        changes,
        ts: Date.now()
      });
    });

    // Investigation collaboration
    socket.on('join_investigation', ({ investigationId }: { investigationId: string }) => {
      if (!investigationId) return;
      socket.join(`investigation:${investigationId}`);
      socket.to(`investigation:${investigationId}`).emit('user_joined_investigation', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        ts: Date.now()
      });
    });

    // Timeline collaboration
    socket.on('timeline_event_add', ({ investigationId, event }: { 
      investigationId: string, event: any 
    }) => {
      if (!investigationId) return;
      socket.to(`investigation:${investigationId}`).emit('timeline_event_added', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        event,
        ts: Date.now()
      });
    });

    // Comments and annotations
    socket.on('comment_add', ({ entityId, comment }: { entityId: string, comment: any }) => {
      if (!entityId) return;
      ns.emit('comment_added', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        entityId,
        comment,
        ts: Date.now()
      });
    });

    // AI analysis updates
    socket.on('join_ai_entity', ({ entityId }: { entityId: string }) => {
      if (!entityId) return;
      socket.join(`ai:entity:${entityId}`);
    });

    socket.on('leave_ai_entity', ({ entityId }: { entityId: string }) => {
      if (!entityId) return;
      socket.leave(`ai:entity:${entityId}`);
    });

    // Typing indicators
    socket.on('typing_start', ({ graphId, location }: { graphId: string, location: string }) => {
      if (!graphId) return;
      socket.to(`graph:${graphId}`).emit('user_typing_start', {
        userId: socket.user?.id,
        username: socket.user?.username || socket.user?.email,
        location,
        ts: Date.now()
      });
    });

    socket.on('typing_stop', ({ graphId, location }: { graphId: string, location: string }) => {
      if (!graphId) return;
      socket.to(`graph:${graphId}`).emit('user_typing_stop', {
        userId: socket.user?.id,
        location,
        ts: Date.now()
      });
    });

    socket.on('disconnect', () => {
      connections = Math.max(0, connections - 1);
      if (presenceDisabled && connections < Math.floor(maxConnections * 0.9)) {
        presenceDisabled = false;
        ns.emit('presence_enabled', { reason: 'load_normalized' });
      }
      if (!presenceDisabled) {
        ns.emit('presence:leave', { 
          userId: socket.user?.id, 
          sid: socket.id, 
          ts: Date.now() 
        });
      }
      logger.info(`Realtime disconnect ${socket.id} for user ${socket.user?.id}`);
    });
  });

  ioInstance = io;
  return io;
}

export function getIO(): Server | null { return ioInstance; }