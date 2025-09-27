import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import pino from 'pino';
import { initGraphSync, registerGraphHandlers } from './graph-crdt.js';
import { registerPresenceHandlers } from './presence.js';
import { jwtAuth } from './auth.js';
import { createAdapter } from './adapter.js';
import { registerMutationHandlers } from './mutation.js';

const logger = pino();

interface UserSocket extends Socket {
  user?: {
    id: string;
    email?: string;
    username?: string;
    role?: string;
  };
  userId?: string;
}

let ioInstance: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  });

  if (process.env.REDIS_URL) {
    createAdapter()
      .then((adapter) => io.adapter(adapter))
      .catch((err) => logger.warn({ err }, 'redis-adapter-unavailable'));
  }

  const ns = io.of('/realtime');

  ns.use(jwtAuth);

  ns.on('connection', (socket: UserSocket) => {
    const uid = socket.userId || socket.user?.id;
    logger.info(`Realtime connected ${socket.id} for user ${uid}`);

    const authorize =
      (roles: string[], event: string, handler: (...args: unknown[]) => void) =>
      (...args: unknown[]) => {
        const userRole = socket.user?.role;
        if (!userRole || !roles.includes(userRole)) {
          logger.warn(
            { userId: socket.user?.id, role: userRole, event },
            'Unauthorized socket event',
          );
          socket.emit('error', 'Forbidden');
          return;
        }
        handler(...args);
      };

    const EDIT_ROLES = ['EDITOR', 'ADMIN'];

    socket.on(
      'entity_update',
      authorize(
        EDIT_ROLES,
        'entity_update',
        ({
          graphId,
          entityId,
          changes,
        }: {
          graphId: string;
          entityId: string;
          changes: Record<string, unknown>;
        }) => {
          if (!graphId || !entityId) return;
          socket.to(`graph:${graphId}`).emit('entity_updated', {
            userId: socket.user?.id,
            username: socket.user?.username || socket.user?.email,
            entityId,
            changes,
            ts: Date.now(),
          });
        },
      ),
    );

    registerGraphHandlers(socket);
    registerMutationHandlers(socket);
    registerPresenceHandlers(socket);

    socket.on('disconnect', () => {
      logger.info(`Realtime disconnect ${socket.id} for user ${uid}`);
    });
  });

  ioInstance = io;
  initGraphSync(ns);
  return io;
}

export function getIO(): Server | null {
  return ioInstance;
}
