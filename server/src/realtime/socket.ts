import { randomUUID } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { verifyToken as verifyTokenBase } from '../lib/auth.js';
import pino from 'pino';
import {
  initGraphSync,
  registerGraphHandlers,
  getGraphSnapshot,
  type GraphOperation,
} from './graph-crdt.js';
import { createCollaborationHub } from './collaborationHub.js';

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
import { emitAuditEvent } from '../audit/emit.js';

const logger = (pino as any)();

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

  createCollaborationHub(io);

  const ns = io.of('/realtime');

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
    logger.info(`Realtime connected ${socket.id} for user ${userId}`);

    const joinedInvestigations = new Set<string>();

    const displayName = () =>
      socket.user?.username || socket.user?.email || socket.user?.id || 'user';

    const emitRealtimeAudit = async (
      actionType: string,
      target: { type: string; id?: string; path?: string; name?: string } | undefined,
      metadata: Record<string, unknown>,
    ) => {
      if (!socket.user?.id || !socket.tenantId) return;
      try {
        await emitAuditEvent(
          {
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
            actor: {
              type: 'user',
              id: socket.user.id,
              name: displayName(),
              ipAddress: socket.handshake.address,
            },
            action: {
              type: actionType,
              outcome: 'success',
            },
            tenantId: socket.tenantId,
            target,
            metadata: {
              ...metadata,
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
          'Failed to emit realtime audit event',
        );
      }
    };

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

          await emitRealtimeAudit(
            'presence.join',
            {
              type: 'presence',
              id: socket.user.id,
              path: `investigations/${investigationId}`,
            },
            {
              investigationId,
              status: 'online',
              presenceCount: presence.length,
            },
          );
        } catch (err: any) {
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
          await emitRealtimeAudit(
            'presence.leave',
            {
              type: 'presence',
              id: socket.user!.id,
              path: `investigations/${investigationId}`,
            },
            {
              investigationId,
              status: 'offline',
              presenceCount: presence.length,
            },
          );
        } catch (err: any) {
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
        } catch (err: any) {
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
          await emitRealtimeAudit(
            'presence.status',
            {
              type: 'presence',
              id: socket.user!.id,
              path: `investigations/${investigationId}`,
            },
            {
              investigationId,
              status,
              presenceCount: presence.length,
            },
          );
        } catch (err: any) {
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
        } catch (err: any) {
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
        } catch (err: any) {
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
        } catch (err: any) {
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
        await emitRealtimeAudit(
          'comment.added',
          {
            type: 'comment',
            id: comment.id,
            path: `investigations/${payload.investigationId}`,
          },
          {
            investigationId: payload.investigationId,
            targetId: payload.targetId,
            threadId: payload.threadId,
            messageLength: payload.message?.length ?? 0,
          },
        );
      } catch (err: any) {
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
        await emitRealtimeAudit(
          'comment.updated',
          {
            type: 'comment',
            id: payload.commentId,
            path: `investigations/${payload.investigationId}`,
          },
          {
            investigationId: payload.investigationId,
            messageLength: payload.message?.length ?? 0,
          },
        );
      } catch (err: any) {
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
          await emitRealtimeAudit(
            'comment.deleted',
            {
              type: 'comment',
              id: commentId,
              path: `investigations/${investigationId}`,
            },
            {
              investigationId,
            },
          );
        } catch (err: any) {
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
        } catch (err: any) {
          logger.warn(
            { err: (err as Error).message, graphId },
            'Failed to record graph activity entry',
          );
        }
      },
    });

    socket.on('disconnect', async () => {
      logger.info(`Realtime disconnect ${socket.id} for user ${userId}`);
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
          await emitRealtimeAudit(
            'presence.disconnect',
            {
              type: 'presence',
              id: socket.user!.id,
              path: `investigations/${investigationId}`,
            },
            {
              investigationId,
              status: 'offline',
              presenceCount: presence.length,
            },
          );
        } catch (err: any) {
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
