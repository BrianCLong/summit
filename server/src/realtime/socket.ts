import { Server, Socket } from 'socket.io';
import { verifyToken as verifyTokenBase } from '../lib/auth.js';
import pino from 'pino';
import {
  initGraphSync,
  registerGraphHandlers,
  getGraphSnapshot,
  type GraphOperation,
} from './graph-crdt.js';
import {
  addAnnotation,
  addComment,
  updateAnnotation,
  updateComment,
  deleteAnnotation,
  deleteComment,
  getActivity,
  getAnnotations,
  getComments,
  recordActivity,
  removePresence,
  setPresence,
  touchPresence,
  type PresenceUser,
} from './investigationState.js';
import {
  authorizeInvestigationAction,
  getMembers,
  type InvestigationAction,
  type UserIdentity,
} from './investigationAccess.js';
import { registerDashboardHandlers } from './dashboard.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from '../db/redis.js';
import { registerMaestroHandlers } from './maestro.js';
import promClient from 'prom-client';

const logger = pino();

// Metrics
const connectedClients = new promClient.Gauge({
  name: 'socketio_connected_clients',
  help: 'Number of connected Socket.io clients',
  labelNames: ['tenant'],
});

const messageCounter = new promClient.Counter({
  name: 'socketio_messages_total',
  help: 'Total Socket.io messages received',
  labelNames: ['event', 'tenant'],
});

