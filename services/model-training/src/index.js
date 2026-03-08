"use strict";
/**
 * Model Training Service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingPipeline = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const training_pipeline_js_1 = require("./pipelines/training-pipeline.js");
Object.defineProperty(exports, "TrainingPipeline", { enumerable: true, get: function () { return training_pipeline_js_1.TrainingPipeline; } });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use(body_parser_1.default.json());
/**
 * POST /train - Train a new model
 */
app.post('/api/v1/train', async (req, res) => {
    try {
        const { data, config, modelType } = req.body;
        if (!data || !config) {
            res.status(400).json({ error: 'data and config are required' });
            return;
        }
        const pipeline = new training_pipeline_js_1.TrainingPipeline(config);
        // Model factory placeholder
        const modelFactory = (params) => {
            // Would instantiate appropriate model based on modelType
            return { fit: () => { }, evaluate: () => ({ accuracy: 0.95 }) };
        };
        const result = await pipeline.train(data, modelFactory);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            error: 'Training failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /health
 */
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});
app.listen(PORT, () => {
    console.log(`Model Training Service running on port ${PORT}`);
});
