/**
 * Presence Event Handlers
 */

import { AuthenticatedSocket, PresenceStatus } from '../types/index.js';
import { HandlerDependencies } from './index.js';
import { wrapHandlerWithRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import * as metrics from '../metrics/prometheus.js';

export function registerPresenceHandlers(
  socket: AuthenticatedSocket,
  deps: HandlerDependencies
): void {
  const { connectionManager, presenceManager, roomManager, rateLimiter, io } = deps;

  // Heartbeat to keep presence alive
  socket.on(
    'presence:heartbeat',
    wrapHandlerWithRateLimit(socket, rateLimiter, async (data: { status?: PresenceStatus }) => {
      const startTime = Date.now();

      try {
        const status = data.status || 'online';

        // Update connection manager
        connectionManager.updatePresence(socket.connectionId, status);

        // Update presence in all rooms
        const rooms = roomManager.getSocketRooms(socket.connectionId);

        for (const room of rooms) {
          await presenceManager.touchPresence(room, socket.user.userId);
        }

        metrics.recordMessageLatency(
          socket.tenantId,
          'presence:heartbeat',
          Date.now() - startTime
        );
      } catch (error) {
        logger.error(
          {
            connectionId: socket.connectionId,
            error: (error as Error).message,
          },
          'Failed to process heartbeat'
        );

        metrics.recordError(socket.tenantId, 'presence_heartbeat', 'error');
      }
    })
  );

  // Update presence status
  socket.on(
    'presence:status',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { status: PresenceStatus; metadata?: Record<string, unknown> }) => {
        const startTime = Date.now();

        try {
          const { status, metadata } = data;

          // Update connection manager
          connectionManager.updatePresence(socket.connectionId, status);

          // Update presence in all rooms
          const rooms = roomManager.getSocketRooms(socket.connectionId);

          for (const room of rooms) {
            await presenceManager.updateStatus(room, socket.user.userId, status, metadata);

            // Broadcast to room
            const presence = await presenceManager.getRoomPresence(room);
            io.to(room).emit('presence:update', { room, presence });
          }

          metrics.presenceUpdates.inc({ tenant: socket.tenantId, status });
          metrics.recordMessageLatency(
            socket.tenantId,
            'presence:status',
            Date.now() - startTime
          );
        } catch (error) {
          logger.error(
            {
              connectionId: socket.connectionId,
              error: (error as Error).message,
            },
            'Failed to update presence status'
          );

          socket.emit('system:error', {
            code: 'PRESENCE_UPDATE_FAILED',
            message: 'Failed to update presence status',
          });

          metrics.recordError(socket.tenantId, 'presence_status', 'error');
        }
      }
    )
  );
}
