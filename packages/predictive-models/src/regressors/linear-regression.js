"use strict";
// @ts-nocheck
/**
 * Linear Regression and Regularized Variants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LassoRegression = exports.RidgeRegression = exports.LinearRegression = void 0;
class LinearRegression {
    coefficients = [];
    intercept = 0;
    config;
    fitted = false;
    constructor(config = {}) {
        this.config = {
            fitIntercept: config.fitIntercept !== false,
            normalize: config.normalize || false,
        };
    }
    /**
     * Fit linear regression using ordinary least squares
     */
    fit(dataset) {
        const { features, labels } = dataset;
        const X = features.map(row => [...row]);
        const y = labels;
        // Normalize features if requested
        if (this.config.normalize) {
            this.normalizeFeatures(X);
        }
        // Add intercept column if needed
        if (this.config.fitIntercept) {
            X.forEach(row => row.unshift(1));
        }
        // Solve using normal equations: β = (X'X)^(-1)X'y
        const XtX = this.matrixMultiply(this.transpose(X), X);
        const Xty = this.matrixVectorMultiply(this.transpose(X), y);
        const beta = this.solveLinearSystem(XtX, Xty);
        if (this.config.fitIntercept) {
            this.intercept = beta[0];
            this.coefficients = beta.slice(1);
        }
        else {
            this.coefficients = beta;
        }
        this.fitted = true;
    }
    /**
     * Predict values
     */
    predict(features) {
        if (!this.fitted) {
            throw new Error('Model must be fitted before prediction');
        }
        return features.map(sample => {
            let prediction = this.intercept;
            for (let i = 0; i < this.coefficients.length; i++) {
                prediction += this.coefficients[i] * sample[i];
            }
            return prediction;
        });
    }
    /**
     * Get coefficients
     */
    getCoefficients() {
        return {
            coefficients: [...this.coefficients],
            intercept: this.intercept,
        };
    }
    /**
     * Evaluate model
     */
    evaluate(testDataset) {
        const predicted = this.predict(testDataset.features);
        const actual = testDataset.labels;
        return this.calculateMetrics(actual, predicted);
    }
    /**
     * Normalize features (mean=0, std=1)
     */
    normalizeFeatures(X) {
        const n = X[0].length;
        for (let j = 0; j < n; j++) {
            const column = X.map(row => row[j]);
            const mean = column.reduce((a, b) => a + b, 0) / column.length;
            const std = Math.sqrt(column.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / column.length);
            for (let i = 0; i < X.length; i++) {
                X[i][j] = std > 0 ? (X[i][j] - mean) / std : 0;
            }
        }
    }
    /**
     * Matrix multiplication
     */
    matrixMultiply(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < B.length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }
    /**
     * Matrix transpose
     */
    transpose(matrix) {
        return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }
    /**
     * Matrix-vector multiplication
     */
    matrixVectorMultiply(A, v) {
        return A.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
    }
    /**
     * Solve linear system using Gaussian elimination
     */
    solveLinearSystem(A, b) {
        const n = A.length;
        const augmented = A.map((row, i) => [...row, b[i]]);
        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Partial pivoting
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            // Eliminate column
            for (let k = i + 1; k < n; k++) {
                const factor = augmented[k][i] / augmented[i][i];
                for (let j = i; j <= n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = augmented[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= augmented[i][j] * x[j];
            }
            x[i] /= augmented[i][i];
        }
        return x;
    }
    /**
     * Calculate regression metrics
     */
    calculateMetrics(actual, predicted) {
        const n = actual.length;
        let mae = 0, mse = 0;
        for (let i = 0; i < n; i++) {
            const error = actual[i] - predicted[i];
            mae += Math.abs(error);
            mse += error * error;
        }
        mae /= n;
        mse /= n;
        const rmse = Math.sqrt(mse);
        // Calculate R²
        const meanActual = actual.reduce((a, b) => a + b, 0) / n;
        const ssTotal = actual.reduce((sum, val) => sum + Math.pow(val - meanActual, 2), 0);
        const ssResidual = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
        const r2 = 1 - (ssResidual / ssTotal);
        return { mae, rmse, r2 };
    }
}
exports.LinearRegression = LinearRegression;
/**
 * Ridge Regression (L2 regularization)
 */
