import { randomUUID } from 'node:crypto';
import { Socket } from 'socket.io';
import pino from 'pino';
import { emitAuditEvent } from '../audit/emit.js';

const logger = (pino as any)();

interface Presence {
  userId: string;
  username: string;
  status: string;
  ts: number;
}

const presence = new Map<string, Map<string, Presence>>();

function broadcast(workspaceId: string, socket: Socket): void {
  const list = Array.from(presence.get(workspaceId)?.values() || []);
  socket.to(`workspace:${workspaceId}`).emit('presence:update', list);
  socket.emit('presence:update', list);
}

export function registerPresenceHandlers(socket: Socket): void {
  const user = (socket as any).user;
  const workspaceId = socket.handshake.auth?.workspaceId;
  if (!user?.id || !workspaceId) {
    return;
  }
  const tenantId =
    socket.handshake.auth?.tenantId || (user as any)?.tenantId;
  const username = user.username || user.email || 'unknown';
  const displayName = () => username;

  const emitPresenceAudit = async (
    actionType: string,
    status: string,
  ): Promise<void> => {
    if (!tenantId) return;
    try {
      await emitAuditEvent(
        {
          eventId: randomUUID(),
          occurredAt: new Date().toISOString(),
          actor: {
            type: 'user',
            id: user.id,
            name: displayName(),
            ipAddress: socket.handshake.address,
          },
          action: {
            type: actionType,
            outcome: 'success',
          },
          tenantId,
          target: {
            type: 'presence',
            id: user.id,
            path: `workspaces/${workspaceId}`,
          },
          metadata: {
            workspaceId,
            status,
            userAgent: socket.handshake.headers['user-agent'],
            socketId: socket.id,
          },
        },
        {
          correlationId: socket.id,
          serviceId: 'realtime',
        },
      );
    } catch (err: any) {
      logger.warn(
        { err: (err as Error).message, actionType },
        'Failed to emit presence audit event',
      );
    }
  };

  socket.join(`workspace:${workspaceId}`);
  const wsMap = presence.get(workspaceId) || new Map<string, Presence>();
  wsMap.set(user.id, {
    userId: user.id,
    username,
    status: 'online',
    ts: Date.now(),
  });
  presence.set(workspaceId, wsMap);
  broadcast(workspaceId, socket);
  void emitPresenceAudit('presence.join', 'online');

  socket.on('presence:update', (status: string): void => {
    const map = presence.get(workspaceId);
    if (!map) return;
    map.set(user.id, {
      userId: user.id,
      username,
      status,
      ts: Date.now(),
    });
    broadcast(workspaceId, socket);
    void emitPresenceAudit('presence.status', status);
  });

  socket.on('disconnect', (): void => {
    const map = presence.get(workspaceId);
    if (!map) return;
    map.delete(user.id);
    if (map.size === 0) presence.delete(workspaceId);
    socket
      .to(`workspace:${workspaceId}`)
      .emit('presence:update', Array.from(map.values()));
    logger.info({ userId: user.id, workspaceId }, 'presence:disconnect');
    void emitPresenceAudit('presence.leave', 'offline');
  });
}
