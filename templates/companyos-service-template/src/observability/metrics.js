"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestErrors = exports.httpRequestTotal = exports.httpRequestDuration = exports.register = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
const config_js_1 = require("../config.js");
exports.register = new prom_client_1.default.Registry();
exports.register.setDefaultLabels({ service: config_js_1.config.serviceName });
prom_client_1.default.collectDefaultMetrics({ register: exports.register, labels: { service: config_js_1.config.serviceName } });
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});
exports.httpRequestTotal = new prom_client_1.default.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
});
exports.httpRequestErrors = new prom_client_1.default.Counter({
    name: 'http_request_errors_total',
    help: 'Total HTTP error responses',
    labelNames: ['method', 'route', 'status']
});
exports.register.registerMetric(exports.httpRequestDuration);
exports.register.registerMetric(exports.httpRequestTotal);
exports.register.registerMetric(exports.httpRequestErrors);
