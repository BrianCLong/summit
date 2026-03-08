"use strict";
/**
 * Forecasting Package - Time Series Forecasting and Prediction
 * @module @intelgraph/forecasting
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Backtester = exports.ScenarioAnalyzer = exports.MonteCarloSimulator = exports.AnomalyForecaster = exports.OptimalEnsemble = exports.EnsembleForecaster = exports.ProphetForecaster = exports.SimpleExponentialSmoothing = exports.ExponentialSmoothingForecaster = exports.AutoARIMA = exports.ARIMAForecaster = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Core models
var arima_js_1 = require("./core/arima.js");
Object.defineProperty(exports, "ARIMAForecaster", { enumerable: true, get: function () { return arima_js_1.ARIMAForecaster; } });
Object.defineProperty(exports, "AutoARIMA", { enumerable: true, get: function () { return arima_js_1.AutoARIMA; } });
var exponential_smoothing_js_1 = require("./core/exponential-smoothing.js");
Object.defineProperty(exports, "ExponentialSmoothingForecaster", { enumerable: true, get: function () { return exponential_smoothing_js_1.ExponentialSmoothingForecaster; } });
Object.defineProperty(exports, "SimpleExponentialSmoothing", { enumerable: true, get: function () { return exponential_smoothing_js_1.SimpleExponentialSmoothing; } });
var prophet_js_1 = require("./core/prophet.js");
Object.defineProperty(exports, "ProphetForecaster", { enumerable: true, get: function () { return prophet_js_1.ProphetForecaster; } });
// Ensemble methods
var ensemble_js_1 = require("./models/ensemble.js");
Object.defineProperty(exports, "EnsembleForecaster", { enumerable: true, get: function () { return ensemble_js_1.EnsembleForecaster; } });
Object.defineProperty(exports, "OptimalEnsemble", { enumerable: true, get: function () { return ensemble_js_1.OptimalEnsemble; } });
// Anomaly forecasting
var anomaly_forecast_js_1 = require("./models/anomaly-forecast.js");
Object.defineProperty(exports, "AnomalyForecaster", { enumerable: true, get: function () { return anomaly_forecast_js_1.AnomalyForecaster; } });
// Scenario analysis and simulation
var scenario_simulation_js_1 = require("./utils/scenario-simulation.js");
Object.defineProperty(exports, "MonteCarloSimulator", { enumerable: true, get: function () { return scenario_simulation_js_1.MonteCarloSimulator; } });
Object.defineProperty(exports, "ScenarioAnalyzer", { enumerable: true, get: function () { return scenario_simulation_js_1.ScenarioAnalyzer; } });
Object.defineProperty(exports, "Backtester", { enumerable: true, get: function () { return scenario_simulation_js_1.Backtester; } });
