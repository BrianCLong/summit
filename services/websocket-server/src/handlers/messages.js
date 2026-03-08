"use strict";
/**
 * Message Event Handlers
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMessageHandlers = registerMessageHandlers;
const crypto_1 = __importDefault(require("crypto"));
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const logger_js_1 = require("../utils/logger.js");
const metrics = __importStar(require("../metrics/prometheus.js"));
function registerMessageHandlers(socket, deps) {
    const { roomManager, messagePersistence, rateLimiter, io } = deps;
    // Send message to a room
    socket.on('room:send', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, async (data, ack) => {
        const startTime = Date.now();
        try {
            const { room, payload, persistent = false } = data;
            // Verify user is in the room
            const userRooms = roomManager.getSocketRooms(socket.data.connectionId);
            if (!userRooms.includes(room)) {
                logger_js_1.logger.warn({
                    connectionId: socket.data.connectionId,
                    room,
                }, 'Attempted to send message to room not joined');
                ack?.({ success: false });
                socket.emit('system:error', {
                    code: 'NOT_IN_ROOM',
                    message: 'You are not a member of this room',
                });
                metrics.recordError(socket.data.tenantId, 'room_send', 'not_in_room');
                return;
            }
            // Create message
            const message = {
                room,
                from: socket.data.user.userId,
                payload,
                timestamp: Date.now(),
            };
            // Persist if requested
            let messageId;
            if (persistent) {
                const persisted = await messagePersistence.storeMessage(message);
                messageId = persisted.id;
                metrics.messagePersisted.inc({ tenant: socket.data.tenantId, room });
                metrics.messagePersisted.inc({ tenant: socket.tenantId, room });
            }
            else {
                messageId = crypto_1.default.randomUUID();
            }
            // Broadcast to room (excluding sender)
            socket.to(room).emit('room:message', {
                ...message,
                id: messageId,
            });
            // Send to sender as confirmation
            socket.emit('room:message', {
                ...message,
                id: messageId,
            });
            ack?.({ success: true, messageId });
            metrics.recordMessageSent(socket.data.tenantId, 'room:message');
            metrics.recordMessageLatency(socket.data.tenantId, 'room:send', Date.now() - startTime);
            logger_js_1.logger.debug({
                connectionId: socket.data.connectionId,
                room,
                persistent,
                messageId,
            }, 'Message sent');
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to send message');
            ack?.({ success: false });
            socket.emit('system:error', {
                code: 'MESSAGE_SEND_FAILED',
                message: 'Failed to send message',
            });
            metrics.recordError(socket.data.tenantId, 'room_send', 'error');
        }
    }));
}
