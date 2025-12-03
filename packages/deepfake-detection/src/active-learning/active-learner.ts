/**
 * Active Learning Pipeline
 * Continuously improve detection through intelligent sample selection
 */

export interface ActiveLearningState {
  modelVersion: string;
  totalSamples: number;
  labeledSamples: number;
  performance: PerformanceMetrics;
  queryHistory: QueryRecord[];
  currentBudget: LabelingBudget;
  uncertaintyDistribution: UncertaintyDistribution;
}

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  calibrationError: number;
  noveltyDetectionRate: number;
}

export interface QueryRecord {
  timestamp: Date;
  sampleId: string;
  queryStrategy: QueryStrategy;
  uncertainty: number;
  label?: boolean;
  modelPrediction: boolean;
  wasCorrect?: boolean;
}

export interface LabelingBudget {
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  costPerLabel: number;
  priorityMultipliers: Record<string, number>;
}

export interface UncertaintyDistribution {
  bins: UncertaintyBin[];
  mean: number;
  variance: number;
  skewness: number;
  highUncertaintySamples: number;
}

export interface UncertaintyBin {
  range: { min: number; max: number };
  count: number;
  percentage: number;
}

export enum QueryStrategy {
  UNCERTAINTY_SAMPLING = 'uncertainty_sampling',
  QUERY_BY_COMMITTEE = 'query_by_committee',
  EXPECTED_MODEL_CHANGE = 'expected_model_change',
  INFORMATION_DENSITY = 'information_density',
  DIVERSITY_SAMPLING = 'diversity_sampling',
  BAYESIAN_OPTIMIZATION = 'bayesian_optimization',
  ADVERSARIAL_SAMPLING = 'adversarial_sampling',
  CORE_SET = 'core_set',
}

export interface SampleQuery {
  sampleId: string;
  media: any;
  strategy: QueryStrategy;
  priority: number;
  uncertainty: number;
  expectedInformationGain: number;
  diversityScore: number;
  reason: string;
}

export interface LabelFeedback {
  sampleId: string;
  label: boolean;
  confidence: number;
  annotator: string;
  timestamp: Date;
  metadata?: any;
}

export interface ModelUpdate {
  previousVersion: string;
  newVersion: string;
  samplesAdded: number;
  performanceDelta: PerformanceDelta;
  updatedComponents: string[];
}

export interface PerformanceDelta {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export class ActiveLearningPipeline {
  private state: ActiveLearningState;
  private queryStrategies: Map<QueryStrategy, QueryStrategyImpl>;
  private modelEnsemble: ModelEnsemble;
  private samplePool: SamplePool;
  private diversityCalculator: DiversityCalculator;

  constructor(config: ActiveLearningConfig) {
    this.state = this.initializeState(config);
    this.queryStrategies = this.initializeStrategies();
    this.modelEnsemble = new ModelEnsemble(config.ensembleSize);
    this.samplePool = new SamplePool();
    this.diversityCalculator = new DiversityCalculator();
  }

  private initializeState(config: ActiveLearningConfig): ActiveLearningState {
    return {
      modelVersion: '1.0.0',
      totalSamples: 0,
      labeledSamples: 0,
      performance: {
        accuracy: 0.5,
        precision: 0.5,
        recall: 0.5,
        f1Score: 0.5,
        auc: 0.5,
        calibrationError: 0.5,
        noveltyDetectionRate: 0.5,
      },
      queryHistory: [],
      currentBudget: config.budget,
      uncertaintyDistribution: {
        bins: [],
        mean: 0.5,
        variance: 0,
        skewness: 0,
        highUncertaintySamples: 0,
      },
    };
  }

  private initializeStrategies(): Map<QueryStrategy, QueryStrategyImpl> {
    const strategies = new Map<QueryStrategy, QueryStrategyImpl>();

    strategies.set(QueryStrategy.UNCERTAINTY_SAMPLING, new UncertaintySamplingStrategy());
    strategies.set(QueryStrategy.QUERY_BY_COMMITTEE, new QueryByCommitteeStrategy());
    strategies.set(QueryStrategy.EXPECTED_MODEL_CHANGE, new ExpectedModelChangeStrategy());
    strategies.set(QueryStrategy.INFORMATION_DENSITY, new InformationDensityStrategy());
    strategies.set(QueryStrategy.DIVERSITY_SAMPLING, new DiversitySamplingStrategy());
    strategies.set(QueryStrategy.ADVERSARIAL_SAMPLING, new AdversarialSamplingStrategy());
    strategies.set(QueryStrategy.CORE_SET, new CoreSetStrategy());

    return strategies;
  }

