"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const cors_1 = __importDefault(require("cors"));
const index_js_1 = require("./routes/index.js");
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
});
async function createApp() {
    const app = (0, express_1.default)();
    // Middleware
    app.use(express_1.default.json());
    app.use((0, cors_1.default)());
    app.use((0, pino_http_1.default)({ logger }));
    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'supply-chain-service',
            timestamp: new Date().toISOString(),
        });
    });
    // Setup routes
    (0, index_js_1.setupRoutes)(app);
    return app;
}
// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    createApp().then((app) => {
        const port = process.env.PORT || 4020;
        app.listen(port, () => {
            logger.info(`Supply Chain Service listening on port ${port}`);
        });
    });
}
