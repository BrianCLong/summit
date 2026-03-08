"use strict";
/**
 * Prediction Engine - Core prediction logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionEngine = void 0;
const forecasting_1 = require("@intelgraph/forecasting");
const predictive_models_1 = require("@intelgraph/predictive-models");
const risk_scoring_1 = require("@intelgraph/risk-scoring");
class PredictionEngine {
    modelRegistry = new Map();
    modelMetadata = new Map();
    constructor() {
        this.initializeDefaultModels();
    }
    /**
     * Make predictions
     */
    async predict(request) {
        const startTime = Date.now();
        const model = this.modelRegistry.get(request.modelId);
        if (!model) {
            throw new Error(`Model not found: ${request.modelId}`);
        }
        const metadata = this.modelMetadata.get(request.modelId);
        if (!metadata) {
            throw new Error(`Model metadata not found: ${request.modelId}`);
        }
        let predictions;
        switch (request.modelType) {
            case 'forecast':
                predictions = await this.predictForecast(model, request);
                break;
            case 'classification':
                predictions = await this.predictClassification(model, request);
                break;
            case 'regression':
                predictions = await this.predictRegression(model, request);
                break;
            case 'risk':
                predictions = await this.predictRisk(model, request);
                break;
            default:
                throw new Error(`Unknown model type: ${request.modelType}`);
        }
        const processingTimeMs = Date.now() - startTime;
        return {
            requestId: this.generateRequestId(),
            modelId: request.modelId,
            predictions,
            metadata: {
                timestamp: new Date(),
                processingTimeMs,
                modelVersion: metadata.version,
            },
        };
    }
    /**
     * Register a model
     */
    registerModel(id, model, metadata) {
        this.modelRegistry.set(id, model);
        this.modelMetadata.set(id, metadata);
    }
    /**
     * Get model metadata
     */
    getModelMetadata(id) {
        return this.modelMetadata.get(id);
    }
    /**
     * List all models
     */
    listModels() {
        return Array.from(this.modelMetadata.values());
    }
    /**
     * Forecast predictions
     */
    async predictForecast(model, request) {
        const horizon = request.options?.horizon || 30;
        const confidenceLevel = request.options?.confidenceLevel || 0.95;
        // Convert features to time series data format
        const timeSeriesData = request.features.map((f) => ({
            timestamp: new Date(f.timestamp || Date.now()),
            value: typeof f === 'number' ? f : f.value,
        }));
        model.fit(timeSeriesData);
        return model.forecast(horizon, confidenceLevel);
    }
    /**
     * Classification predictions
     */
    async predictClassification(model, request) {
        return model.predict(request.features);
    }
    /**
     * Regression predictions
     */
    async predictRegression(model, request) {
        return model.predict(request.features);
    }
    /**
     * Risk scoring predictions
     */
    async predictRisk(model, request) {
        const features = request.features;
        return features.map((f, i) => model.score(`entity_${i}`, Array.isArray(f) ? f : Object.values(f)));
    }
    /**
     * Initialize default models for demonstration
     */
    initializeDefaultModels() {
        // Register a default ARIMA forecaster
        const arimaModel = new forecasting_1.ARIMAForecaster({ p: 1, d: 1, q: 1 });
        this.registerModel('default-arima', arimaModel, {
            id: 'default-arima',
            name: 'Default ARIMA Forecaster',
            type: 'forecast',
            version: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            performance: { mae: 0, rmse: 0 },
            status: 'active',
        });
        // Register a default Random Forest classifier
        const rfModel = new predictive_models_1.RandomForestClassifier();
        this.registerModel('default-rf', rfModel, {
            id: 'default-rf',
            name: 'Default Random Forest',
            type: 'classification',
            version: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            performance: { accuracy: 0 },
            status: 'active',
        });
        // Register a default risk scorer
        const riskModel = new risk_scoring_1.LogisticRiskScorer();
        this.registerModel('default-risk', riskModel, {
            id: 'default-risk',
            name: 'Default Risk Scorer',
            type: 'risk',
            version: '1.0.0',
            createdAt: new Date(),
            updatedAt: new Date(),
            performance: { auc: 0 },
            status: 'active',
        });
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.PredictionEngine = PredictionEngine;
