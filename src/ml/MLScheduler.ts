import { EventEmitter } from 'events';
import { promises as fs } from 'fs';

export interface MLModelFeatures {
  targetCount: number;
  changedPaths: string[];
  historicalDAG: DAGStructure;
  timeOfDay: number;
  dayOfWeek: number;
  lastBuildDuration: number;
  cacheHitRate: number;
  targetType: 'lib' | 'bin' | 'test' | 'doc';
  dependencyDepth: number;
  recentFailureRate: number;
}

export interface DAGStructure {
  nodes: number;
  edges: number;
  maxDepth: number;
  criticalPathLength: number;
  parallelism: number;
}

export interface TaskPrediction {
  targetId: string;
  probability: number;
  confidence: number;
  estimatedDuration: number;
  resourceRequirements: ResourceHint;
  suggestedConcurrency: number;
  prefetchHints: string[];
  reasoning: string;
}

export interface ResourceHint {
  cpu: number;
  memory: number;
  disk: number;
  network: boolean;
  gpu?: boolean;
}

export interface SpeculationResult {
  taskId: string;
  predicted: boolean;
  started: Date;
  completed?: Date;
  cancelled?: Date;
  hit: boolean;
  wastedCompute: number;
  savings: number;
}

export interface TrainingData {
  buildId: string;
  timestamp: Date;
  features: MLModelFeatures;
  actualTargets: string[];
  actualDurations: { [targetId: string]: number };
  success: boolean;
  cacheHits: string[];
  cacheMisses: string[];
}

export interface MLModel {
  id: string;
  version: string;
  trainedAt: Date;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  featureImportance: { [feature: string]: number };
  hyperparameters: { [key: string]: any };
}

export class MLScheduler extends EventEmitter {
  private model: MLModel | null = null;
  private trainingData: TrainingData[] = [];
  private speculationResults: Map<string, SpeculationResult> = new Map();
  private runningSpeculations: Map<string, NodeJS.Timeout> = new Map();
  private modelPath: string;

  constructor(modelPath = './models/ml-scheduler-v1.json') {
    super();
    this.modelPath = modelPath;
    this.loadModel();
    this.startPerformanceMonitoring();
  }

  async predictNextTasks(features: MLModelFeatures): Promise<TaskPrediction[]> {
    if (!this.model) {
      this.emit('warning', 'No ML model loaded, falling back to heuristics');
      return this.fallbackHeuristics(features);
    }

    const predictions: TaskPrediction[] = [];

    // Simulate ML inference (in production, this would call the actual model)
    const baseScore = this.calculateBaseScore(features);
    const candidates = await this.generateCandidateTargets(features);

    for (const candidate of candidates) {
      const probability = this.predictTargetProbability(features, candidate);
      const confidence = this.calculateConfidence(features, candidate);

      if (probability > 0.3) {
        // Minimum threshold for speculation
        predictions.push({
          targetId: candidate.targetId,
          probability,
          confidence,
          estimatedDuration: this.predictDuration(features, candidate),
          resourceRequirements: this.predictResources(candidate),
          suggestedConcurrency: this.calculateOptimalConcurrency(
            features,
            candidate,
          ),
          prefetchHints: this.generatePrefetchHints(candidate),
          reasoning: this.generateReasoning(features, candidate, probability),
        });
      }
    }

    // Sort by probability * confidence score
    predictions.sort(
      (a, b) => b.probability * b.confidence - a.probability * a.confidence,
    );

    this.emit('predictions-generated', {
      features,
      predictions: predictions.slice(0, 10), // Top 10 predictions
      modelVersion: this.model.version,
    });

    return predictions.slice(0, 10);
  }

  async startSpeculativeExecution(
    predictions: TaskPrediction[],
  ): Promise<void> {
    this.emit('speculation-start', { predictions: predictions.length });

    for (const prediction of predictions) {
      if (this.runningSpeculations.size >= 5) {
        // Max concurrent speculations
        break;
      }

      if (prediction.probability > 0.65) {
        // High confidence threshold
        await this.launchSpeculativeTask(prediction);
      }
    }
  }

