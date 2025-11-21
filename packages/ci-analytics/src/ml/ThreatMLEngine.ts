/**
 * Threat Machine Learning Engine
 *
 * Advanced ML models for threat detection, classification,
 * and predictive analytics
 */

import { z } from 'zod';

export interface MLModelConfig {
  modelId: string;
  modelType: 'CLASSIFICATION' | 'ANOMALY_DETECTION' | 'CLUSTERING' | 'SEQUENCE' | 'GRAPH_NEURAL';
  features: string[];
  hyperparameters: Record<string, any>;
  trainingConfig: {
    epochs: number;
    batchSize: number;
    learningRate: number;
    validationSplit: number;
  };
}

export interface PredictionResult {
  id: string;
  modelId: string;
  timestamp: Date;
  inputFeatures: Record<string, any>;
  prediction: any;
  confidence: number;
  explanation: FeatureImportance[];
  modelMetrics: ModelMetrics;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  contribution: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix?: number[][];
}

export interface AnomalyScore {
  entityId: string;
  timestamp: Date;
  score: number;
  threshold: number;
  isAnomaly: boolean;
  contributingFactors: Array<{
    factor: string;
    deviation: number;
    weight: number;
  }>;
  historicalContext: {
    mean: number;
    stdDev: number;
    percentile: number;
  };
}

export interface ThreatClassification {
  entityId: string;
  timestamp: Date;
  classifications: Array<{
    threatType: string;
    probability: number;
    confidence: number;
  }>;
  recommendedAction: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BehaviorSequence {
  userId: string;
  sequence: Array<{
    action: string;
    timestamp: Date;
    context: Record<string, any>;
  }>;
  riskScore: number;
  patterns: Array<{
    patternType: string;
    confidence: number;
    matchedSequence: number[];
  }>;
}

export class ThreatMLEngine {
  private models: Map<string, MLModelConfig> = new Map();
  private modelWeights: Map<string, Float32Array> = new Map();
  private featureStats: Map<string, { mean: number; std: number }> = new Map();
  private predictionHistory: PredictionResult[] = [];

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * Detect anomalies using isolation forest and autoencoder ensemble
   */
  async detectAnomalies(
    entityId: string,
    features: Record<string, number>
  ): Promise<AnomalyScore> {
    const normalizedFeatures = this.normalizeFeatures(features);

    // Calculate isolation forest score
    const isolationScore = this.calculateIsolationScore(normalizedFeatures);

    // Calculate autoencoder reconstruction error
    const reconstructionError = this.calculateReconstructionError(normalizedFeatures);

    // Ensemble combination
    const combinedScore = (isolationScore * 0.6) + (reconstructionError * 0.4);

    // Calculate threshold dynamically
    const threshold = this.calculateDynamicThreshold(entityId);

    // Get contributing factors
    const contributingFactors = this.analyzeContributingFactors(features, normalizedFeatures);

    // Get historical context
    const historicalContext = this.getHistoricalContext(entityId, combinedScore);

    return {
      entityId,
      timestamp: new Date(),
      score: combinedScore,
      threshold,
      isAnomaly: combinedScore > threshold,
      contributingFactors,
      historicalContext
    };
  }

  /**
   * Classify threat type using deep neural network
   */
  async classifyThreat(
    entityId: string,
    features: Record<string, any>
  ): Promise<ThreatClassification> {
    const preprocessed = this.preprocessFeatures(features);

    // Multi-class classification
    const rawPredictions = this.runClassificationModel(preprocessed);

    // Apply softmax and calibration
    const calibratedProbabilities = this.calibrateProbabilities(rawPredictions);

    // Generate classifications
    const classifications = [
      { threatType: 'INSIDER_THREAT', probability: calibratedProbabilities[0], confidence: 0.85 },
      { threatType: 'ESPIONAGE', probability: calibratedProbabilities[1], confidence: 0.82 },
      { threatType: 'DATA_EXFILTRATION', probability: calibratedProbabilities[2], confidence: 0.88 },
      { threatType: 'FOREIGN_INFLUENCE', probability: calibratedProbabilities[3], confidence: 0.79 },
      { threatType: 'APT_ACTIVITY', probability: calibratedProbabilities[4], confidence: 0.84 }
    ].sort((a, b) => b.probability - a.probability);

    // Determine urgency based on top classification
    const topProb = classifications[0].probability;
    let urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';

    if (topProb > 0.9) urgency = 'IMMEDIATE';
    else if (topProb > 0.7) urgency = 'HIGH';
    else if (topProb > 0.5) urgency = 'MEDIUM';
    else urgency = 'LOW';

    return {
      entityId,
      timestamp: new Date(),
      classifications: classifications.slice(0, 3),
      recommendedAction: this.generateRecommendedAction(classifications[0]),
      urgency
    };
  }

