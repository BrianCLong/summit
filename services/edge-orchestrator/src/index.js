"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = require("pino");
const pino_http_1 = __importDefault(require("pino-http"));
const edge_computing_1 = require("@intelgraph/edge-computing");
const edge_runtime_1 = require("@intelgraph/edge-runtime");
const edge_ai_1 = require("@intelgraph/edge-ai");
const federated_learning_1 = require("@intelgraph/federated-learning");
const edge_sync_1 = require("@intelgraph/edge-sync");
const nodes_1 = require("./api/nodes");
const deployments_1 = require("./api/deployments");
const inference_1 = require("./api/inference");
const federated_1 = require("./api/federated");
const logger = (0, pino_1.pino)({ name: 'edge-orchestrator' });
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use((0, pino_http_1.default)({ logger }));
// Initialize services
const nodeManager = new edge_computing_1.EdgeNodeManager(logger);
const containerOrchestrator = new edge_runtime_1.ContainerOrchestrator(undefined, logger);
const inferenceEngine = new edge_ai_1.InferenceEngine({ logger });
const federatedTrainer = new federated_learning_1.FederatedTrainer({
    minParticipants: 2,
    maxRounds: 100,
    aggregationStrategy: 'fedavg',
    clientSelection: 'random',
    roundTimeout: 300
}, logger);
const syncManager = new edge_sync_1.SyncManager({
    endpoint: process.env.CLOUD_ENDPOINT || 'http://localhost:9000',
    syncInterval: 300,
    maxConcurrent: 5,
    maxRetries: 3,
    retryDelay: 1000,
    compressionEnabled: true,
    encryptionEnabled: true,
    offlineQueue: {
        enabled: true,
        maxSize: 1000,
        persistToDisk: true
    }
}, logger);
// API Routes
app.use('/api/nodes', (0, nodes_1.createNodeRoutes)(nodeManager));
app.use('/api/deployments', (0, deployments_1.createDeploymentRoutes)(containerOrchestrator));
app.use('/api/inference', (0, inference_1.createInferenceRoutes)(inferenceEngine));
app.use('/api/federated', (0, federated_1.createFederatedRoutes)(federatedTrainer));
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            nodeManager: 'running',
            containerOrchestrator: 'running',
            inferenceEngine: 'running',
            federatedTrainer: 'running',
            syncManager: syncManager.getStatus().isOnline ? 'online' : 'offline'
        }
    });
});
// Metrics endpoint
app.get('/metrics', (req, res) => {
    const nodeStats = nodeManager.getClusterStats();
    const syncStatus = syncManager.getStatus();
    const federatedStats = federatedTrainer.getStats();
    res.json({
        nodes: nodeStats,
        sync: syncStatus,
        federated: federatedStats,
        timestamp: new Date().toISOString()
    });
});
// Error handling
app.use((err, req, res, next) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});
// Start server
async function start() {
    try {
        // Start sync manager
        await syncManager.start();
        app.listen(port, () => {
            logger.info({ port }, 'Edge orchestrator service started');
        });
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully');
            await syncManager.stop();
            await nodeManager.shutdown();
            await inferenceEngine.shutdown();
            process.exit(0);
        });
    }
    catch (error) {
        logger.error({ error }, 'Failed to start service');
        process.exit(1);
    }
}
start();
