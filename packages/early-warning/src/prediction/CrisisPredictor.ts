/**
 * Crisis Predictor - Main Prediction Engine
 * Uses multiple models and indicators to predict crises and instability
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  CrisisType,
  CrisisSeverity,
  CrisisPhase,
  CrisisScenario,
  Prediction,
  PredictionModel,
  ModelType,
  WarningIndicator,
  IndicatorType,
  TimeSeriesData,
  Trend,
  TriggerEvent,
  ConfidenceMetrics,
  UncertaintyFactor,
  EarlyWarningEvents
} from '../types/index.js';

interface PredictorConfig {
  predictionHorizons: number[]; // days ahead to predict
  minConfidence: number;
  minProbability: number;
  enablePatternRecognition: boolean;
  enableTimeSeriesForecasting: boolean;
  enableTriggerAnalysis: boolean;
  updateInterval: number; // milliseconds
}

export class CrisisPredictor extends EventEmitter {
  private config: PredictorConfig;
  private models: Map<string, PredictionModel>;
  private indicators: Map<string, WarningIndicator>;
  private predictions: Map<string, Prediction>;
  private scenarios: Map<string, CrisisScenario>;
  private historicalPatterns: Map<string, HistoricalPattern>;
  private updateTimer?: NodeJS.Timeout;

  constructor(config: PredictorConfig) {
    super();
    this.config = config;
    this.models = new Map();
    this.indicators = new Map();
    this.predictions = new Map();
    this.scenarios = new Map();
    this.historicalPatterns = new Map();
  }

  /**
   * Start the prediction engine
   */
  async start(): Promise<void> {
    console.log('Starting Crisis Predictor...');

    // Initialize models
    await this.initializeModels();

    // Load historical patterns
    await this.loadHistoricalPatterns();

    // Start periodic predictions
    if (this.config.updateInterval > 0) {
      this.updateTimer = setInterval(() => {
        this.runPredictionCycle();
      }, this.config.updateInterval);
    }

    this.emit('system-started');
  }

  /**
   * Stop the prediction engine
   */
  async stop(): Promise<void> {
    console.log('Stopping Crisis Predictor...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.emit('system-stopped');
  }

  /**
   * Predict crises for a specific country or region
   */
  async predictCrisis(options: {
    country?: string;
    region?: string;
    crisisTypes?: CrisisType[];
    horizon?: number; // days ahead
  }): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    const crisisTypes = options.crisisTypes || Object.values(CrisisType);
    const horizon = options.horizon || this.config.predictionHorizons[0];

    for (const crisisType of crisisTypes) {
      // Get relevant indicators
      const relevantIndicators = this.getRelevantIndicators(crisisType, options.country, options.region);

      // Calculate base probability from indicators
      const baseProbability = this.calculateBaseProbability(crisisType, relevantIndicators);

      // Apply model predictions
      const modelProbability = await this.applyModels(crisisType, relevantIndicators, horizon);

      // Combine probabilities
      const combinedProbability = this.combineProbabilities(baseProbability, modelProbability);

      // Check if meets minimum threshold
      if (combinedProbability < this.config.minProbability) {
        continue;
      }

      // Identify trigger events
      const triggers = await this.identifyTriggerEvents(crisisType, options.country, options.region);

      // Calculate confidence
      const confidence = this.calculateConfidence(relevantIndicators, this.getActiveModels(crisisType));

      // Check minimum confidence
      if (confidence.overall < this.config.minConfidence) {
        continue;
      }

      // Create prediction
      const prediction: Prediction = {
        id: uuidv4(),
        modelId: 'ensemble',
        crisisType,
        scenario: this.generateScenarioName(crisisType, options.country, options.region),
        probability: combinedProbability,
        confidence,
        predictionHorizon: horizon,
        predictedOnset: new Date(Date.now() + horizon * 24 * 60 * 60 * 1000),
        predictionMadeAt: new Date(),
        triggeringIndicators: relevantIndicators.map(i => i.id),
        supportingEvidence: this.generateSupportingEvidence(relevantIndicators, triggers),
        uncertaintyFactors: this.identifyUncertaintyFactors(relevantIndicators),
        validated: false
      };

      predictions.push(prediction);
      this.predictions.set(prediction.id, prediction);

      // Emit event
      this.emit('prediction-made', prediction);
    }

    return predictions;
  }

  /**
   * Calculate probability score for a crisis
   */
  calculateProbability(
    crisisType: CrisisType,
    indicators: WarningIndicator[],
    context?: Record<string, any>
  ): number {
    // Filter relevant indicators
    const relevantIndicators = indicators.filter(i => i.relevantCrises.includes(crisisType));

    if (relevantIndicators.length === 0) {
      return 0;
    }

    // Calculate weighted probability
    let weightedSum = 0;
    let totalWeight = 0;

    for (const indicator of relevantIndicators) {
      // Normalize indicator value to 0-1 probability
      const indicatorProbability = this.normalizeIndicatorValue(indicator);

      // Weight by indicator reliability and importance
      const weight = indicator.weight * indicator.reliability;

      weightedSum += indicatorProbability * weight;
      totalWeight += weight;
    }

    const baseProbability = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply pattern recognition if enabled
    let patternAdjustment = 0;
    if (this.config.enablePatternRecognition) {
      patternAdjustment = this.applyPatternRecognition(crisisType, indicators);
    }

    // Apply time-series forecasting if enabled
    let forecastAdjustment = 0;
    if (this.config.enableTimeSeriesForecasting) {
      forecastAdjustment = this.applyTimeSeriesForecasting(indicators);
    }

    // Combine adjustments
    const finalProbability = Math.max(0, Math.min(1,
      baseProbability + patternAdjustment + forecastAdjustment
    ));

    return finalProbability;
  }

  /**
   * Identify trigger events that could precipitate a crisis
   */
  async identifyTriggerEvents(
    crisisType: CrisisType,
    country?: string,
    region?: string
  ): Promise<TriggerEvent[]> {
    const triggers: TriggerEvent[] = [];

    // Define trigger patterns for different crisis types
    const triggerPatterns = this.getTriggerPatterns(crisisType);

    for (const pattern of triggerPatterns) {
      // Check if trigger conditions are met
      const probability = this.evaluateTriggerProbability(pattern, country, region);

      if (probability > 0.1) { // 10% threshold
        const trigger: TriggerEvent = {
          id: uuidv4(),
          type: pattern.type,
          description: pattern.description,
          probability,
          alreadyOccurred: pattern.checkOccurred(),
          leadTime: pattern.leadTime,
          catalystPotential: pattern.catalystPotential
        };

        if (trigger.alreadyOccurred) {
          trigger.occurredAt = pattern.occurredAt;
        }

        triggers.push(trigger);
      }
    }

    // Sort by probability (descending)
    return triggers.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Perform time-series forecasting on indicators
   */
  forecastTimeSeries(
    indicator: WarningIndicator,
    horizons: number[] = [7, 30, 90] // days
  ): Map<number, TimeSeriesForecast> {
    const forecasts = new Map<number, TimeSeriesForecast>();

    if (indicator.historicalValues.length < 10) {
      // Not enough data for reliable forecasting
      return forecasts;
    }

    const values = indicator.historicalValues.map(v => v.value);
    const timestamps = indicator.historicalValues.map(v => v.timestamp);

    for (const horizon of horizons) {
      // Simple exponential smoothing with trend
      const forecast = this.exponentialSmoothingWithTrend(values, horizon);

      // Calculate confidence interval
      const variance = this.calculateVariance(values);
      const stdDev = Math.sqrt(variance);

      forecasts.set(horizon, {
        horizon,
        forecastDate: new Date(Date.now() + horizon * 24 * 60 * 60 * 1000),
        predictedValue: forecast.value,
        trend: forecast.trend,
        confidenceInterval: {
          lower: forecast.value - 1.96 * stdDev,
          upper: forecast.value + 1.96 * stdDev,
          level: 0.95
        }
      });
    }

    return forecasts;
  }

  /**
   * Recognize patterns in indicator behavior
   */
  recognizePatterns(indicators: WarningIndicator[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Check for common crisis patterns
    patterns.push(...this.detectEscalationPattern(indicators));
    patterns.push(...this.detectConvergencePattern(indicators));
    patterns.push(...this.detectAnomalyPattern(indicators));
    patterns.push(...this.detectCyclicalPattern(indicators));

    return patterns.filter(p => p.confidence > 0.5);
  }

  /**
   * Add or update a prediction model
   */
  addModel(model: PredictionModel): void {
    this.models.set(model.id, model);
    console.log(`Added prediction model: ${model.name} (${model.type})`);
  }

  /**
   * Add or update an indicator
   */
  addIndicator(indicator: WarningIndicator): void {
    const existingIndicator = this.indicators.get(indicator.id);

    if (existingIndicator) {
      // Check for threshold breaches
      this.checkThresholdBreach(existingIndicator, indicator);
    }

    this.indicators.set(indicator.id, indicator);
  }

  /**
   * Update indicator with new value
   */
  updateIndicator(indicatorId: string, newValue: number, timestamp: Date = new Date()): void {
    const indicator = this.indicators.get(indicatorId);
    if (!indicator) {
      throw new Error(`Indicator not found: ${indicatorId}`);
    }

    // Add to historical values
    indicator.historicalValues.push({
      timestamp,
      value: newValue,
      quality: 'HIGH'
    });

    // Update current value
    const oldValue = indicator.currentValue;
    indicator.currentValue = newValue;

    // Update trend
    indicator.trend = this.calculateTrend(indicator.historicalValues);

    // Calculate velocity and acceleration
    indicator.velocity = this.calculateVelocity(indicator.historicalValues);
    indicator.acceleration = this.calculateAcceleration(indicator.historicalValues);

    // Update status
    indicator.status = this.determineIndicatorStatus(indicator);
    indicator.lastUpdated = timestamp;

    // Check for threshold breach
    if (indicator.status === 'BREACH' || indicator.status === 'CRITICAL') {
      this.emit('indicator-breach', indicator);
    }

    // Re-run predictions if indicator is important
    if (indicator.weight > 0.7) {
      this.runPredictionCycle();
    }
  }

  /**
   * Get all predictions
   */
  getPredictions(filter?: {
    crisisType?: CrisisType;
    minProbability?: number;
    minConfidence?: number;
  }): Prediction[] {
    let predictions = Array.from(this.predictions.values());

    if (filter) {
      if (filter.crisisType) {
        predictions = predictions.filter(p => p.crisisType === filter.crisisType);
      }
      if (filter.minProbability !== undefined) {
        predictions = predictions.filter(p => p.probability >= filter.minProbability!);
      }
      if (filter.minConfidence !== undefined) {
        predictions = predictions.filter(p => p.confidence.overall >= filter.minConfidence!);
      }
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Get prediction by ID
   */
  getPrediction(predictionId: string): Prediction | undefined {
    return this.predictions.get(predictionId);
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private async initializeModels(): Promise<void> {
    // This would load pre-trained models from storage
    console.log('Initializing prediction models...');
  }

  private async loadHistoricalPatterns(): Promise<void> {
    // This would load historical crisis patterns for pattern matching
    console.log('Loading historical patterns...');
  }

  private async runPredictionCycle(): Promise<void> {
    // Run predictions for all monitored entities
    console.log('Running prediction cycle...');
  }

  private getRelevantIndicators(
    crisisType: CrisisType,
    country?: string,
    region?: string
  ): WarningIndicator[] {
    return Array.from(this.indicators.values()).filter(indicator => {
      return indicator.relevantCrises.includes(crisisType) &&
             indicator.type === IndicatorType.LEADING;
    });
  }

  private calculateBaseProbability(
    crisisType: CrisisType,
    indicators: WarningIndicator[]
  ): number {
    return this.calculateProbability(crisisType, indicators);
  }

  private async applyModels(
    crisisType: CrisisType,
    indicators: WarningIndicator[],
    horizon: number
  ): Promise<number> {
    const activeModels = this.getActiveModels(crisisType);

    if (activeModels.length === 0) {
      return 0;
    }

    // Ensemble prediction - average of all models weighted by performance
    let weightedSum = 0;
    let totalWeight = 0;

    for (const model of activeModels) {
      // In a real implementation, this would call the actual model
      const modelPrediction = await this.callModel(model, indicators, horizon);
      const weight = model.performance.f1Score || 0.5;

      weightedSum += modelPrediction * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private async callModel(
    model: PredictionModel,
    indicators: WarningIndicator[],
    horizon: number
  ): Promise<number> {
    // Placeholder for actual model inference
    // In production, this would call ML model APIs
    return 0.5;
  }

  private combineProbabilities(prob1: number, prob2: number): number {
    // Use maximum probability (could also use average or weighted combination)
    return Math.max(prob1, prob2);
  }

  private getActiveModels(crisisType: CrisisType): PredictionModel[] {
    return Array.from(this.models.values()).filter(model => {
      return model.isActive &&
             model.status === 'DEPLOYED' &&
             (model.targetCrisis === 'ALL' ||
              model.targetCrisis === crisisType ||
              (Array.isArray(model.targetCrisis) && model.targetCrisis.includes(crisisType)));
    });
  }

  private calculateConfidence(
    indicators: WarningIndicator[],
    models: PredictionModel[]
  ): ConfidenceMetrics {
    // Calculate component confidences
    const dataQuality = this.calculateDataQuality(indicators);
    const modelReliability = this.calculateModelReliability(models);
    const indicatorStrength = this.calculateIndicatorStrength(indicators);

    // Overall confidence is weighted average
    const overall = (dataQuality * 0.3 + modelReliability * 0.4 + indicatorStrength * 0.3);

    return {
      overall,
      dataQuality,
      modelReliability,
      indicatorStrength,
      expertConsensus: 0.5, // Placeholder
      dataGaps: this.identifyDataGaps(indicators),
      assumptions: ['Historical patterns repeat', 'Indicators remain reliable'],
      limitations: ['Limited real-time data', 'Model uncertainty']
    };
  }

  private calculateDataQuality(indicators: WarningIndicator[]): number {
    if (indicators.length === 0) return 0;

    const avgQuality = indicators.reduce((sum, ind) => {
      const recentData = ind.historicalValues.slice(-10);
      const highQuality = recentData.filter(d => d.quality === 'HIGH').length;
      return sum + (highQuality / recentData.length);
    }, 0) / indicators.length;

    return avgQuality;
  }

  private calculateModelReliability(models: PredictionModel[]): number {
    if (models.length === 0) return 0;

    const avgReliability = models.reduce((sum, model) => {
      return sum + (model.performance.f1Score || 0.5);
    }, 0) / models.length;

    return avgReliability;
  }

  private calculateIndicatorStrength(indicators: WarningIndicator[]): number {
    if (indicators.length === 0) return 0;

    const avgStrength = indicators.reduce((sum, ind) => {
      return sum + (ind.weight * ind.reliability);
    }, 0) / indicators.length;

    return avgStrength;
  }

  private identifyDataGaps(indicators: WarningIndicator[]): string[] {
    const gaps: string[] = [];

    for (const indicator of indicators) {
      if (indicator.historicalValues.length < 30) {
        gaps.push(`Insufficient historical data for ${indicator.name}`);
      }
    }

    return gaps;
  }

  private generateScenarioName(crisisType: CrisisType, country?: string, region?: string): string {
    const location = country || region || 'Unknown';
    return `${crisisType} in ${location}`;
  }

  private generateSupportingEvidence(
    indicators: WarningIndicator[],
    triggers: TriggerEvent[]
  ): string[] {
    const evidence: string[] = [];

    // Add top indicators
    const topIndicators = indicators
      .sort((a, b) => (b.weight * b.reliability) - (a.weight * a.reliability))
      .slice(0, 5);

    for (const indicator of topIndicators) {
      evidence.push(`${indicator.name}: ${indicator.status} (${indicator.trend})`);
    }

    // Add top triggers
    for (const trigger of triggers.slice(0, 3)) {
      evidence.push(`${trigger.type}: ${(trigger.probability * 100).toFixed(1)}% probability`);
    }

    return evidence;
  }

  private identifyUncertaintyFactors(indicators: WarningIndicator[]): UncertaintyFactor[] {
    return [
      {
        factor: 'Data completeness',
        impact: 'MEDIUM',
        description: 'Some indicators have incomplete historical data',
        mitigable: true
      },
      {
        factor: 'External shocks',
        impact: 'HIGH',
        description: 'Unpredictable external events could alter trajectory',
        mitigable: false
      }
    ];
  }

  private normalizeIndicatorValue(indicator: WarningIndicator): number {
    // Normalize current value to 0-1 probability based on thresholds
    const value = indicator.currentValue;
    const thresholds = indicator.threshold;

    if (value >= thresholds.breach) return 1.0;
    if (value >= thresholds.critical.min) return 0.8;
    if (value >= thresholds.warning.min) return 0.6;
    if (value >= thresholds.elevated.min) return 0.4;
    return 0.2;
  }

  private applyPatternRecognition(crisisType: CrisisType, indicators: WarningIndicator[]): number {
    // Placeholder for pattern recognition logic
    return 0;
  }

  private applyTimeSeriesForecasting(indicators: WarningIndicator[]): number {
    // Placeholder for time-series forecasting logic
    return 0;
  }

  private getTriggerPatterns(crisisType: CrisisType): TriggerPattern[] {
    // Define trigger patterns based on crisis type
    return [];
  }

  private evaluateTriggerProbability(pattern: TriggerPattern, country?: string, region?: string): number {
    return 0;
  }

  private exponentialSmoothingWithTrend(values: number[], horizon: number): { value: number; trend: number } {
    if (values.length < 2) {
      return { value: values[0] || 0, trend: 0 };
    }

    const alpha = 0.3; // Smoothing factor
    const beta = 0.1;  // Trend smoothing factor

    let level = values[0];
    let trend = values[1] - values[0];

    for (let i = 1; i < values.length; i++) {
      const lastLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
    }

    const forecast = level + trend * horizon;
    return { value: forecast, trend };
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
  }

  private detectEscalationPattern(indicators: WarningIndicator[]): Pattern[] {
    // Detect if multiple indicators are increasing simultaneously
    return [];
  }

  private detectConvergencePattern(indicators: WarningIndicator[]): Pattern[] {
    // Detect if indicators are converging to critical thresholds
    return [];
  }

  private detectAnomalyPattern(indicators: WarningIndicator[]): Pattern[] {
    // Detect unusual spikes or drops
    return [];
  }

  private detectCyclicalPattern(indicators: WarningIndicator[]): Pattern[] {
    // Detect repeating patterns
    return [];
  }

  private checkThresholdBreach(oldIndicator: WarningIndicator, newIndicator: WarningIndicator): void {
    if (oldIndicator.status !== 'BREACH' && newIndicator.status === 'BREACH') {
      this.emit('indicator-breach', newIndicator);
    }
  }

  private calculateTrend(historicalValues: TimeSeriesData[]): Trend {
    if (historicalValues.length < 2) return Trend.STABLE;

    const recentValues = historicalValues.slice(-10).map(v => v.value);
    const older = recentValues.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const recent = recentValues.slice(-5).reduce((a, b) => a + b, 0) / 5;

    const change = (recent - older) / older;

    if (change > 0.2) return Trend.STRONGLY_INCREASING;
    if (change > 0.05) return Trend.INCREASING;
    if (change < -0.2) return Trend.STRONGLY_DECREASING;
    if (change < -0.05) return Trend.DECREASING;

    return Trend.STABLE;
  }

  private calculateVelocity(historicalValues: TimeSeriesData[]): number {
    if (historicalValues.length < 2) return 0;

    const recent = historicalValues.slice(-2);
    const timeDiff = (recent[1].timestamp.getTime() - recent[0].timestamp.getTime()) / (24 * 60 * 60 * 1000);
    return (recent[1].value - recent[0].value) / timeDiff;
  }

  private calculateAcceleration(historicalValues: TimeSeriesData[]): number {
    if (historicalValues.length < 3) return 0;

    const recent = historicalValues.slice(-3).map(v => v.value);
    const v1 = recent[1] - recent[0];
    const v2 = recent[2] - recent[1];
    return v2 - v1;
  }

  private determineIndicatorStatus(indicator: WarningIndicator): 'NORMAL' | 'ELEVATED' | 'WARNING' | 'CRITICAL' | 'BREACH' {
    const value = indicator.currentValue;
    const t = indicator.threshold;

    if (value >= t.breach) return 'BREACH';
    if (value >= t.critical.min && value <= t.critical.max) return 'CRITICAL';
    if (value >= t.warning.min && value <= t.warning.max) return 'WARNING';
    if (value >= t.elevated.min && value <= t.elevated.max) return 'ELEVATED';
    return 'NORMAL';
  }
}

// ============================================================================
// Supporting Interfaces
// ============================================================================

interface HistoricalPattern {
  id: string;
  crisisType: CrisisType;
  pattern: number[];
  similarity: number;
}

interface TimeSeriesForecast {
  horizon: number;
  forecastDate: Date;
  predictedValue: number;
  trend: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number;
  };
}

interface Pattern {
  type: string;
  confidence: number;
  indicators: string[];
  description: string;
}

interface TriggerPattern {
  type: string;
  description: string;
  leadTime: number;
  catalystPotential: number;
  checkOccurred: () => boolean;
  occurredAt?: Date;
}
