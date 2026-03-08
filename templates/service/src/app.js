"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const logger_js_1 = require("./utils/logger.js");
const health_js_1 = __importDefault(require("./routes/health.js"));
const metrics_js_1 = __importDefault(require("./routes/metrics.js"));
const app = (0, express_1.default)();
// Request logging with correlation ID
app.use((0, pino_http_1.default)({ logger: logger_js_1.logger }));
app.use(express_1.default.json());
// Routes
app.use('/', health_js_1.default);
app.use('/', metrics_js_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});
exports.default = app;
