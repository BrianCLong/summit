"use strict";
/**
 * Cross-Border Module Integration
 *
 * This file shows how to integrate the cross-border module into the main server.
 * Add the following to server/src/app.ts:
 *
 * ```typescript
 * import crossBorderRouter from './cross-border/router.js';
 * import { getCrossBorderGateway } from './cross-border/index.js';
 *
 * // Register the cross-border routes
 * app.use('/api/cross-border', crossBorderRouter);
 *
 * // Initialize the gateway (in server startup)
 * const gateway = getCrossBorderGateway();
 * await gateway.initialize();
 * ```
 */
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
exports.initializeCrossBorder = initializeCrossBorder;
exports.registerCrossBorderRoutes = registerCrossBorderRoutes;
exports.getCrossBorderGraphQL = getCrossBorderGraphQL;
exports.shutdownCrossBorder = shutdownCrossBorder;
exports.getCrossBorderHealth = getCrossBorderHealth;
const router_js_1 = __importDefault(require("./router.js"));
const gateway_js_1 = require("./gateway.js");
const metrics_js_1 = require("./metrics.js");
const index_js_1 = require("./graphql/index.js");
/**
 * Initialize the cross-border module
 */
async function initializeCrossBorder() {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    await gateway.initialize();
    // Update metrics periodically
    setInterval(() => {
        const status = gateway.getStatus();
        (0, metrics_js_1.updateActivePartners)(status.activePartners);
        (0, metrics_js_1.updateActiveSessions)(status.activeSessions);
    }, 30000);
    console.log('[cross-border] Module initialized');
}
/**
 * Register cross-border routes with Express app
 */
function registerCrossBorderRoutes(app, basePath = '/api/cross-border') {
    app.use(basePath, router_js_1.default);
    console.log(`[cross-border] Routes registered at ${basePath}`);
}
/**
 * Get GraphQL schema extensions for cross-border module
 */
function getCrossBorderGraphQL() {
    return {
        typeDefs: index_js_1.crossBorderTypeDefs,
        resolvers: index_js_1.crossBorderResolvers,
    };
}
/**
 * Shutdown the cross-border module
 */
async function shutdownCrossBorder() {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    await gateway.shutdown();
    console.log('[cross-border] Module shut down');
}
/**
 * Health check for cross-border module
 */
function getCrossBorderHealth() {
    const gateway = (0, gateway_js_1.getCrossBorderGateway)();
    const metrics = (0, metrics_js_1.getCrossBorderMetrics)();
    const status = gateway.getStatus();
    return {
        module: 'cross-border',
        status: status.activePartners > 0 ? 'healthy' : 'degraded',
        details: {
            ...status,
            metricsCollected: Object.keys(metrics.toJSON()).length > 0,
        },
    };
}
// Re-export everything for convenience
__exportStar(require("./index.js"), exports);
