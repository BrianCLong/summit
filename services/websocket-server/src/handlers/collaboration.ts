/**
 * Collaboration Event Handlers
 */

import { Socket } from 'socket.io';
import { HandlerDependencies } from './index.js';
import { wrapHandlerWithRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import * as metrics from '../metrics/prometheus.js';

export function registerCollaborationHandlers(
  socket: Socket,
  deps: HandlerDependencies
): void {
  const { rateLimiter } = deps;

  // Handle cursor movement
  socket.on(
    'collaboration:cursor_move',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { room: string; x: number; y: number; username?: string }) => {
        try {
          // Broadcast cursor position to others in the room
          // Use volatile to drop events if network is congested
          socket.to(data.room).volatile.emit('collaboration:cursor_update', {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.userId,
            x: data.x,
            y: data.y,
            username: data.username,
          });

          // We don't record latency metrics for high-frequency cursor moves to avoid noise
        } catch (error) {
          logger.error(
            {
              connectionId: socket.data.connectionId,
              error: (error as Error).message,
            },
            'Failed to process cursor move'
          );
        }
      }
    )
  );
}
