"use strict";
/**
 * Communication Fabric - High-Performance Message Routing
 * Handles all inter-agent communication with routing, retries, and delivery guarantees
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationFabric = void 0;
// @ts-nocheck
const events_1 = require("events");
const ioredis_1 = __importDefault(require("ioredis"));
const bull_1 = __importDefault(require("bull"));
const ws_1 = __importDefault(require("ws"));
const nanoid_1 = require("nanoid");
class CommunicationFabric extends events_1.EventEmitter {
    config;
    redis;
    messageQueue;
    connections;
    routes; // meshId -> nodeId -> path
    constructor(config) {
        super();
        this.config = config;
        this.redis = new ioredis_1.default(config.redisUrl);
        this.messageQueue = new bull_1.default('mesh-messages', config.redisUrl);
        this.connections = new Map();
        this.routes = new Map();
        this.setupMessageProcessor();
    }
    /**
     * Register a node in the fabric
     */
    async registerNode(meshId, node) {
        const nodeKey = `${meshId}:${node.id}`;
        // Store node endpoint
        await this.redis.hset('fabric:nodes', nodeKey, JSON.stringify({
            endpoint: node.endpoint,
            protocol: node.protocol,
            status: node.status,
        }));
        // Establish WebSocket connection if supported
        if (node.protocol.includes('websocket')) {
            await this.establishWebSocketConnection(meshId, node);
        }
        this.emit('node-registered', { meshId, nodeId: node.id });
    }
    /**
     * Unregister a node
     */
    async unregisterNode(meshId, nodeId) {
        const nodeKey = `${meshId}:${nodeId}`;
        // Close WebSocket connection
        const ws = this.connections.get(nodeKey);
        if (ws) {
            ws.close();
            this.connections.delete(nodeKey);
        }
        await this.redis.hdel('fabric:nodes', nodeKey);
        this.emit('node-unregistered', { meshId, nodeId });
    }
    /**
     * Establish WebSocket connection to a node
     */
    async establishWebSocketConnection(meshId, node) {
        try {
            const ws = new ws_1.default(node.endpoint);
            ws.on('open', () => {
                this.connections.set(`${meshId}:${node.id}`, ws);
                this.emit('connection-established', { meshId, nodeId: node.id });
            });
            ws.on('message', (data) => {
                this.handleIncomingMessage(meshId, node.id, data);
            });
            ws.on('error', (error) => {
                this.emit('connection-error', {
                    meshId,
                    nodeId: node.id,
                    error,
                });
            });
            ws.on('close', () => {
                this.connections.delete(`${meshId}:${node.id}`);
                this.emit('connection-closed', { meshId, nodeId: node.id });
            });
        }
        catch (error) {
            this.emit('connection-failed', { meshId, nodeId: node.id, error });
        }
    }
    /**
     * Establish connection based on edge definition
     */
    async establishConnection(meshId, edge) {
        // Store routing information
        const routeKey = `route:${meshId}:${edge.sourceId}:${edge.targetId}`;
        await this.redis.set(routeKey, JSON.stringify({
            protocol: edge.protocol,
            weight: edge.weight,
            latency: edge.latencyMs,
        }));
        this.emit('route-established', { meshId, edge });
    }
    /**
     * Send a message through the fabric
     */
    async sendMessage(meshId, message) {
        // Store message
        await this.redis.setex(`message:${message.id}`, message.ttl, JSON.stringify(message));
        // Route message based on protocol
        switch (message.protocol) {
            case 'direct':
                await this.sendDirect(meshId, message);
                break;
            case 'broadcast':
                await this.sendBroadcast(meshId, message);
                break;
            case 'multicast':
                await this.sendMulticast(meshId, message);
                break;
            case 'pubsub':
                await this.publishMessage(meshId, message);
                break;
            case 'request-response':
                await this.sendRequestResponse(meshId, message);
                break;
            case 'fire-and-forget':
                await this.sendFireAndForget(meshId, message);
                break;
            default:
                await this.sendDirect(meshId, message);
        }
        this.emit('message-sent', { meshId, message });
    }
    /**
     * Send direct point-to-point message
     */
    async sendDirect(meshId, message) {
        const targetId = Array.isArray(message.targetId)
            ? message.targetId[0]
            : message.targetId;
        const nodeKey = `${meshId}:${targetId}`;
        const ws = this.connections.get(nodeKey);
        if (ws && ws.readyState === ws_1.default.OPEN) {
            ws.send(JSON.stringify(message));
            message.delivered = true;
            message.deliveredAt = new Date();
            this.emit('message-delivered', { meshId, message });
        }
        else {
            // Queue for later delivery
            await this.messageQueue.add('deliver', { meshId, message });
        }
    }
    /**
     * Broadcast message to all nodes
     */
    async sendBroadcast(meshId, message) {
        const nodeKeys = Array.from(this.connections.keys()).filter((key) => key.startsWith(`${meshId}:`));
        for (const nodeKey of nodeKeys) {
            const ws = this.connections.get(nodeKey);
            if (ws && ws.readyState === ws_1.default.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
        message.delivered = true;
        message.deliveredAt = new Date();
        this.emit('message-broadcast', { meshId, message });
    }
    /**
     * Multicast to specific nodes
     */
    async sendMulticast(meshId, message) {
        const targetIds = Array.isArray(message.targetId)
            ? message.targetId
            : [message.targetId];
        for (const targetId of targetIds) {
            const nodeKey = `${meshId}:${targetId}`;
            const ws = this.connections.get(nodeKey);
            if (ws && ws.readyState === ws_1.default.OPEN) {
                ws.send(JSON.stringify(message));
            }
        }
        message.delivered = true;
        message.deliveredAt = new Date();
        this.emit('message-multicast', { meshId, message });
    }
    /**
     * Publish message to pub/sub channel
     */
    async publishMessage(meshId, message) {
        await this.redis.publish(`mesh:${meshId}:messages`, JSON.stringify(message));
        this.emit('message-published', { meshId, message });
    }
    /**
     * Send request-response message
     */
    async sendRequestResponse(meshId, message) {
        await this.sendDirect(meshId, message);
        // Wait for response with timeout
        const responseKey = `response:${message.id}`;
        const timeout = this.config.messageTimeoutMs;
        // Set up response listener
        const response = await this.waitForResponse(responseKey, timeout);
        if (response) {
            this.emit('response-received', { meshId, message, response });
        }
        else {
            this.emit('response-timeout', { meshId, message });
        }
    }
    /**
     * Fire and forget - no delivery guarantee
     */
    async sendFireAndForget(meshId, message) {
        await this.sendDirect(meshId, message);
        // Don't wait for acknowledgment
    }
    /**
     * Wait for response to a message
     */
    async waitForResponse(responseKey, timeoutMs) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), timeoutMs);
            const checkResponse = async () => {
                const response = await this.redis.get(responseKey);
                if (response) {
                    clearTimeout(timeout);
                    resolve(JSON.parse(response));
                }
                else {
                    setTimeout(checkResponse, 100);
                }
            };
            checkResponse();
        });
    }
    /**
     * Handle incoming message from node
     */
    async handleIncomingMessage(meshId, nodeId, data) {
        try {
            const message = JSON.parse(data.toString());
            // Update message tracking
            message.delivered = true;
            message.deliveredAt = new Date();
            message.hops += 1;
            message.route.push(nodeId);
            await this.redis.setex(`message:${message.id}`, message.ttl, JSON.stringify(message));
            this.emit('message-received', { meshId, nodeId, message });
            // Handle response messages
            if (message.correlationId) {
                await this.redis.setex(`response:${message.correlationId}`, 60, JSON.stringify(message));
            }
        }
        catch (error) {
            this.emit('message-error', { meshId, nodeId, error });
        }
    }
    /**
     * Health check for a node
     */
    async healthCheck(meshId, nodeId) {
        const nodeKey = `${meshId}:${nodeId}`;
        const ws = this.connections.get(nodeKey);
        if (!ws || ws.readyState !== ws_1.default.OPEN) {
            return false;
        }
        // Send ping
        const pingMessage = {
            id: (0, nanoid_1.nanoid)(),
            type: 'heartbeat',
            sourceId: 'fabric',
            targetId: nodeId,
            protocol: 'request-response',
            payload: { type: 'ping' },
            timestamp: new Date(),
            ttl: 30,
            priority: 100,
            hops: 0,
            route: [],
            delivered: false,
            acknowledged: false,
        };
        try {
            ws.send(JSON.stringify(pingMessage));
            const response = await this.waitForResponse(`response:${pingMessage.id}`, 5000);
            return response !== null;
        }
        catch {
            return false;
        }
    }
    /**
     * Set up message queue processor
     */
    setupMessageProcessor() {
        this.messageQueue.process('deliver', async (job) => {
            const { meshId, message } = job.data;
            if (message.retries < this.config.maxRetries) {
                await this.sendMessage(meshId, message);
                message.retries += 1;
            }
            else {
                // Move to dead letter queue
                if (this.config.enableDeadLetterQueue) {
                    await this.redis.lpush(`dlq:${meshId}`, JSON.stringify(message));
                }
                this.emit('message-failed', { meshId, message });
            }
        });
    }
    /**
     * Get fabric statistics
     */
    async getStatistics(meshId) {
        const stats = {
            totalConnections: 0,
            activeConnections: 0,
            messagesSent: 0,
            messagesReceived: 0,
            messagesDropped: 0,
            averageLatency: 0,
        };
        const nodeKeys = Array.from(this.connections.keys()).filter((key) => key.startsWith(`${meshId}:`));
        stats.totalConnections = nodeKeys.length;
        stats.activeConnections = nodeKeys.filter((key) => {
            const ws = this.connections.get(key);
            return ws && ws.readyState === ws_1.default.OPEN;
        }).length;
        // Get message stats from Redis
        const messageKeys = await this.redis.keys(`message:${meshId}:*`);
        stats.messagesSent = messageKeys.length;
        return stats;
    }
    /**
     * Close all connections
     */
    async close() {
        for (const ws of this.connections.values()) {
            ws.close();
        }
        this.connections.clear();
        await this.messageQueue.close();
        await this.redis.quit();
    }
}
exports.CommunicationFabric = CommunicationFabric;
