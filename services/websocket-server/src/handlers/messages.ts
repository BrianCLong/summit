/**
 * Message Event Handlers
 */

import { AuthenticatedSocket } from '../types/index.js';
import { HandlerDependencies } from './index.js';
import { wrapHandlerWithRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import * as metrics from '../metrics/prometheus.js';

export function registerMessageHandlers(
  socket: AuthenticatedSocket,
  deps: HandlerDependencies
): void {
  const { roomManager, messagePersistence, rateLimiter, io } = deps;

  // Send message to a room
  socket.on(
    'room:send',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (
        data: { room: string; payload: unknown; persistent?: boolean },
        ack?: (response: { success: boolean; messageId?: string }) => void
      ) => {
        const startTime = Date.now();

        try {
          const { room, payload, persistent = false } = data;

          // Verify user is in the room
          const userRooms = roomManager.getSocketRooms(socket.connectionId);
          if (!userRooms.includes(room)) {
            logger.warn(
              {
                connectionId: socket.connectionId,
                room,
              },
              'Attempted to send message to room not joined'
            );

            ack?.({ success: false });
            socket.emit('system:error', {
              code: 'NOT_IN_ROOM',
              message: 'You are not a member of this room',
            });

            metrics.recordError(socket.tenantId, 'room_send', 'not_in_room');
            return;
          }

          // Create message
          const message = {
            room,
            from: socket.user.userId,
            payload,
            timestamp: Date.now(),
          };

          // Persist if requested
          let messageId: string | undefined;
          if (persistent) {
            const persisted = await messagePersistence.storeMessage(message);
            messageId = persisted.id;
            metrics.messagePersisted.inc({ tenant: socket.tenantId, room });
          }

          // Broadcast to room (excluding sender)
          socket.to(room).emit('room:message', {
            ...message,
            id: messageId,
          });

          // Send to sender as confirmation
          socket.emit('room:message', {
            ...message,
            id: messageId,
          });

          ack?.({ success: true, messageId });

          metrics.recordMessageSent(socket.tenantId, 'room:message');
          metrics.recordMessageLatency(socket.tenantId, 'room:send', Date.now() - startTime);

          logger.debug(
            {
              connectionId: socket.connectionId,
              room,
              persistent,
              messageId,
            },
            'Message sent'
          );
        } catch (error) {
          logger.error(
            {
              connectionId: socket.connectionId,
              error: (error as Error).message,
            },
            'Failed to send message'
          );

          ack?.({ success: false });
          socket.emit('system:error', {
            code: 'MESSAGE_SEND_FAILED',
            message: 'Failed to send message',
          });

          metrics.recordError(socket.tenantId, 'room_send', 'error');
        }
      }
    )
  );
}