const messageLatency = new promClient.Histogram({
  name: 'socketio_message_processing_duration_seconds',
  help: 'Duration of Socket.io message processing',
  labelNames: ['event', 'tenant'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

let verifyToken = verifyTokenBase;

export function overrideVerifyToken(
  fn?: typeof verifyTokenBase,
): void {
  verifyToken = fn ?? verifyTokenBase;
}

interface UserSocket extends Socket {
  user?: UserIdentity & { email?: string; username?: string };
  tenantId?: string;
}

interface InvestigationJoinPayload {
  investigationId: string;
}

interface AnnotationPayload {
  investigationId: string;
  targetId: string;
  text: string;
  position?: { x: number; y: number } | null;
  resolved?: boolean;
}

interface AnnotationUpdatePayload
  extends Partial<Omit<AnnotationPayload, 'investigationId' | 'targetId'>> {
  investigationId: string;
  annotationId: string;
}

interface CommentPayload {
  investigationId: string;
  threadId: string;
  targetId: string;
  message: string;
}

interface CommentUpdatePayload
  extends Partial<Omit<CommentPayload, 'investigationId' | 'targetId'>> {
  investigationId: string;
  commentId: string;
}

interface EntityUpdatePayload {
  graphId?: string;
  investigationId?: string;
  entityId: string;
  changes: any;
}

interface ActivityFetchPayload {
  investigationId: string;
  limit?: number;
}

let ioInstance: Server | null = null;

export function initSocket(httpServer: any): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  });

  // Set up Redis Adapter for sticky sessions and multi-node scaling
  try {
    const pubClient = getRedisClient();
    if (pubClient) {
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis adapter initialized');
    }
  } catch (error) {
    logger.warn('Failed to initialize Socket.io Redis adapter, falling back to memory adapter', error);
  }

  const ns = io.of('/realtime');

  // Metrics middleware
  ns.use((socket: UserSocket, next) => {
    socket.onAny((event, ...args) => {
      const start = process.hrtime();
      const tenant = socket.tenantId || 'unknown';
      messageCounter.inc({ event, tenant });

      // We can't easily wrap the handler execution itself in onAny,
      // but we can measure the synchronous dispatch overhead or approximate.
      // A better approach for latency in Socket.io is problematic without wrapping every handler.
      // However, we can use a "post-processing" hook if available, or just measure the event emit overhead.
      // For now, let's just record that the event was received.
      // To properly measure handling time, we'd need to wrap `socket.on`.
    });

    // Wrap socket.on to measure handler duration
    const originalOn = socket.on;
    socket.on = function(eventName: string, listener: (...args: any[]) => void) {
        return originalOn.call(this, eventName, async (...args: any[]) => {
            const start = process.hrtime();
            const tenant = socket.tenantId || 'unknown';
            try {
                await listener.apply(this, args);
            } finally {
                const [seconds, nanoseconds] = process.hrtime(start);
                const durationInSeconds = seconds + nanoseconds / 1e9;
                messageLatency.observe({ event: eventName, tenant }, durationInSeconds);
            }
        });
    };

    next();
  });

  ns.use(async (socket: UserSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const user = await verifyToken(token);
      if (!user) {
        logger.warn({ token }, 'Unauthorized socket connection attempt');
        return next(new Error('Unauthorized'));
      }
      socket.user = user;
      socket.tenantId =
        socket.handshake.auth?.tenantId || (user as any)?.tenantId || 'default';
      next();
    } catch (e: any) {
      logger.warn(
        { error: e.message },
        'Unauthorized socket connection attempt',
      );
      next(new Error('Unauthorized'));
    }
  });

  ns.on('connection', (socket: UserSocket) => {
    const userId = socket.user?.id;
    const tenantId = socket.tenantId || 'default';
    logger.info(`Realtime connected ${socket.id} for user ${userId}`);
    connectedClients.inc({ tenant: tenantId });

    // Register Maestro handlers
    registerMaestroHandlers(io, socket as any);

    const joinedInvestigations = new Set<string>();

    const displayName = () =>
      socket.user?.username || socket.user?.email || socket.user?.id || 'user';

    const roomFor = (investigationId: string) =>
      `tenant:${socket.tenantId}:investigation:${investigationId}`;

    const ensureAuthorized = async (
      investigationId: string,
      action: InvestigationAction,
    ) => {
      const result = await authorizeInvestigationAction(
        investigationId,
        socket.user,
        action,
      );
      if (!result.allowed) {
        socket.emit('investigation:error', {
          investigationId,
          message: 'Forbidden',
          code: 'FORBIDDEN',
        });
        socket.emit('error', 'Forbidden');
      }
      return result;
    };

    const broadcastPresence = async (
      investigationId: string,
      presence: PresenceUser[],
    ) => {
      ns.to(roomFor(investigationId)).emit('presence:update', {
        investigationId,
        presence,
      });
    };

    socket.on(
      'investigation:join',
      async ({ investigationId }: InvestigationJoinPayload) => {
        if (!investigationId || !socket.user?.id) return;
        try {
          const auth = await ensureAuthorized(investigationId, 'view');
          if (!auth.allowed) return;

          socket.join(roomFor(investigationId));
          socket.join(`graph:${investigationId}`);
          joinedInvestigations.add(investigationId);

          const [annotations, comments, activity, members] = await Promise.all([
            getAnnotations(investigationId),
            getComments(investigationId),
            getActivity(investigationId, 50),
            getMembers(investigationId),
          ]);
          const graph = getGraphSnapshot(investigationId);

          const presence = await setPresence(investigationId, {
            userId: socket.user.id,
            username: displayName(),
            status: 'online',
            lastSeen: Date.now(),
          });

          socket.emit('investigation:state', {
            investigationId,
            graph,
            annotations,
            comments,
            activity,
            presence,
            members,
            role: auth.role,
          });

          await broadcastPresence(investigationId, presence);

          const activityEntry = await recordActivity(investigationId, {
            type: 'presence',
            action: 'join',
            actorId: socket.user.id,
            actorName: displayName(),
            details: { status: 'online' },
          });
          ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId },
            'Failed to join investigation room',
          );
          socket.emit('investigation:error', {
            investigationId,
            message: 'Unable to join investigation',
            code: 'JOIN_FAILED',
          });
        }
      },
    );

    socket.on(
      'investigation:leave',
      async ({ investigationId }: InvestigationJoinPayload) => {
        if (!investigationId || !joinedInvestigations.has(investigationId)) {
          return;
        }
        joinedInvestigations.delete(investigationId);
        socket.leave(roomFor(investigationId));
        socket.leave(`graph:${investigationId}`);
        try {
          const presence = await removePresence(
            investigationId,
            socket.user!.id,
          );
          await broadcastPresence(investigationId, presence);
          const activityEntry = await recordActivity(investigationId, {
            type: 'presence',
            action: 'leave',
            actorId: socket.user!.id,
            actorName: displayName(),
            details: { status: 'offline' },
          });
          ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId },
            'Failed to leave investigation room cleanly',
          );
        }
      },
    );

    socket.on(
      'presence:heartbeat',
      async ({ investigationId, status }: { investigationId: string; status?: PresenceUser['status'] }) => {
        if (!investigationId || !joinedInvestigations.has(investigationId)) {
          return;
        }
        try {
          const presence = await touchPresence(
            investigationId,
            socket.user!.id,
            status || 'online',
          );
          await broadcastPresence(investigationId, presence);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId },
            'Failed to refresh presence',
          );
        }
      },
    );

    socket.on(
      'presence:set_status',
      async ({ investigationId, status }: { investigationId: string; status: PresenceUser['status'] }) => {
        if (!investigationId || !joinedInvestigations.has(investigationId)) {
          return;
        }
        try {
          const presence = await touchPresence(
            investigationId,
            socket.user!.id,
            status,
          );
          await broadcastPresence(investigationId, presence);
          const activityEntry = await recordActivity(investigationId, {
            type: 'presence',
            action: 'status',
            actorId: socket.user!.id,
            actorName: displayName(),
            details: { status },
          });
          ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId },
            'Failed to update presence status',
          );
        }
      },
    );

    socket.on(
      'annotation:add',
      async (payload: AnnotationPayload) => {
        if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
          return;
        }
        const auth = await ensureAuthorized(payload.investigationId, 'edit');
        if (!auth.allowed) return;
        try {
          const annotation = await addAnnotation(payload.investigationId, {
            targetId: payload.targetId,
            text: payload.text,
            authorId: socket.user!.id,
            authorName: displayName(),
            position: payload.position ?? null,
            resolved: payload.resolved,
          });
          ns.to(roomFor(payload.investigationId)).emit('annotation:added', {
            investigationId: payload.investigationId,
            annotation,
          });
          const activityEntry = await recordActivity(payload.investigationId, {
            type: 'annotation',
            action: 'added',
            actorId: socket.user!.id,
            actorName: displayName(),
            details: { annotationId: annotation.id, targetId: annotation.targetId },
          });
          ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId: payload.investigationId },
            'Failed to add annotation',
          );
        }
      },
    );

    socket.on(
      'annotation:update',
      async (payload: AnnotationUpdatePayload) => {
        if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
          return;
        }
        const auth = await ensureAuthorized(payload.investigationId, 'edit');
        if (!auth.allowed) return;
        try {
          const updated = await updateAnnotation(
            payload.investigationId,
            payload.annotationId,
            {
              text: payload.text,
              position: payload.position,
              resolved: payload.resolved,
            },
          );
          if (!updated) return;
          ns.to(roomFor(payload.investigationId)).emit('annotation:updated', {
            investigationId: payload.investigationId,
            annotation: updated,
          });
          const activityEntry = await recordActivity(payload.investigationId, {
            type: 'annotation',
            action: 'updated',
            actorId: socket.user!.id,
            actorName: displayName(),
            details: { annotationId: payload.annotationId },
          });
          ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId: payload.investigationId },
            'Failed to update annotation',
          );
        }
      },
    );

    socket.on(
      'annotation:delete',
      async ({ investigationId, annotationId }: { investigationId: string; annotationId: string }) => {
        if (!investigationId || !joinedInvestigations.has(investigationId)) {
          return;
        }
        const auth = await ensureAuthorized(investigationId, 'edit');
        if (!auth.allowed) return;
        try {
          await deleteAnnotation(investigationId, annotationId);
          ns.to(roomFor(investigationId)).emit('annotation:deleted', {
            investigationId,
            annotationId,
          });
          const activityEntry = await recordActivity(investigationId, {
            type: 'annotation',
            action: 'deleted',
            actorId: socket.user!.id,
            actorName: displayName(),
            details: { annotationId },
          });
          ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId },
            'Failed to delete annotation',
          );
        }
      },
    );

    socket.on('comment:add', async (payload: CommentPayload) => {
      if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
        return;
      }
      const auth = await ensureAuthorized(payload.investigationId, 'comment');
      if (!auth.allowed) return;
      try {
        const comment = await addComment(payload.investigationId, {
          threadId: payload.threadId,
          targetId: payload.targetId,
          message: payload.message,
          authorId: socket.user!.id,
          authorName: displayName(),
        });
        ns.to(roomFor(payload.investigationId)).emit('comment:added', {
          investigationId: payload.investigationId,
          comment,
        });
        const activityEntry = await recordActivity(payload.investigationId, {
          type: 'comment',
          action: 'added',
          actorId: socket.user!.id,
          actorName: displayName(),
          details: { commentId: comment.id, threadId: comment.threadId },
        });
        ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
      } catch (err) {
        logger.warn(
          { err: (err as Error).message, investigationId: payload.investigationId },
          'Failed to add comment',
        );
      }
    });

    socket.on('comment:update', async (payload: CommentUpdatePayload) => {
      if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
        return;
      }
      const auth = await ensureAuthorized(payload.investigationId, 'comment');
      if (!auth.allowed) return;
      try {
        const updated = await updateComment(
          payload.investigationId,
          payload.commentId,
          {
            message: payload.message,
          },
        );
        if (!updated) return;
        ns.to(roomFor(payload.investigationId)).emit('comment:updated', {
          investigationId: payload.investigationId,
          comment: updated,
        });
        const activityEntry = await recordActivity(payload.investigationId, {
          type: 'comment',
          action: 'updated',
          actorId: socket.user!.id,
          actorName: displayName(),
          details: { commentId: payload.commentId },
        });
        ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
      } catch (err) {
        logger.warn(
          { err: (err as Error).message, investigationId: payload.investigationId },
          'Failed to update comment',
        );
      }
    });

    socket.on(
      'comment:delete',
      async ({ investigationId, commentId }: { investigationId: string; commentId: string }) => {
        if (!investigationId || !joinedInvestigations.has(investigationId)) {
          return;
        }
        const auth = await ensureAuthorized(investigationId, 'comment');
        if (!auth.allowed) return;
        try {
          await deleteComment(investigationId, commentId);
          ns.to(roomFor(investigationId)).emit('comment:deleted', {
            investigationId,
            commentId,
          });
          const activityEntry = await recordActivity(investigationId, {
            type: 'comment',
            action: 'deleted',
            actorId: socket.user!.id,
            actorName: displayName(),
            details: { commentId },
          });
          ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId },
            'Failed to delete comment',
          );
        }
      },
    );

    socket.on('activity:fetch', async (payload: ActivityFetchPayload) => {
      if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
        return;
      }
      const auth = await ensureAuthorized(payload.investigationId, 'view');
      if (!auth.allowed) return;
      const list = await getActivity(
        payload.investigationId,
        payload.limit ?? 50,
      );
      socket.emit('activity:list', {
        investigationId: payload.investigationId,
        activity: list,
      });
    });

    socket.on('entity_update', async (payload: EntityUpdatePayload) => {
      const investigationId = payload.graphId || payload.investigationId;
      if (!investigationId || !joinedInvestigations.has(investigationId)) {
        return;
      }
      const auth = await ensureAuthorized(investigationId, 'edit');
      if (!auth.allowed) return;
      const eventPayload = {
        userId: socket.user!.id,
        username: displayName(),
        entityId: payload.entityId,
        changes: payload.changes,
        ts: Date.now(),
      };
      socket.to(`graph:${investigationId}`).emit('entity_updated', eventPayload);
      ns.to(roomFor(investigationId)).emit('entity_updated', eventPayload);
      const activityEntry = await recordActivity(investigationId, {
        type: 'entity',
        action: 'updated',
        actorId: socket.user!.id,
        actorName: displayName(),
        details: { entityId: payload.entityId },
      });
      ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
    });

    registerGraphHandlers(socket, {
      authorize: async (graphId: string, op: GraphOperation, intent) => {
        if (!joinedInvestigations.has(graphId)) return false;
        const action: InvestigationAction = intent === 'mutate' ? 'edit' : 'view';
        const auth = await authorizeInvestigationAction(
          graphId,
          socket.user,
          action,
        );
        if (!auth.allowed) {
          socket.emit('graph:error', { graphId, reason: 'forbidden' });
          return false;
        }
        if (intent === 'mutate') {
          op.meta = {
            ...(op.meta || {}),
            actorId: socket.user?.id,
            actorName: displayName(),
          };
        }
        return true;
      },
      onApplied: async (graphId, op) => {
        try {
          const activityEntry = await recordActivity(graphId, {
            type: 'graph',
            action: `${op.kind}:${op.action}`,
            actorId:
              (op.meta?.actorId as string) || socket.user?.id || 'unknown',
            actorName:
              (op.meta?.actorName as string) || displayName(),
            details: { id: op.id, kind: op.kind, action: op.action },
          });
          ns.to(roomFor(graphId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, graphId },
            'Failed to record graph activity entry',
          );
        }
      },
    });

    socket.on('disconnect', async () => {
      logger.info(`Realtime disconnect ${socket.id} for user ${userId}`);
      connectedClients.dec({ tenant: tenantId });
      for (const investigationId of joinedInvestigations) {
        try {
          const presence = await removePresence(
            investigationId,
            socket.user!.id,
          );
          await broadcastPresence(investigationId, presence);
          const activityEntry = await recordActivity(investigationId, {
            type: 'presence',
            action: 'disconnect',
            actorId: socket.user!.id,
            actorName: displayName(),
            details: { status: 'offline' },
          });
          ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
        } catch (err) {
          logger.warn(
            { err: (err as Error).message, investigationId },
            'Failed to clean up presence on disconnect',
          );
        }
      }
    });
  });

  ioInstance = io;

  ns.on('connection', (socket: UserSocket) => {
    registerDashboardHandlers(ns as any, socket);
  });

  initGraphSync(ns);
  return io;
}

export function getIO(): Server | null {
  return ioInstance;
}

export async function shutdownSocket(): Promise<void> {
  if (ioInstance) {
    logger.info('Shutting down Socket.io server...');
    const io = ioInstance;

    // Close the adapter (Redis connections)
    // The Redis Adapter itself doesn't expose a clean public 'close' method on the class that closes the redis clients
    // if they were passed in externally (which they were).
    // However, we should try to close the server.

    return new Promise<void>((resolve, reject) => {
      io.close((err) => {
        if (err) {
          logger.error('Error closing Socket.io server', err);
          reject(err);
        } else {
          logger.info('Socket.io server closed');
          resolve();
        }
      });
    });
  }
}
