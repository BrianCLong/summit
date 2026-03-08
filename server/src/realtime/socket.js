"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideVerifyToken = overrideVerifyToken;
exports.initSocket = initSocket;
exports.getIO = getIO;
const node_crypto_1 = require("node:crypto");
const socket_io_1 = require("socket.io");
const auth_js_1 = require("../lib/auth.js");
const pino_1 = __importDefault(require("pino"));
const graph_crdt_js_1 = require("./graph-crdt.js");
const collaborationHub_js_1 = require("./collaborationHub.js");
const investigationState_js_1 = require("./investigationState.js");
const investigationAccess_js_1 = require("./investigationAccess.js");
const dashboard_js_1 = require("./dashboard.js");
const emit_js_1 = require("../audit/emit.js");
const logger = pino_1.default();
let verifyToken = auth_js_1.verifyToken;
function overrideVerifyToken(fn) {
    verifyToken = fn ?? auth_js_1.verifyToken;
}
let ioInstance = null;
function initSocket(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
            credentials: true,
        },
    });
    (0, collaborationHub_js_1.createCollaborationHub)(io);
    const ns = io.of('/realtime');
    ns.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');
            const user = await verifyToken(token);
            if (!user) {
                logger.warn({ token }, 'Unauthorized socket connection attempt');
                return next(new Error('Unauthorized'));
            }
            socket.user = user;
            socket.tenantId =
                socket.handshake.auth?.tenantId || user?.tenantId || 'default';
            next();
        }
        catch (e) {
            logger.warn({ error: e.message }, 'Unauthorized socket connection attempt');
            next(new Error('Unauthorized'));
        }
    });
    ns.on('connection', (socket) => {
        const userId = socket.user?.id;
        logger.info(`Realtime connected ${socket.id} for user ${userId}`);
        const joinedInvestigations = new Set();
        const displayName = () => socket.user?.username || socket.user?.email || socket.user?.id || 'user';
        const emitRealtimeAudit = async (actionType, target, metadata) => {
            if (!socket.user?.id || !socket.tenantId)
                return;
            try {
                await (0, emit_js_1.emitAuditEvent)({
                    eventId: (0, node_crypto_1.randomUUID)(),
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
                }, {
                    correlationId: socket.id,
                    serviceId: 'realtime',
                });
            }
            catch (err) {
                logger.warn({ err: err.message, actionType }, 'Failed to emit realtime audit event');
            }
        };
        const roomFor = (investigationId) => `tenant:${socket.tenantId}:investigation:${investigationId}`;
        const ensureAuthorized = async (investigationId, action) => {
            const result = await (0, investigationAccess_js_1.authorizeInvestigationAction)(investigationId, socket.user, action);
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
        const broadcastPresence = async (investigationId, presence) => {
            ns.to(roomFor(investigationId)).emit('presence:update', {
                investigationId,
                presence,
            });
        };
        socket.on('investigation:join', async ({ investigationId }) => {
            if (!investigationId || !socket.user?.id)
                return;
            try {
                const auth = await ensureAuthorized(investigationId, 'view');
                if (!auth.allowed)
                    return;
                socket.join(roomFor(investigationId));
                socket.join(`graph:${investigationId}`);
                joinedInvestigations.add(investigationId);
                const [annotations, comments, activity, members] = await Promise.all([
                    (0, investigationState_js_1.getAnnotations)(investigationId),
                    (0, investigationState_js_1.getComments)(investigationId),
                    (0, investigationState_js_1.getActivity)(investigationId, 50),
                    (0, investigationAccess_js_1.getMembers)(investigationId),
                ]);
                const graph = (0, graph_crdt_js_1.getGraphSnapshot)(investigationId);
                const presence = await (0, investigationState_js_1.setPresence)(investigationId, {
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
                const activityEntry = await (0, investigationState_js_1.recordActivity)(investigationId, {
                    type: 'presence',
                    action: 'join',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { status: 'online' },
                });
                ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
                await emitRealtimeAudit('presence.join', {
                    type: 'presence',
                    id: socket.user.id,
                    path: `investigations/${investigationId}`,
                }, {
                    investigationId,
                    status: 'online',
                    presenceCount: presence.length,
                });
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId }, 'Failed to join investigation room');
                socket.emit('investigation:error', {
                    investigationId,
                    message: 'Unable to join investigation',
                    code: 'JOIN_FAILED',
                });
            }
        });
        socket.on('investigation:leave', async ({ investigationId }) => {
            if (!investigationId || !joinedInvestigations.has(investigationId)) {
                return;
            }
            joinedInvestigations.delete(investigationId);
            socket.leave(roomFor(investigationId));
            socket.leave(`graph:${investigationId}`);
            try {
                const presence = await (0, investigationState_js_1.removePresence)(investigationId, socket.user.id);
                await broadcastPresence(investigationId, presence);
                const activityEntry = await (0, investigationState_js_1.recordActivity)(investigationId, {
                    type: 'presence',
                    action: 'leave',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { status: 'offline' },
                });
                ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
                await emitRealtimeAudit('presence.leave', {
                    type: 'presence',
                    id: socket.user.id,
                    path: `investigations/${investigationId}`,
                }, {
                    investigationId,
                    status: 'offline',
                    presenceCount: presence.length,
                });
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId }, 'Failed to leave investigation room cleanly');
            }
        });
        socket.on('presence:heartbeat', async ({ investigationId, status }) => {
            if (!investigationId || !joinedInvestigations.has(investigationId)) {
                return;
            }
            try {
                const presence = await (0, investigationState_js_1.touchPresence)(investigationId, socket.user.id, status || 'online');
                await broadcastPresence(investigationId, presence);
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId }, 'Failed to refresh presence');
            }
        });
        socket.on('presence:set_status', async ({ investigationId, status }) => {
            if (!investigationId || !joinedInvestigations.has(investigationId)) {
                return;
            }
            try {
                const presence = await (0, investigationState_js_1.touchPresence)(investigationId, socket.user.id, status);
                await broadcastPresence(investigationId, presence);
                const activityEntry = await (0, investigationState_js_1.recordActivity)(investigationId, {
                    type: 'presence',
                    action: 'status',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { status },
                });
                ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
                await emitRealtimeAudit('presence.status', {
                    type: 'presence',
                    id: socket.user.id,
                    path: `investigations/${investigationId}`,
                }, {
                    investigationId,
                    status,
                    presenceCount: presence.length,
                });
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId }, 'Failed to update presence status');
            }
        });
        socket.on('annotation:add', async (payload) => {
            if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(payload.investigationId, 'edit');
            if (!auth.allowed)
                return;
            try {
                const annotation = await (0, investigationState_js_1.addAnnotation)(payload.investigationId, {
                    targetId: payload.targetId,
                    text: payload.text,
                    authorId: socket.user.id,
                    authorName: displayName(),
                    position: payload.position ?? null,
                    resolved: payload.resolved,
                });
                ns.to(roomFor(payload.investigationId)).emit('annotation:added', {
                    investigationId: payload.investigationId,
                    annotation,
                });
                const activityEntry = await (0, investigationState_js_1.recordActivity)(payload.investigationId, {
                    type: 'annotation',
                    action: 'added',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { annotationId: annotation.id, targetId: annotation.targetId },
                });
                ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId: payload.investigationId }, 'Failed to add annotation');
            }
        });
        socket.on('annotation:update', async (payload) => {
            if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(payload.investigationId, 'edit');
            if (!auth.allowed)
                return;
            try {
                const updated = await (0, investigationState_js_1.updateAnnotation)(payload.investigationId, payload.annotationId, {
                    text: payload.text,
                    position: payload.position,
                    resolved: payload.resolved,
                });
                if (!updated)
                    return;
                ns.to(roomFor(payload.investigationId)).emit('annotation:updated', {
                    investigationId: payload.investigationId,
                    annotation: updated,
                });
                const activityEntry = await (0, investigationState_js_1.recordActivity)(payload.investigationId, {
                    type: 'annotation',
                    action: 'updated',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { annotationId: payload.annotationId },
                });
                ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId: payload.investigationId }, 'Failed to update annotation');
            }
        });
        socket.on('annotation:delete', async ({ investigationId, annotationId }) => {
            if (!investigationId || !joinedInvestigations.has(investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(investigationId, 'edit');
            if (!auth.allowed)
                return;
            try {
                await (0, investigationState_js_1.deleteAnnotation)(investigationId, annotationId);
                ns.to(roomFor(investigationId)).emit('annotation:deleted', {
                    investigationId,
                    annotationId,
                });
                const activityEntry = await (0, investigationState_js_1.recordActivity)(investigationId, {
                    type: 'annotation',
                    action: 'deleted',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { annotationId },
                });
                ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId }, 'Failed to delete annotation');
            }
        });
        socket.on('comment:add', async (payload) => {
            if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(payload.investigationId, 'comment');
            if (!auth.allowed)
                return;
            try {
                const comment = await (0, investigationState_js_1.addComment)(payload.investigationId, {
                    threadId: payload.threadId,
                    targetId: payload.targetId,
                    message: payload.message,
                    authorId: socket.user.id,
                    authorName: displayName(),
                });
                ns.to(roomFor(payload.investigationId)).emit('comment:added', {
                    investigationId: payload.investigationId,
                    comment,
                });
                const activityEntry = await (0, investigationState_js_1.recordActivity)(payload.investigationId, {
                    type: 'comment',
                    action: 'added',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { commentId: comment.id, threadId: comment.threadId },
                });
                ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
                await emitRealtimeAudit('comment.added', {
                    type: 'comment',
                    id: comment.id,
                    path: `investigations/${payload.investigationId}`,
                }, {
                    investigationId: payload.investigationId,
                    targetId: payload.targetId,
                    threadId: payload.threadId,
                    messageLength: payload.message?.length ?? 0,
                });
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId: payload.investigationId }, 'Failed to add comment');
            }
        });
        socket.on('comment:update', async (payload) => {
            if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(payload.investigationId, 'comment');
            if (!auth.allowed)
                return;
            try {
                const updated = await (0, investigationState_js_1.updateComment)(payload.investigationId, payload.commentId, {
                    message: payload.message,
                });
                if (!updated)
                    return;
                ns.to(roomFor(payload.investigationId)).emit('comment:updated', {
                    investigationId: payload.investigationId,
                    comment: updated,
                });
                const activityEntry = await (0, investigationState_js_1.recordActivity)(payload.investigationId, {
                    type: 'comment',
                    action: 'updated',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { commentId: payload.commentId },
                });
                ns.to(roomFor(payload.investigationId)).emit('activity:event', activityEntry);
                await emitRealtimeAudit('comment.updated', {
                    type: 'comment',
                    id: payload.commentId,
                    path: `investigations/${payload.investigationId}`,
                }, {
                    investigationId: payload.investigationId,
                    messageLength: payload.message?.length ?? 0,
                });
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId: payload.investigationId }, 'Failed to update comment');
            }
        });
        socket.on('comment:delete', async ({ investigationId, commentId }) => {
            if (!investigationId || !joinedInvestigations.has(investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(investigationId, 'comment');
            if (!auth.allowed)
                return;
            try {
                await (0, investigationState_js_1.deleteComment)(investigationId, commentId);
                ns.to(roomFor(investigationId)).emit('comment:deleted', {
                    investigationId,
                    commentId,
                });
                const activityEntry = await (0, investigationState_js_1.recordActivity)(investigationId, {
                    type: 'comment',
                    action: 'deleted',
                    actorId: socket.user.id,
                    actorName: displayName(),
                    details: { commentId },
                });
                ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
                await emitRealtimeAudit('comment.deleted', {
                    type: 'comment',
                    id: commentId,
                    path: `investigations/${investigationId}`,
                }, {
                    investigationId,
                });
            }
            catch (err) {
                logger.warn({ err: err.message, investigationId }, 'Failed to delete comment');
            }
        });
        socket.on('activity:fetch', async (payload) => {
            if (!payload?.investigationId || !joinedInvestigations.has(payload.investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(payload.investigationId, 'view');
            if (!auth.allowed)
                return;
            const list = await (0, investigationState_js_1.getActivity)(payload.investigationId, payload.limit ?? 50);
            socket.emit('activity:list', {
                investigationId: payload.investigationId,
                activity: list,
            });
        });
        socket.on('entity_update', async (payload) => {
            const investigationId = payload.graphId || payload.investigationId;
            if (!investigationId || !joinedInvestigations.has(investigationId)) {
                return;
            }
            const auth = await ensureAuthorized(investigationId, 'edit');
            if (!auth.allowed)
                return;
            const eventPayload = {
                userId: socket.user.id,
                username: displayName(),
                entityId: payload.entityId,
                changes: payload.changes,
                ts: Date.now(),
            };
            socket.to(`graph:${investigationId}`).emit('entity_updated', eventPayload);
            ns.to(roomFor(investigationId)).emit('entity_updated', eventPayload);
            const activityEntry = await (0, investigationState_js_1.recordActivity)(investigationId, {
                type: 'entity',
                action: 'updated',
                actorId: socket.user.id,
                actorName: displayName(),
                details: { entityId: payload.entityId },
            });
            ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
        });
        (0, graph_crdt_js_1.registerGraphHandlers)(socket, {
            authorize: async (graphId, op, intent) => {
                if (!joinedInvestigations.has(graphId))
                    return false;
                const action = intent === 'mutate' ? 'edit' : 'view';
                const auth = await (0, investigationAccess_js_1.authorizeInvestigationAction)(graphId, socket.user, action);
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
                    const activityEntry = await (0, investigationState_js_1.recordActivity)(graphId, {
                        type: 'graph',
                        action: `${op.kind}:${op.action}`,
                        actorId: op.meta?.actorId || socket.user?.id || 'unknown',
                        actorName: op.meta?.actorName || displayName(),
                        details: { id: op.id, kind: op.kind, action: op.action },
                    });
                    ns.to(roomFor(graphId)).emit('activity:event', activityEntry);
                }
                catch (err) {
                    logger.warn({ err: err.message, graphId }, 'Failed to record graph activity entry');
                }
            },
        });
        socket.on('disconnect', async () => {
            logger.info(`Realtime disconnect ${socket.id} for user ${userId}`);
            for (const investigationId of joinedInvestigations) {
                try {
                    const presence = await (0, investigationState_js_1.removePresence)(investigationId, socket.user.id);
                    await broadcastPresence(investigationId, presence);
                    const activityEntry = await (0, investigationState_js_1.recordActivity)(investigationId, {
                        type: 'presence',
                        action: 'disconnect',
                        actorId: socket.user.id,
                        actorName: displayName(),
                        details: { status: 'offline' },
                    });
                    ns.to(roomFor(investigationId)).emit('activity:event', activityEntry);
                    await emitRealtimeAudit('presence.disconnect', {
                        type: 'presence',
                        id: socket.user.id,
                        path: `investigations/${investigationId}`,
                    }, {
                        investigationId,
                        status: 'offline',
                        presenceCount: presence.length,
                    });
                }
                catch (err) {
                    logger.warn({ err: err.message, investigationId }, 'Failed to clean up presence on disconnect');
                }
            }
        });
    });
    ioInstance = io;
    ns.on('connection', (socket) => {
        (0, dashboard_js_1.registerDashboardHandlers)(ns, socket);
    });
    (0, graph_crdt_js_1.initGraphSync)(ns);
    return io;
}
function getIO() {
    return ioInstance;
}
