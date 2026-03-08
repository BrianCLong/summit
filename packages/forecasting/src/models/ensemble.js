"use strict";
/**
 * Ensemble Forecasting Methods
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimalEnsemble = exports.EnsembleForecaster = void 0;
const arima_js_1 = require("../core/arima.js");
const exponential_smoothing_js_1 = require("../core/exponential-smoothing.js");
const prophet_js_1 = require("../core/prophet.js");
class EnsembleForecaster {
    config;
    models = [];
    fitted = false;
    constructor(config) {
        this.config = config;
        this.initializeModels();
    }
    /**
     * Initialize individual models
     */
    initializeModels() {
        const weights = this.config.weights ||
            new Array(this.config.models.length).fill(1 / this.config.models.length);
        for (let i = 0; i < this.config.models.length; i++) {
            const modelSpec = this.config.models[i];
            let forecaster;
            switch (modelSpec.type) {
                case 'arima':
                case 'sarima':
                    forecaster = new arima_js_1.ARIMAForecaster(modelSpec.params);
                    break;
                case 'exponential':
                    forecaster = new exponential_smoothing_js_1.ExponentialSmoothingForecaster(modelSpec.params);
                    break;
                case 'prophet':
                    forecaster = new prophet_js_1.ProphetForecaster(modelSpec.params);
                    break;
                default:
                    throw new Error(`Unsupported model type: ${modelSpec.type}`);
            }
            this.models.push({
                forecaster,
                weight: weights[i],
            });
        }
    }
    /**
     * Fit all ensemble models
     */
    fit(data) {
        for (const model of this.models) {
            model.forecaster.fit(data);
        }
        this.fitted = true;
    }
    /**
     * Generate ensemble forecasts
     */
    forecast(horizon, confidenceLevel = 0.95) {
        if (!this.fitted) {
            throw new Error('Ensemble must be fitted before forecasting');
        }
        // Get forecasts from all models
        const allForecasts = this.models.map(model => model.forecaster.forecast(horizon, confidenceLevel));
        // Combine forecasts based on method
        if (this.config.method === 'average') {
            return this.averageForecasts(allForecasts);
        }
        else if (this.config.method === 'weighted') {
            return this.weightedForecasts(allForecasts);
        }
        else {
            // Stacking would require a meta-model
            return this.weightedForecasts(allForecasts);
        }
    }
    /**
     * Simple average of forecasts
     */
    averageForecasts(allForecasts) {
        const n = allForecasts[0].length;
        const results = [];
        for (let i = 0; i < n; i++) {
            const forecasts = allForecasts.map(f => f[i].forecast);
            const lowerBounds = allForecasts.map(f => f[i].lowerBound);
            const upperBounds = allForecasts.map(f => f[i].upperBound);
            results.push({
                timestamp: allForecasts[0][i].timestamp,
                forecast: this.mean(forecasts),
                lowerBound: this.mean(lowerBounds),
                upperBound: this.mean(upperBounds),
                confidence: allForecasts[0][i].confidence,
            });
        }
        return results;
    }
    /**
     * Weighted average of forecasts
     */
    weightedForecasts(allForecasts) {
        const n = allForecasts[0].length;
        const results = [];
        for (let i = 0; i < n; i++) {
            let forecast = 0;
            let lowerBound = 0;
            let upperBound = 0;
            for (let j = 0; j < this.models.length; j++) {
                forecast += allForecasts[j][i].forecast * this.models[j].weight;
                lowerBound += allForecasts[j][i].lowerBound * this.models[j].weight;
                upperBound += allForecasts[j][i].upperBound * this.models[j].weight;
            }
            results.push({
                timestamp: allForecasts[0][i].timestamp,
                forecast,
                lowerBound,
                upperBound,
                confidence: allForecasts[0][i].confidence,
            });
        }
        return results;
    }
    mean(arr) {
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}
exports.EnsembleForecaster = EnsembleForecaster;
/**
 * Forecast combination using optimal weights
 */
class OptimalEnsemble {
    /**
     * Calculate optimal weights using inverse variance weighting
     */
    static calculateOptimalWeights(forecasts, actualValues) {
        const n = forecasts.length;
        const variances = [];
        // Calculate variance for each model
        for (const modelForecasts of forecasts) {
            const errors = modelForecasts.map((f, i) => actualValues[i] ? f.forecast - actualValues[i] : 0);
            const variance = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
            variances.push(variance);
        }
        // Inverse variance weights
        const inverseVars = variances.map(v => 1 / (v + 1e-10));
        const sum = inverseVars.reduce((a, b) => a + b, 0);
        return inverseVars.map(iv => iv / sum);
    }
}
exports.OptimalEnsemble = OptimalEnsemble;
