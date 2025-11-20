import {
  AlgorithmType,
  ModelConfig,
  ModelComplexity,
  Dataset,
  AutoMLJobConfig,
} from './types';

/**
 * Algorithm recommendation engine for automated model selection
 */
export class ModelSelector {
  private algorithmCatalog: Map<string, AlgorithmMetadata> = new Map();

  constructor() {
    this.initializeAlgorithmCatalog();
  }

  /**
   * Recommend best algorithms for given dataset and task
   */
  async recommendAlgorithms(
    dataset: Dataset,
    config: AutoMLJobConfig,
    topK: number = 5
  ): Promise<ModelConfig[]> {
    const candidates = this.filterAlgorithmsByType(config.algorithmType);
    const scored = await this.scoreAlgorithms(candidates, dataset, config);
    const sorted = this.sortByScore(scored);

    return sorted.slice(0, topK).map(item => this.createModelConfig(item.algorithm));
  }

  /**
   * Analyze model complexity and resource requirements
   */
  analyzeComplexity(modelConfig: ModelConfig, dataset: Dataset): {
    complexity: ModelComplexity;
    estimatedTime: number;
    estimatedMemory: number;
    estimatedCost: number;
  } {
    const algorithm = this.algorithmCatalog.get(modelConfig.algorithm);
    if (!algorithm) {
      throw new Error(`Unknown algorithm: ${modelConfig.algorithm}`);
    }

    const dataSize = dataset.rows * dataset.columns;
    const complexityFactor = this.calculateComplexityFactor(algorithm, dataSize);

    return {
      complexity: this.determineComplexity(complexityFactor),
      estimatedTime: complexityFactor * algorithm.baseTime,
      estimatedMemory: dataSize * algorithm.memoryFactor,
      estimatedCost: (complexityFactor * algorithm.baseTime * 0.001), // Example cost calculation
    };
  }

  /**
   * Explain why an algorithm was selected or rejected
   */
  explainSelection(
    algorithm: string,
    dataset: Dataset,
    config: AutoMLJobConfig
  ): {
    selected: boolean;
    reasons: string[];
    score: number;
  } {
    const metadata = this.algorithmCatalog.get(algorithm);
    if (!metadata) {
      return {
        selected: false,
        reasons: ['Algorithm not found in catalog'],
        score: 0,
      };
    }

    const reasons: string[] = [];
    let score = 0;

    // Check algorithm type compatibility
    if (metadata.type !== config.algorithmType) {
      reasons.push(`Algorithm type mismatch: expected ${config.algorithmType}, got ${metadata.type}`);
      return { selected: false, reasons, score: 0 };
    }

    // Check dataset size compatibility
    const dataSize = dataset.rows * dataset.columns;
    if (dataSize < metadata.minDataSize) {
      reasons.push(`Dataset too small: ${dataSize} < ${metadata.minDataSize}`);
      score -= 20;
    } else {
      reasons.push('Dataset size compatible');
      score += 10;
    }

    // Check feature types
    const categoricalFeatures = dataset.features.filter(f => f.type === 'categorical').length;
    const _numericFeatures = dataset.features.filter(f => f.type === 'numeric').length;

    if (metadata.supportsCategorical || categoricalFeatures === 0) {
      reasons.push('Categorical features supported');
      score += 10;
    } else {
      reasons.push('Categorical features not supported');
      score -= 15;
    }

    // Check missing values
    const hasMissingValues = dataset.features.some(f => f.missing > 0);
    if (metadata.handlesMissing || !hasMissingValues) {
      reasons.push('Missing values handled');
      score += 5;
    } else {
      reasons.push('Missing values require preprocessing');
      score -= 10;
    }

    // Performance-cost tradeoff
    if (config.timeLimit) {
      const complexity = this.analyzeComplexity(
        this.createModelConfig(algorithm),
        dataset
      );
      if (complexity.estimatedTime > config.timeLimit) {
        reasons.push(`Estimated time ${complexity.estimatedTime}s exceeds limit ${config.timeLimit}s`);
        score -= 25;
      }
    }

    // Historical performance
    if (metadata.avgPerformance) {
      reasons.push(`Historical avg performance: ${(metadata.avgPerformance * 100).toFixed(2)}%`);
      score += metadata.avgPerformance * 30;
    }

    return {
      selected: score > 0,
      reasons,
      score,
    };
  }

