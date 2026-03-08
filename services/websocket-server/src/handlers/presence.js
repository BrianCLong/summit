"use strict";
/**
 * Presence Event Handlers
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
exports.registerPresenceHandlers = registerPresenceHandlers;
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const logger_js_1 = require("../utils/logger.js");
const metrics = __importStar(require("../metrics/prometheus.js"));
function registerPresenceHandlers(socket, deps) {
    const { connectionManager, presenceManager, roomManager, rateLimiter, io } = deps;
    // Heartbeat to keep presence alive
    socket.on('presence:heartbeat', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, async (data) => {
        const startTime = Date.now();
        try {
            const status = data.status || 'online';
            // Update connection manager
            connectionManager.updatePresence(socket.data.connectionId, status);
            // Update presence in all rooms
            const rooms = roomManager.getSocketRooms(socket.data.connectionId);
            for (const room of rooms) {
                await presenceManager.touchPresence(room, socket.data.user.userId);
            }
            metrics.recordMessageLatency(socket.data.tenantId, 'presence:heartbeat', Date.now() - startTime);
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to process heartbeat');
            metrics.recordError(socket.data.tenantId, 'presence_heartbeat', 'error');
        }
    }));
    // Update presence status
    socket.on('presence:status', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, async (data) => {
        const startTime = Date.now();
        try {
            const { status, metadata } = data;
            const validMetadata = metadata || undefined;
            // Update connection manager
            connectionManager.updatePresence(socket.data.connectionId, status);
            // Update presence in all rooms
            const rooms = roomManager.getSocketRooms(socket.data.connectionId);
            for (const room of rooms) {
                await presenceManager.updateStatus(room, socket.data.user.userId, status, validMetadata);
                await presenceManager.updateStatus(room, socket.user.userId, status, validMetadata);
                // Broadcast to room
                const presence = await presenceManager.getRoomPresence(room);
                io.to(room).emit('presence:update', { room, presence });
            }
            metrics.presenceUpdates.inc({ tenant: socket.data.tenantId, status });
            metrics.recordMessageLatency(socket.data.tenantId, 'presence:status', Date.now() - startTime);
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to update presence status');
            socket.emit('system:error', {
                code: 'PRESENCE_UPDATE_FAILED',
                message: 'Failed to update presence status',
            });
            metrics.recordError(socket.data.tenantId, 'presence_status', 'error');
        }
    }));
}
