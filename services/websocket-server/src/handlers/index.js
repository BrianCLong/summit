"use strict";
/**
 * WebSocket Event Handlers
 * Registers all Socket.IO event handlers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEventHandlers = registerEventHandlers;
const logger_js_1 = require("../utils/logger.js");
const metrics = __importStar(require("../metrics/prometheus.js"));
const presence_js_1 = require("./presence.js");
const rooms_js_1 = require("./rooms.js");
const messages_js_1 = require("./messages.js");
const collaboration_js_1 = require("./collaboration.js");
function registerEventHandlers(deps) {
    const { io, connectionManager, presenceManager, roomManager, messagePersistence, rateLimiter } = deps;
    io.on('connection', (socket) => {
        const authSocket = socket;
        const startTime = Date.now();
        logger_js_1.logger.info({
            connectionId: authSocket.connectionId,
            userId: authSocket.user.userId,
            tenantId: authSocket.tenantId,
        }, 'Client connected');
        // Register connection
        connectionManager.register(authSocket);
        metrics.recordConnectionStart(authSocket.tenantId);
        // Send connection established event
        authSocket.emit('connection:established', {
            connectionId: authSocket.connectionId,
            tenantId: authSocket.tenantId,
        });
        // Register specific handlers
        (0, presence_js_1.registerPresenceHandlers)(authSocket, deps);
        (0, rooms_js_1.registerRoomHandlers)(authSocket, deps);
        (0, messages_js_1.registerMessageHandlers)(authSocket, deps);
        (0, collaboration_js_1.registerCollaborationHandlers)(authSocket, deps);
        // Handle disconnection
        authSocket.on('disconnect', async (reason) => {
            const duration = (Date.now() - startTime) / 1000;
            logger_js_1.logger.info({
                connectionId: authSocket.connectionId,
                userId: authSocket.user.userId,
                tenantId: authSocket.tenantId,
                reason,
                durationSeconds: duration,
            }, 'Client disconnected');
            // Unregister connection
            connectionManager.unregister(authSocket.connectionId);
            // Leave all rooms
            roomManager.leaveAll(authSocket.connectionId);
            // Remove presence from all rooms where user was active
            const rooms = roomManager.getSocketRooms(authSocket.connectionId);
            for (const room of rooms) {
                await presenceManager.removePresence(room, authSocket.user.userId);
                // Broadcast presence update
                const presence = await presenceManager.getRoomPresence(room);
                authSocket.to(room).emit('presence:update', { room, presence });
            }
            // Record metrics
            metrics.recordConnectionEnd(authSocket.tenantId, reason, duration);
        });
        // Handle errors
        authSocket.on('error', (error) => {
            logger_js_1.logger.error({
                connectionId: authSocket.connectionId,
                error: error.message,
            }, 'Socket error');
            metrics.recordError(authSocket.tenantId, 'socket_error', 'unknown');
        });
        // Update activity on any event
        authSocket.onAny(() => {
            connectionManager.updateActivity(authSocket.connectionId);
        });
    });
    // Handle cluster events
    io.on('cluster:broadcast', (data) => {
        logger_js_1.logger.debug({ event: data.event }, 'Cluster broadcast received');
        io.emit('broadcast', data); // Cast as any if broadcast is not in typed events
        metrics.clusterBroadcasts.inc({ event: data.event });
    });
    logger_js_1.logger.info('Event handlers registered');
}
