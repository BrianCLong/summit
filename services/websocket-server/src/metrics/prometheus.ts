/**
 * Prometheus Metrics Collection
 * Comprehensive metrics for WebSocket server monitoring
 */

import promClient from 'prom-client';

// Register
export const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Connection metrics
export const activeConnections = new promClient.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['tenant', 'status'],
  registers: [register],
});

export const totalConnections = new promClient.Counter({
  name: 'websocket_connections_total',
  help: 'Total number of WebSocket connections',
  labelNames: ['tenant'],
  registers: [register],
});

export const disconnections = new promClient.Counter({
  name: 'websocket_disconnections_total',
  help: 'Total number of WebSocket disconnections',
  labelNames: ['tenant', 'reason'],
  registers: [register],
});

export const connectionDuration = new promClient.Histogram({
  name: 'websocket_connection_duration_seconds',
  help: 'Duration of WebSocket connections in seconds',
  labelNames: ['tenant'],
  buckets: [1, 5, 15, 30, 60, 300, 600, 1800, 3600],
  registers: [register],
});

// Message metrics
export const messagesReceived = new promClient.Counter({
  name: 'websocket_messages_received_total',
  help: 'Total number of messages received',
  labelNames: ['tenant', 'event'],
  registers: [register],
});

export const messagesSent = new promClient.Counter({
  name: 'websocket_messages_sent_total',
  help: 'Total number of messages sent',
  labelNames: ['tenant', 'event'],
  registers: [register],
});

export const messageLatency = new promClient.Histogram({
  name: 'websocket_message_latency_ms',
  help: 'Message processing latency in milliseconds',
  labelNames: ['tenant', 'event'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

export const messagePersisted = new promClient.Counter({
  name: 'websocket_messages_persisted_total',
  help: 'Total number of messages persisted to Redis',
  labelNames: ['tenant', 'room'],
  registers: [register],
});

export const messageDropped = new promClient.Counter({
  name: 'websocket_messages_dropped_total',
  help: 'Total number of messages dropped',
  labelNames: ['tenant', 'reason'],
  registers: [register],
});

// Room metrics
export const activeRooms = new promClient.Gauge({
  name: 'websocket_active_rooms',
  help: 'Number of active rooms',
  labelNames: ['tenant'],
  registers: [register],
});

export const roomSubscriptions = new promClient.Gauge({
  name: 'websocket_room_subscriptions',
  help: 'Number of room subscriptions',
  labelNames: ['tenant'],
  registers: [register],
});

export const roomJoins = new promClient.Counter({
  name: 'websocket_room_joins_total',
  help: 'Total number of room joins',
  labelNames: ['tenant'],
  registers: [register],
});

export const roomLeaves = new promClient.Counter({
  name: 'websocket_room_leaves_total',
  help: 'Total number of room leaves',
  labelNames: ['tenant'],
  registers: [register],
});

// Presence metrics
export const presenceUpdates = new promClient.Counter({
  name: 'websocket_presence_updates_total',
  help: 'Total number of presence updates',
  labelNames: ['tenant', 'status'],
  registers: [register],
});

export const activePresence = new promClient.Gauge({
  name: 'websocket_active_presence',
  help: 'Number of users with active presence',
  labelNames: ['tenant', 'status'],
  registers: [register],
});

// Error metrics
export const errors = new promClient.Counter({
  name: 'websocket_errors_total',
  help: 'Total number of errors',
  labelNames: ['tenant', 'type', 'code'],
  registers: [register],
});

export const authFailures = new promClient.Counter({
  name: 'websocket_auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['reason'],
  registers: [register],
});

// Rate limiting metrics
export const rateLimitHits = new promClient.Counter({
  name: 'websocket_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['tenant', 'type'],
  registers: [register],
});

// Redis metrics
export const redisOperations = new promClient.Counter({
  name: 'websocket_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const redisLatency = new promClient.Histogram({
  name: 'websocket_redis_latency_ms',
  help: 'Redis operation latency in milliseconds',
  labelNames: ['operation'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
  registers: [register],
});

// Cluster metrics
export const clusterNodes = new promClient.Gauge({
  name: 'websocket_cluster_nodes',
  help: 'Number of nodes in the cluster',
  registers: [register],
});

export const clusterBroadcasts = new promClient.Counter({
  name: 'websocket_cluster_broadcasts_total',
  help: 'Total number of cluster broadcasts',
  labelNames: ['event'],
  registers: [register],
});

// Performance metrics
export const eventLoopLag = new promClient.Gauge({
  name: 'websocket_event_loop_lag_ms',
  help: 'Event loop lag in milliseconds',
  registers: [register],
});

// Helper functions
export function recordConnectionStart(tenant: string): void {
  totalConnections.inc({ tenant });
  activeConnections.inc({ tenant, status: 'online' });
}

export function recordConnectionEnd(
  tenant: string,
  reason: string,
  durationSeconds: number
): void {
  activeConnections.dec({ tenant, status: 'online' });
  disconnections.inc({ tenant, reason });
  connectionDuration.observe({ tenant }, durationSeconds);
}

export function recordMessageReceived(tenant: string, event: string): void {
  messagesReceived.inc({ tenant, event });
}

export function recordMessageSent(tenant: string, event: string): void {
  messagesSent.inc({ tenant, event });
}

export function recordMessageLatency(
  tenant: string,
  event: string,
  latencyMs: number
): void {
  messageLatency.observe({ tenant, event }, latencyMs);
}

export function recordError(tenant: string, type: string, code: string): void {
  errors.inc({ tenant, type, code });
}

export function recordAuthFailure(reason: string): void {
  authFailures.inc({ reason });
}

export function recordRateLimitHit(tenant: string, type: string): void {
  rateLimitHits.inc({ tenant, type });
}

export function recordRedisOperation(
  operation: string,
  status: 'success' | 'error',
  latencyMs?: number
): void {
  redisOperations.inc({ operation, status });
  if (latencyMs !== undefined) {
    redisLatency.observe({ operation }, latencyMs);
  }
}

// Metrics endpoint handler
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

// Measure event loop lag
let lastCheck = Date.now();
setInterval(() => {
  const now = Date.now();
  const lag = now - lastCheck - 1000; // Expected 1000ms
  eventLoopLag.set(Math.max(0, lag));
  lastCheck = now;
}, 1000);