class RidgeRegression extends LinearRegression {
    alpha;
    constructor(alpha = 1.0, config = {}) {
        super(config);
        this.alpha = alpha;
    }
    /**
     * Fit ridge regression
     */
    fit(dataset) {
        const { features, labels } = dataset;
        const X = features.map(row => [...row]);
        const y = labels;
        // Add intercept column
        X.forEach(row => row.unshift(1));
        // Solve: β = (X'X + αI)^(-1)X'y
        const XtX = this.matrixMultiply(this.transpose(X), X);
        // Add regularization term (don't penalize intercept)
        for (let i = 1; i < XtX.length; i++) {
            XtX[i][i] += this.alpha;
        }
        const Xty = this.matrixVectorMultiply(this.transpose(X), y);
        const beta = this.solveLinearSystem(XtX, Xty);
        this['intercept'] = beta[0];
        this['coefficients'] = beta.slice(1);
        this['fitted'] = true;
    }
    matrixMultiply(A, B) {
        const result = [];
        for (let i = 0; i < A.length; i++) {
            result[i] = [];
            for (let j = 0; j < B[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < B.length; k++) {
                    sum += A[i][k] * B[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }
    transpose(matrix) {
        return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
    }
    matrixVectorMultiply(A, v) {
        return A.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
    }
    solveLinearSystem(A, b) {
        const n = A.length;
        const augmented = A.map((row, i) => [...row, b[i]]);
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                    maxRow = k;
                }
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
            for (let k = i + 1; k < n; k++) {
                const factor = augmented[k][i] / augmented[i][i];
                for (let j = i; j <= n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = augmented[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= augmented[i][j] * x[j];
            }
            x[i] /= augmented[i][i];
        }
        return x;
    }
}
exports.RidgeRegression = RidgeRegression;
/**
 * Lasso Regression (L1 regularization) - using coordinate descent
 */
class LassoRegression {
    coefficients = [];
    intercept = 0;
    alpha;
    maxIterations;
    tolerance;
    fitted = false;
    constructor(alpha = 1.0, maxIterations = 1000, tolerance = 1e-4) {
        this.alpha = alpha;
        this.maxIterations = maxIterations;
        this.tolerance = tolerance;
    }
    /**
     * Fit lasso regression using coordinate descent
     */
    fit(dataset) {
        const { features, labels } = dataset;
        const X = features;
        const y = labels;
        const n = X.length;
        const p = X[0].length;
        // Initialize coefficients
        this.coefficients = new Array(p).fill(0);
        this.intercept = y.reduce((a, b) => a + b, 0) / n;
        // Coordinate descent
        for (let iter = 0; iter < this.maxIterations; iter++) {
            const oldCoeffs = [...this.coefficients];
            for (let j = 0; j < p; j++) {
                // Calculate residual without j-th feature
                const residual = y.map((yi, i) => {
                    let pred = this.intercept;
                    for (let k = 0; k < p; k++) {
                        if (k !== j) {
                            pred += this.coefficients[k] * X[i][k];
                        }
                    }
                    return yi - pred;
                });
                // Calculate correlation
                const rho = X.reduce((sum, xi, i) => sum + xi[j] * residual[i], 0) / n;
                // Soft thresholding
                if (rho > this.alpha) {
                    this.coefficients[j] = rho - this.alpha;
                }
                else if (rho < -this.alpha) {
                    this.coefficients[j] = rho + this.alpha;
                }
                else {
                    this.coefficients[j] = 0;
                }
            }
            // Check convergence
            const maxChange = Math.max(...this.coefficients.map((c, i) => Math.abs(c - oldCoeffs[i])));
            if (maxChange < this.tolerance) {
                break;
            }
        }
        this.fitted = true;
    }
    /**
     * Predict values
     */
    predict(features) {
        if (!this.fitted) {
            throw new Error('Model must be fitted before prediction');
        }
        return features.map(sample => {
            let prediction = this.intercept;
            for (let i = 0; i < this.coefficients.length; i++) {
                prediction += this.coefficients[i] * sample[i];
            }
            return prediction;
        });
    }
    /**
     * Get non-zero coefficients (sparse solution)
     */
    getSparseCoefficients() {
        return this.coefficients
            .map((coef, i) => ({ index: i, value: coef }))
            .filter(c => Math.abs(c.value) > 1e-10);
    }
}
exports.LassoRegression = LassoRegression;
