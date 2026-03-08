"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EREngine = void 0;
exports.start = start;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const er_engine_js_1 = require("./core/er-engine.js");
Object.defineProperty(exports, "EREngine", { enumerable: true, get: function () { return er_engine_js_1.EREngine; } });
const routes_js_1 = require("./api/routes.js");
const types_js_1 = require("./types.js");
const logger = (0, pino_1.default)({ name: 'er-service' });
/**
 * Create and configure Express app
 */
function createApp() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    // Parsing middleware
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    // Compression
    app.use((0, compression_1.default)());
    // Logging
    app.use((0, pino_http_1.default)({ logger }));
    // Create ER engine
    const engine = new er_engine_js_1.EREngine(types_js_1.DEFAULT_SCORING_CONFIG);
    // API routes
    app.use('/api/v1', (0, routes_js_1.createRoutes)(engine));
    // Error handling
    app.use((err, req, res, _next) => {
        logger.error({ err, path: req.path }, 'Request error');
        res.status(500).json({
            error: err.message || 'Internal server error',
        });
    });
    return app;
}
/**
 * Start server
 */
function start() {
    const app = createApp();
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
        logger.info({ port }, 'ER Service started');
    });
}
__exportStar(require("./types.js"), exports);