  private async launchSpeculativeTask(
    prediction: TaskPrediction,
  ): Promise<void> {
    const speculationId = `spec-${prediction.targetId}-${Date.now()}`;

    const speculation: SpeculationResult = {
      taskId: prediction.targetId,
      predicted: true,
      started: new Date(),
      hit: false,
      wastedCompute: 0,
      savings: 0,
    };

    this.speculationResults.set(speculationId, speculation);

    this.emit('speculation-launched', {
      speculationId,
      targetId: prediction.targetId,
      probability: prediction.probability,
    });

    // Simulate speculative task execution
    const timeout = setTimeout(async () => {
      try {
        await this.executeSpeculativeTask(prediction);
        speculation.completed = new Date();
        speculation.hit = true;
        speculation.savings = this.calculateSavings(prediction);

        this.emit('speculation-completed', {
          speculationId,
          savings: speculation.savings,
        });
      } catch (error) {
        speculation.cancelled = new Date();
        speculation.wastedCompute = this.calculateWaste(prediction);

        this.emit('speculation-failed', {
          speculationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        this.runningSpeculations.delete(speculationId);
      }
    }, prediction.estimatedDuration * 1000);

    this.runningSpeculations.set(speculationId, timeout);
  }

  async cancelSpeculativeTask(
    speculationId: string,
    reason = 'misprediction',
  ): Promise<boolean> {
    const timeout = this.runningSpeculations.get(speculationId);
    const speculation = this.speculationResults.get(speculationId);

    if (!timeout || !speculation) {
      return false;
    }

    clearTimeout(timeout);
    this.runningSpeculations.delete(speculationId);

    speculation.cancelled = new Date();
    speculation.wastedCompute = this.calculateCancellationWaste(speculation);

    this.emit('speculation-cancelled', {
      speculationId,
      reason,
      wastedCompute: speculation.wastedCompute,
    });

    return true;
  }

  async recordBuildResult(
    buildId: string,
    features: MLModelFeatures,
    actualTargets: string[],
    result: any,
  ): Promise<void> {
    const trainingRecord: TrainingData = {
      buildId,
      timestamp: new Date(),
      features,
      actualTargets,
      actualDurations: result.durations || {},
      success: result.success || false,
      cacheHits: result.cacheHits || [],
      cacheMisses: result.cacheMisses || [],
    };

    this.trainingData.push(trainingRecord);

    // Keep only last 1000 records for memory efficiency
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000);
    }

    // Update speculation hit/miss tracking
    await this.updateSpeculationAccuracy(actualTargets);

    this.emit('training-data-recorded', {
      buildId,
      features: Object.keys(features).length,
    });
  }

  async retrainModel(): Promise<MLModel> {
    if (this.trainingData.length < 50) {
      throw new Error('Insufficient training data for model retraining');
    }

    this.emit('retraining-start', { samples: this.trainingData.length });

    // Simulate model training (in production, this would call ML training pipeline)
    const newModel: MLModel = {
      id: `ml-scheduler-${Date.now()}`,
      version: `v${Math.floor(Date.now() / 1000)}`,
      trainedAt: new Date(),
      accuracy: this.simulateTrainingMetric(0.75, 0.95),
      precision: this.simulateTrainingMetric(0.7, 0.9),
      recall: this.simulateTrainingMetric(0.65, 0.85),
      f1Score: 0.0, // Will be calculated
      featureImportance: this.calculateFeatureImportance(),
      hyperparameters: {
        learningRate: 0.001,
        hiddenLayers: [128, 64, 32],
        dropout: 0.2,
        epochs: 100,
        batchSize: 32,
      },
    };

    newModel.f1Score =
      (2 * newModel.precision * newModel.recall) /
      (newModel.precision + newModel.recall);

    // Model validation
    const validationAccuracy = await this.validateModel(newModel);
    if (validationAccuracy < 0.6) {
      throw new Error(
        `Model validation failed: accuracy ${validationAccuracy} below threshold`,
      );
    }

    this.model = newModel;
    await this.saveModel(newModel);

    this.emit('retraining-complete', {
      version: newModel.version,
      accuracy: newModel.accuracy,
      improvement: this.model ? newModel.accuracy - this.model.accuracy : 0,
    });

    return newModel;
  }