  /**
   * Generate ensemble model configurations
   */
  generateEnsembleConfig(
    baseModels: ModelConfig[],
    method: 'voting' | 'stacking' | 'boosting' | 'bagging'
  ): ModelConfig {
    return {
      algorithm: `ensemble_${method}`,
      algorithmType: baseModels[0].algorithmType,
      complexity: ModelComplexity.VERY_HIGH,
      hyperparameters: {
        method,
        baseModels: baseModels.map(m => m.algorithm),
        weights: baseModels.map(() => 1 / baseModels.length),
      },
    };
  }

  // Private helper methods

  private initializeAlgorithmCatalog(): void {
    // Classification algorithms
    this.algorithmCatalog.set('random_forest', {
      name: 'Random Forest',
      type: AlgorithmType.CLASSIFICATION,
      complexity: ModelComplexity.MEDIUM,
      supportsCategorical: true,
      handlesMissing: false,
      supportsMulticlass: true,
      minDataSize: 100,
      baseTime: 1.0,
      memoryFactor: 0.01,
      avgPerformance: 0.85,
    });

    this.algorithmCatalog.set('gradient_boosting', {
      name: 'Gradient Boosting',
      type: AlgorithmType.CLASSIFICATION,
      complexity: ModelComplexity.HIGH,
      supportsCategorical: false,
      handlesMissing: false,
      supportsMulticlass: true,
      minDataSize: 200,
      baseTime: 2.5,
      memoryFactor: 0.02,
      avgPerformance: 0.88,
    });

    this.algorithmCatalog.set('xgboost', {
      name: 'XGBoost',
      type: AlgorithmType.CLASSIFICATION,
      complexity: ModelComplexity.HIGH,
      supportsCategorical: true,
      handlesMissing: true,
      supportsMulticlass: true,
      minDataSize: 100,
      baseTime: 2.0,
      memoryFactor: 0.015,
      avgPerformance: 0.90,
    });

    this.algorithmCatalog.set('lightgbm', {
      name: 'LightGBM',
      type: AlgorithmType.CLASSIFICATION,
      complexity: ModelComplexity.MEDIUM,
      supportsCategorical: true,
      handlesMissing: true,
      supportsMulticlass: true,
      minDataSize: 100,
      baseTime: 1.5,
      memoryFactor: 0.012,
      avgPerformance: 0.89,
    });

    this.algorithmCatalog.set('logistic_regression', {
      name: 'Logistic Regression',
      type: AlgorithmType.CLASSIFICATION,
      complexity: ModelComplexity.LOW,
      supportsCategorical: false,
      handlesMissing: false,
      supportsMulticlass: true,
      minDataSize: 50,
      baseTime: 0.5,
      memoryFactor: 0.005,
      avgPerformance: 0.78,
    });

    this.algorithmCatalog.set('svm', {
      name: 'Support Vector Machine',
      type: AlgorithmType.CLASSIFICATION,
      complexity: ModelComplexity.HIGH,
      supportsCategorical: false,
      handlesMissing: false,
      supportsMulticlass: true,
      minDataSize: 50,
      baseTime: 3.0,
      memoryFactor: 0.025,
      avgPerformance: 0.82,
    });

    this.algorithmCatalog.set('neural_network', {
      name: 'Neural Network',
      type: AlgorithmType.CLASSIFICATION,
      complexity: ModelComplexity.VERY_HIGH,
      supportsCategorical: false,
      handlesMissing: false,
      supportsMulticlass: true,
      minDataSize: 500,
      baseTime: 5.0,
      memoryFactor: 0.05,
      avgPerformance: 0.87,
    });

    // Regression algorithms
    this.algorithmCatalog.set('linear_regression', {
      name: 'Linear Regression',
      type: AlgorithmType.REGRESSION,
      complexity: ModelComplexity.LOW,
      supportsCategorical: false,
      handlesMissing: false,
      supportsMulticlass: false,
      minDataSize: 30,
      baseTime: 0.3,
      memoryFactor: 0.003,
      avgPerformance: 0.75,
    });

    this.algorithmCatalog.set('random_forest_regressor', {
      name: 'Random Forest Regressor',
      type: AlgorithmType.REGRESSION,
      complexity: ModelComplexity.MEDIUM,
      supportsCategorical: true,
      handlesMissing: false,
      supportsMulticlass: false,
      minDataSize: 100,
      baseTime: 1.2,
      memoryFactor: 0.01,
      avgPerformance: 0.83,
    });

    this.algorithmCatalog.set('xgboost_regressor', {
      name: 'XGBoost Regressor',
      type: AlgorithmType.REGRESSION,
      complexity: ModelComplexity.HIGH,
      supportsCategorical: true,
      handlesMissing: true,
      supportsMulticlass: false,
      minDataSize: 100,
      baseTime: 2.0,
      memoryFactor: 0.015,
      avgPerformance: 0.88,
    });

    // Add more algorithms as needed...
  }

