import { Server, Socket } from 'socket.io';
import { default as pino } from 'pino';
import { getRedisClient } from '../db/redis.js';

// @ts-ignore
const logger = (pino as any)({ name: 'maestro-ws' });

interface MaestroSocket extends Socket {
  user?: {
    id: string;
    email: string;
    username: string;
  };
  tenantId?: string;
}

interface RunSubscriptionPayload {
  runId: string;
}

interface LogSubscriptionPayload {
  runId: string;
}

export function registerMaestroHandlers(io: Server, socket: MaestroSocket) {
  const userId = socket.user?.id || 'unknown';
  const tenantId = socket.tenantId || 'default';

  // Scoped room helper
  const runRoom = (runId: string) => `tenant:${tenantId}:run:${runId}`;
  const logsRoom = (runId: string) => `tenant:${tenantId}:logs:${runId}`;
  const statusRoom = (runId: string) => `tenant:${tenantId}:status:${runId}`;

  // Agent Execution Progress
  socket.on('maestro:subscribe_run', async (payload: RunSubscriptionPayload) => {
    if (!payload || typeof payload !== 'object' || !payload.runId) return;
    const { runId } = payload;
    try {
      const room = runRoom(runId);
      await socket.join(room);
      socket.emit('maestro:subscribed', { type: 'run', runId });
      logger.debug({ userId, runId }, 'Subscribed to run updates');
    } catch (error: any) {
      logger.error({ userId, runId, error }, 'Failed to subscribe to run');
      socket.emit('maestro:error', { code: 'SUBSCRIPTION_FAILED', message: 'Failed to subscribe to run' });
    }
  });

  socket.on('maestro:unsubscribe_run', async (payload: RunSubscriptionPayload) => {
    if (!payload || typeof payload !== 'object' || !payload.runId) return;
    const { runId } = payload;
    const room = runRoom(runId);
    await socket.leave(room);
    socket.emit('maestro:unsubscribed', { type: 'run', runId });
  });

  // Real-time Log Streaming
  socket.on('maestro:subscribe_logs', async (payload: LogSubscriptionPayload) => {
    if (!payload || typeof payload !== 'object' || !payload.runId) return;
    const { runId } = payload;
    try {
      const room = logsRoom(runId);
      await socket.join(room);
      socket.emit('maestro:subscribed', { type: 'logs', runId });
      logger.debug({ userId, runId }, 'Subscribed to log stream');
    } catch (error: any) {
      logger.error({ userId, runId, error }, 'Failed to subscribe to logs');
      socket.emit('maestro:error', { code: 'SUBSCRIPTION_FAILED', message: 'Failed to subscribe to logs' });
    }
  });

  socket.on('maestro:unsubscribe_logs', async (payload: LogSubscriptionPayload) => {
    if (!payload || typeof payload !== 'object' || !payload.runId) return;
    const { runId } = payload;
    const room = logsRoom(runId);
    await socket.leave(room);
    socket.emit('maestro:unsubscribed', { type: 'logs', runId });
  });

  // Global Status/Dashboard Updates (for lists of runs)
  socket.on('maestro:subscribe_status', async () => {
      const room = `tenant:${tenantId}:maestro:status`;
      await socket.join(room);
      socket.emit('maestro:subscribed', { type: 'status' });
  });

  socket.on('maestro:unsubscribe_status', async () => {
      const room = `tenant:${tenantId}:maestro:status`;
      await socket.leave(room);
      socket.emit('maestro:unsubscribed', { type: 'status' });
  });
}

/**
 * Server-side helper to emit events to rooms.
 * This should be used by backend services (e.g. via an internal event bus or direct call if in same process).
 * If scaling horizontally, use Redis Adapter broadcast or Redis Pub/Sub directly.
 */
export const MaestroEvents = {
  emitRunUpdate: (io: Server, tenantId: string, runId: string, data: any) => {
    io.to(`tenant:${tenantId}:run:${runId}`).emit('maestro:run_update', {
      runId,
      ...data,
      timestamp: Date.now()
    });
  },

  emitLog: (io: Server, tenantId: string, runId: string, logEntry: any) => {
    io.to(`tenant:${tenantId}:logs:${runId}`).emit('maestro:log', {
      runId,
      entry: logEntry,
      timestamp: Date.now()
    });
  },

  emitStatusChange: (io: Server, tenantId: string, runId: string, status: string) => {
     // Emit to specific run room
     io.to(`tenant:${tenantId}:run:${runId}`).emit('maestro:status_change', {
         runId,
         status,
         timestamp: Date.now()
     });
     // Emit to global dashboard
     io.to(`tenant:${tenantId}:maestro:status`).emit('maestro:status_update', {
         runId,
         status,
         timestamp: Date.now()
     });
  }
};
