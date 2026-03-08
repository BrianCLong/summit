"use strict";
/**
 * Prometheus Metrics Collection
 * Comprehensive metrics for WebSocket server monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securitySensitiveEventsTotal = exports.securityAuditWritesTotal = exports.securityPermissionDenialsTotal = exports.securityAuthDenialsTotal = exports.eventLoopLag = exports.clusterBroadcasts = exports.clusterNodes = exports.redisLatency = exports.redisOperations = exports.rateLimitHits = exports.authFailures = exports.errors = exports.activePresence = exports.presenceUpdates = exports.roomLeaves = exports.roomJoins = exports.roomSubscriptions = exports.activeRooms = exports.messageDropped = exports.messagePersisted = exports.messageLatency = exports.messagesSent = exports.messagesReceived = exports.connectionDuration = exports.disconnections = exports.totalConnections = exports.activeConnections = exports.register = void 0;
exports.recordConnectionStart = recordConnectionStart;
exports.recordConnectionEnd = recordConnectionEnd;
exports.recordMessageReceived = recordMessageReceived;
exports.recordMessageSent = recordMessageSent;
exports.recordMessageLatency = recordMessageLatency;
exports.recordError = recordError;
exports.recordAuthFailure = recordAuthFailure;
exports.recordRateLimitHit = recordRateLimitHit;
exports.recordRedisOperation = recordRedisOperation;
exports.recordSecurityAuthDenial = recordSecurityAuthDenial;
exports.recordSecurityPermissionDenial = recordSecurityPermissionDenial;
exports.recordSecurityAuditWrite = recordSecurityAuditWrite;
exports.recordSecuritySensitiveEvent = recordSecuritySensitiveEvent;
exports.getMetrics = getMetrics;
exports.recordMessageFailed = recordMessageFailed;
const prom_client_1 = __importDefault(require("prom-client"));
// Register
exports.register = new prom_client_1.default.Registry();
// Default metrics (CPU, memory, etc.)
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
// Connection metrics
exports.activeConnections = new prom_client_1.default.Gauge({
    name: 'websocket_active_connections',
    help: 'Number of active WebSocket connections',
    labelNames: ['tenant', 'status'],
    registers: [exports.register],
});
exports.totalConnections = new prom_client_1.default.Counter({
    name: 'websocket_connections_total',
    help: 'Total number of WebSocket connections',
    labelNames: ['tenant'],
    registers: [exports.register],
});
exports.disconnections = new prom_client_1.default.Counter({
    name: 'websocket_disconnections_total',
    help: 'Total number of WebSocket disconnections',
    labelNames: ['tenant', 'reason'],
    registers: [exports.register],
});
exports.connectionDuration = new prom_client_1.default.Histogram({
    name: 'websocket_connection_duration_seconds',
    help: 'Duration of WebSocket connections in seconds',
    labelNames: ['tenant'],
    buckets: [1, 5, 15, 30, 60, 300, 600, 1800, 3600],
    registers: [exports.register],
});
// Message metrics
exports.messagesReceived = new prom_client_1.default.Counter({
    name: 'websocket_messages_received_total',
    help: 'Total number of messages received',
    labelNames: ['tenant', 'event'],
    registers: [exports.register],
});
exports.messagesSent = new prom_client_1.default.Counter({
    name: 'websocket_messages_sent_total',
    help: 'Total number of messages sent',
    labelNames: ['tenant', 'event'],
    registers: [exports.register],
});
exports.messageLatency = new prom_client_1.default.Histogram({
    name: 'websocket_message_latency_ms',
    help: 'Message processing latency in milliseconds',
    labelNames: ['tenant', 'event'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [exports.register],
});
exports.messagePersisted = new prom_client_1.default.Counter({
    name: 'websocket_messages_persisted_total',
    help: 'Total number of messages persisted to Redis',
    labelNames: ['tenant', 'room'],
    registers: [exports.register],
});
exports.messageDropped = new prom_client_1.default.Counter({
    name: 'websocket_messages_dropped_total',
    help: 'Total number of messages dropped',
    labelNames: ['tenant', 'reason'],
    registers: [exports.register],
});
// Room metrics
exports.activeRooms = new prom_client_1.default.Gauge({
    name: 'websocket_active_rooms',
    help: 'Number of active rooms',
    labelNames: ['tenant'],
    registers: [exports.register],
});
exports.roomSubscriptions = new prom_client_1.default.Gauge({
    name: 'websocket_room_subscriptions',
    help: 'Number of room subscriptions',
    labelNames: ['tenant'],
    registers: [exports.register],
});
exports.roomJoins = new prom_client_1.default.Counter({
    name: 'websocket_room_joins_total',
    help: 'Total number of room joins',
    labelNames: ['tenant'],
    registers: [exports.register],
});
exports.roomLeaves = new prom_client_1.default.Counter({
    name: 'websocket_room_leaves_total',
    help: 'Total number of room leaves',
    labelNames: ['tenant'],
    registers: [exports.register],
});
// Presence metrics
exports.presenceUpdates = new prom_client_1.default.Counter({
    name: 'websocket_presence_updates_total',
    help: 'Total number of presence updates',
    labelNames: ['tenant', 'status'],
    registers: [exports.register],
});
exports.activePresence = new prom_client_1.default.Gauge({
    name: 'websocket_active_presence',
    help: 'Number of users with active presence',
    labelNames: ['tenant', 'status'],
    registers: [exports.register],
});
// Error metrics
exports.errors = new prom_client_1.default.Counter({
    name: 'websocket_errors_total',
    help: 'Total number of errors',
    labelNames: ['tenant', 'type', 'code'],
    registers: [exports.register],
});
exports.authFailures = new prom_client_1.default.Counter({
    name: 'websocket_auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['reason'],
    registers: [exports.register],
});
// Rate limiting metrics
exports.rateLimitHits = new prom_client_1.default.Counter({
    name: 'websocket_rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['tenant', 'type'],
    registers: [exports.register],
});
// Redis metrics
exports.redisOperations = new prom_client_1.default.Counter({
    name: 'websocket_redis_operations_total',
    help: 'Total number of Redis operations',
    labelNames: ['operation', 'status'],
    registers: [exports.register],
});
exports.redisLatency = new prom_client_1.default.Histogram({
    name: 'websocket_redis_latency_ms',
    help: 'Redis operation latency in milliseconds',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500],
    registers: [exports.register],
});
// Cluster metrics
exports.clusterNodes = new prom_client_1.default.Gauge({
    name: 'websocket_cluster_nodes',
    help: 'Number of nodes in the cluster',
    registers: [exports.register],
});
exports.clusterBroadcasts = new prom_client_1.default.Counter({
    name: 'websocket_cluster_broadcasts_total',
    help: 'Total number of cluster broadcasts',
    labelNames: ['event'],
    registers: [exports.register],
});
// Performance metrics
exports.eventLoopLag = new prom_client_1.default.Gauge({
    name: 'websocket_event_loop_lag_ms',
    help: 'Event loop lag in milliseconds',
    registers: [exports.register],
});
// ---------------------------------------------------------------------------
// Security observability metrics
// Answers: "unusual sensitive-read spikes?", "audit write failures?",
//          "disproportionate auth errors?"
// ---------------------------------------------------------------------------
exports.securityAuthDenialsTotal = new prom_client_1.default.Counter({
    name: 'websocket_security_auth_denials_total',
    help: 'Auth/permission denials with structured reason for SOC dashboards',
    labelNames: ['reason', 'tenant'],
    registers: [exports.register],
});
exports.securityPermissionDenialsTotal = new prom_client_1.default.Counter({
    name: 'websocket_security_permission_denials_total',
    help: 'Permission check denials on WebSocket handlers',
    labelNames: ['permission', 'tenant'],
    registers: [exports.register],
});
exports.securityAuditWritesTotal = new prom_client_1.default.Counter({
    name: 'websocket_security_audit_writes_total',
    help: 'Audit events written from WebSocket service',
    labelNames: ['event_type', 'outcome'],
    registers: [exports.register],
});
exports.securitySensitiveEventsTotal = new prom_client_1.default.Counter({
    name: 'websocket_security_sensitive_events_total',
    help: 'Security-sensitive events (room joins, collaboration, presence) for spike detection',
    labelNames: ['event_type', 'tenant'],
    registers: [exports.register],
});
// Helper functions
function recordConnectionStart(tenant) {
    exports.totalConnections.inc({ tenant });
    exports.activeConnections.inc({ tenant, status: 'online' });
}
function recordConnectionEnd(tenant, reason, durationSeconds) {
    exports.activeConnections.dec({ tenant, status: 'online' });
    exports.disconnections.inc({ tenant, reason });
    exports.connectionDuration.observe({ tenant }, durationSeconds);
}
function recordMessageReceived(tenant, event) {
    exports.messagesReceived.inc({ tenant, event });
}
function recordMessageSent(tenant, event) {
    exports.messagesSent.inc({ tenant, event });
}
function recordMessageLatency(tenant, event, latencyMs) {
    exports.messageLatency.observe({ tenant, event }, latencyMs);
}
function recordError(tenant, type, code) {
    exports.errors.inc({ tenant, type, code });
}
function recordAuthFailure(reason) {
    exports.authFailures.inc({ reason });
}
function recordRateLimitHit(tenant, type) {
    exports.rateLimitHits.inc({ tenant, type });
}
function recordRedisOperation(operation, status, latencyMs) {
    exports.redisOperations.inc({ operation, status });
    if (latencyMs !== undefined) {
        exports.redisLatency.observe({ operation }, latencyMs);
    }
}
// Security observability helpers
function recordSecurityAuthDenial(reason, tenant) {
    exports.securityAuthDenialsTotal.inc({ reason, tenant });
}
function recordSecurityPermissionDenial(permission, tenant) {
    exports.securityPermissionDenialsTotal.inc({ permission, tenant });
}
function recordSecurityAuditWrite(eventType, outcome) {
    exports.securityAuditWritesTotal.inc({ event_type: eventType, outcome });
}
function recordSecuritySensitiveEvent(eventType, tenant) {
    exports.securitySensitiveEventsTotal.inc({ event_type: eventType, tenant });
}
// Metrics endpoint handler
async function getMetrics() {
    return await exports.register.metrics();
}
// Measure event loop lag
let lastCheck = Date.now();
setInterval(() => {
    const now = Date.now();
    const lag = now - lastCheck - 1000; // Expected 1000ms
    exports.eventLoopLag.set(Math.max(0, lag));
    lastCheck = now;
}, 1000);
function recordMessageFailed(tenant, reason) {
    exports.messageDropped.inc({ tenant, reason });
}
