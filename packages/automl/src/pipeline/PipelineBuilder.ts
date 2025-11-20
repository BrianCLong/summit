import { v4 as uuidv4 } from 'uuid';
import { Pipeline } from '../core/types';

/**
 * Builder for creating AutoML pipelines
 */
export class PipelineBuilder {
  private _pipeline: Pipeline;

  constructor(name: string) {
    this._pipeline = {
      id: uuidv4(),
      name,
      steps: [],
      status: 'pending' as any,
    };
  }

  /**
   * Add preprocessing step
   */
  addPreprocessing(config: {
    scaling?: 'standard' | 'minmax' | 'robust';
    encoding?: 'onehot' | 'label' | 'target';
    imputation?: 'mean' | 'median' | 'mode' | 'knn';
    outlierHandling?: 'remove' | 'clip' | 'transform';
  }): this {
    this._pipeline.steps.push({
      id: uuidv4(),
      name: 'Preprocessing',
      type: 'preprocessing',
      config,
      status: 'pending',
    });
    return this;
  }

  /**
   * Add feature engineering step
   */
  addFeatureEngineering(config: {
    polynomialDegree?: number;
    interactions?: boolean;
    timeBased?: boolean;
    statistical?: boolean;
    domainSpecific?: Record<string, any>;
  }): this {
    this._pipeline.steps.push({
      id: uuidv4(),
      name: 'Feature Engineering',
      type: 'feature_engineering',
      config,
      status: 'pending',
    });
    return this;
  }

  /**
   * Add model training step
   */
  addModelTraining(config: {
    algorithm: string;
    hyperparameters: Record<string, any>;
    crossValidation: {
      method: string;
      folds: number;
    };
  }): this {
    this._pipeline.steps.push({
      id: uuidv4(),
      name: `Train ${config.algorithm}`,
      type: 'model_training',
      config,
      status: 'pending',
    });
    return this;
  }

  /**
   * Add ensemble step
   */
  addEnsemble(config: {
    method: 'voting' | 'stacking' | 'boosting' | 'bagging';
    models: string[];
    weights?: number[];
  }): this {
    this._pipeline.steps.push({
      id: uuidv4(),
      name: `Ensemble (${config.method})`,
      type: 'ensemble',
      config,
      status: 'pending',
    });
    return this;
  }

  /**
   * Add deployment step
   */
  addDeployment(config: {
    target: 'rest_api' | 'batch' | 'streaming' | 'edge';
    scaling?: {
      minInstances: number;
      maxInstances: number;
    };
    monitoring?: boolean;
  }): this {
    this._pipeline.steps.push({
      id: uuidv4(),
      name: `Deploy to ${config.target}`,
      type: 'deployment',
      config,
      status: 'pending',
    });
    return this;
  }

  /**
   * Build and return the pipeline
   */
  build(): Pipeline {
    return { ...this._pipeline };
  }

  /**
   * Validate pipeline configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this._pipeline.steps.length === 0) {
      errors.push('Pipeline must have at least one step');
    }

    const hasModelTraining = this._pipeline.steps.some(
      step => step.type === 'model_training'
    );

    if (!hasModelTraining) {
      errors.push('Pipeline must include at least one model training step');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clone an existing pipeline
   */
  static clone(pipeline: Pipeline): Pipeline {
    return {
      ...pipeline,
      id: uuidv4(),
      steps: pipeline.steps.map(step => ({
        ...step,
        id: uuidv4(),
        status: 'pending',
        result: undefined,
        error: undefined,
      })),
    };
  }

  /**
   * Create pipeline from template
   */
  static fromTemplate(
    template: 'quick' | 'standard' | 'thorough' | 'custom',
    algorithmType: string
  ): PipelineBuilder {
    const builder = new PipelineBuilder(`${template}_${algorithmType}_pipeline`);

    switch (template) {
      case 'quick':
        builder
          .addPreprocessing({
            scaling: 'standard',
            encoding: 'onehot',
            imputation: 'mean',
          })
          .addModelTraining({
            algorithm: 'random_forest',
            hyperparameters: { n_estimators: 50 },
            crossValidation: { method: 'kfold', folds: 3 },
          });
        break;

      case 'standard':
        builder
          .addPreprocessing({
            scaling: 'standard',
            encoding: 'onehot',
            imputation: 'mean',
            outlierHandling: 'clip',
          })
          .addFeatureEngineering({
            interactions: true,
            statistical: true,
          })
          .addModelTraining({
            algorithm: 'xgboost',
            hyperparameters: { n_estimators: 100, max_depth: 6 },
            crossValidation: { method: 'stratified', folds: 5 },
          });
        break;

      case 'thorough':
        builder
          .addPreprocessing({
            scaling: 'robust',
            encoding: 'target',
            imputation: 'knn',
            outlierHandling: 'transform',
          })
          .addFeatureEngineering({
            polynomialDegree: 2,
            interactions: true,
            timeBased: true,
            statistical: true,
          })
          .addModelTraining({
            algorithm: 'xgboost',
            hyperparameters: { n_estimators: 200, max_depth: 8 },
            crossValidation: { method: 'stratified', folds: 10 },
          })
          .addEnsemble({
            method: 'stacking',
            models: ['xgboost', 'lightgbm', 'random_forest'],
          });
        break;
    }

    return builder;
  }
}
