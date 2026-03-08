"use strict";
/**
 * Federation Service Server
 *
 * Express server for cross-org intel exchange.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pino_http_1 = __importDefault(require("pino-http"));
const pino_1 = __importDefault(require("pino"));
const routes_js_1 = __importDefault(require("./api/routes.js"));
const logger = (0, pino_1.default)({ name: 'federation-service' });
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, pino_http_1.default)({ logger }));
// CORS (in production, configure properly)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Partner-Id, X-Request-Id');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
// Routes
app.use(routes_js_1.default);
// Error handler
app.use((err, req, res, next) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
// Start server
const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Federation service started');
});
exports.default = app;
