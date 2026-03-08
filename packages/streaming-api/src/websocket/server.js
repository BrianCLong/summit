"use strict";
/**
 * WebSocket Streaming Server
 *
 * Provides real-time bidirectional streaming over WebSocket
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingWebSocketServer = void 0;
const ws_1 = require("ws");
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
class StreamingWebSocketServer extends eventemitter3_1.EventEmitter {
    wss;
    connections = new Map();
    subscriptions = new Map(); // topic -> connectionIds
    options;
    heartbeatTimer;
    constructor(options = {}) {
        super();
        this.options = {
            port: options.port || 8080,
            server: options.server,
            path: options.path || '/ws',
            maxConnections: options.maxConnections || 10000,
            heartbeatInterval: options.heartbeatInterval || 30000,
            messageTimeout: options.messageTimeout || 5000,
            authenticate: options.authenticate || (() => Promise.resolve({})),
        };
        this.wss = new ws_1.WebSocketServer({
            port: this.options.server ? undefined : this.options.port,
            server: this.options.server,
            path: this.options.path,
        });
        this.initialize();
    }
    initialize() {
        this.wss.on('connection', (socket, request) => {
            this.handleConnection(socket, request);
        });
        // Start heartbeat
        this.startHeartbeat();
    }
    handleConnection(socket, request) {
        const connectionId = (0, uuid_1.v4)();
        // Check connection limit
        if (this.connections.size >= this.options.maxConnections) {
            socket.close(1008, 'Max connections reached');
            return;
        }
        const connection = {
            id: connectionId,
            socket,
            subscriptions: new Set(),
            metadata: {
                connectedAt: new Date(),
                lastActivity: new Date(),
                ip: request.socket.remoteAddress,
                userAgent: request.headers['user-agent'],
            },
        };
        this.connections.set(connectionId, connection);
        socket.on('message', (data) => {
            void this.handleMessage(connectionId, data);
        });
        socket.on('close', () => {
            this.handleDisconnection(connectionId);
        });
        socket.on('error', (error) => {
            this.handleError(connectionId, error);
        });
        // Send welcome message
        this.sendMessage(connectionId, {
            type: 'connected',
            id: connectionId,
            timestamp: new Date().toISOString(),
        });
        this.emit('connection', connection);
    }
    async handleMessage(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return;
        }
        connection.metadata.lastActivity = new Date();
        try {
            const message = JSON.parse(data.toString());
            switch (message.type) {
                case 'subscribe':
                    await this.handleSubscribe(connectionId, message);
                    break;
                case 'unsubscribe':
                    await this.handleUnsubscribe(connectionId, message);
                    break;
                case 'ack':
                    this.emit('ack', { connectionId, messageId: message.messageId });
                    break;
                case 'ping':
                    this.sendMessage(connectionId, {
                        type: 'pong',
                        timestamp: Date.now(),
                    });
                    break;
                case 'query':
                    await this.handleQuery(connectionId, message);
                    break;
                default:
                    this.sendError(connectionId, {
                        code: 'UNKNOWN_MESSAGE_TYPE',
                        message: `Unknown message type: ${message.type}`,
                        recoverable: true,
                    });
            }
        }
        catch (error) {
            this.sendError(connectionId, {
                code: 'INVALID_MESSAGE',
                message: 'Failed to parse message',
                details: error,
                recoverable: true,
            });
        }
    }
    async handleSubscribe(connectionId, message) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return;
        }
        const { topic, filter } = message;
        // Add to connection subscriptions
        connection.subscriptions.add(topic);
        // Add to topic subscriptions
        if (!this.subscriptions.has(topic)) {
            this.subscriptions.set(topic, new Set());
        }
        const subs = this.subscriptions.get(topic);
        if (subs) {
            subs.add(connectionId);
        }
        // Send confirmation
        this.sendMessage(connectionId, {
            type: 'subscribed',
            id: message.id,
            topic,
            timestamp: new Date().toISOString(),
        });
        this.emit('subscribe', { connectionId, topic, filter });
        await Promise.resolve();
    }
    async handleUnsubscribe(connectionId, message) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return;
        }
        const { topic } = message;
        // Remove from connection subscriptions
        connection.subscriptions.delete(topic);
        // Remove from topic subscriptions
        const topicSubs = this.subscriptions.get(topic);
        if (topicSubs) {
            topicSubs.delete(connectionId);
            if (topicSubs.size === 0) {
                this.subscriptions.delete(topic);
            }
        }
        // Send confirmation
        this.sendMessage(connectionId, {
            type: 'unsubscribed',
            id: message.id,
            topic,
            timestamp: new Date().toISOString(),
        });
        this.emit('unsubscribe', { connectionId, topic });
        await Promise.resolve();
    }
    async handleQuery(connectionId, message) {
        this.emit('query', {
            connectionId,
            queryId: message.id,
            query: message.query,
            stream: message.stream,
        });
        await Promise.resolve();
    }
    handleDisconnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return;
        }
        // Remove from all subscriptions
        connection.subscriptions.forEach((topic) => {
            const topicSubs = this.subscriptions.get(topic);
            if (topicSubs) {
                topicSubs.delete(connectionId);
                if (topicSubs.size === 0) {
                    this.subscriptions.delete(topic);
                }
            }
        });
        this.connections.delete(connectionId);
        this.emit('disconnection', connection);
    }
    handleError(connectionId, error) {
        this.emit('error', { connectionId, error });
    }
    /**
     * Broadcast event to all subscribers of a topic
     */
    broadcast(topic, event) {
        const subscribers = this.subscriptions.get(topic);
        if (!subscribers) {
            return;
        }
        const message = {
            type: 'data',
            subscriptionId: topic,
            event,
        };
        subscribers.forEach((connectionId) => {
            this.sendMessage(connectionId, message);
        });
    }
    /**
     * Send message to a specific connection
     */
    sendMessage(connectionId, message) {
        const connection = this.connections.get(connectionId);
        if (!connection) {
            return;
        }
        try {
            if (connection.socket.readyState === ws_1.WebSocket.OPEN) {
                connection.socket.send(JSON.stringify(message));
            }
        }
        catch (_error) {
            // Suppress console error or use logger if available
            // console.error('Failed to send message:', error);
        }
    }
    /**
     * Send error to a specific connection
     */
    sendError(connectionId, error, subscriptionId) {
        this.sendMessage(connectionId, {
            type: 'error',
            error,
            subscriptionId,
        });
    }
    /**
     * Start heartbeat to detect dead connections
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            this.connections.forEach((connection, connectionId) => {
                const inactiveTime = now - connection.metadata.lastActivity.getTime();
                if (inactiveTime > this.options.heartbeatInterval * 2) {
                    // Connection is dead
                    connection.socket.terminate();
                    this.handleDisconnection(connectionId);
                }
                else if (inactiveTime > this.options.heartbeatInterval) {
                    // Send ping
                    this.sendMessage(connectionId, {
                        type: 'ping',
                        timestamp: now,
                    });
                }
            });
        }, this.options.heartbeatInterval);
    }
    /**
     * Get connection statistics
     */
    getStatistics() {
        return {
            connections: this.connections.size,
            subscriptions: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.size, 0),
            topics: this.subscriptions.size,
        };
    }
    /**
     * Close the server
     */
    close() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        this.connections.forEach((connection) => {
            connection.socket.close();
        });
        this.wss.close();
    }
}
exports.StreamingWebSocketServer = StreamingWebSocketServer;