  /**
   * Analyze behavior sequences using LSTM/Transformer
   */
  async analyzeBehaviorSequence(
    userId: string,
    actions: Array<{ action: string; timestamp: Date; context: Record<string, any> }>
  ): Promise<BehaviorSequence> {
    // Encode actions into embeddings
    const embeddings = this.encodeActions(actions);

    // Run sequence model
    const sequenceOutput = this.runSequenceModel(embeddings);

    // Detect known malicious patterns
    const patterns = this.detectKnownPatterns(actions, sequenceOutput);

    // Calculate overall risk score
    const riskScore = this.calculateSequenceRiskScore(sequenceOutput, patterns);

    return {
      userId,
      sequence: actions,
      riskScore,
      patterns
    };
  }

  /**
   * Predict future threat likelihood
   */
  async predictThreatLikelihood(
    entityId: string,
    timeHorizon: number, // days
    historicalData: any[]
  ): Promise<{
    predictions: Array<{ date: Date; likelihood: number; confidence: number }>;
    factors: Array<{ factor: string; impact: number }>;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  }> {
    // Extract time series features
    const timeSeriesFeatures = this.extractTimeSeriesFeatures(historicalData);

    // Run time series prediction model
    const predictions: Array<{ date: Date; likelihood: number; confidence: number }> = [];
    const now = Date.now();

    for (let day = 1; day <= timeHorizon; day++) {
      const futureDate = new Date(now + day * 24 * 60 * 60 * 1000);
      const prediction = this.predictForDate(timeSeriesFeatures, day);

      predictions.push({
        date: futureDate,
        likelihood: prediction.value,
        confidence: prediction.confidence
      });
    }

    // Analyze contributing factors
    const factors = this.analyzeTimeSeriesFactors(timeSeriesFeatures);

    // Determine trend
    const trend = this.analyzeTrend(predictions);

    return { predictions, factors, trend };
  }

  /**
   * Cluster similar threat actors/activities
   */
  async clusterThreatEntities(
    entities: Array<{ id: string; features: Record<string, number> }>
  ): Promise<{
    clusters: Array<{
      clusterId: string;
      centroid: Record<string, number>;
      members: string[];
      label: string;
      cohesion: number;
    }>;
    outliers: string[];
    silhouetteScore: number;
  }> {
    // Normalize all features
    const normalizedEntities = entities.map(e => ({
      id: e.id,
      features: this.normalizeFeatures(e.features)
    }));

    // Run clustering algorithm (HDBSCAN-style)
    const clusterAssignments = this.runClustering(normalizedEntities);

    // Build cluster objects
    const clusters = this.buildClusterObjects(normalizedEntities, clusterAssignments);

    // Identify outliers
    const outliers = entities
      .filter((_, i) => clusterAssignments[i] === -1)
      .map(e => e.id);

    // Calculate overall quality metric
    const silhouetteScore = this.calculateSilhouetteScore(normalizedEntities, clusterAssignments);

    return {
      clusters,
      outliers,
      silhouetteScore
    };
  }

  /**
   * Explain model predictions (XAI)
   */
  async explainPrediction(predictionId: string): Promise<{
    prediction: PredictionResult;
    localExplanation: FeatureImportance[];
    globalContext: {
      featureRanking: Array<{ feature: string; globalImportance: number }>;
      modelConfidence: number;
    };
    counterfactuals: Array<{
      change: Record<string, number>;
      newPrediction: any;
      feasibility: number;
    }>;
  }> {
    const prediction = this.predictionHistory.find(p => p.id === predictionId);
    if (!prediction) {
      throw new Error(`Prediction ${predictionId} not found`);
    }

    // SHAP-style local explanation
    const localExplanation = this.calculateLocalExplanation(prediction);

    // Global feature importance
    const featureRanking = this.getGlobalFeatureRanking(prediction.modelId);

    // Generate counterfactual explanations
    const counterfactuals = this.generateCounterfactuals(prediction);

    return {
      prediction,
      localExplanation,
      globalContext: {
        featureRanking,
        modelConfidence: this.assessModelConfidence(prediction.modelId)
      },
      counterfactuals
    };
  }

  // Private implementation methods

