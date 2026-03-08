"use strict";
/**
 * ARIMA and SARIMA Time Series Forecasting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoARIMA = exports.ARIMAForecaster = void 0;
class ARIMAForecaster {
    params;
    data;
    fitted = false;
    coefficients = null;
    constructor(params) {
        this.params = params;
        this.data = [];
    }
    /**
     * Fit the ARIMA model to training data
     */
    fit(data) {
        this.data = [...data];
        // Apply differencing
        const differenced = this.difference(data.map(d => d.value), this.params.d, this.params.D || 0, this.params.s || 1);
        // Estimate AR and MA coefficients using Yule-Walker equations
        const arCoeffs = this.estimateAR(differenced, this.params.p);
        const maCoeffs = this.estimateMA(differenced, this.params.q);
        // Seasonal components (if SARIMA)
        let sarCoeffs = [];
        let smaCoeffs = [];
        if (this.params.P && this.params.Q && this.params.s) {
            sarCoeffs = this.estimateSeasonalAR(differenced, this.params.P, this.params.s);
            smaCoeffs = this.estimateSeasonalMA(differenced, this.params.Q, this.params.s);
        }
        this.coefficients = {
            ar: arCoeffs,
            ma: maCoeffs,
            sar: sarCoeffs.length > 0 ? sarCoeffs : undefined,
            sma: smaCoeffs.length > 0 ? smaCoeffs : undefined,
        };
        this.fitted = true;
    }
    /**
     * Generate forecasts
     */
    forecast(horizon, confidenceLevel = 0.95) {
        if (!this.fitted || !this.coefficients) {
            throw new Error('Model must be fitted before forecasting');
        }
        const results = [];
        const lastTimestamp = this.data[this.data.length - 1].timestamp;
        const values = this.data.map(d => d.value);
        for (let h = 1; h <= horizon; h++) {
            const forecast = this.forecastOneStep(values, h);
            const variance = this.calculateForecastVariance(h);
            const zScore = this.getZScore(confidenceLevel);
            const margin = zScore * Math.sqrt(variance);
            const timestamp = new Date(lastTimestamp.getTime() + h * 24 * 60 * 60 * 1000);
            results.push({
                timestamp,
                forecast,
                lowerBound: forecast - margin,
                upperBound: forecast + margin,
                confidence: confidenceLevel,
            });
            values.push(forecast);
        }
        return results;
    }
    /**
     * Calculate model performance metrics
     */
    evaluate(testData) {
        const predictions = this.forecast(testData.length, 0.95);
        const actual = testData.map(d => d.value);
        const predicted = predictions.map(p => p.forecast);
        return this.calculateMetrics(actual, predicted);
    }
    /**
     * Apply differencing to make series stationary
     */
    difference(series, order, seasonalOrder, seasonalPeriod) {
        let result = [...series];
        // Regular differencing
        for (let i = 0; i < order; i++) {
            result = result.slice(1).map((val, idx) => val - result[idx]);
        }
        // Seasonal differencing
        for (let i = 0; i < seasonalOrder; i++) {
            result = result.slice(seasonalPeriod).map((val, idx) => val - result[idx]);
        }
        return result;
    }
    /**
     * Estimate AR coefficients using Yule-Walker equations
     */
    estimateAR(data, order) {
        if (order === 0)
            return [];
        const n = data.length;
        const mean = data.reduce((a, b) => a + b, 0) / n;
        const centered = data.map(x => x - mean);
        // Calculate autocorrelations
        const acf = [];
        for (let k = 0; k <= order; k++) {
            let sum = 0;
            for (let t = k; t < n; t++) {
                sum += centered[t] * centered[t - k];
            }
            acf.push(sum / n);
        }
        // Solve Yule-Walker equations using Levinson-Durbin recursion
        const phi = new Array(order).fill(0);
        phi[0] = acf[1] / acf[0];
        for (let k = 1; k < order; k++) {
            let sum = 0;
            for (let j = 0; j < k; j++) {
                sum += phi[j] * acf[k - j];
            }
            const phiNew = (acf[k + 1] - sum) / (acf[0] - sum);
            for (let j = 0; j < k; j++) {
                phi[j] = phi[j] - phiNew * phi[k - 1 - j];
            }
            phi[k] = phiNew;
        }
        return phi;
    }
    /**
     * Estimate MA coefficients
     */
    estimateMA(data, order) {
        if (order === 0)
            return [];
        // Simplified MA estimation using innovations algorithm
        const theta = new Array(order).fill(0);
        const n = data.length;
        const mean = data.reduce((a, b) => a + b, 0) / n;
        // Calculate residuals from AR fit
        const residuals = data.map(x => x - mean);
        for (let i = 0; i < order && i < residuals.length - 1; i++) {
            let sum = 0;
            for (let j = 0; j < Math.min(i + 1, residuals.length - 1); j++) {
                sum += residuals[j] * residuals[j + 1];
            }
            theta[i] = sum / (n - 1);
        }
        return theta;
    }
    /**
     * Estimate seasonal AR coefficients
     */
    estimateSeasonalAR(data, order, period) {
        // Extract seasonal lags
        const seasonalData = [];
        for (let i = period; i < data.length; i += period) {
            seasonalData.push(data[i]);
        }
        return this.estimateAR(seasonalData, order);
    }
    /**
     * Estimate seasonal MA coefficients
     */
    estimateSeasonalMA(data, order, period) {
        // Extract seasonal lags
        const seasonalData = [];
        for (let i = period; i < data.length; i += period) {
            seasonalData.push(data[i]);
        }
        return this.estimateMA(seasonalData, order);
    }
    /**
     * Forecast one step ahead
     */
    forecastOneStep(values, horizon) {
        if (!this.coefficients)
            throw new Error('Model not fitted');
        const { ar, ma } = this.coefficients;
        let forecast = 0;
        // AR component
        for (let i = 0; i < ar.length; i++) {
            const idx = values.length - 1 - i;
            if (idx >= 0) {
                forecast += ar[i] * values[idx];
            }
        }
        // MA component would require residuals from previous forecasts
        // Simplified implementation
        return forecast;
    }
    /**
     * Calculate forecast variance
     */
    calculateForecastVariance(horizon) {
        // Simplified variance calculation
        const residuals = this.calculateResiduals();
        const variance = residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length;
        // Variance increases with horizon
        return variance * (1 + 0.1 * horizon);
    }
    /**
     * Calculate residuals
     */
    calculateResiduals() {
        if (!this.coefficients)
            return [];
        const residuals = [];
        const values = this.data.map(d => d.value);
        for (let i = this.params.p; i < values.length; i++) {
            let predicted = 0;
            for (let j = 0; j < this.coefficients.ar.length; j++) {
                predicted += this.coefficients.ar[j] * values[i - j - 1];
            }
            residuals.push(values[i] - predicted);
        }
        return residuals;
    }
    /**
     * Get z-score for confidence level
     */
    getZScore(confidenceLevel) {
        // Approximate z-scores for common confidence levels
        const zScores = {
            0.90: 1.645,
            0.95: 1.96,
            0.99: 2.576,
        };
        return zScores[confidenceLevel] || 1.96;
    }
    /**
     * Calculate performance metrics
     */
    calculateMetrics(actual, predicted) {
        const n = actual.length;
        let mae = 0, mse = 0, mape = 0, smape = 0;
        for (let i = 0; i < n; i++) {
            const error = actual[i] - predicted[i];
            mae += Math.abs(error);
            mse += error * error;
            if (actual[i] !== 0) {
                mape += Math.abs(error / actual[i]);
            }
            const denominator = (Math.abs(actual[i]) + Math.abs(predicted[i])) / 2;
            if (denominator !== 0) {
                smape += Math.abs(error) / denominator;
            }
        }
        mae /= n;
        mse /= n;
        mape = (mape / n) * 100;
        smape = (smape / n) * 100;
        const rmse = Math.sqrt(mse);
        // Calculate R²
        const meanActual = actual.reduce((a, b) => a + b, 0) / n;
        const ssTotal = actual.reduce((sum, val) => sum + Math.pow(val - meanActual, 2), 0);
        const ssResidual = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
        const r2 = 1 - (ssResidual / ssTotal);
        // Calculate MASE (simplified)
        const naiveMae = actual.slice(1).reduce((sum, val, i) => sum + Math.abs(val - actual[i]), 0) / (n - 1);
        const mase = mae / naiveMae;
        return { mae, rmse, mape, mase, smape, r2 };
    }
}
exports.ARIMAForecaster = ARIMAForecaster;
/**
 * Auto ARIMA - Automatic parameter selection
 */
