/**
 * Collaboration Event Handlers
 */

import { AuthenticatedSocket } from '../types/index.js';
import { HandlerDependencies } from './index.js';
import { wrapHandlerWithRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

export function registerCollaborationHandlers(
  socket: AuthenticatedSocket,
  deps: HandlerDependencies
): void {
  const { rateLimiter, collabManager } = deps;

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
            connectionId: socket.connectionId,
            userId: socket.user.userId,
            x: data.x,
            y: data.y,
            username: data.username,
          });

          // We don't record latency metrics for high-frequency cursor moves to avoid noise
        } catch (error) {
          logger.error(
            {
              connectionId: socket.connectionId,
              error: (error as Error).message,
            },
            'Failed to process cursor move'
          );
        }
      }
    )
  );

  // Handle sync
  socket.on(
    'collab:sync',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { room: string; payload: any }) => {
        try {
            const vector = data.payload instanceof Buffer ? data.payload : Buffer.from(data.payload);
            await collabManager.handleSync(socket, data.room, vector);
        } catch (error) {
            logger.error({ error: (error as Error).message, room: data.room }, 'collab:sync failed');
        }
    })
  );

  // Handle update
  socket.on(
    'collab:update',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { room: string; payload: any }) => {
        try {
            const update = data.payload instanceof Buffer ? data.payload : Buffer.from(data.payload);
            await collabManager.handleUpdate(socket, data.room, update);
        } catch (error) {
            logger.error({ error: (error as Error).message, room: data.room }, 'collab:update failed');
        }
    })
  );
}
