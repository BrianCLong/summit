"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = void 0;
exports.metricsMiddleware = metricsMiddleware;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'citizen-service-metrics' });
class MetricsCollector {
    metrics = {
        requests: { total: 0, byEndpoint: {}, byStatus: {} },
        latency: { total: 0, count: 0, byEndpoint: {} },
        citizens: { registered: 0, verified: 0 },
        services: { requested: 0, completed: 0, byDomain: {} },
    };
    startTime = Date.now();
    recordRequest(endpoint, status, durationMs) {
        this.metrics.requests.total++;
        this.metrics.requests.byEndpoint[endpoint] = (this.metrics.requests.byEndpoint[endpoint] || 0) + 1;
        this.metrics.requests.byStatus[status] = (this.metrics.requests.byStatus[status] || 0) + 1;
        this.metrics.latency.total += durationMs;
        this.metrics.latency.count++;
        if (!this.metrics.latency.byEndpoint[endpoint]) {
            this.metrics.latency.byEndpoint[endpoint] = { total: 0, count: 0 };
        }
        this.metrics.latency.byEndpoint[endpoint].total += durationMs;
        this.metrics.latency.byEndpoint[endpoint].count++;
    }
    recordCitizenRegistration() {
        this.metrics.citizens.registered++;
    }
    recordCitizenVerification() {
        this.metrics.citizens.verified++;
    }
    recordServiceRequest(domain) {
        this.metrics.services.requested++;
        this.metrics.services.byDomain[domain] = (this.metrics.services.byDomain[domain] || 0) + 1;
    }
    recordServiceCompletion() {
        this.metrics.services.completed++;
    }
    getMetrics() {
        const avgLatency = this.metrics.latency.count > 0
            ? this.metrics.latency.total / this.metrics.latency.count
            : 0;
        return {
            uptime: Date.now() - this.startTime,
            requests: this.metrics.requests,
            latency: {
                average: avgLatency,
                byEndpoint: Object.fromEntries(Object.entries(this.metrics.latency.byEndpoint).map(([k, v]) => [
                    k,
                    v.count > 0 ? v.total / v.count : 0,
                ])),
            },
            citizens: this.metrics.citizens,
            services: this.metrics.services,
        };
    }
    getPrometheusMetrics() {
        const lines = [];
        const m = this.metrics;
        lines.push(`# HELP citizen_service_requests_total Total requests`);
        lines.push(`# TYPE citizen_service_requests_total counter`);
        lines.push(`citizen_service_requests_total ${m.requests.total}`);
        lines.push(`# HELP citizen_service_citizens_registered Total registered citizens`);
        lines.push(`# TYPE citizen_service_citizens_registered counter`);
        lines.push(`citizen_service_citizens_registered ${m.citizens.registered}`);
        lines.push(`# HELP citizen_service_services_requested Total service requests`);
        lines.push(`# TYPE citizen_service_services_requested counter`);
        lines.push(`citizen_service_services_requested ${m.services.requested}`);
        const avgLatency = m.latency.count > 0 ? m.latency.total / m.latency.count : 0;
        lines.push(`# HELP citizen_service_latency_avg Average latency in ms`);
        lines.push(`# TYPE citizen_service_latency_avg gauge`);
        lines.push(`citizen_service_latency_avg ${avgLatency.toFixed(2)}`);
        return lines.join('\n');
    }
}
exports.metricsCollector = new MetricsCollector();
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const endpoint = `${req.method} ${req.route?.path || req.path}`;
        exports.metricsCollector.recordRequest(endpoint, res.statusCode, duration);
        if (duration > 1000) {
            logger.warn({ endpoint, duration }, 'Slow request detected');
        }
    });
    next();
}