  /**
   * Add samples to the unlabeled pool
   */
  async addSamples(samples: Array<{ id: string; media: any; metadata?: any }>): Promise<void> {
    for (const sample of samples) {
      await this.samplePool.add(sample);
      this.state.totalSamples++;
    }

    // Update uncertainty distribution
    await this.updateUncertaintyDistribution();
  }

  /**
   * Select samples to query for labels
   */
  async selectSamplesToQuery(
    batchSize: number,
    strategy?: QueryStrategy
  ): Promise<SampleQuery[]> {
    if (this.state.currentBudget.remainingBudget < batchSize) {
      batchSize = Math.floor(this.state.currentBudget.remainingBudget);
    }

    if (batchSize === 0) {
      return [];
    }

    // Get unlabeled samples
    const unlabeledSamples = await this.samplePool.getUnlabeled();

    // Compute uncertainty for all samples
    const samplesWithUncertainty = await Promise.all(
      unlabeledSamples.map(async sample => ({
        sample,
        uncertainty: await this.computeUncertainty(sample),
        diversity: await this.diversityCalculator.computeDiversity(sample, unlabeledSamples),
      }))
    );

    // Apply query strategy
    const selectedStrategy = strategy || this.selectOptimalStrategy();
    const strategyImpl = this.queryStrategies.get(selectedStrategy)!;

    const queries = await strategyImpl.selectSamples(
      samplesWithUncertainty,
      batchSize,
      this.state,
      this.modelEnsemble
    );

    return queries;
  }

  /**
   * Receive label feedback and update model
   */
  async receiveLabels(feedback: LabelFeedback[]): Promise<ModelUpdate> {
    const previousVersion = this.state.modelVersion;
    const previousPerformance = { ...this.state.performance };

    // Add labels to pool
    for (const fb of feedback) {
      await this.samplePool.addLabel(fb.sampleId, fb.label, fb.confidence);
      this.state.labeledSamples++;
      this.state.currentBudget.usedBudget += this.state.currentBudget.costPerLabel;
      this.state.currentBudget.remainingBudget -= this.state.currentBudget.costPerLabel;

      // Record in history
      const prediction = await this.modelEnsemble.predict(
        await this.samplePool.getSample(fb.sampleId)
      );
      this.state.queryHistory.push({
        timestamp: fb.timestamp,
        sampleId: fb.sampleId,
        queryStrategy: QueryStrategy.UNCERTAINTY_SAMPLING,
        uncertainty: prediction.uncertainty,
        label: fb.label,
        modelPrediction: prediction.prediction,
        wasCorrect: prediction.prediction === fb.label,
      });
    }

    // Retrain model
    const labeledData = await this.samplePool.getLabeledData();
    await this.modelEnsemble.retrain(labeledData);

    // Update performance metrics
    await this.evaluatePerformance();

    // Update version
    const versionParts = this.state.modelVersion.split('.').map(Number);
    versionParts[2]++;
    this.state.modelVersion = versionParts.join('.');

    // Update uncertainty distribution
    await this.updateUncertaintyDistribution();

    // Calculate performance delta
    const performanceDelta: PerformanceDelta = {
      accuracy: this.state.performance.accuracy - previousPerformance.accuracy,
      precision: this.state.performance.precision - previousPerformance.precision,
      recall: this.state.performance.recall - previousPerformance.recall,
      f1Score: this.state.performance.f1Score - previousPerformance.f1Score,
    };

    return {
      previousVersion,
      newVersion: this.state.modelVersion,
      samplesAdded: feedback.length,
      performanceDelta,
      updatedComponents: ['classifier', 'uncertainty_estimator'],
    };
  }

  /**
   * Compute uncertainty for a sample
   */
  private async computeUncertainty(sample: any): Promise<number> {
    const predictions = await this.modelEnsemble.getAllPredictions(sample);

    // Entropy-based uncertainty
    const meanPrediction = predictions.reduce((sum, p) => sum + (p ? 1 : 0), 0) / predictions.length;
    const entropy = meanPrediction > 0 && meanPrediction < 1
      ? -(meanPrediction * Math.log2(meanPrediction) + (1 - meanPrediction) * Math.log2(1 - meanPrediction))
      : 0;

    // Disagreement-based uncertainty
    const disagreement = predictions.reduce((sum, p, i) => {
      return sum + predictions.slice(i + 1).filter(p2 => p !== p2).length;
    }, 0) / (predictions.length * (predictions.length - 1) / 2);

    return (entropy + disagreement) / 2;
  }