  private filterAlgorithmsByType(type: AlgorithmType): string[] {
    return Array.from(this.algorithmCatalog.entries())
      .filter(([_, metadata]) => metadata.type === type)
      .map(([name, _]) => name);
  }

  private async scoreAlgorithms(
    algorithms: string[],
    dataset: Dataset,
    config: AutoMLJobConfig
  ): Promise<Array<{ algorithm: string; score: number }>> {
    const scored = algorithms.map(algorithm => {
      const explanation = this.explainSelection(algorithm, dataset, config);
      return {
        algorithm,
        score: explanation.score,
      };
    });

    return scored.filter(item => item.score > 0);
  }

  private sortByScore(
    items: Array<{ algorithm: string; score: number }>
  ): Array<{ algorithm: string; score: number }> {
    return items.sort((a, b) => b.score - a.score);
  }

  private createModelConfig(algorithm: string): ModelConfig {
    const metadata = this.algorithmCatalog.get(algorithm);
    if (!metadata) {
      throw new Error(`Unknown algorithm: ${algorithm}`);
    }

    return {
      algorithm,
      algorithmType: metadata.type,
      complexity: metadata.complexity,
      hyperparameters: this.getDefaultHyperparameters(algorithm),
    };
  }

  private getDefaultHyperparameters(algorithm: string): Record<string, any> {
    const defaults: Record<string, Record<string, any>> = {
      random_forest: {
        n_estimators: 100,
        max_depth: 10,
        min_samples_split: 2,
        min_samples_leaf: 1,
      },
      xgboost: {
        n_estimators: 100,
        max_depth: 6,
        learning_rate: 0.3,
        subsample: 1.0,
      },
      lightgbm: {
        n_estimators: 100,
        max_depth: -1,
        learning_rate: 0.1,
        num_leaves: 31,
      },
      gradient_boosting: {
        n_estimators: 100,
        max_depth: 3,
        learning_rate: 0.1,
      },
      logistic_regression: {
        C: 1.0,
        penalty: 'l2',
        solver: 'lbfgs',
      },
      svm: {
        C: 1.0,
        kernel: 'rbf',
        gamma: 'scale',
      },
      neural_network: {
        hidden_layers: [100, 50],
        activation: 'relu',
        learning_rate: 0.001,
        batch_size: 32,
        epochs: 100,
      },
      linear_regression: {
        fit_intercept: true,
        normalize: false,
      },
      random_forest_regressor: {
        n_estimators: 100,
        max_depth: 10,
        min_samples_split: 2,
      },
      xgboost_regressor: {
        n_estimators: 100,
        max_depth: 6,
        learning_rate: 0.3,
      },
    };

    return defaults[algorithm] || {};
  }

  private calculateComplexityFactor(
    metadata: AlgorithmMetadata,
    dataSize: number
  ): number {
    let factor = 1.0;

    // Adjust for data size
    factor *= Math.log10(dataSize + 1);

    // Adjust for algorithm complexity
    switch (metadata.complexity) {
      case ModelComplexity.LOW:
        factor *= 0.5;
        break;
      case ModelComplexity.MEDIUM:
        factor *= 1.0;
        break;
      case ModelComplexity.HIGH:
        factor *= 2.0;
        break;
      case ModelComplexity.VERY_HIGH:
        factor *= 4.0;
        break;
    }

    return factor;
  }

  private determineComplexity(factor: number): ModelComplexity {
    if (factor < 1.0) return ModelComplexity.LOW;
    if (factor < 2.0) return ModelComplexity.MEDIUM;
    if (factor < 4.0) return ModelComplexity.HIGH;
    return ModelComplexity.VERY_HIGH;
  }
}

interface AlgorithmMetadata {
  name: string;
  type: AlgorithmType;
  complexity: ModelComplexity;
  supportsCategorical: boolean;
  handlesMissing: boolean;
  supportsMulticlass: boolean;
  minDataSize: number;
  baseTime: number;
  memoryFactor: number;
  avgPerformance?: number;
}
