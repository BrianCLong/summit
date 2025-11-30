/**
 * Time Warp Engine - Core Engine
 * Predicts when anomalies will occur and their precursor signals
 */

import { AnomalyPredictor, AnomalyPredictionResult } from './algorithms/AnomalyPredictor.js';
import { PrecursorExtractor, PrecursorResult } from './algorithms/PrecursorExtractor.js';
import { TimelineWarper, WarpedTimeline } from './algorithms/TimelineWarper.js';
import { InterventionPlanner, InterventionPlan } from './algorithms/InterventionPlanner.js';
import { AnomalyPrediction } from './models/AnomalyPrediction.js';
import { PrecursorSignal } from './models/PrecursorSignal.js';
import { TimeWarpedTimeline } from './models/TimeWarpedTimeline.js';
import { PreventiveIntervention } from './models/PreventiveIntervention.js';

export interface TimeWarpConfig {
  predictionHorizon: number;
  precursorWindow: number;
  warpGranularity: number;
  interventionLeadTime: number;
}

export interface TimeWarpAnalysis {
  predictions: AnomalyPrediction[];
  precursors: PrecursorSignal[];
  timeline: TimeWarpedTimeline;
  interventions: PreventiveIntervention[];
}

export class TimeWarpEngine {
  private predictor: AnomalyPredictor;
  private extractor: PrecursorExtractor;
  private warper: TimelineWarper;
  private planner: InterventionPlanner;

  private predictions: Map<string, AnomalyPrediction> = new Map();
  private precursors: Map<string, PrecursorSignal[]> = new Map();
  private timelines: Map<string, TimeWarpedTimeline> = new Map();

  private config: TimeWarpConfig;

  constructor(config?: Partial<TimeWarpConfig>) {
    this.config = {
      predictionHorizon: 24, // hours
      precursorWindow: 6, // hours before anomaly
      warpGranularity: 15, // minutes
      interventionLeadTime: 2, // hours before predicted onset
      ...config,
    };

    this.predictor = new AnomalyPredictor(this.config.predictionHorizon);
    this.extractor = new PrecursorExtractor(this.config.precursorWindow);
    this.warper = new TimelineWarper(this.config.warpGranularity);
    this.planner = new InterventionPlanner(this.config.interventionLeadTime);
  }

  async predictAnomalies(
    data: unknown[],
    domain: string,
  ): Promise<AnomalyPredictionResult> {
    const result = await this.predictor.predict(data, domain);

    for (const prediction of result.predictions) {
      this.predictions.set(prediction.id, prediction);
    }

    return result;
  }

  async extractPrecursors(
    anomalyId: string,
    historicalData: unknown[],
  ): Promise<PrecursorResult> {
    const anomaly = this.predictions.get(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly prediction not found: ${anomalyId}`);
    }

    const result = await this.extractor.extract(anomaly, historicalData);

    this.precursors.set(anomalyId, result.signals);

    return result;
  }

  async generateWarpedTimeline(
    anomalyId: string,
  ): Promise<WarpedTimeline> {
    const anomaly = this.predictions.get(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly prediction not found: ${anomalyId}`);
    }

    const precursors = this.precursors.get(anomalyId) || [];
    const result = await this.warper.warp(anomaly, precursors);

    this.timelines.set(anomalyId, result.timeline);

    return result;
  }

  async planIntervention(
    anomalyId: string,
  ): Promise<InterventionPlan> {
    const anomaly = this.predictions.get(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly prediction not found: ${anomalyId}`);
    }

    const precursors = this.precursors.get(anomalyId) || [];
    const timeline = this.timelines.get(anomalyId);

    return this.planner.plan(anomaly, precursors, timeline);
  }

  async monitorForAnomalies(
    streamData: unknown[],
    domain: string,
    callback: (prediction: AnomalyPrediction) => void,
  ): Promise<void> {
    const result = await this.predictAnomalies(streamData, domain);

    for (const prediction of result.predictions) {
      if (prediction.probability >= 0.7) {
        // Extract precursors for high-probability anomalies
        await this.extractPrecursors(prediction.id, streamData);
        await this.generateWarpedTimeline(prediction.id);
        callback(prediction);
      }
    }
  }

  async runFullAnalysis(
    data: unknown[],
    domain: string,
  ): Promise<TimeWarpAnalysis> {
    // 1. Predict anomalies
    const predictionResult = await this.predictAnomalies(data, domain);

    // 2. Extract precursors for each prediction
    const allPrecursors: PrecursorSignal[] = [];
    for (const prediction of predictionResult.predictions) {
      const precursorResult = await this.extractPrecursors(prediction.id, data);
      allPrecursors.push(...precursorResult.signals);
    }

    // 3. Generate warped timeline for highest probability anomaly
    const highestProb = predictionResult.predictions.reduce(
      (max, p) => (p.probability > max.probability ? p : max),
      predictionResult.predictions[0],
    );

    let timeline: TimeWarpedTimeline;
    if (highestProb) {
      const warpResult = await this.generateWarpedTimeline(highestProb.id);
      timeline = warpResult.timeline;
    } else {
      timeline = {
        id: crypto.randomUUID(),
        originalSpan: { start: new Date(), end: new Date() },
        warpedSpan: { start: new Date(), end: new Date() },
        events: [],
        compressionRatio: 1,
      };
    }

    // 4. Plan interventions
    const interventions: PreventiveIntervention[] = [];
    for (const prediction of predictionResult.predictions) {
      if (prediction.probability >= 0.5) {
        const plan = await this.planIntervention(prediction.id);
        interventions.push(...plan.interventions);
      }
    }

    return {
      predictions: predictionResult.predictions,
      precursors: allPrecursors,
      timeline,
      interventions,
    };
  }

  getPrediction(predictionId: string): AnomalyPrediction | undefined {
    return this.predictions.get(predictionId);
  }

  getPrecursors(anomalyId: string): PrecursorSignal[] {
    return this.precursors.get(anomalyId) || [];
  }

  getTimeline(anomalyId: string): TimeWarpedTimeline | undefined {
    return this.timelines.get(anomalyId);
  }

  getAllPredictions(): AnomalyPrediction[] {
    return [...this.predictions.values()];
  }

  setDetectionWindow(windowHours: number): void {
    this.config.predictionHorizon = windowHours;
    this.predictor = new AnomalyPredictor(windowHours);
  }

  clearHistory(): void {
    this.predictions.clear();
    this.precursors.clear();
    this.timelines.clear();
  }
}

export function createTimeWarpEngine(
  config?: Partial<TimeWarpConfig>,
): TimeWarpEngine {
  return new TimeWarpEngine(config);
}
