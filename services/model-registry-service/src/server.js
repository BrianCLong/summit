"use strict";
/**
 * Model Registry Service
 * Dedicated service for model registry with advanced versioning
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
const app = (0, express_1.default)();
const PORT = process.env.MODEL_REGISTRY_PORT || 8081;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json());
// Initialize model registry
const config = {
    backend: 'postgresql',
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/model_registry',
    artifactStore: {
        type: 's3',
        bucket: process.env.MODEL_ARTIFACTS_BUCKET || 'model-artifacts',
    },
};
const registry = new mlops_platform_1.ModelRegistry(config);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'model-registry',
        timestamp: new Date().toISOString(),
    });
});
// Register model
app.post('/api/v1/models', async (req, res) => {
    try {
        const model = await registry.registerModel(req.body);
        res.status(201).json(model);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get model
app.get('/api/v1/models/:id', async (req, res) => {
    try {
        const model = await registry.getModel(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(model);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// List model versions
app.get('/api/v1/models/:name/versions', async (req, res) => {
    try {
        const versions = await registry.listModelVersions(req.params.name);
        res.json(versions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Search models
app.get('/api/v1/models', async (req, res) => {
    try {
        const models = await registry.searchModels(req.query);
        res.json(models);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update model
app.patch('/api/v1/models/:id', async (req, res) => {
    try {
        const model = await registry.updateModel(req.params.id, req.body);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(model);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete model
app.delete('/api/v1/models/:id', async (req, res) => {
    try {
        const deleted = await registry.deleteModel(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get model lineage
app.get('/api/v1/models/:id/lineage', async (req, res) => {
    try {
        const lineage = await registry.getModelLineage(req.params.id);
        if (!lineage) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json(lineage);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Compare model versions
app.get('/api/v1/models/compare/:id1/:id2', async (req, res) => {
    try {
        const comparison = await registry.compareVersions(req.params.id1, req.params.id2);
        if (!comparison) {
            return res.status(404).json({ error: 'One or both models not found' });
        }
        res.json(comparison);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get production models
app.get('/api/v1/models/production', async (req, res) => {
    try {
        const models = await registry.getProductionModels();
        res.json(models);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Model Registry Service listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
