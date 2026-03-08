"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPresenceHandlers = registerPresenceHandlers;
const node_crypto_1 = require("node:crypto");
const pino_1 = __importDefault(require("pino"));
const emit_js_1 = require("../audit/emit.js");
const logger = pino_1.default();
const presence = new Map();
function broadcast(workspaceId, socket) {
    const list = Array.from(presence.get(workspaceId)?.values() || []);
    socket.to(`workspace:${workspaceId}`).emit('presence:update', list);
    socket.emit('presence:update', list);
}
function registerPresenceHandlers(socket) {
    const user = socket.user;
    const workspaceId = socket.handshake.auth?.workspaceId;
    if (!user?.id || !workspaceId) {
        return;
    }
    const tenantId = socket.handshake.auth?.tenantId || user?.tenantId;
    const username = user.username || user.email || 'unknown';
    const displayName = () => username;
    const emitPresenceAudit = async (actionType, status) => {
        if (!tenantId)
            return;
        try {
            await (0, emit_js_1.emitAuditEvent)({
                eventId: (0, node_crypto_1.randomUUID)(),
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
            }, {
                correlationId: socket.id,
                serviceId: 'realtime',
            });
        }
        catch (err) {
            logger.warn({ err: err.message, actionType }, 'Failed to emit presence audit event');
        }
    };
    socket.join(`workspace:${workspaceId}`);
    const wsMap = presence.get(workspaceId) || new Map();
    wsMap.set(user.id, {
        userId: user.id,
        username,
        status: 'online',
        ts: Date.now(),
    });
    presence.set(workspaceId, wsMap);
    broadcast(workspaceId, socket);
    void emitPresenceAudit('presence.join', 'online');
    socket.on('presence:update', (status) => {
        const map = presence.get(workspaceId);
        if (!map)
            return;
        map.set(user.id, {
            userId: user.id,
            username,
            status,
            ts: Date.now(),
        });
        broadcast(workspaceId, socket);
        void emitPresenceAudit('presence.status', status);
    });
    socket.on('disconnect', () => {
        const map = presence.get(workspaceId);
        if (!map)
            return;
        map.delete(user.id);
        if (map.size === 0)
            presence.delete(workspaceId);
        socket
            .to(`workspace:${workspaceId}`)
            .emit('presence:update', Array.from(map.values()));
        logger.info({ userId: user.id, workspaceId }, 'presence:disconnect');
        void emitPresenceAudit('presence.leave', 'offline');
    });
}
