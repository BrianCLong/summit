"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroEvents = void 0;
exports.registerMaestroHandlers = registerMaestroHandlers;
const pino_1 = __importDefault(require("pino"));
// @ts-ignore
const logger = pino_1.default({ name: 'maestro-ws' });
function registerMaestroHandlers(io, socket) {
    const userId = socket.user?.id || 'unknown';
    const tenantId = socket.tenantId || 'default';
    // Scoped room helper
    const runRoom = (runId) => `tenant:${tenantId}:run:${runId}`;
    const logsRoom = (runId) => `tenant:${tenantId}:logs:${runId}`;
    const statusRoom = (runId) => `tenant:${tenantId}:status:${runId}`;
    // Agent Execution Progress
    socket.on('maestro:subscribe_run', async (payload) => {
        if (!payload || typeof payload !== 'object' || !payload.runId)
            return;
        const { runId } = payload;
        try {
            const room = runRoom(runId);
            await socket.join(room);
            socket.emit('maestro:subscribed', { type: 'run', runId });
            logger.debug({ userId, runId }, 'Subscribed to run updates');
        }
        catch (error) {
            logger.error({ userId, runId, error }, 'Failed to subscribe to run');
            socket.emit('maestro:error', { code: 'SUBSCRIPTION_FAILED', message: 'Failed to subscribe to run' });
        }
    });
    socket.on('maestro:unsubscribe_run', async (payload) => {
        if (!payload || typeof payload !== 'object' || !payload.runId)
            return;
        const { runId } = payload;
        const room = runRoom(runId);
        await socket.leave(room);
        socket.emit('maestro:unsubscribed', { type: 'run', runId });
    });
    // Real-time Log Streaming
    socket.on('maestro:subscribe_logs', async (payload) => {
        if (!payload || typeof payload !== 'object' || !payload.runId)
            return;
        const { runId } = payload;
        try {
            const room = logsRoom(runId);
            await socket.join(room);
            socket.emit('maestro:subscribed', { type: 'logs', runId });
            logger.debug({ userId, runId }, 'Subscribed to log stream');
        }
        catch (error) {
            logger.error({ userId, runId, error }, 'Failed to subscribe to logs');
            socket.emit('maestro:error', { code: 'SUBSCRIPTION_FAILED', message: 'Failed to subscribe to logs' });
        }
    });
    socket.on('maestro:unsubscribe_logs', async (payload) => {
        if (!payload || typeof payload !== 'object' || !payload.runId)
            return;
        const { runId } = payload;
        const room = logsRoom(runId);
        await socket.leave(room);
        socket.emit('maestro:unsubscribed', { type: 'logs', runId });
    });
    // Global Status/Dashboard Updates (for lists of runs)
    socket.on('maestro:subscribe_status', async () => {
        const room = `tenant:${tenantId}:maestro:status`;
        await socket.join(room);
        socket.emit('maestro:subscribed', { type: 'status' });
    });
    socket.on('maestro:unsubscribe_status', async () => {
        const room = `tenant:${tenantId}:maestro:status`;
        await socket.leave(room);
        socket.emit('maestro:unsubscribed', { type: 'status' });
    });
}
/**
 * Server-side helper to emit events to rooms.
 * This should be used by backend services (e.g. via an internal event bus or direct call if in same process).
 * If scaling horizontally, use Redis Adapter broadcast or Redis Pub/Sub directly.
 */
exports.MaestroEvents = {
    emitRunUpdate: (io, tenantId, runId, data) => {
        io.to(`tenant:${tenantId}:run:${runId}`).emit('maestro:run_update', {
            runId,
            ...data,
            timestamp: Date.now()
        });
    },
    emitLog: (io, tenantId, runId, logEntry) => {
        io.to(`tenant:${tenantId}:logs:${runId}`).emit('maestro:log', {
            runId,
            entry: logEntry,
            timestamp: Date.now()
        });
    },
    emitStatusChange: (io, tenantId, runId, status) => {
        // Emit to specific run room
        io.to(`tenant:${tenantId}:run:${runId}`).emit('maestro:status_change', {
            runId,
            status,
            timestamp: Date.now()
        });
        // Emit to global dashboard
        io.to(`tenant:${tenantId}:maestro:status`).emit('maestro:status_update', {
            runId,
            status,
            timestamp: Date.now()
        });
    }
};
