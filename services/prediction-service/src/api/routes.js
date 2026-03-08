"use strict";
/**
 * Prediction Service API Routes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPredictionRoutes = createPredictionRoutes;
const express_1 = __importDefault(require("express"));
function createPredictionRoutes(engine, registry) {
    const router = express_1.default.Router();
    /**
     * POST /predict - Make predictions
     */
    router.post('/predict', async (req, res) => {
        try {
            const request = req.body;
            // Validate request
            if (!request.modelId || !request.modelType || !request.features) {
                res.status(400).json({
                    error: 'Invalid request',
                    message: 'modelId, modelType, and features are required',
                });
                return;
            }
            const response = await engine.predict(request);
            res.json(response);
        }
        catch (error) {
            res.status(500).json({
                error: 'Prediction failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /models - List all models
     */
    router.get('/models', (req, res) => {
        const models = engine.listModels();
        res.json({ models });
    });
    /**
     * GET /models/:id - Get model details
     */
    router.get('/models/:id', (req, res) => {
        const { id } = req.params;
        const metadata = engine.getModelMetadata(id);
        if (!metadata) {
            res.status(404).json({ error: 'Model not found' });
            return;
        }
        const versions = registry.listVersions(id);
        const champion = registry.getChampion(id);
        const driftHistory = registry.getDriftHistory(id);
        const needsRetraining = registry.needsRetraining(id);
        res.json({
            metadata,
            versions: versions.map(v => ({
                version: v.version,
                deployedAt: v.deployedAt,
                performance: v.performance,
            })),
            champion: champion?.version,
            driftHistory,
            needsRetraining,
        });
    });
    /**
     * POST /models/:id/promote - Promote model version to champion
     */
    router.post('/models/:id/promote', (req, res) => {
        try {
            const { id } = req.params;
            const { version } = req.body;
            if (!version) {
                res.status(400).json({ error: 'Version is required' });
                return;
            }
            registry.promoteToChampion(id, version);
            res.json({ message: 'Model promoted successfully', modelId: id, version });
        }
        catch (error) {
            res.status(500).json({
                error: 'Promotion failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
    /**
     * GET /health - Health check
     */
    router.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date(),
            models: engine.listModels().length,
        });
    });
    return router;
}
