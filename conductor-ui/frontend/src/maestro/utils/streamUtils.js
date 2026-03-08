"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useResilientStream = exports.WebSocketConnectionPool = exports.ResilientWebSocket = exports.ResilientEventSource = void 0;
// Stream resilience utilities for SSE and WebSocket connections
const react_1 = __importDefault(require("react"));
const DEFAULT_OPTIONS = {
    maxRetries: 10,
    initialRetryDelay: 1000,
    maxRetryDelay: 30000,
    backoffMultiplier: 1.5,
    reconnectOnVisibilityChange: true,
    heartbeatInterval: 30000,
    idempotencyKey: '',
};
const DEFAULT_WS_OPTIONS = {
    ...DEFAULT_OPTIONS,
    maxQueueSize: 200,
    rateLimitPerSecond: 25,
    backpressureThreshold: 256 * 1024,
    queueFlushInterval: 750,
    maxReplayBatch: 20,
    jitter: 0.3,
    connectTimeout: 15000,
    offlineReconnectDelay: 5000,
    monitorInterval: 15000,
    meshEndpoints: [],
    logger: console,
};
class ResilientEventSource {
    eventSource = null;
    url;
    options;
    retryCount = 0;
    reconnectTimer = null;
    heartbeatTimer = null;
    lastEventId = null;
    isConnected = false;
    eventHandlers = new Map();
    onConnectionChange;
    seenEventIds = new Set();
    constructor(url, options = {}) {
        this.url = url;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        // Handle page visibility changes
        if (this.options.reconnectOnVisibilityChange) {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }
    }
    connect() {
        this.disconnect();
        try {
            const urlWithLastEventId = this.buildUrlWithLastEventId();
            this.eventSource = new EventSource(urlWithLastEventId);
            this.eventSource.onopen = this.handleOpen.bind(this);
            this.eventSource.onerror = this.handleError.bind(this);
            this.eventSource.onmessage = this.handleMessage.bind(this);
            // Set up heartbeat
            this.startHeartbeat();
        }
        catch (error) {
            console.error('Failed to create EventSource:', error);
            this.scheduleReconnect();
        }
    }
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.clearTimers();
        this.isConnected = false;
        this.onConnectionChange?.(false);
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
        // Register with EventSource if connected
        if (this.eventSource && event !== 'message') {
            this.eventSource.addEventListener(event, this.createEventHandler(event, handler));
        }
    }
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(event);
            }
        }
    }
    onConnectionChange(callback) {
        this.onConnectionChange = callback;
    }
    getConnectionState() {
        return {
            connected: this.isConnected,
            retryCount: this.retryCount,
            lastEventId: this.lastEventId,
            readyState: this.eventSource?.readyState ?? null,
        };
    }
    buildUrlWithLastEventId() {
        if (!this.lastEventId)
            return this.url;
        const separator = this.url.includes('?') ? '&' : '?';
        return `${this.url}${separator}lastEventId=${encodeURIComponent(this.lastEventId)}`;
    }
    handleOpen = () => {
        console.log('EventSource connected');
        this.isConnected = true;
        this.retryCount = 0;
        this.onConnectionChange?.(true);
    };
    handleError = () => {
        console.log('EventSource error, attempting reconnect');
        this.isConnected = false;
        this.onConnectionChange?.(false);
        this.scheduleReconnect();
    };
    handleMessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const streamEvent = {
                id: event.lastEventId,
                data,
                timestamp: Date.now(),
            };
            // Store last event ID for reconnection
            if (event.lastEventId) {
                this.lastEventId = event.lastEventId;
            }
            // Check for duplicates using event ID
            if (streamEvent.id) {
                if (this.seenEventIds.has(streamEvent.id)) {
                    console.log('Duplicate event received, skipping:', streamEvent.id);
                    return;
                }
                this.seenEventIds.add(streamEvent.id);
                // Limit memory usage by keeping only recent event IDs
                if (this.seenEventIds.size > 1000) {
                    const firstId = this.seenEventIds.values().next().value;
                    this.seenEventIds.delete(firstId);
                }
            }
            this.emit('message', streamEvent);
        }
        catch (error) {
            console.error('Failed to parse SSE message:', error);
        }
    };
    createEventHandler(eventType, handler) {
        return (event) => {
            const streamEvent = {
                id: event.lastEventId,
                event: eventType,
                data: event.data,
                timestamp: Date.now(),
            };
            handler(streamEvent);
        };
    }
    emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                }
                catch (error) {
                    console.error('Error in event handler:', error);
                }
            });
        }
    }
    scheduleReconnect() {
        if (this.retryCount >= this.options.maxRetries) {
            console.error('Maximum retry attempts reached');
            return;
        }
        const delay = Math.min(this.options.initialRetryDelay *
            Math.pow(this.options.backoffMultiplier, this.retryCount), this.options.maxRetryDelay);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries})`);
        this.reconnectTimer = setTimeout(() => {
            this.retryCount++;
            this.connect();
        }, delay);
    }
    startHeartbeat() {
        this.clearHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            if (!this.isConnected &&
                this.eventSource?.readyState !== EventSource.OPEN) {
                console.log('Heartbeat detected disconnection');
                this.handleError();
            }
        }, this.options.heartbeatInterval);
    }
    clearHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    clearTimers() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.clearHeartbeat();
    }
    handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !this.isConnected) {
            console.log('Page became visible, reconnecting');
            this.connect();
        }
    };
    destroy() {
        this.disconnect();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.eventHandlers.clear();
        this.seenEventIds.clear();
    }
}
exports.ResilientEventSource = ResilientEventSource;
class ResilientWebSocket {
    ws = null;
    url;
    protocols;
    options;
    retryCount = 0;
    reconnectTimer = null;
    pingTimer = null;
    connectTimeoutTimer = null;
    monitorTimer = null;
    queueFlushTimer = null;
    pongReceived = true;
    state = 'idle';
    messageQueue = [];
    eventHandlers = new Map();
    onConnectionChange;
    manualClose = false;
    tokens;
    lastTokenRefill = Date.now();
    currentEndpointIndex = 0;
    offlineSince = null;
    logger;
    lastResolvedUrl;
    hasVisibilityListener = false;
    constructor(url, protocols, options = {}) {
        this.url = url;
        this.protocols = protocols;
        const meshEndpoints = options.meshEndpoints && options.meshEndpoints.length > 0
            ? options.meshEndpoints
            : DEFAULT_WS_OPTIONS.meshEndpoints;
        const logger = options.logger ?? DEFAULT_WS_OPTIONS.logger;
        this.options = {
            ...DEFAULT_WS_OPTIONS,
            ...options,
            meshEndpoints,
            logger,
        };
        this.tokens = this.options.rateLimitPerSecond;
        this.logger = this.options.logger;
        this.lastResolvedUrl = this.url;
        this.setupNetworkListeners();
    }
    connect() {
        this.manualClose = false;
        this.clearReconnectTimer();
        const nextState = this.retryCount === 0 ? 'connecting' : 'reconnecting';
        this.updateState(nextState, { attempt: this.retryCount + 1 });
        this.openSocket();
    }
    disconnect(reason = 'Manual disconnect') {
        this.manualClose = true;
        if (this.state !== 'disconnected') {
            this.updateState('disconnected', { reason });
        }
        this.disconnectSocketOnly(reason);
        this.clearTimers();
        this.tokens = this.options.rateLimitPerSecond;
    }
    send(data) {
        this.refillTokens();
        const serialized = this.serializeMessage(data);
        if (this.state === 'connected' &&
            this.ws &&
            this.ws.readyState === WebSocket.OPEN &&
            this.hasCapacity()) {
            const sent = this.performSend(serialized, data, false);
            if (sent) {
                return true;
            }
        }
        this.enqueue(serialized, data);
        return false;
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
    }
    off(event, handler) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(event);
            }
        }
    }
    onConnectionChange(callback) {
        this.onConnectionChange = callback;
    }
    notifyNetworkChange(status) {
        if (status === 'offline') {
            this.handleNetworkOffline();
        }
        else {
            this.handleNetworkOnline();
        }
    }
    getSnapshot() {
        return {
            state: this.state,
            queueDepth: this.messageQueue.length,
            retryCount: this.retryCount,
            endpoint: this.lastResolvedUrl,
            offlineSince: this.offlineSince,
        };
    }
    destroy() {
        this.disconnect('Destroyed');
        this.removeNetworkListeners();
        this.eventHandlers.clear();
        this.messageQueue = [];
    }
    openSocket() {
        this.disconnectSocketOnly();
        const targetUrl = this.resolveUrl();
        this.logger.info?.(`Opening WebSocket connection to ${targetUrl}`);
        try {
            this.ws = new WebSocket(targetUrl, this.protocols);
            this.ws.onopen = this.handleOpen;
            this.ws.onclose = this.handleClose;
            this.ws.onerror = this.handleError;
            this.ws.onmessage = this.handleMessage;
            this.startConnectTimeout();
        }
        catch (error) {
            this.logger.error?.('Failed to create WebSocket:', error);
            this.options.metricsCollector?.record('connect_error', {
                message: error instanceof Error ? error.message : 'unknown',
            });
            this.scheduleReconnect('creation_error');
        }
    }
    disconnectSocketOnly(reason = 'Manual disconnect') {
        if (this.ws) {
            try {
                this.ws.close(1000, reason);
            }
            catch (error) {
                this.logger.warn?.(`Failed to close WebSocket cleanly: ${String(error)}`);
            }
            this.ws = null;
        }
    }
    setupNetworkListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.handleNetworkOnline);
            window.addEventListener('offline', this.handleNetworkOffline);
        }
        if (typeof document !== 'undefined' &&
            this.options.reconnectOnVisibilityChange) {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            this.hasVisibilityListener = true;
        }
    }
    removeNetworkListeners() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleNetworkOnline);
            window.removeEventListener('offline', this.handleNetworkOffline);
        }
        if (typeof document !== 'undefined' && this.hasVisibilityListener) {
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            this.hasVisibilityListener = false;
        }
    }
    handleVisibilityChange = () => {
        if (typeof document === 'undefined') {
            return;
        }
        if (document.visibilityState === 'visible' && this.state !== 'connected') {
            this.logger.info?.('Document became visible; verifying WebSocket connectivity');
            this.scheduleReconnect('visibility');
        }
    };
    handleNetworkOnline = () => {
        this.offlineSince = null;
        this.options.metricsCollector?.record('browser_online', {});
        if (this.state !== 'connected') {
            this.scheduleReconnect('network_online');
        }
    };
    handleNetworkOffline = () => {
        this.offlineSince = Date.now();
        this.options.metricsCollector?.record('browser_offline', {});
        if (this.state === 'connected') {
            this.connectionLoss('network_offline');
        }
        else {
            this.scheduleReconnect('network_offline');
        }
    };
    handleOpen = () => {
        this.clearConnectTimeout();
        this.clearReconnectTimer();
        this.tokens = this.options.rateLimitPerSecond;
        this.pongReceived = true;
        this.updateState('connected', { endpoint: this.lastResolvedUrl });
        this.options.metricsCollector?.record('connected', {
            endpoint: this.lastResolvedUrl,
        });
        this.flushQueue();
        this.startPing();
        this.startMonitoring();
    };
    handleClose = (event) => {
        this.options.metricsCollector?.record('closed', {
            code: event.code,
            reason: event.reason,
        });
        if (this.manualClose) {
            this.manualClose = false;
            this.clearTimers();
            return;
        }
        this.connectionLoss(`close_${event.code}`);
    };
    handleError = (event) => {
        const message = event?.message || 'unknown';
        this.logger.warn?.(`WebSocket error encountered: ${message}`);
        this.options.metricsCollector?.record('socket_error', { message });
        this.connectionLoss('error');
    };
    handleMessage = (event) => {
        const raw = event.data;
        try {
            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (data?.type === 'pong') {
                this.pongReceived = true;
                this.options.metricsCollector?.record('pong', {
                    latency: typeof data.timestamp === 'number'
                        ? Date.now() - data.timestamp
                        : undefined,
                });
                return;
            }
            this.emit('message', data);
            if (data?.type) {
                this.emit(data.type, data);
            }
        }
        catch (error) {
            this.logger.error?.('Failed to parse WebSocket message:', error);
            this.emit('message', raw);
        }
    };
    updateState(state, context) {
        if (this.state === state) {
            return;
        }
        const previous = this.state;
        this.state = state;
        const isConnected = state === 'connected';
        const wasConnected = previous === 'connected';
        if (isConnected) {
            this.retryCount = 0;
        }
        if (this.onConnectionChange && isConnected !== wasConnected) {
            this.onConnectionChange(isConnected);
        }
        this.emit('state-change', {
            state,
            previous,
            timestamp: Date.now(),
            context,
        });
        this.options.metricsCollector?.record('state_change', {
            state,
            previous,
            ...context,
        });
    }
    hasCapacity() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        if (this.tokens < 1) {
            return false;
        }
        if (this.ws.bufferedAmount > this.options.backpressureThreshold) {
            this.options.metricsCollector?.record('client_backpressure', {
                bufferedAmount: this.ws.bufferedAmount,
                threshold: this.options.backpressureThreshold,
            });
            return false;
        }
        return true;
    }
    performSend(serialized, raw, fromQueue, enqueuedAt) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        if (this.tokens < 1) {
            return false;
        }
        if (this.ws.bufferedAmount > this.options.backpressureThreshold) {
            this.options.metricsCollector?.record('client_backpressure', {
                bufferedAmount: this.ws.bufferedAmount,
                threshold: this.options.backpressureThreshold,
            });
            return false;
        }
        try {
            this.ws.send(serialized);
            this.tokens = Math.max(0, this.tokens - 1);
            this.options.metricsCollector?.record('message_sent', {
                fromQueue,
                queueDepth: this.messageQueue.length,
                endpoint: this.lastResolvedUrl,
                latency: enqueuedAt ? Date.now() - enqueuedAt : 0,
            });
            return true;
        }
        catch (error) {
            this.logger.error?.('Failed to send WebSocket message:', error);
            this.options.metricsCollector?.record('send_error', {
                message: error instanceof Error ? error.message : 'unknown',
            });
            return false;
        }
    }
    enqueue(serialized, raw) {
        if (this.messageQueue.length >= this.options.maxQueueSize) {
            this.messageQueue.shift();
            this.logger.warn?.('Dropping queued WebSocket message due to queue capacity');
            this.options.metricsCollector?.record('queue_dropped', {
                maxQueueSize: this.options.maxQueueSize,
            });
        }
        this.messageQueue.push({
            raw,
            serialized,
            enqueuedAt: Date.now(),
            attempts: 1,
        });
        this.options.metricsCollector?.record('message_queued', {
            queueDepth: this.messageQueue.length,
            state: this.state,
        });
        this.scheduleQueueFlush();
    }
    scheduleQueueFlush() {
        if (this.queueFlushTimer || this.messageQueue.length === 0) {
            return;
        }
        this.queueFlushTimer = setTimeout(() => {
            this.queueFlushTimer = null;
            this.flushQueue();
        }, this.options.queueFlushInterval);
    }
    flushQueue() {
        if (this.state !== 'connected' || !this.ws) {
            return;
        }
        this.refillTokens();
        const batch = this.messageQueue.splice(0, this.options.maxReplayBatch);
        let failureIndex = -1;
        for (let index = 0; index < batch.length; index += 1) {
            const item = batch[index];
            const success = this.performSend(item.serialized, item.raw, true, item.enqueuedAt);
            if (!success) {
                item.attempts += 1;
                failureIndex = index;
                break;
            }
        }
        if (failureIndex >= 0) {
            const toRequeue = batch.slice(failureIndex);
            this.messageQueue = [...toRequeue, ...this.messageQueue];
            this.scheduleQueueFlush();
        }
        else if (this.messageQueue.length > 0) {
            this.scheduleQueueFlush();
        }
        this.options.metricsCollector?.record('queue_depth', {
            queueDepth: this.messageQueue.length,
        });
    }
    computeReconnectDelay() {
        const base = Math.min(this.options.initialRetryDelay *
            Math.pow(this.options.backoffMultiplier, this.retryCount), this.options.maxRetryDelay);
        const jitter = base * this.options.jitter;
        const delay = base + (Math.random() * jitter - jitter / 2);
        if (this.offlineSince) {
            return Math.max(delay, this.options.offlineReconnectDelay);
        }
        return delay;
    }
    scheduleReconnect(reason) {
        if (this.retryCount >= this.options.maxRetries) {
            this.updateState('failed', { reason });
            this.emit('error', {
                type: 'reconnect_failed',
                message: 'Maximum WebSocket retry attempts reached',
                reason,
            });
            this.options.metricsCollector?.record('reconnect_exhausted', { reason });
            return;
        }
        this.clearReconnectTimer();
        const delay = this.computeReconnectDelay();
        this.options.metricsCollector?.record('reconnect_scheduled', {
            reason,
            delay,
            attempt: this.retryCount + 1,
            nextEndpoint: this.getNextEndpointPreview(),
        });
        this.logger.warn?.(`WebSocket reconnecting in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries}) due to ${reason}`);
        this.reconnectTimer = setTimeout(() => {
            this.retryCount += 1;
            if (this.options.meshEndpoints.length > 0) {
                this.currentEndpointIndex =
                    (this.currentEndpointIndex + 1) % this.options.meshEndpoints.length;
            }
            this.connect();
        }, delay);
    }
    connectionLoss(reason) {
        this.clearConnectTimeout();
        this.clearPing();
        this.stopMonitoring();
        if (this.ws) {
            try {
                this.ws.close(4000, reason);
            }
            catch (error) {
                this.logger.warn?.(`Error while closing WebSocket after loss: ${String(error)}`);
            }
            this.ws = null;
        }
        this.options.metricsCollector?.record('connection_lost', {
            reason,
            attempt: this.retryCount + 1,
        });
        this.updateState('reconnecting', { reason });
        this.scheduleReconnect(reason);
    }
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    startConnectTimeout() {
        this.clearConnectTimeout();
        this.connectTimeoutTimer = setTimeout(() => {
            this.options.metricsCollector?.record('connect_timeout', {
                url: this.lastResolvedUrl,
            });
            this.logger.warn?.('WebSocket connection attempt timed out');
            this.connectionLoss('connect_timeout');
        }, this.options.connectTimeout);
    }
    clearConnectTimeout() {
        if (this.connectTimeoutTimer) {
            clearTimeout(this.connectTimeoutTimer);
            this.connectTimeoutTimer = null;
        }
    }
    startPing() {
        this.clearPing();
        this.pingTimer = setInterval(() => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                return;
            }
            if (!this.pongReceived) {
                this.logger.warn?.('Pong not received, forcing WebSocket reconnect');
                this.connectionLoss('heartbeat_timeout');
                return;
            }
            this.pongReceived = false;
            try {
                this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
            catch (error) {
                this.logger.error?.('Failed to send ping frame:', error);
            }
        }, this.options.heartbeatInterval);
    }
    clearPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }
    startMonitoring() {
        this.stopMonitoring();
        this.monitorTimer = setInterval(() => {
            this.options.metricsCollector?.record('connection_snapshot', {
                state: this.state,
                queueDepth: this.messageQueue.length,
                bufferedAmount: this.ws?.bufferedAmount ?? 0,
                retryCount: this.retryCount,
                endpoint: this.lastResolvedUrl,
            });
        }, this.options.monitorInterval);
    }
    stopMonitoring() {
        if (this.monitorTimer) {
            clearInterval(this.monitorTimer);
            this.monitorTimer = null;
        }
    }
    clearQueueFlush() {
        if (this.queueFlushTimer) {
            clearTimeout(this.queueFlushTimer);
            this.queueFlushTimer = null;
        }
    }
    clearTimers() {
        this.clearReconnectTimer();
        this.clearPing();
        this.clearQueueFlush();
        this.clearConnectTimeout();
        this.stopMonitoring();
    }
    refillTokens() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastTokenRefill) / 1000;
        if (elapsedSeconds <= 0) {
            return;
        }
        this.tokens = Math.min(this.options.rateLimitPerSecond, this.tokens + elapsedSeconds * this.options.rateLimitPerSecond);
        this.lastTokenRefill = now;
    }
    resolveUrl() {
        if (!this.options.meshEndpoints.length) {
            this.lastResolvedUrl = this.url;
            return this.lastResolvedUrl;
        }
        const candidate = this.options.meshEndpoints[this.currentEndpointIndex % this.options.meshEndpoints.length];
        if (!candidate) {
            this.lastResolvedUrl = this.url;
            return this.lastResolvedUrl;
        }
        if (candidate.includes('{path}')) {
            const path = this.url.replace(/^wss?:\/\//, '');
            this.lastResolvedUrl = candidate.replace('{path}', path);
            return this.lastResolvedUrl;
        }
        if (candidate.startsWith('ws://') || candidate.startsWith('wss://')) {
            this.lastResolvedUrl = candidate;
            return this.lastResolvedUrl;
        }
        try {
            const reference = new URL(this.url);
            const base = candidate.endsWith('/') ? candidate.slice(0, -1) : candidate;
            this.lastResolvedUrl = `${base}${reference.pathname}${reference.search}${reference.hash}`;
            return this.lastResolvedUrl;
        }
        catch (error) {
            this.lastResolvedUrl = candidate;
            return this.lastResolvedUrl;
        }
    }
    getNextEndpointPreview() {
        if (!this.options.meshEndpoints.length) {
            return this.url;
        }
        const nextIndex = (this.currentEndpointIndex + 1) % this.options.meshEndpoints.length;
        return this.options.meshEndpoints[nextIndex] ?? this.url;
    }
    serializeMessage(data) {
        if (typeof data === 'string') {
            return data;
        }
        try {
            return JSON.stringify(data);
        }
        catch (error) {
            this.logger.error?.('Failed to serialize WebSocket message payload:', error);
            this.options.metricsCollector?.record('serialization_error', {
                message: error instanceof Error ? error.message : 'unknown',
            });
            return JSON.stringify({ type: 'unserializable', payload: String(error) });
        }
    }
    emit(event, data) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(data);
                }
                catch (error) {
                    this.logger.error?.('Error in WebSocket event handler:', error);
                }
            });
        }
    }
}
exports.ResilientWebSocket = ResilientWebSocket;
class WebSocketConnectionPool {
    connections = new Map();
    defaultOptions;
    logger;
    metricsCollector;
    constructor(options = {}) {
        this.defaultOptions = options.defaultOptions ?? {};
        this.logger = options.logger ?? console;
        this.metricsCollector = options.metricsCollector;
    }
    acquire(id, url, protocols, options = {}) {
        const existing = this.connections.get(id);
        if (existing) {
            return existing.socket;
        }
        const mergedOptions = {
            ...this.defaultOptions,
            ...options,
        };
        if (this.metricsCollector && !mergedOptions.metricsCollector) {
            mergedOptions.metricsCollector = this.metricsCollector;
        }
        const socket = new ResilientWebSocket(url, protocols, mergedOptions);
        socket.on('state-change', (payload) => {
            this.metricsCollector?.record('pool_state_change', {
                id,
                ...payload,
            });
        });
        this.connections.set(id, {
            socket,
            url,
            protocols,
            options: mergedOptions,
        });
        return socket;
    }
    get(id) {
        return this.connections.get(id)?.socket;
    }
    release(id) {
        const entry = this.connections.get(id);
        if (!entry) {
            return;
        }
        entry.socket.destroy();
        this.connections.delete(id);
    }
    broadcast(data) {
        for (const { socket } of this.connections.values()) {
            socket.send(data);
        }
    }
    notifyNetworkChange(status) {
        for (const { socket } of this.connections.values()) {
            socket.notifyNetworkChange(status);
        }
    }
    disconnectAll(reason = 'Pool shutdown') {
        for (const { socket } of this.connections.values()) {
            socket.disconnect(reason);
        }
    }
    getDiagnostics() {
        const diagnostics = {};
        for (const [id, { socket }] of this.connections.entries()) {
            diagnostics[id] = socket.getSnapshot();
        }
        return diagnostics;
    }
}
exports.WebSocketConnectionPool = WebSocketConnectionPool;
// React hook for resilient streaming
const useResilientStream = (url, options = {}) => {
    const [connection, setConnection] = react_1.default.useState(null);
    const [connected, setConnected] = react_1.default.useState(false);
    const [events, setEvents] = react_1.default.useState([]);
    const [error, setError] = react_1.default.useState(null);
    react_1.default.useEffect(() => {
        const stream = new ResilientEventSource(url, options);
        stream.onConnectionChange((isConnected) => {
            setConnected(isConnected);
            setError(isConnected ? null : 'Connection lost');
        });
        stream.on('message', (event) => {
            setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
            setError(null);
        });
        stream.on('error', (event) => {
            setError(event.data?.message || 'Stream error');
        });
        stream.connect();
        setConnection(stream);
        return () => {
            stream.destroy();
        };
    }, [url]);
    return {
        connection,
        connected,
        events,
        error,
        reconnect: () => connection?.connect(),
        disconnect: () => connection?.disconnect(),
    };
};
exports.useResilientStream = useResilientStream;
