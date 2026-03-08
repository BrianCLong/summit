"use strict";
/**
 * Collaboration Event Handlers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCollaborationHandlers = registerCollaborationHandlers;
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const logger_js_1 = require("../utils/logger.js");
function registerCollaborationHandlers(socket, deps) {
    const { rateLimiter } = deps;
    // Handle cursor movement
    socket.on('collaboration:cursor_move', (0, rateLimit_js_1.wrapHandlerWithRateLimit)(socket, rateLimiter, async (data) => {
        try {
            // Broadcast cursor position to others in the room
            // Use volatile to drop events if network is congested
            socket.to(data.room).volatile.emit('collaboration:cursor_update', {
                connectionId: socket.data.connectionId,
                userId: socket.data.user.userId,
                x: data.x,
                y: data.y,
                username: data.username,
            });
            // We don't record latency metrics for high-frequency cursor moves to avoid noise
        }
        catch (error) {
            logger_js_1.logger.error({
                connectionId: socket.data.connectionId,
                error: error.message,
            }, 'Failed to process cursor move');
        }
    }));
}