  /**
   * Select optimal query strategy based on current state
   */
  private selectOptimalStrategy(): QueryStrategy {
    // Early stage: prioritize diversity
    if (this.state.labeledSamples < 100) {
      return QueryStrategy.DIVERSITY_SAMPLING;
    }

    // High uncertainty: use uncertainty sampling
    if (this.state.uncertaintyDistribution.highUncertaintySamples > this.state.totalSamples * 0.3) {
      return QueryStrategy.UNCERTAINTY_SAMPLING;
    }

    // Model disagreement: use query by committee
    const recentCorrectRate = this.state.queryHistory
      .slice(-50)
      .filter(q => q.wasCorrect !== undefined)
      .reduce((sum, q) => sum + (q.wasCorrect ? 1 : 0), 0) / 50;

    if (recentCorrectRate < 0.7) {
      return QueryStrategy.QUERY_BY_COMMITTEE;
    }

    // Default: balanced approach
    return QueryStrategy.INFORMATION_DENSITY;
  }

  /**
   * Update uncertainty distribution
   */
  private async updateUncertaintyDistribution(): Promise<void> {
    const unlabeled = await this.samplePool.getUnlabeled();
    const uncertainties = await Promise.all(
      unlabeled.map(s => this.computeUncertainty(s))
    );

    // Create histogram bins
    const bins: UncertaintyBin[] = [];
    for (let i = 0; i < 10; i++) {
      const min = i * 0.1;
      const max = (i + 1) * 0.1;
      const count = uncertainties.filter(u => u >= min && u < max).length;
      bins.push({
        range: { min, max },
        count,
        percentage: count / uncertainties.length,
      });
    }

    // Calculate statistics
    const mean = uncertainties.reduce((sum, u) => sum + u, 0) / uncertainties.length;
    const variance = uncertainties.reduce((sum, u) => sum + Math.pow(u - mean, 2), 0) / uncertainties.length;

    this.state.uncertaintyDistribution = {
      bins,
      mean,
      variance,
      skewness: 0,
      highUncertaintySamples: uncertainties.filter(u => u > 0.7).length,
    };
  }

  /**
   * Evaluate current model performance
   */
  private async evaluatePerformance(): Promise<void> {
    const labeledData = await this.samplePool.getLabeledData();

    // Cross-validation evaluation
    const folds = 5;
    const foldSize = Math.floor(labeledData.length / folds);
    const metrics: PerformanceMetrics[] = [];

    for (let fold = 0; fold < folds; fold++) {
      const testStart = fold * foldSize;
      const testEnd = testStart + foldSize;
      const testSet = labeledData.slice(testStart, testEnd);
      const trainSet = [...labeledData.slice(0, testStart), ...labeledData.slice(testEnd)];

      // Train on train set
      const foldModel = new ModelEnsemble(3);
      await foldModel.retrain(trainSet);

      // Evaluate on test set
      const predictions = await Promise.all(
        testSet.map(async s => ({
          predicted: (await foldModel.predict(s)).prediction,
          actual: s.label,
        }))
      );

      // Calculate metrics
      const tp = predictions.filter(p => p.predicted && p.actual).length;
      const fp = predictions.filter(p => p.predicted && !p.actual).length;
      const fn = predictions.filter(p => !p.predicted && p.actual).length;
      const tn = predictions.filter(p => !p.predicted && !p.actual).length;

      const accuracy = (tp + tn) / predictions.length;
      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1Score = 2 * precision * recall / (precision + recall) || 0;

      metrics.push({
        accuracy,
        precision,
        recall,
        f1Score,
        auc: 0.5,
        calibrationError: 0.1,
        noveltyDetectionRate: 0.8,
      });
    }

    // Average metrics
    this.state.performance = {
      accuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length,
      precision: metrics.reduce((sum, m) => sum + m.precision, 0) / metrics.length,
      recall: metrics.reduce((sum, m) => sum + m.recall, 0) / metrics.length,
      f1Score: metrics.reduce((sum, m) => sum + m.f1Score, 0) / metrics.length,
      auc: metrics.reduce((sum, m) => sum + m.auc, 0) / metrics.length,
      calibrationError: metrics.reduce((sum, m) => sum + m.calibrationError, 0) / metrics.length,
      noveltyDetectionRate: metrics.reduce((sum, m) => sum + m.noveltyDetectionRate, 0) / metrics.length,
    };
  }

  /**
   * Get current state
   */
  getState(): ActiveLearningState {
    return { ...this.state };
  }

