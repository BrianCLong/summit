/**
 * Collaboration Event Handlers
 */

import { Socket } from 'socket.io';
import { HandlerDependencies } from './index.js';
import { wrapHandlerWithRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';
import * as metrics from '../metrics/prometheus.js';
import { AuthenticatedSocket } from '../types/index.js';
import * as decoding from 'lib0/decoding';

export function registerCollaborationHandlers(
  socket: Socket,
  deps: HandlerDependencies
): void {
  const { rateLimiter, collabManager, roomManager } = deps;
  const authSocket = socket as AuthenticatedSocket;

  if (process.env.COLLAB_ENABLED !== 'true') {
      return;
  }

  // Handle Join
  socket.on(
    'collab:join',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { room: string }) => {
        try {
          if (!authSocket.user.permissions.includes('case:read')) {
             logger.warn({ userId: authSocket.user.userId, room: data.room }, 'Unauthorized join attempt');
             socket.emit('system:error', { code: 'UNAUTHORIZED', message: 'Missing case:read permission' });
             return;
          }

          // Join the socket room if not already
          if (!socket.rooms.has(data.room)) {
              await socket.join(data.room);
          }
          await collabManager.handleJoin(socket, data.room);
        } catch (error) {
           logger.error({ error }, 'Failed to process collab join');
        }
      }
    )
  );

  // Handle cursor movement
  socket.on(
    'collaboration:cursor_move',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { room: string; x: number; y: number; username?: string }) => {
        try {
          if (!authSocket.user.permissions.includes('case:read')) {
              return;
          }
          // Broadcast cursor position to others in the room
          // Use volatile to drop events if network is congested
          socket.to(data.room).volatile.emit('collaboration:cursor_update', {
            connectionId: socket.data.connectionId,
            userId: socket.data.user.userId,
            x: data.x,
            y: data.y,
            username: data.username,
          });
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

  // Yjs Sync
  socket.on(
    'collab:sync',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { room: string; buffer: Uint8Array }) => {
        try {
            // Join check (implicit or explicit)
            if (!socket.rooms.has(data.room)) {
                if (!authSocket.user.permissions.includes('case:read')) {
                    socket.emit('system:error', { code: 'UNAUTHORIZED', message: 'Missing case:read permission' });
                    return;
                }
                await collabManager.handleJoin(socket, data.room);
            }

            // Inspect message type for write permission check
            // 0: Step 1 (Requesting state) - Read
            // 1: Step 2 (Sending state) - Write
            // 2: Update - Write
            const decoder = decoding.createDecoder(data.buffer);
            const messageType = decoding.readVarUint(decoder);

            if (messageType > 0 && !authSocket.user.permissions.includes('case:comment')) {
                logger.warn({ userId: authSocket.user.userId, room: data.room }, 'Unauthorized write attempt via sync');
                socket.emit('system:error', { code: 'UNAUTHORIZED', message: 'Missing case:comment permission' });
                return;
            }

            await collabManager.handleSync(socket, data.room, data.buffer);
        } catch (error) {
           logger.error({ error }, 'Failed to process collab sync');
        }
      }
    )
  );

  // Yjs Update
  socket.on(
    'collab:update',
    wrapHandlerWithRateLimit(
      socket,
      rateLimiter,
      async (data: { room: string; update: Uint8Array }) => {
        try {
          if (!authSocket.user.permissions.includes('case:comment')) {
              logger.warn({ userId: authSocket.user.userId, room: data.room }, 'Unauthorized update attempt');
              socket.emit('system:error', { code: 'UNAUTHORIZED', message: 'Missing case:comment permission' });
              return;
          }
          await collabManager.handleUpdate(socket, data.room, data.update);
        } catch (error) {
           logger.error({ error }, 'Failed to process collab update');
        }
      }
    )
  );
}
