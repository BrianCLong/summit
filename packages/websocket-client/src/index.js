"use strict";
// @ts-nocheck
/**
 * WebSocket Client SDK
 * Provides auto-reconnection, message queuing, and type-safe events
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
const socket_io_client_1 = require("socket.io-client");
const eventemitter3_1 = __importDefault(require("eventemitter3"));
class WebSocketClient extends eventemitter3_1.default {
    socket = null;
    config;
    status = 'disconnected';
    messageQueue = [];
    maxQueueSize = 1000;
    reconnectAttempts = 0;
    constructor(config) {
        super();
        this.config = {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            tenantId: 'default',
            ...config,
        };
        if (this.config.autoConnect) {
            this.connect();
        }
    }
    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.socket?.connected) {
            console.warn('Already connected');
            return;
        }
        this.setStatus('connecting');
        this.socket = (0, socket_io_client_1.io)(this.config.url, {
            auth: {
                token: this.config.token,
                tenantId: this.config.tenantId,
            },
            reconnection: this.config.reconnection,
            reconnectionAttempts: this.config.reconnectionAttempts,
            reconnectionDelay: this.config.reconnectionDelay,
            reconnectionDelayMax: this.config.reconnectionDelayMax,
            timeout: this.config.timeout,
            transports: ['websocket', 'polling'],
        });
        this.setupEventListeners();
    }
    /**
     * Disconnect from WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.setStatus('disconnected');
        }
    }
    /**
     * Get current connection status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.status === 'connected' && this.socket?.connected === true;
    }
    /**
     * Send heartbeat to keep presence alive
     */
    heartbeat(status) {
        this.emit('presence:heartbeat', { status });
    }
    /**
     * Update presence status
     */
    setPresenceStatus(status, metadata) {
        this.emitWithQueue('presence:status', { status, metadata });
    }
    /**
     * Join a room
     */
    async joinRoom(room, metadata) {
        return new Promise((resolve) => {
            this.emitWithQueue('room:join', { room, metadata }, (response) => {
                resolve(response);
            });
        });
    }
    /**
     * Leave a room
     */
    async leaveRoom(room) {
        return new Promise((resolve) => {
            this.emitWithQueue('room:leave', { room }, (response) => {
                resolve(response);
            });
        });
    }
    /**
     * Send message to a room
     */
    async sendMessage(room, payload, persistent = false) {
        return new Promise((resolve) => {
            this.emitWithQueue('room:send', { room, payload, persistent }, (response) => {
                resolve(response);
            });
        });
    }
    /**
     * Query presence in a room
     */
    async queryPresence(room) {
        return new Promise((resolve) => {
            this.emitWithQueue('query:presence', { room }, (response) => {
                resolve(response.presence);
            });
        });
    }
    /**
     * Query user's joined rooms
     */
    async queryRooms() {
        return new Promise((resolve) => {
            this.emitWithQueue('query:rooms', undefined, (response) => {
                resolve(response.rooms);
            });
        });
    }
    setupEventListeners() {
        if (!this.socket) {
            return;
        }
        // Connection events
        this.socket.on('connect', () => {
            this.setStatus('connected');
            this.reconnectAttempts = 0;
            this.flushMessageQueue();
        });
        this.socket.on('disconnect', (reason) => {
            this.setStatus('disconnected');
            console.log('Disconnected:', reason);
        });
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error.message);
            this.reconnectAttempts++;
        });
        this.socket.io.on('reconnect_attempt', () => {
            this.setStatus('reconnecting');
        });
        this.socket.io.on('reconnect', () => {
            this.setStatus('connected');
            this.reconnectAttempts = 0;
            this.flushMessageQueue();
        });
        this.socket.io.on('reconnect_failed', () => {
            this.setStatus('disconnected');
            console.error('Reconnection failed');
        });
        // Application events
        this.socket.on('connection:established', (data) => {
            this.emit('connection:established', data);
        });
        this.socket.on('connection:error', (error) => {
            this.emit('connection:error', error);
        });
        this.socket.on('presence:update', (data) => {
            this.emit('presence:update', data);
        });
        this.socket.on('presence:join', (data) => {
            this.emit('presence:join', data);
        });
        this.socket.on('presence:leave', (data) => {
            this.emit('presence:leave', data);
        });
        this.socket.on('room:joined', (data) => {
            this.emit('room:joined', data);
        });
        this.socket.on('room:left', (data) => {
            this.emit('room:left', data);
        });
        this.socket.on('room:message', (message) => {
            this.emit('room:message', message);
        });
        this.socket.on('system:restart', (data) => {
            this.emit('system:restart', data);
            // Auto-reconnect after server restart
            setTimeout(() => {
                this.disconnect();
                this.connect();
            }, data.reconnectIn);
        });
        this.socket.on('system:error', (error) => {
            this.emit('system:error', error);
        });
        this.socket.on('broadcast', (data) => {
            this.emit('broadcast', data);
        });
    }
    setStatus(status) {
        if (this.status !== status) {
            this.status = status;
            this.emit('status:change', status);
        }
    }
    emitWithQueue(event, data, ack) {
        if (this.isConnected() && this.socket) {
            // Send immediately if connected
            if (ack) {
                this.socket.emit(event, data, ack);
            }
            else {
                this.socket.emit(event, data);
            }
        }
        else {
            // Queue message if not connected
            this.queueMessage(event, data, ack);
        }
    }
    queueMessage(event, data, ack) {
        if (this.messageQueue.length >= this.maxQueueSize) {
            console.warn('Message queue full, dropping oldest message');
            this.messageQueue.shift();
        }
        this.messageQueue.push({
            event,
            data,
            ack,
            timestamp: Date.now(),
            attempts: 0,
        });
    }
    flushMessageQueue() {
        if (!this.isConnected() || !this.socket) {
            return;
        }
        const queue = [...this.messageQueue];
        this.messageQueue = [];
        for (const message of queue) {
            try {
                if (message.ack) {
                    this.socket.emit(message.event, message.data, message.ack);
                }
                else {
                    this.socket.emit(message.event, message.data);
                }
            }
            catch (error) {
                console.error('Failed to send queued message:', error);
                // Re-queue if failed
                message.attempts++;
                if (message.attempts < 3) {
                    this.messageQueue.push(message);
                }
            }
        }
        if (queue.length > 0) {
            console.log(`Flushed ${queue.length} queued messages`);
        }
    }
}
exports.WebSocketClient = WebSocketClient;
exports.default = WebSocketClient;
