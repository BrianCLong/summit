"use strict";
/**
 * WebSocket Delivery Channel
 *
 * Delivers real-time notifications to connected web clients via WebSocket.
 * Uses Socket.IO for connection management and fallback support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryWebSocketManager = exports.WebSocketDelivery = void 0;
const base_delivery_js_1 = require("./base-delivery.js");
class WebSocketDelivery extends base_delivery_js_1.BaseDeliveryChannel {
    name = 'websocket';
    enabled;
    wsManager = null;
    constructor(wsManager) {
        super();
        this.wsManager = wsManager || null;
        this.enabled = this.wsManager !== null;
    }
    async deliver(message) {
        const startTime = Date.now();
        try {
            if (!this.wsManager) {
                return {
                    success: false,
                    channel: 'websocket',
                    error: new Error('WebSocket manager not configured'),
                    retryable: false,
                };
            }
            // Check if user is connected
            if (!this.wsManager.isUserConnected(message.userId)) {
                // Queue for delivery when user connects
                return {
                    success: false,
                    channel: 'websocket',
                    error: new Error('User not connected'),
                    retryable: true,
                    metadata: {
                        reason: 'offline',
                        queueForDelivery: true,
                    },
                };
            }
            // Send notification via WebSocket
            const payload = {
                id: message.id,
                type: 'audit.notification',
                severity: message.severity,
                title: message.title,
                body: message.body,
                data: message.data,
                eventId: message.eventId,
                timestamp: new Date().toISOString(),
            };
            const sent = await this.wsManager.sendToUser(message.userId, 'notification', payload);
            const durationMs = Date.now() - startTime;
            if (sent) {
                this.updateStats({ success: true, channel: 'websocket', retryable: false }, durationMs);
                return {
                    success: true,
                    channel: 'websocket',
                    messageId: message.id,
                    retryable: false,
                    metadata: {
                        deliveryTime: durationMs,
                        connectionCount: this.wsManager.getConnectionCount(message.userId),
                    },
                };
            }
            else {
                return {
                    success: false,
                    channel: 'websocket',
                    error: new Error('Failed to send via WebSocket'),
                    retryable: true,
                };
            }
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            this.updateStats({
                success: false,
                channel: 'websocket',
                error: error,
                retryable: true,
            }, durationMs);
            return {
                success: false,
                channel: 'websocket',
                error: error,
                retryable: true,
            };
        }
    }
    async healthCheck() {
        if (!this.wsManager) {
            return false;
        }
        // Check if WebSocket server is running
        try {
            const totalConnections = this.wsManager.getTotalConnections();
            return totalConnections >= 0; // Any non-negative number means server is running
        }
        catch {
            return false;
        }
    }
}
exports.WebSocketDelivery = WebSocketDelivery;
/**
 * In-memory WebSocket manager for testing/development
 */
class InMemoryWebSocketManager {
    connections = new Map();
    async sendToUser(userId, event, data) {
        const userConnections = this.connections.get(userId);
        if (!userConnections || userConnections.size === 0) {
            return false;
        }
        // Simulate sending to all user connections
        console.log(`[WebSocket] Sending to user ${userId}:`, event, data);
        return true;
    }
    getConnectionCount(userId) {
        return this.connections.get(userId)?.size || 0;
    }
    isUserConnected(userId) {
        return this.getConnectionCount(userId) > 0;
    }
    getTotalConnections() {
        let total = 0;
        for (const connections of this.connections.values()) {
            total += connections.size;
        }
        return total;
    }
    // Test helpers
    addConnection(userId, connectionId) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId).add(connectionId);
    }
    removeConnection(userId, connectionId) {
        this.connections.get(userId)?.delete(connectionId);
    }
}
exports.InMemoryWebSocketManager = InMemoryWebSocketManager;
