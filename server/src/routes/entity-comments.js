"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const express_1 = require("express");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const postgres_js_1 = require("../db/postgres.js");
const EntityCommentService_js_1 = require("../entities/comments/EntityCommentService.js");
const access_js_1 = require("../entities/comments/access.js");
const opa_client_js_1 = require("../services/opa-client.js");
const types_js_1 = require("../notifications/types.js");
const emit_js_1 = require("../audit/emit.js");
const routeLogger = logger_js_1.default.child({ name: 'EntityCommentRoutes' });
const entityCommentsRouter = (0, express_1.Router)();
const authorizer = (0, access_js_1.createEntityCommentAuthorizer)(opa_client_js_1.opaClient);
function getRequestContext(req) {
    const tenantId = String(req.headers['x-tenant-id'] || req.headers['x-tenant'] || '');
    // SEC-2025-006: Do not trust x-user-id header for entity comments.
    // Rely exclusively on the authenticated req.user object.
    const userId = req.user?.id || req.user?.sub || req.user?.email || 'system';
    return {
        tenantId: tenantId || null,
        userId,
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
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new EntityCommentService_js_1.EntityCommentService(pg);
        const comment = await service.addComment({
            tenantId,
            entityId: id,
            entityType,
            entityLabel,
            authorId: userId,
            content,
            metadata,
            attachments: (attachments || []),
        });
        await (0, emit_js_1.emitAuditEvent)({
            eventId: (0, node_crypto_1.randomUUID)(),
            occurredAt: new Date().toISOString(),
            actor: {
                type: 'user',
                id: userId,
                name: req.user?.username || req.user?.email || userId,
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
        }, {
            correlationId: req.headers['x-request-id'],
            serviceId: 'entities',
        }).catch((error) => {
            routeLogger.warn({ error: error.message, entityId: id }, 'Failed to emit entity comment audit event');
        });
        const notificationService = req.app?.locals?.notificationService;
        if (notificationService && comment.mentions.length > 0) {
            await Promise.all(comment.mentions.map((mention) => {
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
                    channels: [types_js_1.NotificationChannel.IN_APP],
                };
                if (typeof notificationService.sendAsync === 'function') {
                    return notificationService.sendAsync(payload);
                }
                if (typeof notificationService.send === 'function') {
                    return notificationService.send(payload);
                }
                return Promise.resolve();
            }));
        }
        res.status(201).json(comment);
    }
    catch (error) {
        if (error instanceof access_js_1.EntityCommentAccessError) {
            return res.status(error.status).json({ error: error.code });
        }
        routeLogger.error({ error: error.message }, 'Failed to add entity comment');
        res.status(500).json({ error: error.message });
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
        const limit = req.query.limit
            ? parseInt(req.query.limit, 10)
            : undefined;
        const offset = req.query.offset
            ? parseInt(req.query.offset, 10)
            : undefined;
        await authorizer({
            userId,
            tenantId,
            entityId: id,
            action: 'comment:read',
        });
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new EntityCommentService_js_1.EntityCommentService(pg);
        const comments = await service.listComments(tenantId, id, limit, offset, {
            includeDeleted: String(req.query.includeDeleted || '') === 'true',
        });
        res.json(comments);
    }
    catch (error) {
        if (error instanceof access_js_1.EntityCommentAccessError) {
            return res.status(error.status).json({ error: error.code });
        }
        routeLogger.error({ error: error.message }, 'Failed to list entity comments');
        res.status(500).json({ error: error.message });
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
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new EntityCommentService_js_1.EntityCommentService(pg);
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
        const deleted = await service.softDeleteComment(tenantId, commentId, userId, req.body?.reason);
        if (!deleted) {
            return res.status(404).json({ error: 'comment_not_found' });
        }
        await (0, emit_js_1.emitAuditEvent)({
            eventId: (0, node_crypto_1.randomUUID)(),
            occurredAt: new Date().toISOString(),
            actor: {
                type: 'user',
                id: userId,
                name: req.user?.username || req.user?.email || userId,
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
        }, {
            correlationId: req.headers['x-request-id'],
            serviceId: 'entities',
        }).catch((error) => {
            routeLogger.warn({ error: error.message, entityId, commentId }, 'Failed to emit entity comment delete audit event');
        });
        res.json({ status: 'deleted', comment: deleted });
    }
    catch (error) {
        if (error instanceof access_js_1.EntityCommentAccessError) {
            return res.status(error.status).json({ error: error.code });
        }
        routeLogger.error({ error: error.message }, 'Failed to delete entity comment');
        res.status(500).json({ error: error.message });
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
        const pg = (0, postgres_js_1.getPostgresPool)();
        const service = new EntityCommentService_js_1.EntityCommentService(pg);
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
        await (0, emit_js_1.emitAuditEvent)({
            eventId: (0, node_crypto_1.randomUUID)(),
            occurredAt: new Date().toISOString(),
            actor: {
                type: 'user',
                id: userId,
                name: req.user?.username || req.user?.email || userId,
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
        }, {
            correlationId: req.headers['x-request-id'],
            serviceId: 'entities',
        }).catch((error) => {
            routeLogger.warn({ error: error.message, entityId, commentId }, 'Failed to emit entity comment restore audit event');
        });
        res.json({ status: 'restored', comment: restored });
    }
    catch (error) {
        if (error instanceof access_js_1.EntityCommentAccessError) {
            return res.status(error.status).json({ error: error.code });
        }
        routeLogger.error({ error: error.message }, 'Failed to restore entity comment');
        res.status(500).json({ error: error.message });
    }
});
exports.default = entityCommentsRouter;