  getSpeculationMetrics(): {
    totalSpeculations: number;
    hitRate: number;
    wastedCompute: number;
    totalSavings: number;
    avgSpeculationTime: number;
  } {
    const results = Array.from(this.speculationResults.values());
    const completed = results.filter((r) => r.hit);
    const cancelled = results.filter((r) => r.cancelled);

    const totalWasted = cancelled.reduce((sum, r) => sum + r.wastedCompute, 0);
    const totalSavings = completed.reduce((sum, r) => sum + r.savings, 0);

    const avgTime =
      results.length > 0
        ? results.reduce((sum, r) => {
            const endTime = r.completed || r.cancelled || new Date();
            return sum + (endTime.getTime() - r.started.getTime());
          }, 0) /
          results.length /
          1000
        : 0;

    return {
      totalSpeculations: results.length,
      hitRate: results.length > 0 ? completed.length / results.length : 0,
      wastedCompute: totalWasted,
      totalSavings,
      avgSpeculationTime: avgTime,
    };
  }

  private calculateBaseScore(features: MLModelFeatures): number {
    let score = 0.5; // Base probability

    // Time-based patterns
    if (features.timeOfDay >= 9 && features.timeOfDay <= 17) score += 0.1; // Business hours
    if (features.dayOfWeek >= 1 && features.dayOfWeek <= 5) score += 0.1; // Weekdays

    // Historical patterns
    if (features.cacheHitRate > 0.7) score += 0.15;
    if (features.recentFailureRate < 0.1) score += 0.1;

    // Build complexity
    if (features.targetCount < 50) score += 0.1; // Smaller builds more predictable
    if (features.dependencyDepth < 5) score += 0.05;

    return Math.min(1.0, Math.max(0.0, score));
  }

  private async generateCandidateTargets(
    features: MLModelFeatures,
  ): Promise<{ targetId: string; type: string; priority: number }[]> {
    const candidates = [];

    // Generate candidates based on changed paths
    for (const path of features.changedPaths) {
      const targetType = this.inferTargetType(path);
      candidates.push({
        targetId: `target-${path.replace(/[^a-zA-Z0-9]/g, '-')}`,
        type: targetType,
        priority:
          targetType === 'test' ? 0.8 : targetType === 'lib' ? 0.9 : 0.7,
      });
    }

    // Add common targets based on historical patterns
    const commonTargets = [
      '//core:lib',
      '//utils:lib',
      '//tests:unit',
      '//integration:test',
    ];
    for (const target of commonTargets) {
      candidates.push({
        targetId: target,
        type: this.inferTargetType(target),
        priority: 0.6,
      });
    }

    return candidates.slice(0, 20); // Limit candidates
  }

  private predictTargetProbability(
    features: MLModelFeatures,
    candidate: any,
  ): number {
    let probability = 0.3; // Base probability

    // Boost probability based on candidate priority
    probability *= candidate.priority;

    // Time-based adjustments
    if (features.timeOfDay >= 9 && features.timeOfDay <= 17) probability *= 1.2;

    // Historical success rate
    if (features.recentFailureRate < 0.05) probability *= 1.3;

    // Cache effectiveness
    if (features.cacheHitRate > 0.8) probability *= 1.1;

    // Target type adjustments
    if (
      candidate.type === 'test' &&
      features.changedPaths.some((p) => p.includes('test'))
    ) {
      probability *= 1.4;
    }

    return Math.min(0.95, Math.max(0.0, probability));
  }

