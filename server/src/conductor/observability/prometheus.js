"use strict";
// Conductor Prometheus Metrics Integration
// Integrates Conductor metrics with the existing Prometheus metrics system
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.prometheusConductorMetrics = exports.PrometheusConductorMetrics = exports.capacityActiveReservationsGauge = exports.capacityReserveLatencyMs = exports.capacityReservationsCounter = exports.pricingReadLatencyMs = exports.pricingReadRequestsTotal = exports.conductorTaskTimeoutTotal = exports.conductorConcurrencyLimitHitsTotal = exports.conductorRoutingConfidenceHistogram = exports.conductorQuotaRemainingGauge = exports.conductorSystemHealthStatus = exports.conductorMcpServerStatus = exports.conductorSecurityEventsTotal = exports.conductorActiveTasksGauge = exports.conductorMcpLatencySeconds = exports.conductorMcpOperationsTotal = exports.conductorExpertCostUsd = exports.conductorExpertLatencySeconds = exports.conductorExpertExecutionsTotal = exports.conductorRouterDecisionsTotal = void 0;
exports.getConfidenceBucket = getConfidenceBucket;
exports.getCostBucket = getCostBucket;
const promClient = __importStar(require("prom-client"));
const metrics_js_1 = require("../../monitoring/metrics.js");
const client = promClient.default || promClient;
function createHistogram(config) {
    try {
        return new client.Histogram(config);
    }
    catch (e) {
        return { observe: () => { }, startTimer: () => () => { }, labels: () => ({ observe: () => { } }), reset: () => { } };
    }
}
function createCounter(config) {
    try {
        return new client.Counter(config);
    }
    catch (e) {
        return { inc: () => { }, labels: () => ({ inc: () => { } }), reset: () => { } };
    }
}
function createGauge(config) {
    try {
        return new client.Gauge(config);
    }
    catch (e) {
        return { inc: () => { }, dec: () => { }, set: () => { }, labels: () => ({ inc: () => { }, dec: () => { }, set: () => { } }), reset: () => { } };
    }
}
// Conductor-specific Prometheus metrics
exports.conductorRouterDecisionsTotal = createCounter({
    name: 'conductor_router_decisions_total',
    help: 'Total number of routing decisions made by the Conductor',
    labelNames: ['expert', 'result', 'confidence_bucket'],
});
exports.conductorExpertExecutionsTotal = createCounter({
    name: 'conductor_expert_executions_total',
    help: 'Total number of expert executions',
    labelNames: ['expert', 'result', 'cost_bucket'],
});
exports.conductorExpertLatencySeconds = createHistogram({
    name: 'conductor_expert_latency_seconds',
    help: 'Duration of expert executions in seconds',
    labelNames: ['expert'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
exports.conductorExpertCostUsd = createHistogram({
    name: 'conductor_expert_cost_usd',
    help: 'Cost of expert executions in USD',
    labelNames: ['expert'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
});
exports.conductorMcpOperationsTotal = createCounter({
    name: 'conductor_mcp_operations_total',
    help: 'Total number of MCP operations',
    labelNames: ['server', 'tool', 'result'],
});
exports.conductorMcpLatencySeconds = createHistogram({
    name: 'conductor_mcp_latency_seconds',
    help: 'Duration of MCP operations in seconds',
    labelNames: ['server', 'tool'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
exports.conductorActiveTasksGauge = createGauge({
    name: 'conductor_active_tasks',
    help: 'Number of currently active Conductor tasks',
});
exports.conductorSecurityEventsTotal = createCounter({
    name: 'conductor_security_events_total',
    help: 'Total number of security events in Conductor',
    labelNames: ['type', 'result'],
});
exports.conductorMcpServerStatus = createGauge({
    name: 'conductor_mcp_server_status',
    help: 'Status of MCP servers (1=healthy, 0=unhealthy)',
    labelNames: ['server', 'url'],
});
exports.conductorSystemHealthStatus = createGauge({
    name: 'conductor_system_health_status',
    help: 'Overall Conductor system health (1=healthy, 0.5=degraded, 0=unhealthy)',
});
exports.conductorQuotaRemainingGauge = createGauge({
    name: 'conductor_quota_remaining',
    help: 'Remaining quota for Conductor operations',
    labelNames: ['expert', 'quota_type', 'user_id'],
});
exports.conductorRoutingConfidenceHistogram = createHistogram({
    name: 'conductor_routing_confidence',
    help: 'Confidence scores for routing decisions',
    labelNames: ['expert'],
    buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99, 1.0],
});
exports.conductorConcurrencyLimitHitsTotal = createCounter({
    name: 'conductor_concurrency_limit_hits_total',
    help: 'Total number of times concurrency limits were hit',
    labelNames: ['expert'],
});
exports.conductorTaskTimeoutTotal = createCounter({
    name: 'conductor_task_timeout_total',
    help: 'Total number of tasks that timed out',
    labelNames: ['expert', 'timeout_type'],
});
exports.pricingReadRequestsTotal = createCounter({
    name: 'pricing_read_requests_total',
    help: 'Total number of pricing read/debug API requests',
    labelNames: ['route', 'status'],
});
exports.pricingReadLatencyMs = createHistogram({
    name: 'pricing_read_latency_ms',
    help: 'Latency of pricing read/debug API requests in milliseconds',
    labelNames: ['route'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
});
exports.capacityReservationsCounter = createCounter({
    name: 'capacity_reservations_total',
    help: 'Total capacity reservation actions',
    labelNames: ['action', 'status'],
});
exports.capacityReserveLatencyMs = createHistogram({
    name: 'capacity_reserve_latency_ms',
    help: 'Latency of capacity reservation requests in milliseconds',
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
});
exports.capacityActiveReservationsGauge = createGauge({
    name: 'capacity_active_reservations',
    help: 'Number of active capacity reservations',
});
// Register all conductor metrics with the main registry
try {
    [
        exports.conductorRouterDecisionsTotal,
        exports.conductorExpertExecutionsTotal,
        exports.conductorExpertLatencySeconds,
        exports.conductorExpertCostUsd,
        exports.conductorMcpOperationsTotal,
        exports.conductorMcpLatencySeconds,
        exports.conductorActiveTasksGauge,
        exports.conductorSecurityEventsTotal,
        exports.conductorMcpServerStatus,
        exports.conductorSystemHealthStatus,
        exports.conductorQuotaRemainingGauge,
        exports.conductorRoutingConfidenceHistogram,
        exports.conductorConcurrencyLimitHitsTotal,
        exports.conductorTaskTimeoutTotal,
        exports.pricingReadRequestsTotal,
        exports.pricingReadLatencyMs,
        exports.capacityReservationsCounter,
        exports.capacityReserveLatencyMs,
        exports.capacityActiveReservationsGauge,
    ].forEach((metric) => metrics_js_1.register.registerMetric(metric));
}
catch (e) { }
// Helper functions to work with confidence buckets
function getConfidenceBucket(confidence) {
    if (confidence >= 0.9)
        return 'high';
    if (confidence >= 0.7)
        return 'medium';
    if (confidence >= 0.5)
        return 'low';
    return 'very_low';
}
function getCostBucket(cost) {
    if (cost >= 5)
        return 'expensive';
    if (cost >= 1)
        return 'moderate';
    if (cost >= 0.1)
        return 'cheap';
    return 'free';
}
// Prometheus-compatible metrics recorder that implements the ConductorMetrics interface
class PrometheusConductorMetrics {
    /**
     * Record a routing decision
     */
    recordRoutingDecision(expert, latencyMs, confidence, success) {
        const confidenceBucket = getConfidenceBucket(confidence);
        exports.conductorRouterDecisionsTotal.inc({
            expert,
            result: success ? 'success' : 'error',
            confidence_bucket: confidenceBucket,
        });
        exports.conductorRoutingConfidenceHistogram.observe({ expert }, confidence);
    }
    /**
     * Record expert execution
     */
    recordExpertExecution(expert, latencyMs, cost, success) {
        const costBucket = getCostBucket(cost);
        exports.conductorExpertExecutionsTotal.inc({
            expert,
            result: success ? 'success' : 'error',
            cost_bucket: costBucket,
        });
        exports.conductorExpertLatencySeconds.observe({ expert }, latencyMs / 1000);
        exports.conductorExpertCostUsd.observe({ expert }, cost);
    }
    /**
     * Record MCP operation
     */
    recordMCPOperation(serverName, toolName, latencyMs, success) {
        exports.conductorMcpOperationsTotal.inc({
            server: serverName,
            tool: toolName,
            result: success ? 'success' : 'error',
        });
        exports.conductorMcpLatencySeconds.observe({
            server: serverName,
            tool: toolName,
        }, latencyMs / 1000);
    }
    /**
     * Update active task count
     */
    updateActiveTaskCount(count) {
        exports.conductorActiveTasksGauge.set(count);
    }
    /**
     * Record security event
     */
    recordSecurityEvent(eventType, success) {
        exports.conductorSecurityEventsTotal.inc({
            type: eventType,
            result: success ? 'allowed' : 'denied',
        });
    }
    /**
     * Update MCP server status
     */
    updateMCPServerStatus(serverName, url, healthy) {
        exports.conductorMcpServerStatus.set({ server: serverName, url }, healthy ? 1 : 0);
    }
    /**
     * Update system health status
     */
    updateSystemHealthStatus(status) {
        const statusValue = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
        exports.conductorSystemHealthStatus.set(statusValue);
    }
    /**
     * Update quota remaining
     */
    updateQuotaRemaining(expert, quotaType, userId, remaining) {
        exports.conductorQuotaRemainingGauge.set({ expert, quota_type: quotaType, user_id: userId }, remaining);
    }
    /**
     * Record concurrency limit hit
     */
    recordConcurrencyLimitHit(expert) {
        exports.conductorConcurrencyLimitHitsTotal.inc({ expert });
    }
    /**
     * Record task timeout
     */
    recordTaskTimeout(expert, timeoutType) {
        exports.conductorTaskTimeoutTotal.inc({ expert, timeout_type: timeoutType });
    }
    /**
     * Record operational event (for general operational tracking)
     */
    recordOperationalEvent(eventType, metadata) {
        // Record as a security event with generic type
        exports.conductorSecurityEventsTotal.inc({
            type: eventType,
            result: metadata?.success !== false ? 'allowed' : 'denied',
        });
    }
    /**
     * Record operational metric (for general metric tracking)
     */
    recordOperationalMetric(metricName, value, labels) {
        // For now, record as active task count or use a generic gauge
        // This is a stub implementation that can be expanded
        if (metricName.includes('active') || metricName.includes('count')) {
            exports.conductorActiveTasksGauge.set(value);
        }
    }
}
exports.PrometheusConductorMetrics = PrometheusConductorMetrics;
// Singleton instance
exports.prometheusConductorMetrics = new PrometheusConductorMetrics();
