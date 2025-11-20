/**
 * Hyperparameter Optimization
 */

import type { Dataset, HyperparameterSearchResult, ModelPerformance } from '../types/index.js';

export interface ParameterSpace {
  [key: string]: number[] | string[] | boolean[];
}

export interface OptimizerConfig {
  nIterations: number;
  nFolds: number;
  scoringMetric: 'accuracy' | 'f1' | 'rmse' | 'r2';
  randomState?: number;
}

/**
 * Grid Search for hyperparameter optimization
 */
export class GridSearchCV {
  private config: OptimizerConfig;

  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = {
      nIterations: config.nIterations || 10,
      nFolds: config.nFolds || 5,
      scoringMetric: config.scoringMetric || 'accuracy',
      randomState: config.randomState,
    };
  }

  /**
   * Search over parameter grid
   */
  search(
    parameterSpace: ParameterSpace,
    modelFactory: (params: Record<string, unknown>) => any,
    dataset: Dataset
  ): HyperparameterSearchResult {
    const paramGrid = this.generateParameterGrid(parameterSpace);
    const cvResults: Array<{
      params: Record<string, unknown>;
      meanScore: number;
      stdScore: number;
    }> = [];

    let bestScore = -Infinity;
    let bestParams: Record<string, unknown> = {};

    for (const params of paramGrid) {
      const scores = this.crossValidate(modelFactory, params, dataset);
      const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdScore = this.std(scores);

      cvResults.push({ params, meanScore, stdScore });

      if (meanScore > bestScore) {
        bestScore = meanScore;
        bestParams = params;
      }
    }

    return {
      bestParams,
      bestScore,
      cvResults,
    };
  }

  /**
   * Generate parameter grid
   */
  private generateParameterGrid(space: ParameterSpace): Array<Record<string, unknown>> {
    const keys = Object.keys(space);
    const values = keys.map(k => space[k]);

    const grid: Array<Record<string, unknown>> = [];

    const generateCombinations = (index: number, current: Record<string, unknown>) => {
      if (index === keys.length) {
        grid.push({ ...current });
        return;
      }

      for (const value of values[index]) {
        current[keys[index]] = value;
        generateCombinations(index + 1, current);
      }
    };

    generateCombinations(0, {});
    return grid;
  }

  /**
   * K-fold cross validation
   */
  private crossValidate(
    modelFactory: (params: Record<string, unknown>) => any,
    params: Record<string, unknown>,
    dataset: Dataset
  ): number[] {
    const scores: number[] = [];
    const folds = this.createFolds(dataset, this.config.nFolds);

    for (let i = 0; i < this.config.nFolds; i++) {
      const trainFolds = folds.filter((_, idx) => idx !== i);
      const testFold = folds[i];

      const trainData = this.combineFolds(trainFolds);
      const model = modelFactory(params);

      model.fit(trainData);
      const performance = model.evaluate(testFold);

      scores.push(this.extractScore(performance));
    }

    return scores;
  }

  /**
   * Create K folds
   */
  private createFolds(dataset: Dataset, k: number): Dataset[] {
    const n = dataset.features.length;
    const foldSize = Math.floor(n / k);
    const indices = Array.from({ length: n }, (_, i) => i);

    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const folds: Dataset[] = [];

    for (let i = 0; i < k; i++) {
      const start = i * foldSize;
      const end = i === k - 1 ? n : (i + 1) * foldSize;
      const foldIndices = indices.slice(start, end);

      folds.push({
        features: foldIndices.map(idx => dataset.features[idx]),
        labels: foldIndices.map(idx => dataset.labels[idx]),
      });
    }

    return folds;
  }

  /**
   * Combine folds
   */
  private combineFolds(folds: Dataset[]): Dataset {
    return {
      features: folds.flatMap(f => f.features),
      labels: folds.flatMap(f => f.labels),
    };
  }

  /**
   * Extract score from performance metrics
   */
  private extractScore(performance: ModelPerformance): number {
    switch (this.config.scoringMetric) {
      case 'accuracy':
        return performance.accuracy || 0;
      case 'f1':
        return performance.f1Score || 0;
      case 'rmse':
        return -(performance.rmse || Infinity); // Negative because lower is better
      case 'r2':
        return performance.r2 || 0;
      default:
        return 0;
    }
  }

  private std(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(x => Math.pow(x - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
  }
}

/**
 * Random Search for hyperparameter optimization
 */
export class RandomSearchCV {
  private config: OptimizerConfig;

  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = {
      nIterations: config.nIterations || 10,
      nFolds: config.nFolds || 5,
      scoringMetric: config.scoringMetric || 'accuracy',
      randomState: config.randomState,
    };
  }

  /**
   * Random search over parameter distributions
   */
  search(
    parameterSpace: ParameterSpace,
    modelFactory: (params: Record<string, unknown>) => any,
    dataset: Dataset
  ): HyperparameterSearchResult {
    const cvResults: Array<{
      params: Record<string, unknown>;
      meanScore: number;
      stdScore: number;
    }> = [];

    let bestScore = -Infinity;
    let bestParams: Record<string, unknown> = {};

    for (let iter = 0; iter < this.config.nIterations; iter++) {
      const params = this.sampleParameters(parameterSpace);
      const scores = this.crossValidate(modelFactory, params, dataset);
      const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdScore = this.std(scores);

      cvResults.push({ params, meanScore, stdScore });

      if (meanScore > bestScore) {
        bestScore = meanScore;
        bestParams = params;
      }
    }

    return {
      bestParams,
      bestScore,
      cvResults,
    };
  }

  /**
   * Sample random parameters
   */
  private sampleParameters(space: ParameterSpace): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    for (const [key, values] of Object.entries(space)) {
      const randomIndex = Math.floor(Math.random() * values.length);
      params[key] = values[randomIndex];
    }

    return params;
  }

  private crossValidate(
    modelFactory: (params: Record<string, unknown>) => any,
    params: Record<string, unknown>,
    dataset: Dataset
  ): number[] {
    const scores: number[] = [];
    const folds = this.createFolds(dataset, this.config.nFolds);

    for (let i = 0; i < this.config.nFolds; i++) {
      const trainFolds = folds.filter((_, idx) => idx !== i);
      const testFold = folds[i];

      const trainData = this.combineFolds(trainFolds);
      const model = modelFactory(params);

      model.fit(trainData);
      const performance = model.evaluate(testFold);
      scores.push(this.extractScore(performance));
    }

    return scores;
  }

  private createFolds(dataset: Dataset, k: number): Dataset[] {
    const n = dataset.features.length;
    const foldSize = Math.floor(n / k);
    const indices = Array.from({ length: n }, (_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const folds: Dataset[] = [];

    for (let i = 0; i < k; i++) {
      const start = i * foldSize;
      const end = i === k - 1 ? n : (i + 1) * foldSize;
      const foldIndices = indices.slice(start, end);

      folds.push({
        features: foldIndices.map(idx => dataset.features[idx]),
        labels: foldIndices.map(idx => dataset.labels[idx]),
      });
    }

    return folds;
  }

  private combineFolds(folds: Dataset[]): Dataset {
    return {
      features: folds.flatMap(f => f.features),
      labels: folds.flatMap(f => f.labels),
    };
  }

  private extractScore(performance: ModelPerformance): number {
    switch (this.config.scoringMetric) {
      case 'accuracy':
        return performance.accuracy || 0;
      case 'f1':
        return performance.f1Score || 0;
      case 'rmse':
        return -(performance.rmse || Infinity);
      case 'r2':
        return performance.r2 || 0;
      default:
        return 0;
    }
  }

  private std(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(x => Math.pow(x - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / arr.length);
  }
}
