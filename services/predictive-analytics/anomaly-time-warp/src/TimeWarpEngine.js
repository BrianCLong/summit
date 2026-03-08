"use strict";
/**
 * Time Warp Engine - Core Engine
 * Predicts when anomalies will occur and their precursor signals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeWarpEngine = void 0;
exports.createTimeWarpEngine = createTimeWarpEngine;
const AnomalyPredictor_js_1 = require("./algorithms/AnomalyPredictor.js");
const PrecursorExtractor_js_1 = require("./algorithms/PrecursorExtractor.js");
const TimelineWarper_js_1 = require("./algorithms/TimelineWarper.js");
const InterventionPlanner_js_1 = require("./algorithms/InterventionPlanner.js");
class TimeWarpEngine {
    predictor;
    extractor;
    warper;
    planner;
    predictions = new Map();
    precursors = new Map();
    timelines = new Map();
    config;
    constructor(config) {
        this.config = {
            predictionHorizon: 24, // hours
            precursorWindow: 6, // hours before anomaly
            warpGranularity: 15, // minutes
            interventionLeadTime: 2, // hours before predicted onset
            ...config,
        };
        this.predictor = new AnomalyPredictor_js_1.AnomalyPredictor(this.config.predictionHorizon);
        this.extractor = new PrecursorExtractor_js_1.PrecursorExtractor(this.config.precursorWindow);
        this.warper = new TimelineWarper_js_1.TimelineWarper(this.config.warpGranularity);
        this.planner = new InterventionPlanner_js_1.InterventionPlanner(this.config.interventionLeadTime);
    }
    async predictAnomalies(data, domain) {
        const result = await this.predictor.predict(data, domain);
        for (const prediction of result.predictions) {
            this.predictions.set(prediction.id, prediction);
        }
        return result;
    }
    async extractPrecursors(anomalyId, historicalData) {
        const anomaly = this.predictions.get(anomalyId);
        if (!anomaly) {
            throw new Error(`Anomaly prediction not found: ${anomalyId}`);
        }
        const result = await this.extractor.extract(anomaly, historicalData);
        this.precursors.set(anomalyId, result.signals);
        return result;
    }
    async generateWarpedTimeline(anomalyId) {
        const anomaly = this.predictions.get(anomalyId);
        if (!anomaly) {
            throw new Error(`Anomaly prediction not found: ${anomalyId}`);
        }
        const precursors = this.precursors.get(anomalyId) || [];
        const result = await this.warper.warp(anomaly, precursors);
        this.timelines.set(anomalyId, result.timeline);
        return result;
    }
    async planIntervention(anomalyId) {
        const anomaly = this.predictions.get(anomalyId);
        if (!anomaly) {
            throw new Error(`Anomaly prediction not found: ${anomalyId}`);
        }
        const precursors = this.precursors.get(anomalyId) || [];
        const timeline = this.timelines.get(anomalyId);
        return this.planner.plan(anomaly, precursors, timeline);
    }
    async monitorForAnomalies(streamData, domain, callback) {
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
    async runFullAnalysis(data, domain) {
        // 1. Predict anomalies
        const predictionResult = await this.predictAnomalies(data, domain);
        // 2. Extract precursors for each prediction
        const allPrecursors = [];
        for (const prediction of predictionResult.predictions) {
            const precursorResult = await this.extractPrecursors(prediction.id, data);
            allPrecursors.push(...precursorResult.signals);
        }
        // 3. Generate warped timeline for highest probability anomaly
        const highestProb = predictionResult.predictions.reduce((max, p) => (p.probability > max.probability ? p : max), predictionResult.predictions[0]);
        let timeline;
        if (highestProb) {
            const warpResult = await this.generateWarpedTimeline(highestProb.id);
            timeline = warpResult.timeline;
        }
        else {
            timeline = {
                id: crypto.randomUUID(),
                originalSpan: { start: new Date(), end: new Date() },
                warpedSpan: { start: new Date(), end: new Date() },
                events: [],
                compressionRatio: 1,
            };
        }
        // 4. Plan interventions
        const interventions = [];
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
    getPrediction(predictionId) {
        return this.predictions.get(predictionId);
    }
    getPrecursors(anomalyId) {
        return this.precursors.get(anomalyId) || [];
    }
    getTimeline(anomalyId) {
        return this.timelines.get(anomalyId);
    }
    getAllPredictions() {
        return [...this.predictions.values()];
    }
    setDetectionWindow(windowHours) {
        this.config.predictionHorizon = windowHours;
        this.predictor = new AnomalyPredictor_js_1.AnomalyPredictor(windowHours);
    }
    clearHistory() {
        this.predictions.clear();
        this.precursors.clear();
        this.timelines.clear();
    }
}
exports.TimeWarpEngine = TimeWarpEngine;
function createTimeWarpEngine(config) {
    return new TimeWarpEngine(config);
}