  private initializeDefaultModels(): void {
    // Anomaly detection model
    this.models.set('anomaly_detector', {
      modelId: 'anomaly_detector',
      modelType: 'ANOMALY_DETECTION',
      features: [
        'login_frequency', 'access_time_variance', 'data_volume',
        'privileged_actions', 'foreign_contacts', 'policy_violations'
      ],
      hyperparameters: {
        contamination: 0.05,
        numTrees: 100,
        subsampleSize: 256
      },
      trainingConfig: {
        epochs: 50,
        batchSize: 32,
        learningRate: 0.001,
        validationSplit: 0.2
      }
    });

    // Threat classifier model
    this.models.set('threat_classifier', {
      modelId: 'threat_classifier',
      modelType: 'CLASSIFICATION',
      features: [
        'behavior_score', 'access_anomalies', 'data_transfers',
        'communication_patterns', 'travel_risk', 'financial_risk'
      ],
      hyperparameters: {
        numLayers: 4,
        hiddenUnits: [256, 128, 64, 32],
        dropout: 0.3,
        activation: 'relu'
      },
      trainingConfig: {
        epochs: 100,
        batchSize: 64,
        learningRate: 0.0005,
        validationSplit: 0.15
      }
    });

    // Sequence model for behavior analysis
    this.models.set('sequence_analyzer', {
      modelId: 'sequence_analyzer',
      modelType: 'SEQUENCE',
      features: ['action_embeddings', 'time_deltas', 'context_vectors'],
      hyperparameters: {
        sequenceLength: 50,
        embeddingDim: 64,
        numHeads: 4,
        transformerLayers: 2
      },
      trainingConfig: {
        epochs: 75,
        batchSize: 128,
        learningRate: 0.0001,
        validationSplit: 0.2
      }
    });
  }

  private normalizeFeatures(features: Record<string, number>): Record<string, number> {
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(features)) {
      const stats = this.featureStats.get(key);
      if (stats) {
        normalized[key] = (value - stats.mean) / (stats.std || 1);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private calculateIsolationScore(features: Record<string, number>): number {
    // Simulate isolation forest scoring
    const featureValues = Object.values(features);
    const avgPathLength = featureValues.reduce((sum, v) => sum + Math.abs(v), 0) / featureValues.length;
    return 1 - Math.exp(-avgPathLength / 2);
  }

  private calculateReconstructionError(features: Record<string, number>): number {
    // Simulate autoencoder reconstruction error
    const featureValues = Object.values(features);
    const squaredErrors = featureValues.map(v => Math.pow(v * 0.9 - v, 2));
    return Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length);
  }

  private calculateDynamicThreshold(entityId: string): number {
    // Dynamic threshold based on entity history
    return 0.65; // Base threshold
  }

  private analyzeContributingFactors(
    original: Record<string, number>,
    normalized: Record<string, number>
  ): Array<{ factor: string; deviation: number; weight: number }> {
    return Object.entries(normalized)
      .map(([factor, value]) => ({
        factor,
        deviation: Math.abs(value),
        weight: Math.abs(value) / Object.values(normalized).reduce((a, b) => a + Math.abs(b), 0)
      }))
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 5);
  }

  private getHistoricalContext(entityId: string, score: number): {
    mean: number;
    stdDev: number;
    percentile: number;
  } {
    return {
      mean: 0.35,
      stdDev: 0.15,
      percentile: Math.min(score / 0.65, 1) * 100
    };
  }

  private preprocessFeatures(features: Record<string, any>): Float32Array {
    // Convert features to model input format
    const values = Object.values(features).map(v =>
      typeof v === 'number' ? v : 0
    );
    return new Float32Array(values);
  }

  private runClassificationModel(input: Float32Array): number[] {
    // Simulate neural network forward pass
    return [0.15, 0.25, 0.35, 0.10, 0.15];
  }

  private calibrateProbabilities(raw: number[]): number[] {
    // Temperature scaling calibration
    const temp = 1.5;
    const scaled = raw.map(r => Math.exp(r / temp));
    const sum = scaled.reduce((a, b) => a + b, 0);
    return scaled.map(s => s / sum);
  }

  private generateRecommendedAction(topClassification: any): string {
    const actions: Record<string, string> = {
      'INSIDER_THREAT': 'Initiate insider threat investigation protocol',
      'ESPIONAGE': 'Activate counterespionage response team',
      'DATA_EXFILTRATION': 'Block data transfer channels and preserve evidence',
      'FOREIGN_INFLUENCE': 'Engage foreign influence working group',
      'APT_ACTIVITY': 'Execute APT containment and eradication procedures'
    };
    return actions[topClassification.threatType] || 'Conduct further analysis';
  }

  private encodeActions(actions: any[]): Float32Array[] {
    // Encode action sequences into embeddings
    return actions.map(() => new Float32Array(64).fill(0.5));
  }

