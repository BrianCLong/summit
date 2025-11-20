import { v4 as uuidv4 } from 'uuid';
import {
  OptimizationStudy,
  OptimizationConfig,
  TrialResult,
  Optimizer,
} from './types.js';
import { BayesianOptimizer } from './optimizers/BayesianOptimizer.js';
import { RandomSearchOptimizer } from './optimizers/RandomSearch.js';
import { GridSearchOptimizer } from './optimizers/GridSearch.js';
import { GeneticAlgorithmOptimizer } from './optimizers/GeneticAlgorithm.js';

/**
 * Study manager for hyperparameter optimization
 */
export class StudyManager {
  private studies: Map<string, OptimizationStudy> = new Map();
  private optimizers: Map<string, Optimizer> = new Map();

  constructor() {
    this.registerDefaultOptimizers();
  }

  /**
   * Create a new optimization study
   */
  createStudy(
    name: string,
    config: OptimizationConfig,
    optimizerType: 'bayesian' | 'random' | 'grid' | 'genetic' = 'bayesian'
  ): OptimizationStudy {
    const study: OptimizationStudy = {
      id: uuidv4(),
      name,
      config,
      trials: [],
      status: 'running',
      startTime: new Date().toISOString(),
    };

    this.studies.set(study.id, study);

    // Set optimizer for this study
    const optimizer = this.getOptimizer(optimizerType);
    this.optimizers.set(study.id, optimizer);

    return study;
  }

  /**
   * Suggest next hyperparameter configuration
   */
  async suggest(studyId: string): Promise<Record<string, any>> {
    const study = this.studies.get(studyId);
    if (!study) {
      throw new Error(`Study ${studyId} not found`);
    }

    const optimizer = this.optimizers.get(studyId);
    if (!optimizer) {
      throw new Error(`No optimizer found for study ${studyId}`);
    }

    return optimizer.suggest(study);
  }

  /**
   * Report trial result
   */
  reportTrial(
    studyId: string,
    parameters: Record<string, any>,
    metrics: Record<string, number>,
    status: 'completed' | 'failed' | 'pruned' = 'completed'
  ): TrialResult {
    const study = this.studies.get(studyId);
    if (!study) {
      throw new Error(`Study ${studyId} not found`);
    }

    const score = metrics[study.config.metric];
    if (score === undefined) {
      throw new Error(`Metric ${study.config.metric} not found in metrics`);
    }

    const trial: TrialResult = {
      id: uuidv4(),
      parameters,
      metrics,
      score,
      status,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
    };

    study.trials.push(trial);

    // Update best trial
    if (status === 'completed') {
      if (!study.bestTrial || this.isBetter(trial, study.bestTrial, study.config.objective)) {
        study.bestTrial = trial;
      }
    }

    // Update optimizer
    const optimizer = this.optimizers.get(studyId);
    if (optimizer) {
      optimizer.update(study, trial);
    }

    // Check stopping conditions
    this.checkStoppingConditions(study);

    return trial;
  }

  /**
   * Get study by ID
   */
  getStudy(studyId: string): OptimizationStudy | undefined {
    return this.studies.get(studyId);
  }

  /**
   * List all studies
   */
  listStudies(filters?: {
    status?: string;
    nameContains?: string;
  }): OptimizationStudy[] {
    let studies = Array.from(this.studies.values());

    if (filters?.status) {
      studies = studies.filter(s => s.status === filters.status);
    }

    if (filters?.nameContains) {
      studies = studies.filter(s =>
        s.name.toLowerCase().includes(filters.nameContains!.toLowerCase())
      );
    }

    return studies;
  }