  private calculateConfidence(
    features: MLModelFeatures,
    candidate: any,
  ): number {
    let confidence = 0.7; // Base confidence

    // Model-based confidence (simulated)
    if (this.model) {
      confidence = Math.max(0.5, this.model.accuracy * 0.8);
    }

    // Adjust based on data quality
    if (features.changedPaths.length > 0) confidence *= 1.1;
    if (features.lastBuildDuration > 0) confidence *= 1.05;

    return Math.min(1.0, confidence);
  }

  private predictDuration(features: MLModelFeatures, candidate: any): number {
    let baseDuration = 60; // 60 seconds default

    // Adjust based on target type
    switch (candidate.type) {
      case 'test':
        baseDuration *= 2;
        break;
      case 'lib':
        baseDuration *= 0.7;
        break;
      case 'bin':
        baseDuration *= 1.5;
        break;
    }

    // Adjust based on historical data
    if (features.lastBuildDuration > 0) {
      baseDuration = features.lastBuildDuration * 0.3; // Assume individual targets take less time
    }

    return Math.max(10, Math.min(600, baseDuration)); // 10s to 10min range
  }

  private predictResources(candidate: any): ResourceHint {
    const baseResources: ResourceHint = {
      cpu: 1,
      memory: 512,
      disk: 100,
      network: false,
    };

    // Adjust based on target type
    switch (candidate.type) {
      case 'test':
        baseResources.cpu = 2;
        baseResources.memory = 1024;
        baseResources.network = true;
        break;
      case 'bin':
        baseResources.cpu = 4;
        baseResources.memory = 2048;
        baseResources.disk = 500;
        break;
      case 'doc':
        baseResources.cpu = 1;
        baseResources.memory = 256;
        break;
    }

    return baseResources;
  }

  private calculateOptimalConcurrency(
    features: MLModelFeatures,
    candidate: any,
  ): number {
    let concurrency = 1;

    // Base on available parallelism
    if (features.historicalDAG.parallelism > 1) {
      concurrency = Math.min(
        4,
        Math.floor(features.historicalDAG.parallelism * 0.5),
      );
    }

    // Adjust for target type
    if (candidate.type === 'test') concurrency = Math.min(8, concurrency * 2);

    return Math.max(1, concurrency);
  }

  private generatePrefetchHints(candidate: any): string[] {
    const hints = [];

    // Common dependencies based on target type
    if (candidate.type === 'test') {
      hints.push('test-framework', 'test-data', 'mock-dependencies');
    } else if (candidate.type === 'lib') {
      hints.push('runtime-deps', 'compile-tools');
    }

    hints.push('base-image', 'toolchain');

    return hints;
  }

  private generateReasoning(
    features: MLModelFeatures,
    candidate: any,
    probability: number,
  ): string {
    const reasons = [];

    if (features.changedPaths.some((p) => p.includes(candidate.type))) {
      reasons.push(`changed paths indicate ${candidate.type} modifications`);
    }

    if (features.recentFailureRate < 0.1) {
      reasons.push('low recent failure rate suggests stable targets');
    }

    if (features.cacheHitRate > 0.7) {
      reasons.push('high cache hit rate indicates predictable build patterns');
    }

    if (probability > 0.7) {
      reasons.push('high probability due to strong historical patterns');
    }

    return reasons.join('; ');
  }

