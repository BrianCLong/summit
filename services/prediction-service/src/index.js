"use strict";
/**
 * Prediction Service - Main Entry Point
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = exports.PredictionEngine = void 0;
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const prediction_engine_js_1 = require("./core/prediction-engine.js");
Object.defineProperty(exports, "PredictionEngine", { enumerable: true, get: function () { return prediction_engine_js_1.PredictionEngine; } });
const model_registry_js_1 = require("./core/model-registry.js");
Object.defineProperty(exports, "ModelRegistry", { enumerable: true, get: function () { return model_registry_js_1.ModelRegistry; } });
const routes_js_1 = require("./api/routes.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(body_parser_1.default.json());
// Initialize services
const predictionEngine = new prediction_engine_js_1.PredictionEngine();
const modelRegistry = new model_registry_js_1.ModelRegistry();
// Routes
app.use('/api/v1', (0, routes_js_1.createPredictionRoutes)(predictionEngine, modelRegistry));
// Start server
app.listen(PORT, () => {
    console.log(`Prediction Service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});
