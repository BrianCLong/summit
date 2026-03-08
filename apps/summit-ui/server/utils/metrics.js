"use strict";
/**
 * Lightweight in-process metrics store (Prometheus-compatible text format).
 * No external dependency – just counters and gauges accumulated in memory.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.incCounter = incCounter;
exports.setGauge = setGauge;
exports.renderPrometheus = renderPrometheus;
exports.metricsMiddleware = metricsMiddleware;
const counters = new Map();
const gauges = new Map();
function incCounter(name, help = '', labels = {}) {
    const key = metricKey(name, labels);
    const existing = counters.get(key);
    if (existing) {
        existing.value += 1;
    }
    else {
        counters.set(key, { value: 1, help, labels });
    }
}
function setGauge(name, value, help = '', labels = {}) {
    const key = metricKey(name, labels);
    gauges.set(key, { value, help, labels });
}
function renderPrometheus() {
    const lines = [];
    for (const [key, c] of counters) {
        if (c.help)
            lines.push(`# HELP ${key.split('{')[0]} ${c.help}`);
        lines.push(`# TYPE ${key.split('{')[0]} counter`);
        lines.push(`${key} ${c.value}`);
    }
    for (const [key, g] of gauges) {
        if (g.help)
            lines.push(`# HELP ${key.split('{')[0]} ${g.help}`);
        lines.push(`# TYPE ${key.split('{')[0]} gauge`);
        lines.push(`${key} ${g.value}`);
    }
    return lines.join('\n') + '\n';
}
function metricKey(name, labels) {
    const entries = Object.entries(labels);
    if (entries.length === 0)
        return name;
    const labelStr = entries.map(([k, v]) => `${k}="${v}"`).join(',');
    return `${name}{${labelStr}}`;
}
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const route = req.route?.path ?? req.path;
        const labels = { method: req.method, route, status: String(res.statusCode) };
        incCounter('http_requests_total', 'Total HTTP requests', labels);
        setGauge('http_request_duration_ms', Date.now() - start, 'Last HTTP request duration in ms', { method: req.method, route });
    });
    next();
}
