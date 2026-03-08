"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.record = record;
const prom_client_1 = __importDefault(require("prom-client"));
const h = new prom_client_1.default.Histogram({
    name: 'http_request_duration_seconds',
    help: 'latency',
    labelNames: ['path', 'method'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
function record(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
        const secs = Number(process.hrtime.bigint() - start) / 1e9;
        h.labels(req.route?.path || req.path, req.method).observe(secs);
    });
    next();
}
