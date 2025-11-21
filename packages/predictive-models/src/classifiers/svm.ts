/**
 * Support Vector Machine Classifier
 */

import type { Dataset, PredictionResult, ModelPerformance } from '../types/index.js';

export interface SVMConfig {
  kernel: 'linear' | 'rbf' | 'polynomial';
  C: number; // Regularization parameter
  gamma?: number; // RBF kernel parameter
  degree?: number; // Polynomial kernel degree
  maxIterations: number;
  tolerance: number;
}

export class SVMClassifier {
  private config: SVMConfig;
  private supportVectors: number[][] = [];
  private alphas: number[] = [];
  private bias: number = 0;
  private labels: number[] = [];
  private classes: (string | number)[] = [];
  private fitted: boolean = false;

  constructor(config: Partial<SVMConfig> = {}) {
    this.config = {
      kernel: config.kernel || 'rbf',
      C: config.C || 1.0,
      gamma: config.gamma || 0.1,
      degree: config.degree || 3,
      maxIterations: config.maxIterations || 1000,
      tolerance: config.tolerance || 1e-3,
    };
  }

  /**
   * Fit SVM using simplified SMO algorithm
   */
  fit(dataset: Dataset): void {
    const { features, labels } = dataset;
    this.classes = [...new Set(labels)];

    // Convert to binary labels (-1, 1)
    const y = labels.map(l => l === this.classes[0] ? -1 : 1);
    const X = features;
    const n = X.length;

    // Initialize alphas
    this.alphas = new Array(n).fill(0);
    this.bias = 0;

    // Simplified SMO
    let passes = 0;
    const maxPasses = 5;

    while (passes < maxPasses) {
      let numChangedAlphas = 0;

      for (let i = 0; i < n; i++) {
        const Ei = this.predict_value(X, y, X[i]) - y[i];

        if ((y[i] * Ei < -this.config.tolerance && this.alphas[i] < this.config.C) ||
            (y[i] * Ei > this.config.tolerance && this.alphas[i] > 0)) {

          // Select random j != i
          let j = Math.floor(Math.random() * n);
          while (j === i) j = Math.floor(Math.random() * n);

          const Ej = this.predict_value(X, y, X[j]) - y[j];

          const alphaI_old = this.alphas[i];
          const alphaJ_old = this.alphas[j];

          // Compute bounds
          let L: number, H: number;
          if (y[i] !== y[j]) {
            L = Math.max(0, this.alphas[j] - this.alphas[i]);
            H = Math.min(this.config.C, this.config.C + this.alphas[j] - this.alphas[i]);
          } else {
            L = Math.max(0, this.alphas[i] + this.alphas[j] - this.config.C);
            H = Math.min(this.config.C, this.alphas[i] + this.alphas[j]);
          }

          if (L === H) continue;

          // Compute eta
          const eta = 2 * this.kernel(X[i], X[j]) -
                      this.kernel(X[i], X[i]) -
                      this.kernel(X[j], X[j]);

          if (eta >= 0) continue;

          // Update alpha_j
          this.alphas[j] = alphaJ_old - (y[j] * (Ei - Ej)) / eta;
          this.alphas[j] = Math.min(H, Math.max(L, this.alphas[j]));

          if (Math.abs(this.alphas[j] - alphaJ_old) < 1e-5) continue;

          // Update alpha_i
          this.alphas[i] = alphaI_old + y[i] * y[j] * (alphaJ_old - this.alphas[j]);

          // Update bias
          const b1 = this.bias - Ei -
                     y[i] * (this.alphas[i] - alphaI_old) * this.kernel(X[i], X[i]) -
                     y[j] * (this.alphas[j] - alphaJ_old) * this.kernel(X[i], X[j]);

          const b2 = this.bias - Ej -
                     y[i] * (this.alphas[i] - alphaI_old) * this.kernel(X[i], X[j]) -
                     y[j] * (this.alphas[j] - alphaJ_old) * this.kernel(X[j], X[j]);

          if (0 < this.alphas[i] && this.alphas[i] < this.config.C) {
            this.bias = b1;
          } else if (0 < this.alphas[j] && this.alphas[j] < this.config.C) {
            this.bias = b2;
          } else {
            this.bias = (b1 + b2) / 2;
          }

          numChangedAlphas++;
        }
      }

      if (numChangedAlphas === 0) {
        passes++;
      } else {
        passes = 0;
      }
    }

    // Store support vectors
    this.supportVectors = [];
    this.labels = [];
    const finalAlphas: number[] = [];

    for (let i = 0; i < n; i++) {
      if (this.alphas[i] > 1e-5) {
        this.supportVectors.push(X[i]);
        this.labels.push(y[i]);
        finalAlphas.push(this.alphas[i]);
      }
    }

    this.alphas = finalAlphas;
    this.fitted = true;
  }

