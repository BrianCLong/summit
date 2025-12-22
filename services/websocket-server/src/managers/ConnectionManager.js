"use strict";
/**
 * Connection State Management
 * Tracks all active WebSocket connections and their metadata
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
var logger_js_1 = require("../utils/logger.js");
var events_1 = require("events");
var ConnectionManager = /** @class */ (function (_super) {
    __extends(ConnectionManager, _super);
    function ConnectionManager() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.connections = new Map();
        _this.userToConnections = new Map();
        _this.tenantToConnections = new Map();
        return _this;
    }
    /**
     * Register a new connection
     */
    ConnectionManager.prototype.register = function (socket) {
        var metadata = {
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
    };
    /**
     * Unregister a connection
     */
    ConnectionManager.prototype.unregister = function (connectionId) {
        var metadata = this.connections.get(connectionId);
        if (!metadata) {
            return;
        }
        // Remove from user tracking
        var userConnections = this.userToConnections.get(metadata.userId);
        if (userConnections) {
            userConnections.delete(connectionId);
            if (userConnections.size === 0) {
                this.userToConnections.delete(metadata.userId);
            }
        }
        // Remove from tenant tracking
        var tenantConnections = this.tenantToConnections.get(metadata.tenantId);
        if (tenantConnections) {
            tenantConnections.delete(connectionId);
            if (tenantConnections.size === 0) {
                this.tenantToConnections.delete(metadata.tenantId);
            }
        }
        this.connections.delete(connectionId);
        logger_js_1.logger.info({
            connectionId: connectionId,
            userId: metadata.userId,
            tenantId: metadata.tenantId,
            totalConnections: this.connections.size,
        }, 'Connection unregistered');
        this.emit('connection:unregistered', metadata);
    };
    /**
     * Update connection activity timestamp
     */
    ConnectionManager.prototype.updateActivity = function (connectionId) {
        var metadata = this.connections.get(connectionId);
        if (metadata) {
            metadata.lastActivity = Date.now();
        }
    };
    /**
     * Update connection presence status
     */
    ConnectionManager.prototype.updatePresence = function (connectionId, status) {
        var metadata = this.connections.get(connectionId);
        if (metadata) {
            var oldStatus = metadata.presence;
            metadata.presence = status;
            metadata.lastActivity = Date.now();
            this.emit('presence:changed', {
                connectionId: connectionId,
                userId: metadata.userId,
                tenantId: metadata.tenantId,
                oldStatus: oldStatus,
                newStatus: status,
            });
        }
    };
    /**
     * Add room to connection
     */
    ConnectionManager.prototype.addRoom = function (connectionId, room) {
        var metadata = this.connections.get(connectionId);
        if (metadata) {
            metadata.rooms.add(room);
            this.emit('room:joined', { connectionId: connectionId, room: room });
        }
    };
    /**
     * Remove room from connection
     */
    ConnectionManager.prototype.removeRoom = function (connectionId, room) {
        var metadata = this.connections.get(connectionId);
        if (metadata) {
            metadata.rooms.delete(room);
            this.emit('room:left', { connectionId: connectionId, room: room });
        }
    };
    /**
     * Get connection metadata
     */
    ConnectionManager.prototype.getConnection = function (connectionId) {
        return this.connections.get(connectionId);
    };
    /**
     * Get all connections for a user
     */
    ConnectionManager.prototype.getUserConnections = function (userId) {
        var _this = this;
        var connectionIds = this.userToConnections.get(userId) || new Set();
        return Array.from(connectionIds)
            .map(function (id) { return _this.connections.get(id); })
            .filter(function (m) { return m !== undefined; });
    };
    /**
     * Get all connections for a tenant
     */
    ConnectionManager.prototype.getTenantConnections = function (tenantId) {
        var _this = this;
        var connectionIds = this.tenantToConnections.get(tenantId) || new Set();
        return Array.from(connectionIds)
            .map(function (id) { return _this.connections.get(id); })
            .filter(function (m) { return m !== undefined; });
    };
    /**
     * Check if user is connected
     */
    ConnectionManager.prototype.isUserConnected = function (userId) {
        var connections = this.userToConnections.get(userId);
        return connections ? connections.size > 0 : false;
    };
    /**
     * Get total connection count
     */
    ConnectionManager.prototype.getTotalConnections = function () {
        return this.connections.size;
    };
    /**
     * Get connections by tenant
     */
    ConnectionManager.prototype.getConnectionsByTenant = function () {
        var result = {};
        for (var _i = 0, _a = this.tenantToConnections; _i < _a.length; _i++) {
            var _b = _a[_i], tenantId = _b[0], connections = _b[1];
            result[tenantId] = connections.size;
        }
        return result;
    };
    /**
     * Get connections by presence status
     */
    ConnectionManager.prototype.getConnectionsByStatus = function () {
        var result = {
            online: 0,
            away: 0,
            busy: 0,
            offline: 0,
        };
        for (var _i = 0, _a = this.connections.values(); _i < _a.length; _i++) {
            var metadata = _a[_i];
            result[metadata.presence]++;
        }
        return result;
    };
    /**
     * Get all connections
     */
    ConnectionManager.prototype.getAllConnections = function () {
        return Array.from(this.connections.values());
    };
    /**
     * Clean up stale connections (not active for threshold)
     */
    ConnectionManager.prototype.cleanupStale = function (thresholdMs) {
        var now = Date.now();
        var staleConnections = [];
        for (var _i = 0, _a = this.connections; _i < _a.length; _i++) {
            var _b = _a[_i], connectionId = _b[0], metadata = _b[1];
            if (now - metadata.lastActivity > thresholdMs) {
                staleConnections.push(connectionId);
                this.unregister(connectionId);
            }
        }
        if (staleConnections.length > 0) {
            logger_js_1.logger.info({ count: staleConnections.length, thresholdMs: thresholdMs }, 'Cleaned up stale connections');
        }
        return staleConnections;
    };
    return ConnectionManager;
}(events_1.EventEmitter));
exports.ConnectionManager = ConnectionManager;
