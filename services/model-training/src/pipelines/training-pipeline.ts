/**
 * Model Training Pipeline
 */

import { AutomatedFeatureGenerator, StandardScaler } from '@summit/feature-engineering';
import { GridSearchCV } from '@summit/predictive-models';
import type { Dataset } from '@summit/predictive-models';

export interface TrainingConfig {
  modelType: 'classification' | 'regression' | 'forecast';
  hyperparameterTuning: boolean;
  featureEngineering: boolean;
  crossValidation: number;
  testSize: number;
}

export interface TrainingResult {
  modelId: string;
  version: string;
  performance: Record<string, number>;
  bestParams?: Record<string, unknown>;
  features?: string[];
  trainedAt: Date;
}

export class TrainingPipeline {
  private config: TrainingConfig;

  constructor(config: TrainingConfig) {
    this.config = config;
  }

  /**
   * Train a model end-to-end
   */
  async train(
    data: Dataset,
    modelFactory: (params?: Record<string, unknown>) => any
  ): Promise<TrainingResult> {
    console.log('Starting training pipeline...');

    // Step 1: Feature Engineering
    let processedData = data;
    if (this.config.featureEngineering) {
      processedData = await this.engineerFeatures(data);
    }

    // Step 2: Split data
    const { train, test } = this.splitData(processedData, this.config.testSize);

    // Step 3: Hyperparameter Tuning (optional)
    let bestParams: Record<string, unknown> = {};
    if (this.config.hyperparameterTuning) {
      const tuningResult = await this.tuneHyperparameters(train, modelFactory);
      bestParams = tuningResult.bestParams;
    }

    // Step 4: Train final model
    const model = modelFactory(bestParams);
    model.fit(train);

    // Step 5: Evaluate
    const performance = model.evaluate(test);

    console.log('Training complete!', performance);

    return {
      modelId: `model_${Date.now()}`,
      version: '1.0.0',
      performance,
      bestParams,
      features: processedData.featureNames,
      trainedAt: new Date(),
    };
  }

  /**
   * Engineer features
   */
  private async engineerFeatures(data: Dataset): Promise<Dataset> {
    console.log('Engineering features...');

    const generator = new AutomatedFeatureGenerator();
    const scaler = new StandardScaler();

    // Generate polynomial features
    const polyFeatures = generator.generatePolynomialFeatures(data.features, 2);

    // Scale features
    const scaledFeatures = scaler.fitTransform(polyFeatures.features);

    return {
      features: scaledFeatures,
      labels: data.labels,
      featureNames: polyFeatures.featureNames,
    };
  }

  /**
   * Split data into train and test sets
   */
  private splitData(
    data: Dataset,
    testSize: number
  ): { train: Dataset; test: Dataset } {
    const splitIndex = Math.floor(data.features.length * (1 - testSize));

    return {
      train: {
        features: data.features.slice(0, splitIndex),
        labels: data.labels.slice(0, splitIndex),
        featureNames: data.featureNames,
      },
      test: {
        features: data.features.slice(splitIndex),
        labels: data.labels.slice(splitIndex),
        featureNames: data.featureNames,
      },
    };
  }

  /**
   * Tune hyperparameters
   */
  private async tuneHyperparameters(
    data: Dataset,
    modelFactory: (params?: Record<string, unknown>) => any
  ): Promise<{ bestParams: Record<string, unknown>; bestScore: number }> {
    console.log('Tuning hyperparameters...');

    const gridSearch = new GridSearchCV({
      nFolds: this.config.crossValidation,
      scoringMetric: this.config.modelType === 'classification' ? 'accuracy' : 'r2',
    });

    // Define parameter space (example for Random Forest)
    const parameterSpace = {
      nEstimators: [50, 100, 200],
      maxDepth: [5, 10, 20],
      minSamplesSplit: [2, 5, 10],
    };

    const result = gridSearch.search(parameterSpace, modelFactory, data);

    console.log('Best parameters:', result.bestParams);
    console.log('Best score:', result.bestScore);

    return {
      bestParams: result.bestParams,
      bestScore: result.bestScore,
    };
  }
}
