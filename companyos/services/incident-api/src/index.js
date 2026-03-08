"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("config"));
const prom_client_1 = __importDefault(require("prom-client"));
const pino_1 = __importDefault(require("pino"));
const health_js_1 = __importDefault(require("./routes/health.js"));
const incident_routes_js_1 = __importDefault(require("./routes/incident.routes.js"));
const app = (0, express_1.default)();
const serviceName = config_1.default.get('service.name');
const port = Number(process.env.PORT ?? config_1.default.get('service.port'));
const logger = (0, pino_1.default)({ name: serviceName });
const register = new prom_client_1.default.Registry();
prom_client_1.default.collectDefaultMetrics({ register });
const httpDuration = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpDuration);
app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const durationSec = Number(end - start) / 1e9;
        httpDuration
            .labels(req.method, req.route?.path ?? req.path, String(res.statusCode))
            .observe(durationSec);
        logger.info({
            event_type: 'http_request',
            method: req.method,
            path: req.originalUrl,
            status_code: res.statusCode,
            duration_sec: durationSec,
            tenant_id: req.tenant_id ?? null,
            trace_id: req.trace_id ?? null
        });
    });
    req.log = logger;
    next();
});
app.use(express_1.default.json());
app.use('/', health_js_1.default);
app.use('/', incident_routes_js_1.default);
app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        logger.info({ port, service: serviceName }, 'api-svc-template listening');
    });
}
exports.default = app;