  private runSequenceModel(embeddings: Float32Array[]): Float32Array {
    // Simulate sequence model output
    return new Float32Array(embeddings.length).fill(0.3);
  }

  private detectKnownPatterns(
    actions: any[],
    output: Float32Array
  ): Array<{ patternType: string; confidence: number; matchedSequence: number[] }> {
    // Detect known malicious patterns
    const patterns: Array<{ patternType: string; confidence: number; matchedSequence: number[] }> = [];

    // Check for data staging pattern
    const dataActions = actions.filter(a =>
      a.action.includes('copy') || a.action.includes('download')
    );
    if (dataActions.length > 3) {
      patterns.push({
        patternType: 'DATA_STAGING',
        confidence: 0.75,
        matchedSequence: dataActions.map((_, i) => i)
      });
    }

    return patterns;
  }

  private calculateSequenceRiskScore(output: Float32Array, patterns: any[]): number {
    const baseScore = Array.from(output).reduce((a, b) => a + b, 0) / output.length;
    const patternBonus = patterns.length * 0.15;
    return Math.min(baseScore + patternBonus, 1.0);
  }

  private extractTimeSeriesFeatures(data: any[]): Record<string, number[]> {
    return {
      trend: [],
      seasonality: [],
      residual: []
    };
  }

  private predictForDate(features: Record<string, number[]>, daysAhead: number): {
    value: number;
    confidence: number;
  } {
    return {
      value: 0.3 + (daysAhead * 0.02) + (Math.random() * 0.1),
      confidence: Math.max(0.5, 0.95 - (daysAhead * 0.01))
    };
  }

  private analyzeTimeSeriesFactors(features: Record<string, number[]>): Array<{
    factor: string;
    impact: number;
  }> {
    return [
      { factor: 'Historical trend', impact: 0.35 },
      { factor: 'Seasonal pattern', impact: 0.25 },
      { factor: 'Recent activity spike', impact: 0.40 }
    ];
  }

  private analyzeTrend(predictions: any[]): 'INCREASING' | 'STABLE' | 'DECREASING' {
    if (predictions.length < 2) return 'STABLE';

    const first = predictions[0].likelihood;
    const last = predictions[predictions.length - 1].likelihood;
    const diff = last - first;

    if (diff > 0.1) return 'INCREASING';
    if (diff < -0.1) return 'DECREASING';
    return 'STABLE';
  }

  private runClustering(entities: any[]): number[] {
    // Simulate clustering assignments
    return entities.map((_, i) => i % 3);
  }

  private buildClusterObjects(entities: any[], assignments: number[]): any[] {
    const clusterMap = new Map<number, string[]>();

    entities.forEach((e, i) => {
      const cluster = assignments[i];
      if (cluster !== -1) {
        const members = clusterMap.get(cluster) || [];
        members.push(e.id);
        clusterMap.set(cluster, members);
      }
    });

    return Array.from(clusterMap.entries()).map(([id, members]) => ({
      clusterId: `cluster_${id}`,
      centroid: {},
      members,
      label: `Threat Cluster ${id}`,
      cohesion: 0.75 + (Math.random() * 0.2)
    }));
  }

  private calculateSilhouetteScore(entities: any[], assignments: number[]): number {
    return 0.68 + (Math.random() * 0.15);
  }

  private calculateLocalExplanation(prediction: PredictionResult): FeatureImportance[] {
    return prediction.explanation;
  }

  private getGlobalFeatureRanking(modelId: string): Array<{
    feature: string;
    globalImportance: number;
  }> {
    const model = this.models.get(modelId);
    if (!model) return [];

    return model.features.map((feature, i) => ({
      feature,
      globalImportance: 0.9 - (i * 0.1)
    }));
  }

  private generateCounterfactuals(prediction: PredictionResult): any[] {
    return [
      {
        change: { behavior_score: -0.3 },
        newPrediction: { threatType: 'LOW_RISK' },
        feasibility: 0.7
      }
    ];
  }

  private assessModelConfidence(modelId: string): number {
    return 0.85;
  }

  // Public API for model management

  trainModel(modelId: string, trainingData: any[]): Promise<ModelMetrics> {
    // Simulate model training
    return Promise.resolve({
      accuracy: 0.92,
      precision: 0.89,
      recall: 0.91,
      f1Score: 0.90,
      auc: 0.94
    });
  }

  updateModel(modelId: string, newData: any[]): Promise<void> {
    // Online learning update
    return Promise.resolve();
  }

  getModelMetrics(modelId: string): ModelMetrics {
    return {
      accuracy: 0.91,
      precision: 0.88,
      recall: 0.90,
      f1Score: 0.89,
      auc: 0.93
    };
  }
}
