"use strict";
/**
 * Room Event Handlers
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
exports.registerRoomHandlers = registerRoomHandlers;
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const logger_js_1 = require("../utils/logger.js");
const metrics = __importStar(require("../metrics/prometheus.js"));
function registerRoomHandlers(socket, deps) {
    const { connectionManager, presenceManager, roomManager, rateLimiter, io } = deps;
    // Join a room
    socket.on('room:join', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, async (data, ack) => {
        const startTime = Date.now();
        try {
            const { room, metadata } = data;
            const validMetadata = metadata;
            // Join room via room manager
            const result = await roomManager.join(socket, room, validMetadata);
            if (!result.success) {
                ack?.({ success: false, error: result.error });
                metrics.recordError(socket.data.tenantId, 'room_join', result.error || 'unknown');
                return;
            }
            // Add to connection manager
            connectionManager.addRoom(socket.data.connectionId, room);
            // Set presence in room
            await presenceManager.setPresence(room, socket.data.user.userId, {
                status: 'online',
                username: socket.data.user.userId,
            });
            // Get current presence
            const presence = await presenceManager.getRoomPresence(room);
            // Notify room of new member
            socket.to(room).emit('presence:join', {
                room,
                user: {
                    userId: socket.data.user.userId,
                    status: 'online',
                    lastSeen: Date.now(),
                },
            });
            // Send success response
            socket.emit('room:joined', { room, metadata });
            ack?.({ success: true });
            // Send current presence to joiner
            socket.emit('presence:update', { room, presence });
            metrics.roomJoins.inc({ tenant: socket.data.tenantId });
            metrics.recordMessageLatency(socket.data.tenantId, 'room:join', Date.now() - startTime);
            logger_js_1.logger.info({
                connectionId: socket.data.connectionId,
                room,
                membersCount: roomManager.getRoomSize(socket.data.tenantId, room),
            }, 'Room joined');
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to join room');
            ack?.({ success: false, error: 'Internal error' });
            socket.emit('system:error', {
                code: 'ROOM_JOIN_FAILED',
                message: 'Failed to join room',
            });
            metrics.recordError(socket.data.tenantId, 'room_join', 'error');
        }
    }));
    // Leave a room
    socket.on('room:leave', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, async (data, ack) => {
        const startTime = Date.now();
        try {
            const { room } = data;
            // Leave room via room manager
            await roomManager.leave(socket, room);
            // Remove from connection manager
            connectionManager.removeRoom(socket.data.connectionId, room);
            // Remove presence
            await presenceManager.removePresence(room, socket.data.user.userId);
            // Notify room
            socket.to(room).emit('presence:leave', {
                room,
                userId: socket.data.user.userId,
            });
            // Send success response
            socket.emit('room:left', { room });
            ack?.({ success: true });
            metrics.roomLeaves.inc({ tenant: socket.data.tenantId });
            metrics.recordMessageLatency(socket.data.tenantId, 'room:leave', Date.now() - startTime);
            logger_js_1.logger.info({
                connectionId: socket.data.connectionId,
                room,
            }, 'Room left');
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to leave room');
            ack?.({ success: false });
            socket.emit('system:error', {
                code: 'ROOM_LEAVE_FAILED',
                message: 'Failed to leave room',
            });
            metrics.recordError(socket.data.tenantId, 'room_leave', 'error');
        }
    }));
    // Query presence in a room
    socket.on('query:presence', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, async (data, ack) => {
        try {
            const { room } = data;
            // Check if user is in room
            const userRooms = roomManager.getSocketRooms(socket.data.connectionId);
            if (!userRooms.includes(room)) {
                ack?.({ presence: [] });
                return;
            }
            const presence = await presenceManager.getRoomPresence(room);
            ack?.({ presence });
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to query presence');
            ack?.({ presence: [] });
            metrics.recordError(socket.data.tenantId, 'query_presence', 'error');
        }
    }));
    // Query user's rooms
    socket.on('query:rooms', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, (ack) => {
        try {
            const rooms = roomManager.getSocketRooms(socket.data.connectionId);
            ack?.({ rooms });
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to query rooms');
            ack?.({ rooms: [] });
            metrics.recordError(socket.data.tenantId, 'query_rooms', 'error');
        }
    }));
}
