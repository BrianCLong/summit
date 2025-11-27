/**
 * Room Event Handlers
 */

import { Socket } from 'socket.io';
import { HandlerDependencies } from './index.js';
import { wrapHandlerWithRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import * as metrics from '../metrics/prometheus.js';

export function registerRoomHandlers(
  socket: Socket,
  deps: HandlerDependencies
): void {
  const { connectionManager, presenceManager, roomManager, rateLimiter, io } = deps;

  // Join a room
  socket.on(
    'room:join',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (
        data: { room: string; metadata?: Record<string, unknown> },
        ack?: (response: { success: boolean; error?: string }) => void
      ) => {
        const startTime = Date.now();

        try {
          const { room, metadata } = data;

          // Join room via room manager
          const result = await roomManager.join(socket, room, metadata);

          if (!result.success) {
            ack?.({ success: false, error: result.error });
            metrics.recordError(socket.data.tenantId, 'room_join', result.error || 'unknown');
            return;
          }

          // Add to connection manager
          connectionManager.addRoom(socket.data.connectionId, room);

          // Set presence in room
          await presenceManager.setPresence(room, socket.data.user.userId, {
            status: 'online',
            username: socket.data.user.userId,
          });

          // Get current presence
          const presence = await presenceManager.getRoomPresence(room);

          // Notify room of new member
          socket.to(room).emit('presence:join', {
            room,
            user: {
              userId: socket.data.user.userId,
              status: 'online' as const,
              lastSeen: Date.now(),
            },
          });

          // Send success response
          socket.emit('room:joined', { room, metadata });
          ack?.({ success: true });

          // Send current presence to joiner
          socket.emit('presence:update', { room, presence });

          metrics.roomJoins.inc({ tenant: socket.data.tenantId });
          metrics.recordMessageLatency(socket.data.tenantId, 'room:join', Date.now() - startTime);

          logger.info(
            {
              connectionId: socket.data.connectionId,
              room,
              membersCount: roomManager.getRoomSize(socket.data.tenantId, room),
            },
            'Room joined'
          );
        } catch (error) {
          logger.error(
            {
              connectionId: socket.data.connectionId,
              error: (error as Error).message,
            },
            'Failed to join room'
          );

          ack?.({ success: false, error: 'Internal error' });
          socket.emit('system:error', {
            code: 'ROOM_JOIN_FAILED',
            message: 'Failed to join room',
          });

          metrics.recordError(socket.data.tenantId, 'room_join', 'error');
        }
      }
    )
  );

  // Leave a room
  socket.on(
    'room:leave',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (
        data: { room: string },
        ack?: (response: { success: boolean }) => void
      ) => {
        const startTime = Date.now();

        try {
          const { room } = data;

          // Leave room via room manager
          await roomManager.leave(socket, room);

          // Remove from connection manager
          connectionManager.removeRoom(socket.data.connectionId, room);

          // Remove presence
          await presenceManager.removePresence(room, socket.data.user.userId);

          // Notify room
          socket.to(room).emit('presence:leave', {
            room,
            userId: socket.data.user.userId,
          });

          // Send success response
          socket.emit('room:left', { room });
          ack?.({ success: true });

          metrics.roomLeaves.inc({ tenant: socket.data.tenantId });
          metrics.recordMessageLatency(socket.data.tenantId, 'room:leave', Date.now() - startTime);

          logger.info(
            {
              connectionId: socket.data.connectionId,
              room,
            },
            'Room left'
          );
        } catch (error) {
          logger.error(
            {
              connectionId: socket.data.connectionId,
              error: (error as Error).message,
            },
            'Failed to leave room'
          );

          ack?.({ success: false });
          socket.emit('system:error', {
            code: 'ROOM_LEAVE_FAILED',
            message: 'Failed to leave room',
          });

          metrics.recordError(socket.data.tenantId, 'room_leave', 'error');
        }
      }
    )
  );

  // Query presence in a room
  socket.on(
    'query:presence',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (
        data: { room: string },
        ack?: (response: { presence: any[] }) => void
      ) => {
        try {
          const { room } = data;

          // Check if user is in room
          const userRooms = roomManager.getSocketRooms(socket.data.connectionId);
          if (!userRooms.includes(room)) {
            ack?.({ presence: [] });
            return;
          }

          const presence = await presenceManager.getRoomPresence(room);
          ack?.({ presence });
        } catch (error) {
          logger.error(
            {
              connectionId: socket.data.connectionId,
              error: (error as Error).message,
            },
            'Failed to query presence'
          );

          ack?.({ presence: [] });
          metrics.recordError(socket.data.tenantId, 'query_presence', 'error');
        }
      }
    )
  );

  // Query user's rooms
  socket.on(
    'query:rooms',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      (ack?: (response: { rooms: string[] }) => void) => {
        try {
          const rooms = roomManager.getSocketRooms(socket.data.connectionId);
          ack?.({ rooms });
        } catch (error) {
          logger.error(
            {
              connectionId: socket.data.connectionId,
              error: (error as Error).message,
            },
            'Failed to query rooms'
          );

          ack?.({ rooms: [] });
          metrics.recordError(socket.data.tenantId, 'query_rooms', 'error');
        }
      }
    )
  );
}
