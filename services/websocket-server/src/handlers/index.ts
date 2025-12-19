/**
 * WebSocket Event Handlers
 * Registers all Socket.IO event handlers
 */

import { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/index.js';
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
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  connectionManager: ConnectionManager;
  presenceManager: PresenceManager;
  roomManager: RoomManager;
  messagePersistence: MessagePersistence;
  rateLimiter: RateLimiter;
}

export function registerEventHandlers(deps: HandlerDependencies): void {
  const { io, connectionManager, presenceManager, roomManager, messagePersistence, rateLimiter } = deps;

  io.on('connection', (socket: any) => {
    const authSocket = socket as AuthenticatedSocket;
    const startTime = Date.now();

    logger.info(
      {
        connectionId: authSocket.connectionId,
        userId: authSocket.user.userId,
        tenantId: authSocket.tenantId,
      },
      'Client connected'
    );

    // Register connection
    connectionManager.register(authSocket);
    metrics.recordConnectionStart(authSocket.tenantId);

    // Send connection established event
    authSocket.emit('connection:established', {
      connectionId: authSocket.connectionId,
      tenantId: authSocket.tenantId,
    });

    // Register specific handlers
    registerPresenceHandlers(authSocket, deps);
    registerRoomHandlers(authSocket, deps);
    registerMessageHandlers(authSocket, deps);

    // Handle disconnection
    authSocket.on('disconnect', async (reason) => {
      const duration = (Date.now() - startTime) / 1000;

      logger.info(
        {
          connectionId: authSocket.connectionId,
          userId: authSocket.user.userId,
          tenantId: authSocket.tenantId,
          reason,
          durationSeconds: duration,
        },
        'Client disconnected'
      );

      // Unregister connection
      connectionManager.unregister(authSocket.connectionId);

      // Leave all rooms
      roomManager.leaveAll(authSocket.connectionId);

      // Remove presence from all rooms where user was active
      const rooms = roomManager.getSocketRooms(authSocket.connectionId);
      for (const room of rooms) {
        await presenceManager.removePresence(room, authSocket.user.userId);

        // Broadcast presence update
        const presence = await presenceManager.getRoomPresence(room);
        authSocket.to(room).emit('presence:update', { room, presence });
      }

      // Record metrics
      metrics.recordConnectionEnd(authSocket.tenantId, reason, duration);
    });

    // Handle errors
    authSocket.on('error', (error) => {
      logger.error(
        {
          connectionId: authSocket.connectionId,
          error: error.message,
        },
        'Socket error'
      );

      metrics.recordError(authSocket.tenantId, 'socket_error', 'unknown');
    });

    // Update activity on any event
    authSocket.onAny(() => {
      connectionManager.updateActivity(authSocket.connectionId);
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
