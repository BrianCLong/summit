"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_js_1 = require("./config.js");
const logger_js_1 = __importDefault(require("./utils/logger.js"));
const structuredLogger_js_1 = require("./logging/structuredLogger.js");
function createApp({ lightweight = false } = {}) {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        referrerPolicy: { policy: 'no-referrer' },
    }));
    app.use((0, cors_1.default)({ origin: config_js_1.cfg.CORS_ORIGIN, credentials: true }));
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    app.use((0, morgan_1.default)('combined', { stream: { write: (msg) => logger_js_1.default.info(msg.trim()) } }));
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: config_js_1.cfg.NODE_ENV,
            version: '1.0.0',
        });
    });
    app.get('/observability/logs/dashboard', (req, res) => {
        res.status(200).json(structuredLogger_js_1.auditLogDashboard.getDashboardSnapshot());
    });
    if (lightweight)
        return app;
    // In full mode, server.ts wires DB + GraphQL + websockets.
    return app;
}