  /**
   * Get optimization history
   */
  getHistory(studyId: string): {
    iterations: number[];
    scores: number[];
    bestScores: number[];
  } {
    const study = this.studies.get(studyId);
    if (!study) {
      throw new Error(`Study ${studyId} not found`);
    }

    const completedTrials = study.trials.filter(t => t.status === 'completed');

    const iterations = completedTrials.map((_, i) => i + 1);
    const scores = completedTrials.map(t => t.score);

    const bestScores: number[] = [];
    let currentBest = study.config.objective === 'maximize' ? -Infinity : Infinity;

    for (const score of scores) {
      if (study.config.objective === 'maximize') {
        currentBest = Math.max(currentBest, score);
      } else {
        currentBest = Math.min(currentBest, score);
      }
      bestScores.push(currentBest);
    }

    return { iterations, scores, bestScores };
  }

  /**
   * Get parameter importance
   */
  getParameterImportance(studyId: string): Array<{ parameter: string; importance: number }> {
    const study = this.studies.get(studyId);
    if (!study) {
      throw new Error(`Study ${studyId} not found`);
    }

    const completedTrials = study.trials.filter(t => t.status === 'completed');
    if (completedTrials.length < 10) {
      return []; // Not enough data
    }

    const importance: Record<string, number> = {};

    // Simple variance-based importance
    for (const param of study.config.searchSpace.parameters) {
      const values = completedTrials.map(t => t.parameters[param.name]);
      const scores = completedTrials.map(t => t.score);

      // Calculate correlation between parameter and score
      const correlation = this.calculateCorrelation(values, scores);
      importance[param.name] = Math.abs(correlation);
    }

    return Object.entries(importance)
      .map(([parameter, imp]) => ({ parameter, importance: imp }))
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Parallelize study
   */
  async parallelSuggest(studyId: string, n: number): Promise<Array<Record<string, any>>> {
    const suggestions: Array<Record<string, any>> = [];

    for (let i = 0; i < n; i++) {
      suggestions.push(await this.suggest(studyId));
    }

    return suggestions;
  }

  // Private helper methods

  private registerDefaultOptimizers(): void {
    // Optimizers are created per study, not registered globally
  }

  private getOptimizer(type: string): Optimizer {
    switch (type) {
      case 'bayesian':
        return new BayesianOptimizer();
      case 'random':
        return new RandomSearchOptimizer();
      case 'grid':
        return new GridSearchOptimizer();
      case 'genetic':
        return new GeneticAlgorithmOptimizer();
      default:
        throw new Error(`Unknown optimizer type: ${type}`);
    }
  }

  private isBetter(trial1: TrialResult, trial2: TrialResult, objective: string): boolean {
    return objective === 'maximize'
      ? trial1.score > trial2.score
      : trial1.score < trial2.score;
  }

  private checkStoppingConditions(study: OptimizationStudy): void {
    const completedTrials = study.trials.filter(t => t.status === 'completed');

    // Check max evaluations
    if (
      study.config.maxEvaluations &&
      completedTrials.length >= study.config.maxEvaluations
    ) {
      study.status = 'completed';
      study.endTime = new Date().toISOString();
      return;
    }

    // Check max time
    if (study.config.maxTime) {
      const elapsed = Date.now() - new Date(study.startTime).getTime();
      if (elapsed >= study.config.maxTime * 1000) {
        study.status = 'completed';
        study.endTime = new Date().toISOString();
        return;
      }
    }

    // Check early stopping
    if (study.config.earlyStoppingRounds && completedTrials.length >= study.config.earlyStoppingRounds) {
      const recentTrials = completedTrials.slice(-study.config.earlyStoppingRounds);
      const scores = recentTrials.map(t => t.score);
      const variance = this.calculateVariance(scores);

      // Stop if no improvement
      if (variance < 1e-6) {
        study.status = 'completed';
        study.endTime = new Date().toISOString();
      }
    }
  }

  private calculateCorrelation(x: any[], y: number[]): number {
    // Convert categorical/boolean to numeric if needed
    const xNumeric = x.map(val => {
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'string') return val.length; // Simple heuristic
      return val;
    });

    const n = xNumeric.length;
    const meanX = xNumeric.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = xNumeric[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return 0;

    return numerator / Math.sqrt(denomX * denomY);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}