class AutoARIMA {
    maxP;
    maxD;
    maxQ;
    seasonal;
    constructor(maxP = 5, maxD = 2, maxQ = 5, seasonal = false) {
        this.maxP = maxP;
        this.maxD = maxD;
        this.maxQ = maxQ;
        this.seasonal = seasonal;
    }
    /**
     * Automatically select best ARIMA parameters
     */
    selectBestModel(data, validationSplit = 0.2) {
        const splitIdx = Math.floor(data.length * (1 - validationSplit));
        const trainData = data.slice(0, splitIdx);
        const validData = data.slice(splitIdx);
        let bestParams = null;
        let bestAIC = Infinity;
        let bestPerformance = null;
        // Grid search over parameter space
        for (let p = 0; p <= this.maxP; p++) {
            for (let d = 0; d <= this.maxD; d++) {
                for (let q = 0; q <= this.maxQ; q++) {
                    try {
                        const params = { p, d, q };
                        const model = new ARIMAForecaster(params);
                        model.fit(trainData);
                        const performance = model.evaluate(validData);
                        const aic = this.calculateAIC(trainData.length, performance.rmse, p + q);
                        if (aic < bestAIC) {
                            bestAIC = aic;
                            bestParams = params;
                            bestPerformance = performance;
                        }
                    }
                    catch (error) {
                        // Skip invalid parameter combinations
                        continue;
                    }
                }
            }
        }
        if (!bestParams || !bestPerformance) {
            throw new Error('Failed to find suitable ARIMA parameters');
        }
        return { params: bestParams, performance: bestPerformance };
    }
    /**
     * Calculate Akaike Information Criterion
     */
    calculateAIC(n, mse, k) {
        return n * Math.log(mse) + 2 * k;
    }
}
exports.AutoARIMA = AutoARIMA;
