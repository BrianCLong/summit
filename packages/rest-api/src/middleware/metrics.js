"use strict";
/**
 * Metrics Middleware
 *
 * Collects API metrics and analytics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryMetricsCollector = void 0;
exports.metricsMiddleware = metricsMiddleware;
/**
 * In-memory metrics collector (for demo, use proper metrics system in production)
 */
class MemoryMetricsCollector {
    metrics = [];
    maxSize = 10000;
    record(metrics) {
        this.metrics.push(metrics);
        // Keep only recent metrics
        if (this.metrics.length > this.maxSize) {
            this.metrics.shift();
        }
    }
    getMetrics() {
        return [...this.metrics];
    }
    getStats() {
        const now = Date.now();
        const lastHour = this.metrics.filter((m) => now - m.timestamp.getTime() < 3600000);
        const totalRequests = lastHour.length;
        const errorRequests = lastHour.filter((m) => m.statusCode >= 400).length;
        const avgDuration = lastHour.reduce((sum, m) => sum + m.duration, 0) / totalRequests || 0;
        const statusCodes = lastHour.reduce((acc, m) => {
            acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
            return acc;
        }, {});
        const endpoints = lastHour.reduce((acc, m) => {
            const key = `${m.method} ${m.path}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        return {
            totalRequests,
            errorRequests,
            errorRate: totalRequests > 0 ? errorRequests / totalRequests : 0,
            avgDuration,
            statusCodes,
            endpoints,
        };
    }
    clear() {
        this.metrics = [];
    }
}
exports.MemoryMetricsCollector = MemoryMetricsCollector;
function metricsMiddleware(collector) {
    const metricsCollector = collector || new MemoryMetricsCollector();
    return (req, res, next) => {
        const startTime = Date.now();
        // Capture response
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const metrics = {
                requestId: req.context?.requestId || 'unknown',
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration,
                timestamp: new Date(),
                userId: req.context?.user?.id,
                apiVersion: req.context?.apiVersion,
                userAgent: req.get('user-agent'),
                ip: req.ip || req.socket.remoteAddress,
            };
            metricsCollector.record(metrics);
        });
        next();
    };
}
