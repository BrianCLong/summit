"use strict";
/**
 * MLOps Service
 * REST API for comprehensive MLOps platform
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const mlops_platform_1 = require("@intelgraph/mlops-platform");
const model_serving_1 = require("@intelgraph/model-serving");
const model_explainability_1 = require("@intelgraph/model-explainability");
const app = (0, express_1.default)();
const PORT = process.env.MLOPS_SERVICE_PORT || 8080;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Initialize core components
const modelRegistryConfig = {
    backend: 'postgresql',
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mlops',
    artifactStore: {
        type: 's3',
        bucket: process.env.MODEL_ARTIFACTS_BUCKET || 'mlops-models',
    },
};
const featureStoreConfig = {
    online: {
        enabled: true,
        backend: 'redis',
        ttl: 3600,
        config: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
        },
    },
    offline: {
        enabled: true,
        backend: 's3',
        config: {
            bucket: process.env.FEATURE_STORE_BUCKET || 'mlops-features',
        },
    },
};
const modelRegistry = new mlops_platform_1.ModelRegistry(modelRegistryConfig);
const trainingOrchestrator = new mlops_platform_1.TrainingOrchestrator();
const featureStore = new mlops_platform_1.FeatureStore(featureStoreConfig);
const modelServer = new model_serving_1.ModelServer();
const explainabilityEngine = new model_explainability_1.ExplainabilityEngine();
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'mlops',
        timestamp: new Date().toISOString(),
    });
});
// Model Registry API
app.post('/api/v1/models', async (req, res) => {
    try {
        const model = await modelRegistry.registerModel(req.body);
        res.status(201).json(model);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/models', async (req, res) => {
    try {
        const models = await modelRegistry.searchModels(req.query);
        res.json(models);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/models/:id', async (req, res) => {
    try {
        const model = await modelRegistry.getModel(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(model);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Training API
app.post('/api/v1/training/submit', async (req, res) => {
    try {
        const jobId = await trainingOrchestrator.submitTraining(req.body);
        res.status(201).json({ jobId });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/training/:runId', async (req, res) => {
    try {
        const run = await trainingOrchestrator.getTrainingRun(req.params.runId);
        if (!run) {
            return res.status(404).json({ error: 'Training run not found' });
        }
        res.json(run);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/training/:runId/cancel', async (req, res) => {
    try {
        await trainingOrchestrator.cancelTraining(req.params.runId);
        res.json({ status: 'cancelled' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Feature Store API
app.post('/api/v1/features', async (req, res) => {
    try {
        const feature = await featureStore.registerFeature(req.body);
        res.status(201).json(feature);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/features/write', async (req, res) => {
    try {
        await featureStore.batchWrite(req.body.writes);
        res.json({ status: 'success' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/features/read', async (req, res) => {
    try {
        const { entityIds, featureIds } = req.body;
        const vectors = await featureStore.batchRead(entityIds, featureIds);
        res.json(vectors);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Model Serving API
app.post('/api/v1/deployments', async (req, res) => {
    try {
        const deployment = await modelServer.deploy(req.body);
        res.status(201).json(deployment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/predict', async (req, res) => {
    try {
        const prediction = await modelServer.predict(req.body);
        res.json(prediction);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/deployments/:id/scale', async (req, res) => {
    try {
        await modelServer.scale(req.params.id, req.body.replicas);
        res.json({ status: 'scaling' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Explainability API
app.post('/api/v1/explain', async (req, res) => {
    try {
        const explanation = await explainabilityEngine.explain(req.body);
        res.json(explanation);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/models/:id/global-explanation', async (req, res) => {
    try {
        const explanation = await explainabilityEngine.getGlobalExplanation(req.params.id);
        res.json(explanation);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Metrics and Monitoring
app.get('/api/v1/metrics', (req, res) => {
    res.json({
        models: {
            total: 0,
            production: 0,
            staging: 0,
        },
        training: {
            active: 0,
            completed: 0,
            failed: 0,
        },
        deployments: {
            active: 0,
            healthy: 0,
            degraded: 0,
        },
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`MLOps Service listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
