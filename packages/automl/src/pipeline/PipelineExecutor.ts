import { Pipeline, PipelineStep, JobStatus } from '../core/types';

/**
 * Executor for running AutoML pipelines
 */
export class PipelineExecutor {
  private runningPipelines: Map<string, Pipeline> = new Map();

  /**
   * Execute a pipeline
   */
  async execute(pipeline: Pipeline): Promise<Pipeline> {
    this.runningPipelines.set(pipeline.id, pipeline);
    pipeline.status = 'pending' as JobStatus;

    try {
      for (const step of pipeline.steps) {
        await this.executeStep(step, pipeline);

        // Check if pipeline was cancelled
        if (pipeline.status === JobStatus.CANCELLED) {
          break;
        }
      }

      if (pipeline.status !== JobStatus.CANCELLED) {
        pipeline.status = JobStatus.COMPLETED;
      }
    } catch (error) {
      pipeline.status = JobStatus.FAILED;
      throw error;
    } finally {
      this.runningPipelines.delete(pipeline.id);
    }

    return pipeline;
  }

  /**
   * Cancel a running pipeline
   */
  async cancel(pipelineId: string): Promise<boolean> {
    const pipeline = this.runningPipelines.get(pipelineId);
    if (!pipeline) return false;

    pipeline.status = JobStatus.CANCELLED;
    return true;
  }

  /**
   * Get pipeline status
   */
  getStatus(pipelineId: string): Pipeline | undefined {
    return this.runningPipelines.get(pipelineId);
  }

  // Private execution methods

  private async executeStep(step: PipelineStep, pipeline: Pipeline): Promise<void> {
    step.status = 'running';

    try {
      switch (step.type) {
        case 'preprocessing':
          step.result = await this.executePreprocessing(step, pipeline);
          break;
        case 'feature_engineering':
          step.result = await this.executeFeatureEngineering(step, pipeline);
          break;
        case 'model_training':
          step.result = await this.executeModelTraining(step, pipeline);
          break;
        case 'ensemble':
          step.result = await this.executeEnsemble(step, pipeline);
          break;
        case 'deployment':
          step.result = await this.executeDeployment(step, pipeline);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      step.status = 'completed';
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async executePreprocessing(
    step: PipelineStep,
    _pipeline: Pipeline
  ): Promise<any> {
    // Simulate preprocessing
    await this.simulateWork(500);

    return {
      scaledFeatures: step.config.scaling ? ['feature1', 'feature2'] : [],
      encodedFeatures: step.config.encoding ? ['cat1', 'cat2'] : [],
      imputedValues: step.config.imputation ? 5 : 0,
      outliersHandled: step.config.outlierHandling ? 3 : 0,
    };
  }

  private async executeFeatureEngineering(
    step: PipelineStep,
    _pipeline: Pipeline
  ): Promise<any> {
    // Simulate feature engineering
    await this.simulateWork(800);

    const originalFeatures = 10;
    let newFeatures = originalFeatures;

    if (step.config.polynomialDegree) {
      newFeatures += originalFeatures * step.config.polynomialDegree;
    }

    if (step.config.interactions) {
      newFeatures += (originalFeatures * (originalFeatures - 1)) / 2;
    }

    return {
      originalFeatures,
      newFeatures,
      generatedFeatures: newFeatures - originalFeatures,
      featureNames: Array.from({ length: newFeatures }, (_, i) => `feature_${i}`),
    };
  }

  private async executeModelTraining(
    step: PipelineStep,
    _pipeline: Pipeline
  ): Promise<any> {
    // Simulate model training
    await this.simulateWork(2000);

    const baseAccuracy = 0.75 + Math.random() * 0.2;

    return {
      modelId: `model_${Date.now()}`,
      algorithm: step.config.algorithm,
      hyperparameters: step.config.hyperparameters,
      performance: {
        accuracy: baseAccuracy,
        precision: baseAccuracy + Math.random() * 0.05,
        recall: baseAccuracy - Math.random() * 0.05,
        f1Score: baseAccuracy,
        crossValidationScores: Array.from(
          { length: step.config.crossValidation.folds },
          () => baseAccuracy + (Math.random() - 0.5) * 0.1
        ),
      },
      trainingTime: 1500 + Math.random() * 1000,
    };
  }

  private async executeEnsemble(
    step: PipelineStep,
    _pipeline: Pipeline
  ): Promise<any> {
    // Simulate ensemble building
    await this.simulateWork(1500);

    return {
      ensembleId: `ensemble_${Date.now()}`,
      method: step.config.method,
      baseModels: step.config.models,
      weights: step.config.weights || step.config.models.map(() => 1 / step.config.models.length),
      performance: {
        accuracy: 0.90 + Math.random() * 0.08,
        improvement: 0.02 + Math.random() * 0.03,
      },
    };
  }

  private async executeDeployment(
    step: PipelineStep,
    _pipeline: Pipeline
  ): Promise<any> {
    // Simulate deployment
    await this.simulateWork(1000);

    return {
      deploymentId: `deploy_${Date.now()}`,
      target: step.config.target,
      endpoint: `https://api.example.com/models/${Date.now()}`,
      status: 'active',
      instances: step.config.scaling?.minInstances || 1,
      monitoring: step.config.monitoring || false,
    };
  }

  private async simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate pipeline before execution
   */
  validate(pipeline: Pipeline): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pipeline.steps || pipeline.steps.length === 0) {
      errors.push('Pipeline must have at least one step');
    }

    // Check for required step types
    const hasModelTraining = pipeline.steps.some(s => s.type === 'model_training');
    if (!hasModelTraining) {
      errors.push('Pipeline must include at least one model training step');
    }

    // Validate step order
    const stepOrder = pipeline.steps.map(s => s.type);
    if (stepOrder.includes('deployment' as any)) {
      const deployIndex = stepOrder.lastIndexOf('deployment' as any);
      if (deployIndex !== stepOrder.length - 1) {
        errors.push('Deployment step must be the last step in the pipeline');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Resume pipeline from failed step
   */
  async resume(pipeline: Pipeline, fromStepIndex: number): Promise<Pipeline> {
    if (fromStepIndex < 0 || fromStepIndex >= pipeline.steps.length) {
      throw new Error('Invalid step index');
    }

    // Reset steps from the resume point
    for (let i = fromStepIndex; i < pipeline.steps.length; i++) {
      pipeline.steps[i].status = 'pending';
      pipeline.steps[i].result = undefined;
      pipeline.steps[i].error = undefined;
    }

    // Execute remaining steps
    return this.execute(pipeline);
  }
}
