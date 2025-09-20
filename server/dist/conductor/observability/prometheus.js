// Conductor Prometheus Metrics Integration
// Integrates Conductor metrics with the existing Prometheus metrics system
import * as client from 'prom-client';
import { register } from '../../monitoring/metrics.js';
// Conductor-specific Prometheus metrics
export const conductorRouterDecisionsTotal = new client.Counter({
    name: 'conductor_router_decisions_total',
    help: 'Total number of routing decisions made by the Conductor',
    labelNames: ['expert', 'result', 'confidence_bucket'],
});
export const conductorExpertExecutionsTotal = new client.Counter({
    name: 'conductor_expert_executions_total',
    help: 'Total number of expert executions',
    labelNames: ['expert', 'result', 'cost_bucket'],
});
export const conductorExpertLatencySeconds = new client.Histogram({
    name: 'conductor_expert_latency_seconds',
    help: 'Duration of expert executions in seconds',
    labelNames: ['expert'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
export const conductorExpertCostUsd = new client.Histogram({
    name: 'conductor_expert_cost_usd',
    help: 'Cost of expert executions in USD',
    labelNames: ['expert'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
});
export const conductorMcpOperationsTotal = new client.Counter({
    name: 'conductor_mcp_operations_total',
    help: 'Total number of MCP operations',
    labelNames: ['server', 'tool', 'result'],
});
export const conductorMcpLatencySeconds = new client.Histogram({
    name: 'conductor_mcp_latency_seconds',
    help: 'Duration of MCP operations in seconds',
    labelNames: ['server', 'tool'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
export const conductorActiveTasksGauge = new client.Gauge({
    name: 'conductor_active_tasks',
    help: 'Number of currently active Conductor tasks',
});
export const conductorSecurityEventsTotal = new client.Counter({
    name: 'conductor_security_events_total',
    help: 'Total number of security events in Conductor',
    labelNames: ['type', 'result'],
});
export const conductorMcpServerStatus = new client.Gauge({
    name: 'conductor_mcp_server_status',
    help: 'Status of MCP servers (1=healthy, 0=unhealthy)',
    labelNames: ['server', 'url'],
});
export const conductorSystemHealthStatus = new client.Gauge({
    name: 'conductor_system_health_status',
    help: 'Overall Conductor system health (1=healthy, 0.5=degraded, 0=unhealthy)',
});
export const conductorQuotaRemainingGauge = new client.Gauge({
    name: 'conductor_quota_remaining',
    help: 'Remaining quota for Conductor operations',
    labelNames: ['expert', 'quota_type', 'user_id'],
});
export const conductorRoutingConfidenceHistogram = new client.Histogram({
    name: 'conductor_routing_confidence',
    help: 'Confidence scores for routing decisions',
    labelNames: ['expert'],
    buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99, 1.0],
});
export const conductorConcurrencyLimitHitsTotal = new client.Counter({
    name: 'conductor_concurrency_limit_hits_total',
    help: 'Total number of times concurrency limits were hit',
    labelNames: ['expert'],
});
export const conductorTaskTimeoutTotal = new client.Counter({
    name: 'conductor_task_timeout_total',
    help: 'Total number of tasks that timed out',
    labelNames: ['expert', 'timeout_type'],
});
// Register all conductor metrics with the main registry
[
    conductorRouterDecisionsTotal,
    conductorExpertExecutionsTotal,
    conductorExpertLatencySeconds,
    conductorExpertCostUsd,
    conductorMcpOperationsTotal,
    conductorMcpLatencySeconds,
    conductorActiveTasksGauge,
    conductorSecurityEventsTotal,
    conductorMcpServerStatus,
    conductorSystemHealthStatus,
    conductorQuotaRemainingGauge,
    conductorRoutingConfidenceHistogram,
    conductorConcurrencyLimitHitsTotal,
    conductorTaskTimeoutTotal,
].forEach((metric) => register.registerMetric(metric));
// Helper functions to work with confidence buckets
export function getConfidenceBucket(confidence) {
    if (confidence >= 0.9)
        return 'high';
    if (confidence >= 0.7)
        return 'medium';
    if (confidence >= 0.5)
        return 'low';
    return 'very_low';
}
export function getCostBucket(cost) {
    if (cost >= 5)
        return 'expensive';
    if (cost >= 1)
        return 'moderate';
    if (cost >= 0.1)
        return 'cheap';
    return 'free';
}
// Prometheus-compatible metrics recorder that implements the ConductorMetrics interface
export class PrometheusConductorMetrics {
    /**
     * Record a routing decision
     */
    recordRoutingDecision(expert, latencyMs, confidence, success) {
        const confidenceBucket = getConfidenceBucket(confidence);
        conductorRouterDecisionsTotal.inc({
            expert,
            result: success ? 'success' : 'error',
            confidence_bucket: confidenceBucket,
        });
        conductorRoutingConfidenceHistogram.observe({ expert }, confidence);
    }
    /**
     * Record expert execution
     */
    recordExpertExecution(expert, latencyMs, cost, success) {
        const costBucket = getCostBucket(cost);
        conductorExpertExecutionsTotal.inc({
            expert,
            result: success ? 'success' : 'error',
            cost_bucket: costBucket,
        });
        conductorExpertLatencySeconds.observe({ expert }, latencyMs / 1000);
        conductorExpertCostUsd.observe({ expert }, cost);
    }
    /**
     * Record MCP operation
     */
    recordMCPOperation(serverName, toolName, latencyMs, success) {
        conductorMcpOperationsTotal.inc({
            server: serverName,
            tool: toolName,
            result: success ? 'success' : 'error',
        });
        conductorMcpLatencySeconds.observe({
            server: serverName,
            tool: toolName,
        }, latencyMs / 1000);
    }
    /**
     * Update active task count
     */
    updateActiveTaskCount(count) {
        conductorActiveTasksGauge.set(count);
    }
    /**
     * Record security event
     */
    recordSecurityEvent(eventType, success) {
        conductorSecurityEventsTotal.inc({
            type: eventType,
            result: success ? 'allowed' : 'denied',
        });
    }
    /**
     * Update MCP server status
     */
    updateMCPServerStatus(serverName, url, healthy) {
        conductorMcpServerStatus.set({ server: serverName, url }, healthy ? 1 : 0);
    }
    /**
     * Update system health status
     */
    updateSystemHealthStatus(status) {
        const statusValue = status === 'healthy' ? 1 : status === 'degraded' ? 0.5 : 0;
        conductorSystemHealthStatus.set(statusValue);
    }
    /**
     * Update quota remaining
     */
    updateQuotaRemaining(expert, quotaType, userId, remaining) {
        conductorQuotaRemainingGauge.set({ expert, quota_type: quotaType, user_id: userId }, remaining);
    }
    /**
     * Record concurrency limit hit
     */
    recordConcurrencyLimitHit(expert) {
        conductorConcurrencyLimitHitsTotal.inc({ expert });
    }
    /**
     * Record task timeout
     */
    recordTaskTimeout(expert, timeoutType) {
        conductorTaskTimeoutTotal.inc({ expert, timeout_type: timeoutType });
    }
}
// Singleton instance
export const prometheusConductorMetrics = new PrometheusConductorMetrics();
//# sourceMappingURL=prometheus.js.map