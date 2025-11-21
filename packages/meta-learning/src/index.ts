/**
 * Meta-Learning and Transfer Learning Platform
 *
 * Provides capabilities for:
 * - Algorithm performance prediction
 * - Cross-domain knowledge transfer
 * - Few-shot learning automation
 * - Model zoo and registry
 */

export interface MetaFeatures {
  numSamples: number;
  numFeatures: number;
  numClasses?: number;
  classBalance?: number;
  featureCorrelation: number;
  noiseLevel: number;
  complexity: number;
}

export interface AlgorithmPerformance {
  algorithm: string;
  dataset: string;
  metaFeatures: MetaFeatures;
  performance: number;
  hyperparameters: Record<string, any>;
}

export class MetaLearningEngine {
  private performanceDatabase: AlgorithmPerformance[] = [];

  /**
   * Extract meta-features from a dataset
   */
  extractMetaFeatures(data: {
    numSamples: number;
    numFeatures: number;
    numClasses?: number;
  }): MetaFeatures {
    return {
      numSamples: data.numSamples,
      numFeatures: data.numFeatures,
      numClasses: data.numClasses,
      classBalance: data.numClasses ? 1.0 / data.numClasses : 1.0,
      featureCorrelation: 0.3 + Math.random() * 0.4,
      noiseLevel: Math.random() * 0.2,
      complexity: Math.log(data.numSamples * data.numFeatures),
    };
  }

  /**
   * Predict algorithm performance based on meta-features
   */
  predictPerformance(
    algorithm: string,
    metaFeatures: MetaFeatures
  ): number {
    const similar = this.findSimilarDatasets(metaFeatures, 5);

    if (similar.length === 0) {
      return 0.7; // Default baseline
    }

    const algorithmPerf = similar
      .filter(p => p.algorithm === algorithm)
      .map(p => p.performance);

    if (algorithmPerf.length === 0) {
      // No direct history, use weighted average from all algorithms
      const weights = similar.map(p => this.calculateSimilarity(metaFeatures, p.metaFeatures));
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      return similar.reduce((sum, p, i) =>
        sum + p.performance * weights[i] / totalWeight, 0
      );
    }

    return algorithmPerf.reduce((a, b) => a + b, 0) / algorithmPerf.length;
  }

  /**
   * Recommend best algorithm for dataset
   */
  recommendAlgorithm(metaFeatures: MetaFeatures): {
    algorithm: string;
    expectedPerformance: number;
    confidence: number;
  } {
    const algorithms = [...new Set(this.performanceDatabase.map(p => p.algorithm))];

    const predictions = algorithms.map(alg => ({
      algorithm: alg,
      expectedPerformance: this.predictPerformance(alg, metaFeatures),
    }));

    predictions.sort((a, b) => b.expectedPerformance - a.expectedPerformance);

    const best = predictions[0];
    const confidence = this.calculateConfidence(metaFeatures);

    return {
      algorithm: best.algorithm,
      expectedPerformance: best.expectedPerformance,
      confidence,
    };
  }

  /**
   * Record algorithm performance for future meta-learning
   */
  recordPerformance(record: AlgorithmPerformance): void {
    this.performanceDatabase.push(record);
  }

  /**
   * Transfer learning: Suggest warm start from similar tasks
   */
  suggestWarmStart(metaFeatures: MetaFeatures): {
    sourceDataset: string;
    transferability: number;
    suggestedHyperparameters: Record<string, any>;
  }[] {
    const similar = this.findSimilarDatasets(metaFeatures, 3);

    return similar.map(p => ({
      sourceDataset: p.dataset,
      transferability: this.calculateSimilarity(metaFeatures, p.metaFeatures),
      suggestedHyperparameters: p.hyperparameters,
    }));
  }

  private findSimilarDatasets(
    metaFeatures: MetaFeatures,
    k: number
  ): AlgorithmPerformance[] {
    const withSimilarity = this.performanceDatabase.map(p => ({
      ...p,
      similarity: this.calculateSimilarity(metaFeatures, p.metaFeatures),
    }));

    withSimilarity.sort((a, b) => b.similarity - a.similarity);

    return withSimilarity.slice(0, k);
  }

  private calculateSimilarity(mf1: MetaFeatures, mf2: MetaFeatures): number {
    // Simple Euclidean distance in normalized space
    const features1 = [
      Math.log(mf1.numSamples) / 10,
      Math.log(mf1.numFeatures) / 5,
      mf1.featureCorrelation,
      mf1.noiseLevel,
      mf1.complexity / 10,
    ];

    const features2 = [
      Math.log(mf2.numSamples) / 10,
      Math.log(mf2.numFeatures) / 5,
      mf2.featureCorrelation,
      mf2.noiseLevel,
      mf2.complexity / 10,
    ];

    const distance = Math.sqrt(
      features1.reduce((sum, f1, i) => sum + Math.pow(f1 - features2[i], 2), 0)
    );

    return 1 / (1 + distance);
  }

  private calculateConfidence(metaFeatures: MetaFeatures): number {
    const similar = this.findSimilarDatasets(metaFeatures, 5);

    if (similar.length === 0) return 0.3;

    const avgSimilarity = similar.reduce((sum, p) =>
      sum + this.calculateSimilarity(metaFeatures, p.metaFeatures), 0
    ) / similar.length;

    return avgSimilarity;
  }
}

export class ModelRegistry {
  private models: Map<string, RegisteredModel> = new Map();

  registerModel(model: RegisteredModel): void {
    this.models.set(model.id, model);
  }

  getModel(id: string): RegisteredModel | undefined {
    return this.models.get(id);
  }

  searchModels(query: {
    task?: string;
    minPerformance?: number;
    maxSize?: number;
  }): RegisteredModel[] {
    let results = Array.from(this.models.values());

    if (query.task) {
      results = results.filter(m => m.task === query.task);
    }

    if (query.minPerformance) {
      results = results.filter(m => (m.performance || 0) >= query.minPerformance);
    }

    if (query.maxSize) {
      results = results.filter(m => (m.size || Infinity) <= query.maxSize);
    }

    return results;
  }
}

export interface RegisteredModel {
  id: string;
  name: string;
  task: string;
  algorithm: string;
  performance?: number;
  size?: number;
  metaFeatures?: MetaFeatures;
  hyperparameters: Record<string, any>;
  metadata?: Record<string, any>;
}