  private async executeSpeculativeTask(
    prediction: TaskPrediction,
  ): Promise<void> {
    // Simulate task execution
    const duration = prediction.estimatedDuration * (0.8 + Math.random() * 0.4); // ±20% variance
    await new Promise((resolve) => setTimeout(resolve, duration * 1000));

    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error('Speculative task failed');
    }
  }

  private calculateSavings(prediction: TaskPrediction): number {
    // Estimate savings based on not having to run this later
    return (
      prediction.estimatedDuration * prediction.resourceRequirements.cpu * 0.1
    ); // $0.1 per CPU-second
  }

  private calculateWaste(prediction: TaskPrediction): number {
    // Calculate wasted compute for failed speculation
    return (
      prediction.estimatedDuration * prediction.resourceRequirements.cpu * 0.05
    );
  }

  private calculateCancellationWaste(speculation: SpeculationResult): number {
    const duration = speculation.cancelled
      ? (speculation.cancelled.getTime() - speculation.started.getTime()) / 1000
      : 0;
    return duration * 0.05; // Simplified waste calculation
  }

  private async updateSpeculationAccuracy(
    actualTargets: string[],
  ): Promise<void> {
    const recentSpeculations = Array.from(
      this.speculationResults.values(),
    ).filter((s) => s.started > new Date(Date.now() - 60000)); // Last minute

    for (const speculation of recentSpeculations) {
      if (actualTargets.includes(speculation.taskId)) {
        speculation.hit = true;
        speculation.savings = this.calculateRetrospectiveSavings(speculation);
      }
    }
  }

  private calculateRetrospectiveSavings(
    speculation: SpeculationResult,
  ): number {
    // Calculate actual savings from successful speculation
    const speculationTime = speculation.completed
      ? (speculation.completed.getTime() - speculation.started.getTime()) / 1000
      : 0;
    return speculationTime * 0.1; // Simplified savings calculation
  }

  private fallbackHeuristics(features: MLModelFeatures): TaskPrediction[] {
    const predictions: TaskPrediction[] = [];

    // Simple heuristics when no ML model available
    if (features.changedPaths.some((p) => p.includes('test'))) {
      predictions.push({
        targetId: '//tests:all',
        probability: 0.8,
        confidence: 0.6,
        estimatedDuration: 120,
        resourceRequirements: {
          cpu: 2,
          memory: 1024,
          disk: 200,
          network: true,
        },
        suggestedConcurrency: 4,
        prefetchHints: ['test-framework'],
        reasoning: 'test files changed, likely to run tests',
      });
    }

    return predictions;
  }

  private simulateTrainingMetric(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private calculateFeatureImportance(): { [feature: string]: number } {
    return {
      changedPaths: 0.25,
      timeOfDay: 0.15,
      cacheHitRate: 0.2,
      recentFailureRate: 0.15,
      targetType: 0.1,
      historicalDAG: 0.1,
      dependencyDepth: 0.05,
    };
  }

  private async validateModel(model: MLModel): Promise<number> {
    // Simulate model validation
    return model.accuracy * (0.9 + Math.random() * 0.1);
  }

  private async loadModel(): Promise<void> {
    try {
      const modelData = await fs.readFile(this.modelPath, 'utf8');
      this.model = JSON.parse(modelData);
      this.emit('model-loaded', { version: this.model?.version });
    } catch (error) {
      this.emit('warning', 'Could not load ML model, using heuristics');
    }
  }

  private async saveModel(model: MLModel): Promise<void> {
    try {
      await fs.writeFile(this.modelPath, JSON.stringify(model, null, 2));
      this.emit('model-saved', { version: model.version });
    } catch (error) {
      this.emit(
        'error',
        `Failed to save model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private inferTargetType(path: string): string {
    if (path.includes('test')) return 'test';
    if (path.includes('lib') || path.includes('src')) return 'lib';
    if (path.includes('bin') || path.includes('main')) return 'bin';
    if (path.includes('doc')) return 'doc';
    return 'unknown';
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      const metrics = this.getSpeculationMetrics();
      this.emit('performance-metrics', metrics);

      // Auto-retrain if performance degrades
      if (metrics.hitRate < 0.5 && metrics.totalSpeculations > 20) {
        this.emit('performance-degraded', metrics);
        this.retrainModel().catch((error) => {
          this.emit(
            'retrain-failed',
            error instanceof Error ? error.message : 'Unknown error',
          );
        });
      }
    }, 300000); // Every 5 minutes
  }
}
