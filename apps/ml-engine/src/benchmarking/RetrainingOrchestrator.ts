import { logger } from '../utils/logger.js';
import { TrainingPipeline, TrainingExample } from '../training/TrainingPipeline.js';
import { ModelBenchmarkingService } from './ModelBenchmarkingService.js';
import { ModelRegistry } from './ModelRegistry.js';

interface OrchestratorConfig {
  checkIntervalMs: number;
  defaultDegradationThreshold: number;
  defaultEvaluationWindow: number;
  defaultMinEvaluations: number;
  cooldownMs: number;
}

interface RetrainingRule {
  modelType: string;
  degradationThreshold: number;
  evaluationWindow: number;
  minEvaluations: number;
  cooldownMs: number;
  lastTriggeredAt?: number;
  inProgress?: boolean;
}

export class RetrainingOrchestrator {
  private readonly rules = new Map<string, RetrainingRule>();
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly benchmarking: ModelBenchmarkingService,
    private readonly modelRegistry: ModelRegistry,
    private readonly trainingPipeline: TrainingPipeline,
    private readonly config: OrchestratorConfig,
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.checkAll().catch((error) =>
        logger.error('Retraining orchestrator check failed', error),
      );
    }, this.config.checkIntervalMs);
    logger.info('Retraining orchestrator started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      logger.info('Retraining orchestrator stopped');
    }
  }

  registerModelType(
    modelType: string,
    overrides: Partial<Omit<RetrainingRule, 'modelType'>> = {},
  ): void {
    const rule: RetrainingRule = {
      modelType,
      degradationThreshold:
        overrides.degradationThreshold ?? this.config.defaultDegradationThreshold,
      evaluationWindow:
        overrides.evaluationWindow ?? this.config.defaultEvaluationWindow,
      minEvaluations:
        overrides.minEvaluations ?? this.config.defaultMinEvaluations,
      cooldownMs: overrides.cooldownMs ?? this.config.cooldownMs,
      lastTriggeredAt: overrides.lastTriggeredAt,
      inProgress: false,
    };

    this.rules.set(modelType, rule);
    logger.info('Registered model type for automated retraining', { modelType });
  }

  private async checkAll(): Promise<void> {
    for (const rule of this.rules.values()) {
      await this.evaluateRule(rule).catch((error) =>
        logger.error('Failed to evaluate retraining rule', {
          modelType: rule.modelType,
          error: error.message,
        }),
      );
    }
  }

  private async evaluateRule(rule: RetrainingRule): Promise<void> {
    if (rule.inProgress) {
      return;
    }

    const now = Date.now();
    if (rule.lastTriggeredAt && now - rule.lastTriggeredAt < rule.cooldownMs) {
      return;
    }

    const activeModel = await this.modelRegistry.getActiveModel(rule.modelType);
    if (!activeModel) {
      logger.debug('No active model for retraining rule', { modelType: rule.modelType });
      return;
    }

    const history = await this.benchmarking.getPerformanceHistory(
      activeModel.id,
      rule.evaluationWindow,
    );

    if (history.length < rule.minEvaluations) {
      logger.debug('Skipping retraining evaluation due to insufficient metrics', {
        modelType: rule.modelType,
        availableEvaluations: history.length,
      });
      return;
    }

    const baseline = history[0];
    const latest = history[history.length - 1];

    if (!baseline || !latest || baseline.f1Score === 0) {
      return;
    }

    const f1Delta = (baseline.f1Score - latest.f1Score) / baseline.f1Score;
    const accuracyDelta =
      (baseline.accuracy - latest.accuracy) / Math.max(baseline.accuracy, 1e-6);
    const degraded =
      f1Delta >= rule.degradationThreshold ||
      accuracyDelta >= rule.degradationThreshold;

    if (!degraded) {
      return;
    }

    rule.inProgress = true;
    logger.warn('Model degradation detected, triggering retraining', {
      modelType: rule.modelType,
      baselineF1: baseline.f1Score,
      latestF1: latest.f1Score,
      f1Delta,
    });

    try {
      await this.triggerRetraining(rule, activeModel.id);
      rule.lastTriggeredAt = Date.now();
    } catch (error) {
      logger.error('Automated retraining failed', error);
    } finally {
      rule.inProgress = false;
    }
  }

  private async triggerRetraining(
    rule: RetrainingRule,
    activeModelId: string,
  ): Promise<void> {
    const examples: TrainingExample[] = await this.trainingPipeline.collectTrainingData();

    if (!examples.length) {
      logger.warn('Skipping automated retraining due to lack of training data', {
        modelType: rule.modelType,
      });
      return;
    }

    const modelVersion = await this.trainingPipeline.trainModel(examples, 'random_forest');

    if (modelVersion.metrics.f1Score <= 0) {
      logger.warn('Automated retraining produced invalid metrics, skipping activation', {
        modelType: rule.modelType,
        modelVersionId: modelVersion.id,
      });
      return;
    }

    await this.trainingPipeline.activateModel(modelVersion.id);
    logger.info('Automated retraining completed successfully', {
      modelType: rule.modelType,
      modelVersionId: modelVersion.id,
      f1Score: modelVersion.metrics.f1Score,
    });
  }
}
