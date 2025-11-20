/**
 * WebSocket Event Handlers
 * Registers all Socket.IO event handlers
 */

import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../types/index.js';
import { ConnectionManager } from '../managers/ConnectionManager.js';
import { PresenceManager } from '../managers/PresenceManager.js';
import { RoomManager } from '../managers/RoomManager.js';
import { MessagePersistence } from '../managers/MessagePersistence.js';
import { RateLimiter, wrapHandlerWithRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import * as metrics from '../metrics/prometheus.js';
import { registerPresenceHandlers } from './presence.js';
import { registerRoomHandlers } from './rooms.js';
import { registerMessageHandlers } from './messages.js';

export interface HandlerDependencies {
  io: Server;
  connectionManager: ConnectionManager;
  presenceManager: PresenceManager;
  roomManager: RoomManager;
  messagePersistence: MessagePersistence;
  rateLimiter: RateLimiter;
}

export function registerEventHandlers(deps: HandlerDependencies): void {
  const { io, connectionManager, presenceManager, roomManager, messagePersistence, rateLimiter } = deps;

  io.on('connection', (socket: AuthenticatedSocket) => {
    const startTime = Date.now();

    logger.info(
      {
        connectionId: socket.connectionId,
        userId: socket.user.userId,
        tenantId: socket.tenantId,
      },
      'Client connected'
    );

    // Register connection
    connectionManager.register(socket);
    metrics.recordConnectionStart(socket.tenantId);

    // Send connection established event
    socket.emit('connection:established', {
      connectionId: socket.connectionId,
      tenantId: socket.tenantId,
    });

    // Register specific handlers
    registerPresenceHandlers(socket, deps);
    registerRoomHandlers(socket, deps);
    registerMessageHandlers(socket, deps);

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      const duration = (Date.now() - startTime) / 1000;

      logger.info(
        {
          connectionId: socket.connectionId,
          userId: socket.user.userId,
          tenantId: socket.tenantId,
          reason,
          durationSeconds: duration,
        },
        'Client disconnected'
      );

      // Unregister connection
      connectionManager.unregister(socket.connectionId);

      // Leave all rooms
      roomManager.leaveAll(socket.connectionId);

      // Remove presence from all rooms where user was active
      const rooms = roomManager.getSocketRooms(socket.connectionId);
      for (const room of rooms) {
        await presenceManager.removePresence(room, socket.user.userId);

        // Broadcast presence update
        const presence = await presenceManager.getRoomPresence(room);
        socket.to(room).emit('presence:update', { room, presence });
      }

      // Record metrics
      metrics.recordConnectionEnd(socket.tenantId, reason, duration);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(
        {
          connectionId: socket.connectionId,
          error: error.message,
        },
        'Socket error'
      );

      metrics.recordError(socket.tenantId, 'socket_error', 'unknown');
    });

    // Update activity on any event
    socket.onAny(() => {
      connectionManager.updateActivity(socket.connectionId);
    });
  });

  // Handle cluster events
  io.on('cluster:broadcast', (data: { event: string; payload: unknown }) => {
    logger.debug({ event: data.event }, 'Cluster broadcast received');
    io.emit('broadcast', data);
    metrics.clusterBroadcasts.inc({ event: data.event });
  });

  logger.info('Event handlers registered');
}
