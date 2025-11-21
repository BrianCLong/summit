/**
 * Prediction Service - Main Entry Point
 */

import express from 'express';
import bodyParser from 'body-parser';
import { PredictionEngine } from './core/prediction-engine.js';
import { ModelRegistry } from './core/model-registry.js';
import { createPredictionRoutes } from './api/routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Initialize services
const predictionEngine = new PredictionEngine();
const modelRegistry = new ModelRegistry();

// Routes
app.use('/api/v1', createPredictionRoutes(predictionEngine, modelRegistry));

// Start server
app.listen(PORT, () => {
  console.log(`Prediction Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});

export { PredictionEngine, ModelRegistry };