  /**
   * Predict class labels
   */
  predict(features: number[][]): PredictionResult[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before prediction');
    }

    return features.map(sample => {
      const decision = this.decisionFunction(sample);
      const prediction = decision >= 0 ? this.classes[1] : this.classes[0];
      const probability = this.sigmoid(decision);

      return {
        prediction,
        probability: prediction === this.classes[1] ? probability : 1 - probability,
        confidence: Math.abs(decision) / (Math.abs(decision) + 1),
      };
    });
  }

  /**
   * Get decision function value
   */
  decisionFunction(sample: number[]): number {
    let result = this.bias;

    for (let i = 0; i < this.supportVectors.length; i++) {
      result += this.alphas[i] * this.labels[i] * this.kernel(this.supportVectors[i], sample);
    }

    return result;
  }

  /**
   * Evaluate model
   */
  evaluate(testDataset: Dataset): ModelPerformance {
    const predictions = this.predict(testDataset.features);
    const predicted = predictions.map(p => p.prediction);
    const actual = testDataset.labels;

    let correct = 0;
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] === predicted[i]) correct++;
    }

    return {
      accuracy: correct / actual.length,
    };
  }

  /**
   * Kernel function
   */
  private kernel(x1: number[], x2: number[]): number {
    switch (this.config.kernel) {
      case 'linear':
        return this.dotProduct(x1, x2);

      case 'rbf':
        const diff = x1.map((v, i) => v - x2[i]);
        const squaredDist = diff.reduce((sum, d) => sum + d * d, 0);
        return Math.exp(-this.config.gamma! * squaredDist);

      case 'polynomial':
        return Math.pow(this.dotProduct(x1, x2) + 1, this.config.degree!);

      default:
        return this.dotProduct(x1, x2);
    }
  }

  /**
   * Predict raw value during training
   */
  private predict_value(X: number[][], y: number[], sample: number[]): number {
    let result = this.bias;

    for (let i = 0; i < X.length; i++) {
      result += this.alphas[i] * y[i] * this.kernel(X[i], sample);
    }

    return result;
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }
}

/**
 * SVM Regressor (SVR)
 */
export class SVMRegressor {
  private config: SVMConfig & { epsilon: number };
  private supportVectors: number[][] = [];
  private alphas: number[] = [];
  private alphaStars: number[] = [];
  private bias: number = 0;
  private fitted: boolean = false;

  constructor(config: Partial<SVMConfig & { epsilon: number }> = {}) {
    this.config = {
      kernel: config.kernel || 'rbf',
      C: config.C || 1.0,
      gamma: config.gamma || 0.1,
      degree: config.degree || 3,
      maxIterations: config.maxIterations || 1000,
      tolerance: config.tolerance || 1e-3,
      epsilon: config.epsilon || 0.1,
    };
  }

  /**
   * Fit SVR model
   */
  fit(features: number[][], labels: number[]): void {
    const n = features.length;

    // Simplified SVR fitting
    this.alphas = new Array(n).fill(0);
    this.alphaStars = new Array(n).fill(0);
    this.bias = labels.reduce((a, b) => a + b, 0) / n;

    // Use gradient descent for simplified implementation
    const learningRate = 0.01;

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      for (let i = 0; i < n; i++) {
        const prediction = this.predictSingle(features, features[i]);
        const error = labels[i] - prediction;

        if (Math.abs(error) > this.config.epsilon) {
          const gradient = error > 0 ? 1 : -1;

          if (this.alphas[i] < this.config.C) {
            this.alphas[i] += learningRate * gradient;
            this.alphas[i] = Math.max(0, Math.min(this.config.C, this.alphas[i]));
          }
        }
      }
    }

    this.supportVectors = features;
    this.fitted = true;
  }

  /**
   * Predict values
   */
  predict(features: number[][]): number[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before prediction');
    }

    return features.map(sample => this.predictSingle(this.supportVectors, sample));
  }

  private predictSingle(supportVectors: number[][], sample: number[]): number {
    let result = this.bias;

    for (let i = 0; i < supportVectors.length; i++) {
      const coef = this.alphas[i] - (this.alphaStars[i] || 0);
      result += coef * this.kernel(supportVectors[i], sample);
    }

    return result;
  }

  private kernel(x1: number[], x2: number[]): number {
    switch (this.config.kernel) {
      case 'linear':
        return x1.reduce((sum, val, i) => sum + val * x2[i], 0);

      case 'rbf':
        const diff = x1.map((v, i) => v - x2[i]);
        const squaredDist = diff.reduce((sum, d) => sum + d * d, 0);
        return Math.exp(-this.config.gamma! * squaredDist);

      case 'polynomial':
        const dot = x1.reduce((sum, val, i) => sum + val * x2[i], 0);
        return Math.pow(dot + 1, this.config.degree!);

      default:
        return x1.reduce((sum, val, i) => sum + val * x2[i], 0);
    }
  }
}
