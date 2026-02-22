import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import logger from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';
import {
  EntityCommentService,
  type EntityCommentAttachmentInput,
} from '../entities/comments/EntityCommentService.js';
import {
  createEntityCommentAuthorizer,
  EntityCommentAccessError,
} from '../entities/comments/access.js';
import { opaClient } from '../services/opa-client.js';
import { NotificationChannel } from '../notifications/types.js';
import { emitAuditEvent } from '../audit/emit.js';

const routeLogger = logger.child({ name: 'EntityCommentRoutes' });
const entityCommentsRouter = Router();
const authorizer = createEntityCommentAuthorizer(opaClient);

function getRequestContext(req: any): {
  tenantId: string | null;
  userId: string | null;
} {
  const tenantId = String(
    req.headers['x-tenant-id'] || req.headers['x-tenant'] || '',
  );
  const userId =
    req.user?.id || req.headers['x-user-id'] || req.user?.email || 'system';

  return {
    tenantId: tenantId || null,
    userId: userId || null,
  };
}

entityCommentsRouter.post('/:id/comments', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;
    const { content, entityType, entityLabel, metadata, attachments } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content_required' });
    }

    await authorizer({
      userId,
      tenantId,
      entityId: id,
      action: 'comment:write',
    });

    const pg = getPostgresPool();
    const service = new EntityCommentService(pg);

    const comment = await service.addComment({
      tenantId,
      entityId: id,
      entityType,
      entityLabel,
      authorId: userId,
      content,
      metadata,
      attachments: (attachments || []) as EntityCommentAttachmentInput[],
    });

    await emitAuditEvent(
      {
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        actor: {
          type: 'user',
          id: userId,
          name: (req.user as any)?.username || (req.user as any)?.email || userId,
          ipAddress: req.ip,
        },
        action: {
          type: 'comment.added',
          outcome: 'success',
        },
        tenantId,
        target: {
          type: 'entity_comment',
          id: comment.id,
          path: `entities/${id}`,
        },
        metadata: {
          entityId: id,
          entityType,
          commentId: comment.id,
          mentionCount: comment.mentions.length,
          attachmentCount: comment.attachments.length,
          messageLength: String(content).length,
          userAgent: req.headers['user-agent'],
        },
      },
      {
        correlationId: req.headers['x-request-id'] as string,
        serviceId: 'entities',
      },
    ).catch((error) => {
      routeLogger.warn(
        { error: (error as Error).message, entityId: id },
        'Failed to emit entity comment audit event',
      );
    });

    const notificationService = req.app?.locals?.notificationService;
    if (notificationService && comment.mentions.length > 0) {
      await Promise.all(
        comment.mentions.map((mention) => {
          const payload = {
            userId: mention.userId,
            type: 'entity_comment_mention',
            subject: 'You were mentioned in a comment',
            message: `You were mentioned in a comment on entity ${entityLabel || id}.`,
            data: {
              entityId: id,
              commentId: comment.id,
              mentionedBy: userId,
            },
            channels: [NotificationChannel.IN_APP],
          };

          if (typeof notificationService.sendAsync === 'function') {
            return notificationService.sendAsync(payload);
          }
          if (typeof notificationService.send === 'function') {
            return notificationService.send(payload);
          }
          return Promise.resolve();
        }),
      );
    }

    res.status(201).json(comment);
  } catch (error: any) {
    if (error instanceof EntityCommentAccessError) {
      return res.status(error.status).json({ error: error.code });
    }
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to add entity comment',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

entityCommentsRouter.get('/:id/comments', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id } = req.params;
    const limit = (req.query.limit as any)
      ? parseInt(req.query.limit as string, 10)
      : undefined;
    const offset = (req.query.offset as any)
      ? parseInt(req.query.offset as string, 10)
      : undefined;

    await authorizer({
      userId,
      tenantId,
      entityId: id,
      action: 'comment:read',
    });

    const pg = getPostgresPool();
    const service = new EntityCommentService(pg);

    const comments = await service.listComments(
      tenantId,
      id,
      limit,
      offset,
      {
        includeDeleted: String((req.query.includeDeleted as any) || '') === 'true',
      },
    );

    res.json(comments);
  } catch (error: any) {
    if (error instanceof EntityCommentAccessError) {
      return res.status(error.status).json({ error: error.code });
    }
    routeLogger.error(
      { error: (error as Error).message },
      'Failed to list entity comments',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

entityCommentsRouter.post('/:id/comments/:commentId/delete', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id: entityId, commentId } = req.params;
    const pg = getPostgresPool();
    const service = new EntityCommentService(pg);
    const comment = await service.getCommentById(tenantId, commentId);

    if (!comment || comment.entityId !== entityId) {
      return res.status(404).json({ error: 'comment_not_found' });
    }

    const isOwner = comment.authorId === userId;
    if (!isOwner) {
      await authorizer({
        userId,
        tenantId,
        entityId,
        action: 'comment:delete',
      });
    }

    const deleted = await service.softDeleteComment(
      tenantId,
      commentId,
      userId,
      req.body?.reason,
    );

    if (!deleted) {
      return res.status(404).json({ error: 'comment_not_found' });
    }

    await emitAuditEvent(
      {
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        actor: {
          type: 'user',
          id: userId,
          name: (req.user as any)?.username || (req.user as any)?.email || userId,
          ipAddress: req.ip,
        },
        action: {
          type: 'comment.deleted',
          outcome: 'success',
        },
        tenantId,
        target: {
          type: 'entity_comment',
          id: commentId,
          path: `entities/${entityId}`,
        },
        metadata: {
          entityId,
          commentId,
          deleteReason: req.body?.reason,
          purgeAfter: deleted.metadata?.purgeAfter,
        },
      },
      {
        correlationId: req.headers['x-request-id'] as string,
        serviceId: 'entities',
      },
    ).catch((error) => {
      routeLogger.warn(
        { error: (error as Error).message, entityId, commentId },
        'Failed to emit entity comment delete audit event',
      );
    });

    res.json({ status: 'deleted', comment: deleted });
  } catch (error: any) {
    if (error instanceof EntityCommentAccessError) {
      return res.status(error.status).json({ error: error.code });
    }

    routeLogger.error(
      { error: (error as Error).message },
      'Failed to delete entity comment',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

entityCommentsRouter.post('/:id/comments/:commentId/restore', async (req, res) => {
  try {
    const { tenantId, userId } = getRequestContext(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_required' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'user_required' });
    }

    const { id: entityId, commentId } = req.params;
    const pg = getPostgresPool();
    const service = new EntityCommentService(pg);
    const comment = await service.getCommentById(tenantId, commentId);

    if (!comment || comment.entityId !== entityId) {
      return res.status(404).json({ error: 'comment_not_found' });
    }

    const isOwner = comment.authorId === userId;
    if (!isOwner) {
      await authorizer({
        userId,
        tenantId,
        entityId,
        action: 'comment:restore',
      });
    }

    const restored = await service.restoreComment(tenantId, commentId, userId);
    if (!restored) {
      return res.status(404).json({ error: 'comment_not_found' });
    }

    await emitAuditEvent(
      {
        eventId: randomUUID(),
        occurredAt: new Date().toISOString(),
        actor: {
          type: 'user',
          id: userId,
          name: (req.user as any)?.username || (req.user as any)?.email || userId,
          ipAddress: req.ip,
        },
        action: {
          type: 'comment.restored',
          outcome: 'success',
        },
        tenantId,
        target: {
          type: 'entity_comment',
          id: commentId,
          path: `entities/${entityId}`,
        },
        metadata: {
          entityId,
          commentId,
        },
      },
      {
        correlationId: req.headers['x-request-id'] as string,
        serviceId: 'entities',
      },
    ).catch((error) => {
      routeLogger.warn(
        { error: (error as Error).message, entityId, commentId },
        'Failed to emit entity comment restore audit event',
      );
    });

    res.json({ status: 'restored', comment: restored });
  } catch (error: any) {
    if (error instanceof EntityCommentAccessError) {
      return res.status(error.status).json({ error: error.code });
    }

    routeLogger.error(
      { error: (error as Error).message },
      'Failed to restore entity comment',
    );
    res.status(500).json({ error: (error as Error).message });
  }
});

export default entityCommentsRouter;
