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
exports.DataDiscoveryFusionEngine = void 0;
const express_1 = __importDefault(require("express"));
const DataDiscoveryFusionEngine_js_1 = require("./DataDiscoveryFusionEngine.js");
const routes_js_1 = require("./api/routes.js");
const logger_js_1 = require("./utils/logger.js");
const PORT = process.env.PORT || 4100;
async function main() {
    // Initialize engine
    const engine = new DataDiscoveryFusionEngine_js_1.DataDiscoveryFusionEngine({
        scanInterval: parseInt(process.env.SCAN_INTERVAL || '60000'),
        autoIngestThreshold: parseFloat(process.env.AUTO_INGEST_THRESHOLD || '0.8'),
        enableAutoDiscovery: process.env.AUTO_DISCOVERY !== 'false',
        enableLearning: process.env.ENABLE_LEARNING !== 'false',
        enableEventPublishing: process.env.ENABLE_EVENTS !== 'false',
        redisUrl: process.env.REDIS_URL,
    });
    // Create Express app
    const app = (0, express_1.default)();
    app.use(express_1.default.json({ limit: '50mb' }));
    // Mount routes
    app.use('/api/v1', (0, routes_js_1.createRoutes)(engine));
    // Start engine
    await engine.start();
    // Start server
    app.listen(PORT, () => {
        logger_js_1.logger.info(`Data Discovery & Fusion Engine running on port ${PORT}`);
    });
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        logger_js_1.logger.info('Shutting down...');
        await engine.stop();
        process.exit(0);
    });
}
main().catch((error) => {
    logger_js_1.logger.error('Failed to start', { error });
    process.exit(1);
});
// Export for testing
var DataDiscoveryFusionEngine_js_2 = require("./DataDiscoveryFusionEngine.js");
Object.defineProperty(exports, "DataDiscoveryFusionEngine", { enumerable: true, get: function () { return DataDiscoveryFusionEngine_js_2.DataDiscoveryFusionEngine; } });
__exportStar(require("./types.js"), exports);
