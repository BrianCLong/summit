"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrainingOrchestrator = void 0;
const logger_js_1 = require("../utils/logger.js");
class RetrainingOrchestrator {
    benchmarking;
    modelRegistry;
    trainingPipeline;
    config;
    rules = new Map();
    timer;
    constructor(benchmarking, modelRegistry, trainingPipeline, config) {
        this.benchmarking = benchmarking;
        this.modelRegistry = modelRegistry;
        this.trainingPipeline = trainingPipeline;
        this.config = config;
    }
    start() {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            this.checkAll().catch((error) => logger_js_1.logger.error('Retraining orchestrator check failed', error));
        }, this.config.checkIntervalMs);
        logger_js_1.logger.info('Retraining orchestrator started');
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
            logger_js_1.logger.info('Retraining orchestrator stopped');
        }
    }
    registerModelType(modelType, overrides = {}) {
        const rule = {
            modelType,
            degradationThreshold: overrides.degradationThreshold ?? this.config.defaultDegradationThreshold,
            evaluationWindow: overrides.evaluationWindow ?? this.config.defaultEvaluationWindow,
            minEvaluations: overrides.minEvaluations ?? this.config.defaultMinEvaluations,
            cooldownMs: overrides.cooldownMs ?? this.config.cooldownMs,
            lastTriggeredAt: overrides.lastTriggeredAt,
            inProgress: false,
        };
        this.rules.set(modelType, rule);
        logger_js_1.logger.info('Registered model type for automated retraining', { modelType });
    }
    async checkAll() {
        for (const rule of this.rules.values()) {
            await this.evaluateRule(rule).catch((error) => logger_js_1.logger.error('Failed to evaluate retraining rule', {
                modelType: rule.modelType,
                error: error.message,
            }));
        }
    }
    async evaluateRule(rule) {
        if (rule.inProgress) {
            return;
        }
        const now = Date.now();
        if (rule.lastTriggeredAt && now - rule.lastTriggeredAt < rule.cooldownMs) {
            return;
        }
        const activeModel = await this.modelRegistry.getActiveModel(rule.modelType);
        if (!activeModel) {
            logger_js_1.logger.debug('No active model for retraining rule', { modelType: rule.modelType });
            return;
        }
        const history = await this.benchmarking.getPerformanceHistory(activeModel.id, rule.evaluationWindow);
        if (history.length < rule.minEvaluations) {
            logger_js_1.logger.debug('Skipping retraining evaluation due to insufficient metrics', {
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
        const accuracyDelta = (baseline.accuracy - latest.accuracy) / Math.max(baseline.accuracy, 1e-6);
        const degraded = f1Delta >= rule.degradationThreshold ||
            accuracyDelta >= rule.degradationThreshold;
        if (!degraded) {
            return;
        }
        rule.inProgress = true;
        logger_js_1.logger.warn('Model degradation detected, triggering retraining', {
            modelType: rule.modelType,
            baselineF1: baseline.f1Score,
            latestF1: latest.f1Score,
            f1Delta,
        });
        try {
            await this.triggerRetraining(rule, activeModel.id);
            rule.lastTriggeredAt = Date.now();
        }
        catch (error) {
            logger_js_1.logger.error('Automated retraining failed', error);
        }
        finally {
            rule.inProgress = false;
        }
    }
    async triggerRetraining(rule, activeModelId) {
        const examples = await this.trainingPipeline.collectTrainingData();
        if (!examples.length) {
            logger_js_1.logger.warn('Skipping automated retraining due to lack of training data', {
                modelType: rule.modelType,
            });
            return;
        }
        const modelVersion = await this.trainingPipeline.trainModel(examples, 'random_forest');
        if (modelVersion.metrics.f1Score <= 0) {
            logger_js_1.logger.warn('Automated retraining produced invalid metrics, skipping activation', {
                modelType: rule.modelType,
                modelVersionId: modelVersion.id,
            });
            return;
        }
        await this.trainingPipeline.activateModel(modelVersion.id);
        logger_js_1.logger.info('Automated retraining completed successfully', {
            modelType: rule.modelType,
            modelVersionId: modelVersion.id,
            f1Score: modelVersion.metrics.f1Score,
        });
    }
}
exports.RetrainingOrchestrator = RetrainingOrchestrator;
