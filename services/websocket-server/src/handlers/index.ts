/**
 * WebSocket Event Handlers
 * Registers all Socket.IO event handlers
 */

import { Server } from 'socket.io';
<<<<<<< HEAD
=======
import {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../types/index.js';
>>>>>>> main
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

<<<<<<< HEAD
  io.on('connection', (socket) => {
=======
  io.on('connection', (socket: any) => {
    const authSocket = socket as AuthenticatedSocket;
>>>>>>> main
    const startTime = Date.now();

    logger.info(
      {
<<<<<<< HEAD
        connectionId: socket.data.connectionId,
        userId: socket.data.user.userId,
        tenantId: socket.data.tenantId,
=======
        connectionId: authSocket.connectionId,
        userId: authSocket.user.userId,
        tenantId: authSocket.tenantId,
>>>>>>> main
      },
      'Client connected'
    );

    // Register connection
<<<<<<< HEAD
    connectionManager.register(socket);
    metrics.recordConnectionStart(socket.data.tenantId);

    // Send connection established event
    socket.emit('connection:established', {
      connectionId: socket.data.connectionId,
      tenantId: socket.data.tenantId,
=======
    connectionManager.register(authSocket);
    metrics.recordConnectionStart(authSocket.tenantId);

    // Send connection established event
    authSocket.emit('connection:established', {
      connectionId: authSocket.connectionId,
      tenantId: authSocket.tenantId,
>>>>>>> main
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
<<<<<<< HEAD
          connectionId: socket.data.connectionId,
          userId: socket.data.user.userId,
          tenantId: socket.data.tenantId,
=======
          connectionId: authSocket.connectionId,
          userId: authSocket.user.userId,
          tenantId: authSocket.tenantId,
>>>>>>> main
          reason,
          durationSeconds: duration,
        },
        'Client disconnected'
      );

      // Unregister connection
<<<<<<< HEAD
      connectionManager.unregister(socket.data.connectionId);

      // Leave all rooms
      roomManager.leaveAll(socket.data.connectionId);

      // Remove presence from all rooms where user was active
      const rooms = roomManager.getSocketRooms(socket.data.connectionId);
      for (const room of rooms) {
        await presenceManager.removePresence(room, socket.data.user.userId);
=======
      connectionManager.unregister(authSocket.connectionId);

      // Leave all rooms
      roomManager.leaveAll(authSocket.connectionId);

      // Remove presence from all rooms where user was active
      const rooms = roomManager.getSocketRooms(authSocket.connectionId);
      for (const room of rooms) {
        await presenceManager.removePresence(room, authSocket.user.userId);
>>>>>>> main

        // Broadcast presence update
        const presence = await presenceManager.getRoomPresence(room);
        authSocket.to(room).emit('presence:update', { room, presence });
      }

      // Record metrics
<<<<<<< HEAD
      metrics.recordConnectionEnd(socket.data.tenantId, reason, duration);
=======
      metrics.recordConnectionEnd(authSocket.tenantId, reason, duration);
>>>>>>> main
    });

    // Handle errors
    authSocket.on('error', (error) => {
      logger.error(
        {
<<<<<<< HEAD
          connectionId: socket.data.connectionId,
=======
          connectionId: authSocket.connectionId,
>>>>>>> main
          error: error.message,
        },
        'Socket error'
      );

<<<<<<< HEAD
      metrics.recordError(socket.data.tenantId, 'socket_error', 'unknown');
    });

    // Update activity on any event
    socket.onAny(() => {
      connectionManager.updateActivity(socket.data.connectionId);
=======
      metrics.recordError(authSocket.tenantId, 'socket_error', 'unknown');
    });

    // Update activity on any event
    authSocket.onAny(() => {
      connectionManager.updateActivity(authSocket.connectionId);
>>>>>>> main
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
