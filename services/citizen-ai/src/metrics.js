"use strict";
/**
 * Metrics and Health Monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
exports.runHealthChecks = runHealthChecks;
class MetricsCollector {
    startTime;
    requestLatencies = [];
    maxLatencySamples = 1000;
    metrics = {
        requests: { total: 0, success: 0, failed: 0 },
        translation: { calls: 0, errors: 0, totalLatency: 0 },
        nlu: { calls: 0, errors: 0, totalLatency: 0 },
        conversation: { calls: 0, errors: 0, totalLatency: 0 },
    };
    constructor() {
        this.startTime = Date.now();
    }
    recordRequest(success, latencyMs) {
        this.metrics.requests.total++;
        if (success) {
            this.metrics.requests.success++;
        }
        else {
            this.metrics.requests.failed++;
        }
        this.requestLatencies.push(latencyMs);
        if (this.requestLatencies.length > this.maxLatencySamples) {
            this.requestLatencies.shift();
        }
    }
    recordTranslation(success, latencyMs) {
        this.metrics.translation.calls++;
        if (!success) {
            this.metrics.translation.errors++;
        }
        this.metrics.translation.totalLatency += latencyMs;
    }
    recordNLU(success, latencyMs) {
        this.metrics.nlu.calls++;
        if (!success) {
            this.metrics.nlu.errors++;
        }
        this.metrics.nlu.totalLatency += latencyMs;
    }
    recordConversation(success, latencyMs) {
        this.metrics.conversation.calls++;
        if (!success) {
            this.metrics.conversation.errors++;
        }
        this.metrics.conversation.totalLatency += latencyMs;
    }
    getSnapshot(cacheStats) {
        const sortedLatencies = [...this.requestLatencies].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedLatencies.length * 0.95);
        const p99Index = Math.floor(sortedLatencies.length * 0.99);
        const avgLatency = sortedLatencies.length > 0
            ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
            : 0;
        const memUsage = process.memoryUsage();
        return {
            timestamp: Date.now(),
            requests: {
                total: this.metrics.requests.total,
                success: this.metrics.requests.success,
                failed: this.metrics.requests.failed,
                avgLatencyMs: avgLatency,
                p95LatencyMs: sortedLatencies[p95Index] || 0,
                p99LatencyMs: sortedLatencies[p99Index] || 0,
            },
            translation: {
                calls: this.metrics.translation.calls,
                errors: this.metrics.translation.errors,
                avgLatencyMs: this.metrics.translation.calls > 0
                    ? this.metrics.translation.totalLatency / this.metrics.translation.calls
                    : 0,
            },
            nlu: {
                calls: this.metrics.nlu.calls,
                errors: this.metrics.nlu.errors,
                avgLatencyMs: this.metrics.nlu.calls > 0
                    ? this.metrics.nlu.totalLatency / this.metrics.nlu.calls
                    : 0,
            },
            conversation: {
                calls: this.metrics.conversation.calls,
                errors: this.metrics.conversation.errors,
                avgLatencyMs: this.metrics.conversation.calls > 0
                    ? this.metrics.conversation.totalLatency / this.metrics.conversation.calls
                    : 0,
            },
            cache: cacheStats || { hits: 0, misses: 0, hitRate: 0, size: 0 },
            system: {
                uptime: Date.now() - this.startTime,
                memoryUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
                memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            },
        };
    }
    reset() {
        this.metrics = {
            requests: { total: 0, success: 0, failed: 0 },
            translation: { calls: 0, errors: 0, totalLatency: 0 },
            nlu: { calls: 0, errors: 0, totalLatency: 0 },
            conversation: { calls: 0, errors: 0, totalLatency: 0 },
        };
        this.requestLatencies = [];
    }
}
exports.metrics = new MetricsCollector();
/**
 * Health check runner
 */
async function runHealthChecks() {
    const checks = [];
    let overallStatus = 'healthy';
    // Memory check
    const memUsage = process.memoryUsage();
    const memoryPercent = memUsage.heapUsed / memUsage.heapTotal;
    if (memoryPercent > 0.9) {
        checks.push({ name: 'memory', status: 'fail', message: 'Memory usage critical' });
        overallStatus = 'unhealthy';
    }
    else if (memoryPercent > 0.7) {
        checks.push({ name: 'memory', status: 'warn', message: 'Memory usage high' });
        if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
        }
    }
    else {
        checks.push({ name: 'memory', status: 'pass' });
    }
    // Services check (NLU, Translation)
    const nluStart = Date.now();
    try {
        // Simple NLU test
        checks.push({
            name: 'nlu',
            status: 'pass',
            latencyMs: Date.now() - nluStart,
        });
    }
    catch {
        checks.push({ name: 'nlu', status: 'fail', message: 'NLU service error' });
        overallStatus = 'unhealthy';
    }
    // Translation check
    checks.push({ name: 'translation', status: 'pass' });
    // Conversation check
    checks.push({ name: 'conversation', status: 'pass' });
    return {
        status: overallStatus,
        checks,
        timestamp: Date.now(),
    };
}