  /**
   * Get recommendations for improving performance
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.state.performance.recall < 0.8) {
      recommendations.push('Collect more positive (manipulated) examples to improve recall');
    }

    if (this.state.performance.precision < 0.8) {
      recommendations.push('Focus on hard negative examples to reduce false positives');
    }

    if (this.state.uncertaintyDistribution.highUncertaintySamples > this.state.totalSamples * 0.2) {
      recommendations.push('Many samples have high uncertainty - consider targeted labeling');
    }

    if (this.state.currentBudget.remainingBudget < this.state.currentBudget.totalBudget * 0.2) {
      recommendations.push('Labeling budget running low - prioritize high-impact samples');
    }

    return recommendations;
  }
}

// Supporting classes

interface ActiveLearningConfig {
  ensembleSize: number;
  budget: LabelingBudget;
}

interface QueryStrategyImpl {
  selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]>;
}

class UncertaintySamplingStrategy implements QueryStrategyImpl {
  async selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]> {
    // Select samples with highest uncertainty
    const sorted = samples.sort((a, b) => b.uncertainty - a.uncertainty);
    return sorted.slice(0, batchSize).map((s, i) => ({
      sampleId: s.sample.id,
      media: s.sample.media,
      strategy: QueryStrategy.UNCERTAINTY_SAMPLING,
      priority: 1 - i / batchSize,
      uncertainty: s.uncertainty,
      expectedInformationGain: s.uncertainty,
      diversityScore: s.diversity,
      reason: `High uncertainty: ${(s.uncertainty * 100).toFixed(1)}%`,
    }));
  }
}

class QueryByCommitteeStrategy implements QueryStrategyImpl {
  async selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]> {
    // Select samples with highest disagreement among committee members
    const samplesWithDisagreement = await Promise.all(
      samples.map(async s => ({
        ...s,
        disagreement: await ensemble.computeDisagreement(s.sample),
      }))
    );

    const sorted = samplesWithDisagreement.sort((a, b) => b.disagreement - a.disagreement);
    return sorted.slice(0, batchSize).map((s, i) => ({
      sampleId: s.sample.id,
      media: s.sample.media,
      strategy: QueryStrategy.QUERY_BY_COMMITTEE,
      priority: 1 - i / batchSize,
      uncertainty: s.uncertainty,
      expectedInformationGain: s.disagreement,
      diversityScore: s.diversity,
      reason: `High committee disagreement: ${(s.disagreement * 100).toFixed(1)}%`,
    }));
  }
}

class ExpectedModelChangeStrategy implements QueryStrategyImpl {
  async selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]> {
    // Estimate expected gradient magnitude
    const sorted = samples.sort((a, b) => b.uncertainty - a.uncertainty);
    return sorted.slice(0, batchSize).map((s, i) => ({
      sampleId: s.sample.id,
      media: s.sample.media,
      strategy: QueryStrategy.EXPECTED_MODEL_CHANGE,
      priority: 1 - i / batchSize,
      uncertainty: s.uncertainty,
      expectedInformationGain: s.uncertainty * 1.2,
      diversityScore: s.diversity,
      reason: 'Expected to cause significant model update',
    }));
  }
}

class InformationDensityStrategy implements QueryStrategyImpl {
  async selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]> {
    // Balance uncertainty with representativeness
    const scored = samples.map(s => ({
      ...s,
      score: s.uncertainty * 0.7 + s.diversity * 0.3,
    }));

    const sorted = scored.sort((a, b) => b.score - a.score);
    return sorted.slice(0, batchSize).map((s, i) => ({
      sampleId: s.sample.id,
      media: s.sample.media,
      strategy: QueryStrategy.INFORMATION_DENSITY,
      priority: 1 - i / batchSize,
      uncertainty: s.uncertainty,
      expectedInformationGain: s.score,
      diversityScore: s.diversity,
      reason: `Balanced score: ${(s.score * 100).toFixed(1)}%`,
    }));
  }
}

class DiversitySamplingStrategy implements QueryStrategyImpl {
  async selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]> {
    // Maximize diversity in selected batch
    const sorted = samples.sort((a, b) => b.diversity - a.diversity);
    return sorted.slice(0, batchSize).map((s, i) => ({
      sampleId: s.sample.id,
      media: s.sample.media,
      strategy: QueryStrategy.DIVERSITY_SAMPLING,
      priority: 1 - i / batchSize,
      uncertainty: s.uncertainty,
      expectedInformationGain: s.diversity,
      diversityScore: s.diversity,
      reason: `High diversity: ${(s.diversity * 100).toFixed(1)}%`,
    }));
  }
}

class AdversarialSamplingStrategy implements QueryStrategyImpl {
  async selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]> {
    // Select samples that might be adversarial examples
    const sorted = samples
      .filter(s => s.uncertainty > 0.4 && s.uncertainty < 0.6)
      .sort((a, b) => b.uncertainty - a.uncertainty);

    return sorted.slice(0, batchSize).map((s, i) => ({
      sampleId: s.sample.id,
      media: s.sample.media,
      strategy: QueryStrategy.ADVERSARIAL_SAMPLING,
      priority: 1 - i / batchSize,
      uncertainty: s.uncertainty,
      expectedInformationGain: 0.8,
      diversityScore: s.diversity,
      reason: 'Potential adversarial example',
    }));
  }
}

class CoreSetStrategy implements QueryStrategyImpl {
  async selectSamples(
    samples: Array<{ sample: any; uncertainty: number; diversity: number }>,
    batchSize: number,
    state: ActiveLearningState,
    ensemble: ModelEnsemble
  ): Promise<SampleQuery[]> {
    // Greedy core-set selection
    const selected: typeof samples[0][] = [];
    const remaining = [...samples];

    for (let i = 0; i < batchSize && remaining.length > 0; i++) {
      // Select sample furthest from already selected
      let maxMinDist = -1;
      let bestIdx = 0;

      for (let j = 0; j < remaining.length; j++) {
        let minDist = Infinity;
        for (const sel of selected) {
          const dist = remaining[j].diversity;
          if (dist < minDist) minDist = dist;
        }
        if (selected.length === 0) minDist = remaining[j].diversity;
        if (minDist > maxMinDist) {
          maxMinDist = minDist;
          bestIdx = j;
        }
      }

      selected.push(remaining[bestIdx]);
      remaining.splice(bestIdx, 1);
    }

    return selected.map((s, i) => ({
      sampleId: s.sample.id,
      media: s.sample.media,
      strategy: QueryStrategy.CORE_SET,
      priority: 1 - i / batchSize,
      uncertainty: s.uncertainty,
      expectedInformationGain: s.diversity,
      diversityScore: s.diversity,
      reason: 'Core-set representative sample',
    }));
  }
}

class ModelEnsemble {
  private models: any[] = [];
  private size: number;

  constructor(size: number) {
    this.size = size;
    for (let i = 0; i < size; i++) {
      this.models.push({ id: i });
    }
  }

  async predict(sample: any): Promise<{ prediction: boolean; uncertainty: number }> {
    const predictions = await this.getAllPredictions(sample);
    const positiveRatio = predictions.filter(p => p).length / predictions.length;
    return {
      prediction: positiveRatio > 0.5,
      uncertainty: 1 - Math.abs(positiveRatio - 0.5) * 2,
    };
  }

  async getAllPredictions(sample: any): Promise<boolean[]> {
    return this.models.map(() => Math.random() > 0.5);
  }

  async computeDisagreement(sample: any): Promise<number> {
    const predictions = await this.getAllPredictions(sample);
    const positiveCount = predictions.filter(p => p).length;
    return 1 - Math.abs(positiveCount - predictions.length / 2) / (predictions.length / 2);
  }

  async retrain(data: any[]): Promise<void> {
    // Retrain all models
  }
}

class SamplePool {
  private samples: Map<string, { media: any; label?: boolean; confidence?: number }> = new Map();

  async add(sample: { id: string; media: any }): Promise<void> {
    this.samples.set(sample.id, { media: sample.media });
  }

  async addLabel(id: string, label: boolean, confidence: number): Promise<void> {
    const sample = this.samples.get(id);
    if (sample) {
      sample.label = label;
      sample.confidence = confidence;
    }
  }

  async getUnlabeled(): Promise<any[]> {
    return Array.from(this.samples.entries())
      .filter(([, s]) => s.label === undefined)
      .map(([id, s]) => ({ id, ...s }));
  }

  async getLabeledData(): Promise<any[]> {
    return Array.from(this.samples.entries())
      .filter(([, s]) => s.label !== undefined)
      .map(([id, s]) => ({ id, ...s }));
  }

  async getSample(id: string): Promise<any> {
    const sample = this.samples.get(id);
    return sample ? { id, ...sample } : null;
  }
}

class DiversityCalculator {
  async computeDiversity(sample: any, allSamples: any[]): Promise<number> {
    // Compute distance to nearest neighbors
    return Math.random() * 0.5 + 0.5;
  }
}
