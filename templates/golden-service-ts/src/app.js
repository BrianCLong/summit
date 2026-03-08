"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const pino_http_1 = require("pino-http");
const logger_js_1 = require("./logger.js");
const metrics_js_1 = require("./metrics.js");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)());
exports.app.use((0, pino_http_1.pinoHttp)({ logger: logger_js_1.logger }));
// Metrics middleware
exports.app.use((req, res, next) => {
    const end = metrics_js_1.httpRequestDurationMicroseconds.startTimer();
    res.on('finish', () => {
        end({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
    });
    next();
});
exports.app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: process.env.npm_package_version || '0.0.0' });
});
exports.app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metrics_js_1.register.contentType);
    res.end(await metrics_js_1.register.metrics());
});
exports.app.get('/', (req, res) => {
    res.json({ message: 'Hello from Golden Service!' });
});
