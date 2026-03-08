"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketConnectionPool = exports.ManagedConnection = exports.ConnectionState = void 0;
// @ts-nocheck
const prom_client_1 = __importDefault(require("prom-client"));
var ConnectionState;
(function (ConnectionState) {
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["RECONNECTING"] = "reconnecting";
    ConnectionState["DISCONNECTED"] = "disconnected";
    ConnectionState["DEGRADED"] = "degraded";
    ConnectionState["FAILED"] = "failed";
})(ConnectionState || (exports.ConnectionState = ConnectionState = {}));
const DEFAULT_OPTIONS = {
    maxQueueSize: 500,
    replayBatchSize: 50,
    queueFlushInterval: 1500,
    rateLimitPerSecond: 40,
    backpressureThreshold: 256 * 1024,
    heartbeatTimeout: 60_000,
    initialRetryDelay: 1_000,
    maxRetryDelay: 60_000,
    backoffMultiplier: 2,
    jitter: 0.3,
    logger: console,
};
const getOrCreateCounter = (name, help, labelNames) => {
    const existing = prom_client_1.default.register.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    return new prom_client_1.default.Counter({ name, help, labelNames });
};
const getOrCreateGauge = (name, help, labelNames) => {
    const existing = prom_client_1.default.register.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    return new prom_client_1.default.Gauge({ name, help, labelNames });
};
const getOrCreateHistogram = (name, help, labelNames) => {
    const existing = prom_client_1.default.register.getSingleMetric(name);
    if (existing) {
        return existing;
    }
    return new prom_client_1.default.Histogram({ name, help, labelNames });
};
const createMetrics = () => ({
    messageCounter: getOrCreateCounter('websocket_messages_sent_total', 'Total WebSocket messages sent', ['tenant']),
    failureCounter: getOrCreateCounter('websocket_failures_total', 'Total WebSocket failures by reason', ['reason']),
    backpressureCounter: getOrCreateCounter('websocket_backpressure_events_total', 'Total WebSocket backpressure events', ['tenant']),
    reconnectHistogram: getOrCreateHistogram('websocket_reconnect_delay_ms', 'Reconnect delay duration in ms', ['tenant']),
    connectionUptimeGauge: getOrCreateGauge('websocket_connection_uptime_seconds', 'Uptime of active connections', ['tenant']),
    stateGauge: getOrCreateGauge('websocket_connections_state', 'Current WebSocket connections by state', ['state']),
    queueGauge: getOrCreateGauge('websocket_connection_queue_depth', 'Queued messages awaiting delivery by tenant', ['tenant']),
    queueLatencyHistogram: getOrCreateHistogram('websocket_queue_latency_ms', 'Latency between enqueue and send in ms', ['tenant']),
});
const resolveMetric = (metric, ...labels) => {
    if (!metric)
        return undefined;
    if (typeof metric.labels === 'function') {
        const labeled = metric.labels(...labels);
        if (labeled &&
            (typeof labeled.inc === 'function' ||
                typeof labeled.set === 'function' ||
                typeof labeled.observe === 'function')) {
            return labeled;
        }
    }
    return metric;
};
const READY_STATE_OPEN = 1;
class ManagedConnection {
    options;
    metrics;
    ws;
    state = ConnectionState.CONNECTING;
    context;
    queue = [];
    reconnectAttempts = 0;
    tokens;
    lastTokenRefill = Date.now();
    timers = new Map();
    lastHeartbeat = Date.now();
    lastStateChange = Date.now();
    failureReason = null;
    subscriptions = new Set();
    onStateChange;
    connectStartedAt = Date.now();
    connectionId;
    constructor(ws, context, options, metrics, onStateChange) {
        this.ws = ws;
        this.context = context;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.metrics = metrics;
        this.tokens = this.options.rateLimitPerSecond;
        this.onStateChange = onStateChange;
        this.connectionId = context.id;
        this.startHeartbeatMonitor();
    }
    getContext() {
        return this.context;
    }
    getState() {
        return this.state;
    }
    getQueueSize() {
        return this.queue.length;
    }
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
    getLastHeartbeat() {
        return this.lastHeartbeat;
    }
    getFailureReason() {
        return this.failureReason;
    }
    getReconnectDelay() {
        const base = Math.min(this.options.initialRetryDelay *
            Math.pow(this.options.backoffMultiplier, this.reconnectAttempts), this.options.maxRetryDelay);
        const jitter = base * this.options.jitter;
        return base + (Math.random() * jitter - jitter / 2);
    }
    markConnected(ws) {
        if (ws) {
            this.ws = ws;
        }
        this.tokens = this.options.rateLimitPerSecond;
        this.reconnectAttempts = 0;
        this.failureReason = null;
        this.lastHeartbeat = Date.now();
        this.connectStartedAt = Date.now();
        this.transitionTo(ConnectionState.CONNECTED);
        this.flushQueue();
        // Send initial sync/ack
        this.sendJson({ type: 'connection_ack', connectionId: this.connectionId });
    }
    markReconnecting(reason) {
        this.failureReason = reason;
        this.reconnectAttempts += 1;
        this.transitionTo(ConnectionState.RECONNECTING);
        const failureCounter = resolveMetric(this.metrics.failureCounter, reason);
        failureCounter?.inc?.();
        const reconnectHistogram = resolveMetric(this.metrics.reconnectHistogram, this.context.tenantId);
        reconnectHistogram?.observe?.(this.getReconnectDelay());
    }
    markNetworkOffline() {
        this.markReconnecting('network_offline');
    }
    markNetworkOnline() {
        this.failureReason = null;
        if (this.state === ConnectionState.RECONNECTING) {
            this.transitionTo(ConnectionState.CONNECTING);
        }
    }
    markServerRestart(reason = 'server_restart') {
        this.failureReason = reason;
        this.transitionTo(ConnectionState.DEGRADED);
        const failureCounter = resolveMetric(this.metrics.failureCounter, reason);
        failureCounter?.inc?.();
    }
    markDisconnected(reason) {
        this.failureReason = reason;
        this.transitionTo(ConnectionState.DISCONNECTED);
    }
    markFailed(reason) {
        this.failureReason = reason;
        this.transitionTo(ConnectionState.FAILED);
        const failureCounter = resolveMetric(this.metrics.failureCounter, reason);
        failureCounter?.inc?.();
    }
    updateRoute(route) {
        this.context.route = route;
    }
    updateHeartbeat() {
        this.lastHeartbeat = Date.now();
    }
    isHeartbeatExpired(timeout) {
        return Date.now() - this.lastHeartbeat > timeout;
    }
    close(code = 1000, reason = 'Closed by manager') {
        try {
            if (typeof this.ws.close === 'function') {
                this.ws.close(code, reason);
            }
        }
        catch (error) {
            this.options.logger.warn?.(`Failed to close WebSocket ${this.context.id}: ${String(error)}`);
        }
        this.transitionTo(ConnectionState.DISCONNECTED);
        this.clearTimer(0 /* TimerType.QUEUE_DRAIN */);
        this.clearTimer(1 /* TimerType.HEARTBEAT */);
    }
    startHeartbeatMonitor() {
        if (this.timers.has(1 /* TimerType.HEARTBEAT */))
            return;
        const interval = setInterval(() => {
            if (this.state === ConnectionState.CONNECTED) {
                const uptime = (Date.now() - this.connectStartedAt) / 1000;
                const uptimeGauge = resolveMetric(this.metrics.connectionUptimeGauge, this.context.tenantId);
                uptimeGauge?.set?.(uptime);
                if (this.isHeartbeatExpired(this.options.heartbeatTimeout)) {
                    this.options.logger.warn(`Heartbeat timeout for ${this.context.id}`);
                    this.markFailed('heartbeat_timeout');
                    this.close(4008, 'Heartbeat timeout');
                }
            }
        }, 5000);
        this.timers.set(1 /* TimerType.HEARTBEAT */, interval);
    }
    sendJson(payload) {
        return this.sendRaw(JSON.stringify(payload));
    }
    sendRaw(payload) {
        this.refillTokens();
        if (this.state !== ConnectionState.CONNECTED) {
            this.enqueue(payload);
            return false;
        }
        if (!this.consumeToken()) {
            this.enqueue(payload);
            return false;
        }
        if (!this.isReadyForSend()) {
            const backpressureCounter = resolveMetric(this.metrics.backpressureCounter, this.context.tenantId);
            backpressureCounter?.inc?.();
            this.enqueue(payload);
            return false;
        }
        return this.performSend(payload);
    }
    flushQueue() {
        if (this.state !== ConnectionState.CONNECTED || this.queue.length === 0) {
            return 0;
        }
        this.refillTokens();
        let sent = 0;
        const batchSize = Math.min(this.queue.length, this.options.replayBatchSize);
        const batch = this.queue.splice(0, batchSize);
        for (const item of batch) {
            const success = this.performSend(item.payload, item);
            if (!success) {
                this.queue.unshift(item, ...batch.slice(sent + 1));
                this.scheduleQueueDrain();
                const queueGauge = resolveMetric(this.metrics.queueGauge, this.context.tenantId);
                queueGauge?.set?.(this.queue.length);
                return sent;
            }
            sent += 1;
        }
        const queueGauge = resolveMetric(this.metrics.queueGauge, this.context.tenantId);
        queueGauge?.set?.(this.queue.length);
        if (this.queue.length > 0) {
            this.scheduleQueueDrain();
        }
        else {
            this.clearTimer(0 /* TimerType.QUEUE_DRAIN */);
        }
        return sent;
    }
    getStats() {
        return {
            id: this.context.id,
            tenantId: this.context.tenantId,
            userId: this.context.userId,
            route: this.context.route,
            state: this.state,
            queueDepth: this.queue.length,
            reconnectAttempts: this.reconnectAttempts,
            lastHeartbeat: this.lastHeartbeat,
            failureReason: this.failureReason,
            sinceStateChangeMs: Date.now() - this.lastStateChange,
            sinceConnectedMs: Date.now() - this.connectStartedAt,
        };
    }
    destroy() {
        this.clearTimer(0 /* TimerType.QUEUE_DRAIN */);
        this.queue.length = 0;
        this.transitionTo(ConnectionState.DISCONNECTED);
    }
    transitionTo(next) {
        if (this.state === next) {
            return;
        }
        this.options.logger.debug?.(`WebSocket connection ${this.context.id} transitioning from ${this.state} to ${next}`);
        this.state = next;
        this.lastStateChange = Date.now();
        this.onStateChange();
    }
    enqueue(payload) {
        const now = Date.now();
        if (this.queue.length >= this.options.maxQueueSize) {
            this.queue.shift();
            this.options.logger.warn?.(`Dropping oldest queued message for ${this.context.id} due to queue capacity`);
        }
        this.queue.push({ payload, enqueuedAt: now, attempts: 1 });
        const queueGauge = resolveMetric(this.metrics.queueGauge, this.context.tenantId);
        queueGauge?.set?.(this.queue.length);
        this.scheduleQueueDrain();
    }
    scheduleQueueDrain() {
        if (this.timers.has(0 /* TimerType.QUEUE_DRAIN */)) {
            return;
        }
        const timer = setTimeout(() => {
            this.timers.delete(0 /* TimerType.QUEUE_DRAIN */);
            this.flushQueue();
        }, this.options.queueFlushInterval);
        this.timers.set(0 /* TimerType.QUEUE_DRAIN */, timer);
    }
    clearTimer(type) {
        const timer = this.timers.get(type);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(type);
        }
    }
    consumeToken() {
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
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
    isReadyForSend() {
        if (typeof this.ws.readyState === 'number' &&
            this.ws.readyState !== READY_STATE_OPEN) {
            return false;
        }
        if (typeof this.ws.getBufferedAmount === 'function') {
            try {
                const buffered = this.ws.getBufferedAmount();
                if (typeof buffered === 'number' &&
                    buffered > this.options.backpressureThreshold) {
                    return false;
                }
            }
            catch (error) {
                this.options.logger.warn?.(`Failed to read bufferedAmount for ${this.context.id}: ${String(error)}`);
            }
        }
        return true;
    }
    performSend(payload, meta) {
        try {
            this.ws.send(payload);
            const messageCounter = resolveMetric(this.metrics.messageCounter, this.context.tenantId);
            messageCounter?.inc?.();
            if (meta) {
                const queueLatencyHistogram = resolveMetric(this.metrics.queueLatencyHistogram, this.context.tenantId);
                queueLatencyHistogram?.observe?.(Math.max(0, Date.now() - meta.enqueuedAt));
            }
            return true;
        }
        catch (error) {
            this.options.logger.error?.(`WebSocket send failed for ${this.context.id}: ${String(error)}`);
            this.enqueue(payload);
            this.markFailed('send_error');
            return false;
        }
    }
}
exports.ManagedConnection = ManagedConnection;
class WebSocketConnectionPool {
    connections = new Map();
    metrics;
    options;
    constructor(options = {}) {
        this.options = options;
        this.metrics = createMetrics();
    }
    registerConnection(id, ws, context) {
        const existing = this.connections.get(id);
        if (existing) {
            existing.updateRoute(context.route);
            existing.markConnected(ws);
            this.refreshStateGauge();
            return existing;
        }
        const managed = new ManagedConnection(ws, context, this.options, this.metrics, () => {
            this.refreshStateGauge();
        });
        this.connections.set(id, managed);
        managed.markConnected(ws);
        this.refreshStateGauge();
        return managed;
    }
    rebindConnection(id, ws) {
        const connection = this.connections.get(id);
        if (connection) {
            connection.markConnected(ws);
            this.refreshStateGauge();
        }
        return connection;
    }
    removeConnection(id, reason = 'closed') {
        const connection = this.connections.get(id);
        if (!connection) {
            return;
        }
        connection.markDisconnected(reason);
        connection.destroy();
        this.connections.delete(id);
        this.refreshStateGauge();
    }
    send(id, payload) {
        const connection = this.connections.get(id);
        if (!connection) {
            return false;
        }
        return connection.sendRaw(payload);
    }
    sendJson(id, payload) {
        return this.send(id, JSON.stringify(payload));
    }
    broadcast(payload, filter) {
        for (const connection of this.connections.values()) {
            if (filter && !filter(connection)) {
                continue;
            }
            connection.sendRaw(payload);
        }
    }
    handleNetworkChange(status) {
        for (const connection of this.connections.values()) {
            if (status === 'offline') {
                connection.markNetworkOffline();
            }
            else {
                connection.markNetworkOnline();
            }
        }
        this.refreshStateGauge();
    }
    handleServerRestart(reason = 'server_restart') {
        for (const connection of this.connections.values()) {
            connection.markServerRestart(reason);
            connection.sendJson({
                type: 'server_restart',
                reason,
                timestamp: Date.now(),
            });
        }
        this.refreshStateGauge();
    }
    closeIdleConnections(timeoutMs) {
        const closed = [];
        for (const [id, connection] of this.connections.entries()) {
            if (connection.isHeartbeatExpired(timeoutMs)) {
                connection.close(4000, 'Heartbeat timeout');
                this.connections.delete(id);
                closed.push(id);
            }
        }
        if (closed.length > 0) {
            this.refreshStateGauge();
        }
        return closed;
    }
    updateRoute(id, route) {
        const connection = this.connections.get(id);
        if (!connection) {
            return;
        }
        connection.updateRoute(route);
    }
    getStats() {
        const stats = [];
        for (const connection of this.connections.values()) {
            stats.push(connection.getStats());
        }
        return {
            totalConnections: this.connections.size,
            byState: stats.reduce((acc, stat) => {
                acc[stat.state] = (acc[stat.state] || 0) + 1;
                return acc;
            }, {}),
            connections: stats,
        };
    }
    refreshStateGauge() {
        const counts = {
            [ConnectionState.CONNECTING]: 0,
            [ConnectionState.CONNECTED]: 0,
            [ConnectionState.RECONNECTING]: 0,
            [ConnectionState.DISCONNECTED]: 0,
            [ConnectionState.DEGRADED]: 0,
            [ConnectionState.FAILED]: 0,
        };
        for (const connection of this.connections.values()) {
            counts[connection.getState()] += 1;
        }
        Object.entries(counts).forEach(([state, count]) => {
            const gauge = this.metrics.stateGauge;
            const labeled = gauge.labels ? gauge.labels(state) : undefined;
            if (labeled && typeof labeled.set === 'function') {
                labeled.set(count);
                return;
            }
            // Fallback for test environments where the registry already has an unlabeled gauge.
            if (typeof gauge.set === 'function') {
                gauge.set(count);
            }
        });
    }
}
exports.WebSocketConnectionPool = WebSocketConnectionPool;
