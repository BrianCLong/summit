"use strict";
/**
 * Resilient Workflow Orchestrator
 *
 * Massive-scale, resilient automation workflows across hybrid, denied,
 * or degraded network environments with failover, satellite comms,
 * adaptive routing, self-healing, and real-time command reporting.
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
exports.CoalitionFederator = exports.CommandReporter = exports.SelfHealingEngine = exports.FailoverController = exports.SatelliteCommHandler = exports.NetworkTopologyManager = exports.WorkflowOrchestrator = void 0;
const WorkflowOrchestrator_js_1 = require("./workflows/WorkflowOrchestrator.js");
Object.defineProperty(exports, "WorkflowOrchestrator", { enumerable: true, get: function () { return WorkflowOrchestrator_js_1.WorkflowOrchestrator; } });
const NetworkTopologyManager_js_1 = require("./routing/NetworkTopologyManager.js");
Object.defineProperty(exports, "NetworkTopologyManager", { enumerable: true, get: function () { return NetworkTopologyManager_js_1.NetworkTopologyManager; } });
const SatelliteCommHandler_js_1 = require("./comms/SatelliteCommHandler.js");
Object.defineProperty(exports, "SatelliteCommHandler", { enumerable: true, get: function () { return SatelliteCommHandler_js_1.SatelliteCommHandler; } });
const FailoverController_js_1 = require("./comms/FailoverController.js");
Object.defineProperty(exports, "FailoverController", { enumerable: true, get: function () { return FailoverController_js_1.FailoverController; } });
const SelfHealingEngine_js_1 = require("./healing/SelfHealingEngine.js");
Object.defineProperty(exports, "SelfHealingEngine", { enumerable: true, get: function () { return SelfHealingEngine_js_1.SelfHealingEngine; } });
const CommandReporter_js_1 = require("./reporting/CommandReporter.js");
Object.defineProperty(exports, "CommandReporter", { enumerable: true, get: function () { return CommandReporter_js_1.CommandReporter; } });
const CoalitionFederator_js_1 = require("./federation/CoalitionFederator.js");
Object.defineProperty(exports, "CoalitionFederator", { enumerable: true, get: function () { return CoalitionFederator_js_1.CoalitionFederator; } });
const logger_js_1 = require("./utils/logger.js");
const metrics_js_1 = require("./utils/metrics.js");
const express_1 = __importDefault(require("express"));
// Re-export types
__exportStar(require("./types.js"), exports);
/**
 * Create and start the orchestrator service
 */
async function main() {
    const config = {
        redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
        nodeId: process.env.NODE_ID ?? `orchestrator-${process.pid}`,
        reportingPort: parseInt(process.env.REPORTING_PORT ?? '8080'),
        maxConcurrentWorkflows: parseInt(process.env.MAX_WORKFLOWS ?? '100'),
        maxConcurrentTasks: parseInt(process.env.MAX_TASKS ?? '1000'),
    };
    logger_js_1.logger.info('Initializing Resilient Workflow Orchestrator', config);
    const orchestrator = new WorkflowOrchestrator_js_1.WorkflowOrchestrator(config);
    // Setup HTTP server for health and metrics
    const app = (0, express_1.default)();
    const httpPort = parseInt(process.env.HTTP_PORT ?? '3000');
    app.get('/health', (req, res) => {
        const stats = orchestrator.getStats();
        res.json({
            status: 'healthy',
            nodeId: config.nodeId,
            uptime: process.uptime(),
            workflows: stats.workflows,
            network: stats.network,
        });
    });
    app.get('/health/ready', (req, res) => {
        res.json({ ready: true });
    });
    app.get('/health/live', (req, res) => {
        res.json({ live: true });
    });
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', metrics_js_1.registry.contentType);
        res.end(await metrics_js_1.registry.metrics());
    });
    app.get('/stats', (req, res) => {
        res.json(orchestrator.getStats());
    });
    // Start orchestrator
    await orchestrator.start();
    // Start HTTP server
    app.listen(httpPort, () => {
        logger_js_1.logger.info(`HTTP server listening on port ${httpPort}`);
    });
    // Graceful shutdown
    const shutdown = async (signal) => {
        logger_js_1.logger.info(`Received ${signal}, shutting down gracefully`);
        await orchestrator.stop();
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    logger_js_1.logger.info('Resilient Workflow Orchestrator ready');
}
// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        logger_js_1.logger.error('Failed to start orchestrator', { error });
        process.exit(1);
    });
}
