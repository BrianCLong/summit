"use strict";
/**
 * Connection State Management
 * Tracks all active WebSocket connections and their metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const logger_js_1 = require("../utils/logger.js");
const events_1 = require("events");
class ConnectionManager extends events_1.EventEmitter {
    connections = new Map();
    userToConnections = new Map();
    tenantToConnections = new Map();
    /**
     * Register a new connection
     */
    register(socket) {
        const metadata = {
            id: socket.data.connectionId,
            userId: socket.data.user.userId,
            tenantId: socket.data.tenantId,
            connectedAt: socket.data.connectedAt,
            lastActivity: Date.now(),
            rooms: new Set(),
            presence: 'online',
            metadata: {},
        };
        this.connections.set(socket.data.connectionId, metadata);
        // Track by user
        if (!this.userToConnections.has(socket.data.user.userId)) {
            this.userToConnections.set(socket.data.user.userId, new Set());
        }
        this.userToConnections.get(socket.data.user.userId).add(socket.data.connectionId);
        // Track by tenant
        if (!this.tenantToConnections.has(socket.data.tenantId)) {
            this.tenantToConnections.set(socket.data.tenantId, new Set());
        }
        this.tenantToConnections.get(socket.data.tenantId).add(socket.data.connectionId);
        logger_js_1.logger.info({
            connectionId: socket.data.connectionId,
            userId: socket.data.user.userId,
            tenantId: socket.data.tenantId,
            totalConnections: this.connections.size,
        }, 'Connection registered');
        this.emit('connection:registered', metadata);
    }
    /**
     * Unregister a connection
     */
    unregister(connectionId) {
        const metadata = this.connections.get(connectionId);
        if (!metadata) {
            return;
        }
        // Remove from user tracking
        const userConnections = this.userToConnections.get(metadata.userId);
        if (userConnections) {
            userConnections.delete(connectionId);
            if (userConnections.size === 0) {
                this.userToConnections.delete(metadata.userId);
            }
        }
        // Remove from tenant tracking
        const tenantConnections = this.tenantToConnections.get(metadata.tenantId);
        if (tenantConnections) {
            tenantConnections.delete(connectionId);
            if (tenantConnections.size === 0) {
                this.tenantToConnections.delete(metadata.tenantId);
            }
        }
        this.connections.delete(connectionId);
        logger_js_1.logger.info({
            connectionId,
            userId: metadata.userId,
            tenantId: metadata.tenantId,
            totalConnections: this.connections.size,
        }, 'Connection unregistered');
        this.emit('connection:unregistered', metadata);
    }
    /**
     * Update connection activity timestamp
     */
    updateActivity(connectionId) {
        const metadata = this.connections.get(connectionId);
        if (metadata) {
            metadata.lastActivity = Date.now();
        }
    }
    /**
     * Update connection presence status
     */
    updatePresence(connectionId, status) {
        const metadata = this.connections.get(connectionId);
        if (metadata) {
            const oldStatus = metadata.presence;
            metadata.presence = status;
            metadata.lastActivity = Date.now();
            this.emit('presence:changed', {
                connectionId,
                userId: metadata.userId,
                tenantId: metadata.tenantId,
                oldStatus,
                newStatus: status,
            });
        }
    }
    /**
     * Add room to connection
     */
    addRoom(connectionId, room) {
        const metadata = this.connections.get(connectionId);
        if (metadata) {
            metadata.rooms.add(room);
            this.emit('room:joined', { connectionId, room });
        }
    }
    /**
     * Remove room from connection
     */
    removeRoom(connectionId, room) {
        const metadata = this.connections.get(connectionId);
        if (metadata) {
            metadata.rooms.delete(room);
            this.emit('room:left', { connectionId, room });
        }
    }
    /**
     * Get connection metadata
     */
    getConnection(connectionId) {
        return this.connections.get(connectionId);
    }
    /**
     * Get all connections for a user
     */
    getUserConnections(userId) {
        const connectionIds = this.userToConnections.get(userId) || new Set();
        return Array.from(connectionIds)
            .map(id => this.connections.get(id))
            .filter((m) => m !== undefined);
    }
    /**
     * Get all connections for a tenant
     */
    getTenantConnections(tenantId) {
        const connectionIds = this.tenantToConnections.get(tenantId) || new Set();
        return Array.from(connectionIds)
            .map(id => this.connections.get(id))
            .filter((m) => m !== undefined);
    }
    /**
     * Check if user is connected
     */
    isUserConnected(userId) {
        const connections = this.userToConnections.get(userId);
        return connections ? connections.size > 0 : false;
    }
    /**
     * Get total connection count
     */
    getTotalConnections() {
        return this.connections.size;
    }
    /**
     * Get connections by tenant
     */
    getConnectionsByTenant() {
        const result = {};
        for (const [tenantId, connections] of this.tenantToConnections) {
            result[tenantId] = connections.size;
        }
        return result;
    }
    /**
     * Get connections by presence status
     */
    getConnectionsByStatus() {
        const result = {
            online: 0,
            away: 0,
            busy: 0,
            offline: 0,
        };
        for (const metadata of this.connections.values()) {
            result[metadata.presence]++;
        }
        return result;
    }
    /**
     * Get all connections
     */
    getAllConnections() {
        return Array.from(this.connections.values());
    }
    /**
     * Clean up stale connections (not active for threshold)
     */
    cleanupStale(thresholdMs) {
        const now = Date.now();
        const staleConnections = [];
        for (const [connectionId, metadata] of this.connections) {
            if (now - metadata.lastActivity > thresholdMs) {
                staleConnections.push(connectionId);
                this.unregister(connectionId);
            }
        }
        if (staleConnections.length > 0) {
            logger_js_1.logger.info({ count: staleConnections.length, thresholdMs }, 'Cleaned up stale connections');
        }
        return staleConnections;
    }
}
exports.ConnectionManager = ConnectionManager;
