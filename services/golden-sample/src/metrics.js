"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestDurationMicroseconds = exports.register = void 0;
const prom_client_1 = __importDefault(require("prom-client"));
// Create a Registry
exports.register = new prom_client_1.default.Registry();
// Add a default label which is added to all metrics
prom_client_1.default.collectDefaultMetrics({ register: exports.register });
exports.httpRequestDurationMicroseconds = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [exports.register],
});
