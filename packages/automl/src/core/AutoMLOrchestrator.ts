import { v4 as uuidv4 } from 'uuid';
import { ModelSelector } from './ModelSelector.js';
import {
  AutoMLJob,
  AutoMLJobConfig,
  JobStatus,
  ModelResult,
  PerformanceMetrics,
  ModelConfig,
} from './types.js';

/**
 * Main orchestrator for AutoML jobs
 */
export class AutoMLOrchestrator {
  private jobs: Map<string, AutoMLJob> = new Map();
  private modelSelector: ModelSelector;

  constructor() {
    this.modelSelector = new ModelSelector();
  }

  /**
   * Create and start a new AutoML job
   */
  async createJob(config: AutoMLJobConfig): Promise<AutoMLJob> {
    const job: AutoMLJob = {
      id: config.id,
      config,
      status: JobStatus.PENDING,
      progress: 0,
      modelsEvaluated: 0,
      logs: [],
      startTime: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);

    // Start job execution asynchronously
    this.executeJob(job.id).catch(error => {
      this.updateJobStatus(job.id, JobStatus.FAILED, error.message);
    });

    return job;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): AutoMLJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      return false;
    }

    job.status = JobStatus.CANCELLED;
    job.endTime = new Date().toISOString();
    return true;
  }

  /**
   * List all jobs
   */
  listJobs(): AutoMLJob[] {
    return Array.from(this.jobs.values());
  }

  // Private execution methods

  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    try {
      // Step 1: Preprocessing
      await this.runPreprocessing(job);

      // Step 2: Feature Engineering
      if (job.config.featureEngineering?.enabled) {
        await this.runFeatureEngineering(job);
      }

      // Step 3: Model Search
      await this.runModelSearch(job);

      // Step 4: Hyperparameter Tuning
      await this.runHyperparameterTuning(job);

      // Step 5: Ensemble Building
      if (job.config.ensemble?.enabled) {
        await this.runEnsembleBuilding(job);
      }

      // Mark as completed
      job.status = JobStatus.COMPLETED;
      job.progress = 100;
      job.endTime = new Date().toISOString();
      this.addLog(jobId, 'Job completed successfully');

    } catch (error) {
      this.updateJobStatus(
        jobId,
        JobStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async runPreprocessing(job: AutoMLJob): Promise<void> {
    this.updateJobStatus(job.id, JobStatus.PREPROCESSING);
    this.addLog(job.id, 'Starting data preprocessing');

    // Simulate preprocessing tasks
    const tasks = [
      'Handling missing values',
      'Encoding categorical variables',
      'Scaling numeric features',
      'Detecting and handling outliers',
      'Balancing classes (if applicable)',
    ];

    for (const task of tasks) {
      this.addLog(job.id, `- ${task}`);
      await this.simulateWork(100);
    }

    job.progress = 20;
    this.addLog(job.id, 'Preprocessing completed');
  }

  private async runFeatureEngineering(job: AutoMLJob): Promise<void> {
    this.updateJobStatus(job.id, JobStatus.FEATURE_ENGINEERING);
    this.addLog(job.id, 'Starting feature engineering');

    const tasks = [
      'Generating polynomial features',
      'Creating interaction features',
      'Extracting time-based features',
      'Calculating statistical features',
      'Selecting most important features',
    ];

    for (const task of tasks) {
      this.addLog(job.id, `- ${task}`);
      await this.simulateWork(100);
    }

    job.progress = 35;
    this.addLog(job.id, 'Feature engineering completed');
  }

  private async runModelSearch(job: AutoMLJob): Promise<void> {
    this.updateJobStatus(job.id, JobStatus.MODEL_SEARCH);
    this.addLog(job.id, 'Starting model search');

    // Get recommended algorithms
    const modelConfigs = await this.modelSelector.recommendAlgorithms(
      job.config.dataset,
      job.config,
      job.config.maxModels || 10
    );

    this.addLog(job.id, `Evaluating ${modelConfigs.length} algorithms`);

    const results: ModelResult[] = [];
    for (const modelConfig of modelConfigs) {
      this.addLog(job.id, `- Training ${modelConfig.algorithm}`);

      const result = await this.trainAndEvaluateModel(
        modelConfig,
        job.config
      );

      results.push(result);
      job.modelsEvaluated++;

      // Update best model if this one is better
      if (!job.bestModel || this.compareModels(result, job.bestModel, job.config)) {
        job.bestModel = result;
        this.addLog(
          job.id,
          `New best model: ${modelConfig.algorithm} (${job.config.optimizationMetric}: ${this.getMetricValue(result.performance, job.config.optimizationMetric)})`
        );
      }
    }

    job.allModels = results;
    job.progress = 60;
    this.addLog(job.id, `Model search completed. Best: ${job.bestModel?.modelConfig.algorithm}`);
  }

  private async runHyperparameterTuning(job: AutoMLJob): Promise<void> {
    this.updateJobStatus(job.id, JobStatus.HYPERPARAMETER_TUNING);
    this.addLog(job.id, 'Starting hyperparameter tuning for best model');

    if (!job.bestModel) {
      this.addLog(job.id, 'No best model found, skipping hyperparameter tuning');
      return;
    }

    // Simulate hyperparameter tuning
    const iterations = 10;
    for (let i = 0; i < iterations; i++) {
      this.addLog(job.id, `- Iteration ${i + 1}/${iterations}`);
      await this.simulateWork(200);

      // Simulate improved performance
      const currentMetric = this.getMetricValue(
        job.bestModel.performance,
        job.config.optimizationMetric
      );

      if (Math.random() > 0.5) {
        const improvement = Math.random() * 0.02;
        this.addLog(
          job.id,
          `  Improved ${job.config.optimizationMetric}: ${(currentMetric + improvement).toFixed(4)}`
        );
      }
    }

    job.progress = 85;
    this.addLog(job.id, 'Hyperparameter tuning completed');
  }

  private async runEnsembleBuilding(job: AutoMLJob): Promise<void> {
    this.updateJobStatus(job.id, JobStatus.ENSEMBLE_BUILDING);
    this.addLog(job.id, 'Building ensemble model');

    if (!job.allModels || job.allModels.length < 2) {
      this.addLog(job.id, 'Not enough models for ensemble, skipping');
      return;
    }

    // Take top N models for ensemble
    const topModels = job.allModels
      .sort((a, b) => {
        const aMetric = this.getMetricValue(a.performance, job.config.optimizationMetric);
        const bMetric = this.getMetricValue(b.performance, job.config.optimizationMetric);
        return job.config.optimizationDirection === 'maximize' ? bMetric - aMetric : aMetric - bMetric;
      })
      .slice(0, job.config.ensemble?.maxModels || 5);

    this.addLog(
      job.id,
      `Creating ${job.config.ensemble?.method || 'voting'} ensemble with ${topModels.length} models`
    );

    await this.simulateWork(500);

    const ensembleConfig = this.modelSelector.generateEnsembleConfig(
      topModels.map(m => m.modelConfig),
      job.config.ensemble?.method || 'voting'
    );

    const ensembleResult = await this.trainAndEvaluateModel(ensembleConfig, job.config);

    // Update best model if ensemble is better
    if (this.compareModels(ensembleResult, job.bestModel!, job.config)) {
      job.bestModel = ensembleResult;
      this.addLog(job.id, 'Ensemble model is now the best model');
    }

    job.progress = 95;
    this.addLog(job.id, 'Ensemble building completed');
  }

  private async trainAndEvaluateModel(
    modelConfig: ModelConfig,
    jobConfig: AutoMLJobConfig
  ): Promise<ModelResult> {
    // Simulate model training and evaluation
    await this.simulateWork(500);

    // Generate mock performance metrics
    const performance = this.generateMockPerformance(
      jobConfig.algorithmType,
      jobConfig.crossValidation
    );

    return {
      id: uuidv4(),
      modelConfig,
      performance,
      trainingTime: Math.random() * 100 + 10,
      timestamp: new Date().toISOString(),
    };
  }

  private generateMockPerformance(
    algorithmType: any,
    crossValidation: any
  ): PerformanceMetrics {
    const baseAccuracy = 0.7 + Math.random() * 0.25;

    return {
      accuracy: baseAccuracy,
      precision: baseAccuracy + Math.random() * 0.05,
      recall: baseAccuracy - Math.random() * 0.05,
      f1Score: baseAccuracy,
      auc: baseAccuracy + Math.random() * 0.1,
      validationMethod: crossValidation.method,
      folds: crossValidation.folds,
    };
  }

  private compareModels(
    model1: ModelResult,
    model2: ModelResult,
    config: AutoMLJobConfig
  ): boolean {
    const metric1 = this.getMetricValue(model1.performance, config.optimizationMetric);
    const metric2 = this.getMetricValue(model2.performance, config.optimizationMetric);

    return config.optimizationDirection === 'maximize'
      ? metric1 > metric2
      : metric1 < metric2;
  }

  private getMetricValue(performance: PerformanceMetrics, metricName: string): number {
    const metrics: Record<string, number | undefined> = {
      accuracy: performance.accuracy,
      precision: performance.precision,
      recall: performance.recall,
      f1Score: performance.f1Score,
      auc: performance.auc,
      rmse: performance.rmse,
      mae: performance.mae,
      r2: performance.r2,
    };

    return metrics[metricName] || 0;
  }

  private updateJobStatus(jobId: string, status: JobStatus, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    if (error) {
      job.error = error;
      job.endTime = new Date().toISOString();
    }
  }

  private addLog(jobId: string, message: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    if (!job.logs) job.logs = [];
    job.logs.push(`[${new Date().toISOString()}] ${message}`);
  }

  private async simulateWork(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
