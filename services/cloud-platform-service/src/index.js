"use strict";
/**
 * Cloud Platform Service
 * REST API for multi-cloud platform management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const cloud_platform_1 = require("@intelgraph/cloud-platform");
const logger = (0, pino_1.default)({ name: 'cloud-platform-service' });
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, pino_http_1.default)({ logger }));
// Initialize managers (would come from config in production)
let multiCloudManager = null;
const costManager = new cloud_platform_1.CloudCostManager();
// Routes
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'cloud-platform' });
});
// Initialize multi-cloud deployment
app.post('/api/cloud/init', async (req, res) => {
    try {
        const deployment = req.body;
        multiCloudManager = new cloud_platform_1.MultiCloudManager(deployment);
        const validationResults = await multiCloudManager.validateAllConnections();
        res.status(201).json({
            message: 'Multi-cloud deployment initialized',
            validationResults: Object.fromEntries(validationResults)
        });
    }
    catch (error) {
        logger.error({ error }, 'Failed to initialize multi-cloud');
        res.status(500).json({ error: error.message });
    }
});
// List resources across all clouds
app.get('/api/cloud/resources', async (req, res) => {
    try {
        if (!multiCloudManager) {
            return res.status(400).json({ error: 'Multi-cloud not initialized' });
        }
        const { type } = req.query;
        const resources = await multiCloudManager.listAllResources(type);
        res.json({ resources: Object.fromEntries(resources) });
    }
    catch (error) {
        logger.error({ error }, 'Failed to list resources');
        res.status(500).json({ error: error.message });
    }
});
// Get optimization recommendations
app.get('/api/cloud/recommendations', async (req, res) => {
    try {
        if (!multiCloudManager) {
            return res.status(400).json({ error: 'Multi-cloud not initialized' });
        }
        const recommendations = await multiCloudManager.getOptimizationRecommendations();
        res.json({ recommendations });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get recommendations');
        res.status(500).json({ error: error.message });
    }
});
// Cost management endpoints
app.post('/api/cost/budget', async (req, res) => {
    try {
        costManager.setBudget(req.body);
        res.status(201).json({ message: 'Budget set successfully' });
    }
    catch (error) {
        logger.error({ error }, 'Failed to set budget');
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/cost/trends', async (req, res) => {
    try {
        const { provider, days } = req.query;
        const trends = costManager.getCostTrends(provider, days ? parseInt(days) : 30);
        res.json({ trends });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get cost trends');
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/cost/forecast', async (req, res) => {
    try {
        const { provider } = req.query;
        const forecast = costManager.forecastNextMonth(provider);
        res.json({ forecast });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get forecast');
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/cost/anomalies', async (req, res) => {
    try {
        const { provider } = req.query;
        const anomalies = costManager.detectAnomalies(provider);
        res.json({ anomalies });
    }
    catch (error) {
        logger.error({ error }, 'Failed to detect anomalies');
        res.status(500).json({ error: error.message });
    }
});
// Disaster recovery endpoints
app.post('/api/dr/failover', async (req, res) => {
    try {
        if (!multiCloudManager) {
            return res.status(400).json({ error: 'Multi-cloud not initialized' });
        }
        const { fromProvider, toProvider, reason } = req.body;
        const drManager = new cloud_platform_1.DisasterRecoveryManager({
            enabled: true,
            rto: 60,
            rpo: 15,
            backupRegions: [],
            failoverPriority: [cloud_platform_1.CloudProvider.AWS, cloud_platform_1.CloudProvider.AZURE, cloud_platform_1.CloudProvider.GCP],
            automatedFailover: true
        }, multiCloudManager);
        const event = await drManager.initiateFailover(fromProvider, toProvider, reason);
        res.json({ event });
    }
    catch (error) {
        logger.error({ error }, 'Failover failed');
        res.status(500).json({ error: error.message });
    }
});
// Start server
const PORT = process.env.PORT || 4300;
app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Cloud platform service started');
});
exports.default = app;
