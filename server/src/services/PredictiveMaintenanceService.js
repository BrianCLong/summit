"use strict";
/**
 * Predictive Maintenance Service
 * ML-based failure prediction, scheduling optimization, and cost-benefit analysis
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictiveMaintenanceService = exports.PredictiveMaintenanceService = void 0;
const uuid_1 = require("uuid");
const digitalTwin_js_1 = require("../types/digitalTwin.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Service for predictive maintenance operations
 */
class PredictiveMaintenanceService {
    schedules = new Map();
    healthHistory = new Map();
    modelConfig;
    constructor(config) {
        this.modelConfig = {
            modelType: 'ENSEMBLE',
            features: ['healthScore', 'age', 'sensorVariance', 'maintenanceHistory'],
            windowSize: 30,
            predictionHorizon: 90,
            confidenceThreshold: 0.7,
            ...config,
        };
    }
    /**
     * Predicts failure for a single asset
     * @param asset - Asset to analyze
     * @param sensorHistory - Historical sensor readings
     */
    async predictFailure(asset, sensorHistory) {
        // Extract features for ML model
        const features = this.extractFeatures(asset, sensorHistory);
        // Run prediction model
        const prediction = this.runPredictionModel(features);
        // Calculate failure probability and date
        const failureProbability = prediction.probability;
        const daysToFailure = this.estimateDaysToFailure(asset, prediction);
        const predictedFailureDate = new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000);
        // Determine priority based on probability and asset criticality
        const priority = this.calculatePriority(failureProbability, asset);
        // Generate recommendation
        const recommendedAction = this.generateRecommendation(failureProbability, daysToFailure, asset);
        // Estimate cost
        const estimatedCost = this.estimateMaintenanceCost(asset, recommendedAction);
        // Calculate confidence interval
        const confidenceInterval = this.calculateConfidenceInterval(predictedFailureDate, prediction.confidence);
        return {
            assetId: asset.id,
            predictedFailureDate,
            failureProbability,
            recommendedAction,
            estimatedCost,
            priority,
            confidenceInterval,
        };
    }
    /**
     * Batch predicts failures for multiple assets
     * @param assets - Assets to analyze
     * @param getSensorHistory - Function to retrieve sensor history
     */
    async batchPredictFailures(assets, getSensorHistory) {
        const predictions = [];
        for (const asset of assets) {
            try {
                const history = await getSensorHistory(asset.id);
                const prediction = await this.predictFailure(asset, history);
                predictions.push(prediction);
            }
            catch (error) {
                logger_js_1.default.error(`Failed to predict for asset ${asset.id}:`, {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        return predictions.sort((a, b) => {
            const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    /**
     * Optimizes maintenance schedule
     * @param predictions - Failure predictions
     * @param constraints - Scheduling constraints
     */
    async optimizeSchedule(predictions, constraints) {
        const optimizedSchedule = [];
        const dailyJobs = new Map();
        const dailyCosts = new Map();
        // Sort by priority and failure date
        const sortedPredictions = [...predictions].sort((a, b) => {
            const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0)
                return priorityDiff;
            return a.predictedFailureDate.getTime() - b.predictedFailureDate.getTime();
        });
        for (const prediction of sortedPredictions) {
            // Find optimal date considering constraints
            const optimalDate = this.findOptimalDate(prediction, dailyJobs, dailyCosts, constraints);
            if (optimalDate) {
                const schedule = {
                    id: (0, uuid_1.v4)(),
                    assetId: prediction.assetId,
                    scheduledDate: optimalDate,
                    type: prediction.priority === 'CRITICAL' ? 'EMERGENCY' : 'PREDICTIVE',
                    estimatedDuration: this.estimateDuration(prediction),
                    estimatedCost: prediction.estimatedCost,
                    status: 'SCHEDULED',
                    createdAt: new Date(),
                };
                optimizedSchedule.push(schedule);
                this.schedules.set(schedule.id, schedule);
                // Update daily counts
                const dateKey = optimalDate.toISOString().split('T')[0];
                dailyJobs.set(dateKey, (dailyJobs.get(dateKey) || 0) + 1);
                dailyCosts.set(dateKey, (dailyCosts.get(dateKey) || 0) + prediction.estimatedCost);
            }
        }
        return optimizedSchedule;
    }
    /**
     * Calculates health score for an asset
     * @param asset - Asset to score
     * @param sensorReadings - Recent sensor readings
     */
    async calculateHealthScore(asset, sensorReadings) {
        const factors = {};
        // Age factor (0-25 points)
        const ageYears = asset.metadata.constructionDate
            ? (Date.now() - new Date(asset.metadata.constructionDate).getTime()) /
                (365 * 24 * 60 * 60 * 1000)
            : 10;
        factors.age = Math.max(25 - ageYears * 0.5, 0);
        // Sensor data quality factor (0-25 points)
        const recentReadings = sensorReadings.filter((r) => Date.now() - r.timestamp.getTime() < 86400000);
        const avgQuality = recentReadings.length
            ? recentReadings.reduce((sum, r) => sum + ({ HIGH: 1, MEDIUM: 0.7, LOW: 0.4, UNKNOWN: 0.2 }[r.quality] || 0.2), 0) / recentReadings.length
            : 0.5;
        factors.dataQuality = avgQuality * 25;
        // Maintenance history factor (0-25 points)
        const lastInspection = asset.metadata.lastInspection;
        const daysSinceInspection = lastInspection
            ? (Date.now() - new Date(lastInspection).getTime()) / (24 * 60 * 60 * 1000)
            : 365;
        factors.maintenance = Math.max(25 - daysSinceInspection * 0.1, 0);
        // Operating conditions factor (0-25 points)
        factors.operatingConditions = this.assessOperatingConditions(sensorReadings);
        const score = Math.round(factors.age + factors.dataQuality + factors.maintenance + factors.operatingConditions);
        // Store in history
        const history = this.healthHistory.get(asset.id) || [];
        history.push({ timestamp: new Date(), score });
        if (history.length > 365)
            history.shift();
        this.healthHistory.set(asset.id, history);
        return { score: Math.min(score, 100), factors };
    }
    /**
     * Performs cost-benefit analysis for maintenance decision
     * @param asset - Asset to analyze
     * @param prediction - Failure prediction
     */
    async analyzeCostBenefit(asset, prediction) {
        const maintenanceCost = prediction.estimatedCost;
        const replacementCost = this.getReplacementCost(asset);
        const downtimeCost = this.calculateDowntimeCost(asset, prediction);
        const riskCost = this.calculateRiskCost(asset, prediction);
        // Determine recommended action
        const totalMaintainCost = maintenanceCost + downtimeCost * 0.5;
        const totalReplaceCost = replacementCost + downtimeCost;
        const monitorCost = riskCost * prediction.failureProbability;
        let recommendedAction;
        let netBenefit;
        if (asset.healthScore < 20) {
            recommendedAction = 'DECOMMISSION';
            netBenefit = replacementCost * 0.1; // Salvage value
        }
        else if (totalReplaceCost < totalMaintainCost * 1.5 && prediction.failureProbability > 0.7) {
            recommendedAction = 'REPLACE';
            netBenefit = totalMaintainCost - totalReplaceCost;
        }
        else if (prediction.failureProbability < 0.3 && asset.healthScore > 70) {
            recommendedAction = 'MONITOR';
            netBenefit = maintenanceCost - monitorCost;
        }
        else {
            recommendedAction = 'MAINTAIN';
            netBenefit = (riskCost + downtimeCost) - maintenanceCost;
        }
        const paybackPeriod = maintenanceCost / (riskCost / 365);
        return {
            assetId: asset.id,
            maintenanceCost,
            replacementCost,
            downtimeCost,
            riskCost,
            recommendedAction,
            netBenefit,
            paybackPeriod,
        };
    }
    /**
     * Gets health trend for an asset
     * @param assetId - Asset ID
     */
    async getHealthTrend(assetId) {
        const history = this.healthHistory.get(assetId);
        if (!history || history.length < 2)
            return null;
        const dataPoints = history.map((h, i) => ({
            timestamp: h.timestamp,
            healthScore: h.score,
            predictedScore: this.predictFutureScore(history.slice(0, i + 1)),
        }));
        // Calculate trend
        const recentScores = history.slice(-10).map((h) => h.score);
        const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
        const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const diff = secondAvg - firstAvg;
        let trend;
        if (diff > 5)
            trend = 'IMPROVING';
        else if (diff > -5)
            trend = 'STABLE';
        else if (secondAvg > 30)
            trend = 'DEGRADING';
        else
            trend = 'CRITICAL';
        const degradationRate = -diff / (history.length * 0.1);
        return { assetId, dataPoints, trend, degradationRate };
    }
    /**
     * Gets all schedules
     */
    async getSchedules() {
        return Array.from(this.schedules.values());
    }
    /**
     * Updates schedule status
     */
    async updateScheduleStatus(scheduleId, status) {
        const schedule = this.schedules.get(scheduleId);
        if (!schedule)
            return null;
        schedule.status = status;
        return schedule;
    }
    // Private helper methods
    extractFeatures(asset, readings) {
        const recentReadings = readings.filter((r) => Date.now() - r.timestamp.getTime() < 30 * 24 * 60 * 60 * 1000);
        const numericValues = recentReadings
            .filter((r) => typeof r.value === 'number')
            .map((r) => r.value);
        const mean = numericValues.length
            ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
            : 0;
        const variance = numericValues.length
            ? numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
                numericValues.length
            : 0;
        const ageYears = asset.metadata.constructionDate
            ? (Date.now() - new Date(asset.metadata.constructionDate).getTime()) /
                (365 * 24 * 60 * 60 * 1000)
            : 15;
        return {
            healthScore: asset.healthScore,
            age: ageYears,
            sensorMean: mean,
            sensorVariance: variance,
            sensorCount: recentReadings.length,
            daysSinceInspection: asset.metadata.lastInspection
                ? (Date.now() - new Date(asset.metadata.lastInspection).getTime()) /
                    (24 * 60 * 60 * 1000)
                : 365,
        };
    }
    runPredictionModel(features) {
        // Simplified ML model simulation
        const healthWeight = 0.4;
        const ageWeight = 0.25;
        const varianceWeight = 0.2;
        const inspectionWeight = 0.15;
        const normalizedHealth = (100 - features.healthScore) / 100;
        const normalizedAge = Math.min(features.age / 50, 1);
        const normalizedVariance = Math.min(features.sensorVariance / 100, 1);
        const normalizedInspection = Math.min(features.daysSinceInspection / 365, 1);
        const probability = normalizedHealth * healthWeight +
            normalizedAge * ageWeight +
            normalizedVariance * varianceWeight +
            normalizedInspection * inspectionWeight;
        const confidence = features.sensorCount > 100 ? 0.85 : features.sensorCount > 30 ? 0.7 : 0.5;
        return { probability: Math.min(probability, 0.99), confidence };
    }
    estimateDaysToFailure(asset, prediction) {
        const baseDays = this.modelConfig.predictionHorizon;
        const healthFactor = asset.healthScore / 100;
        const probabilityFactor = 1 - prediction.probability;
        return Math.max(Math.round(baseDays * healthFactor * probabilityFactor), 7);
    }
    calculatePriority(probability, asset) {
        const criticalTypes = [digitalTwin_js_1.AssetType.POWER_GRID, digitalTwin_js_1.AssetType.WATER_SYSTEM, digitalTwin_js_1.AssetType.BRIDGE];
        const isCritical = criticalTypes.includes(asset.type);
        if (probability > 0.8 || (probability > 0.6 && isCritical))
            return 'CRITICAL';
        if (probability > 0.5 || (probability > 0.3 && isCritical))
            return 'HIGH';
        if (probability > 0.3)
            return 'MEDIUM';
        return 'LOW';
    }
    generateRecommendation(probability, daysToFailure, asset) {
        if (probability > 0.8) {
            return `Emergency repair required for ${asset.name}. Immediate action needed.`;
        }
        if (probability > 0.5) {
            return `Schedule preventive maintenance within ${Math.min(daysToFailure, 30)} days.`;
        }
        if (probability > 0.3) {
            return `Plan routine inspection. Monitor sensor readings closely.`;
        }
        return `Continue monitoring. Next inspection in ${Math.min(daysToFailure, 90)} days.`;
    }
    estimateMaintenanceCost(asset, recommendation) {
        const baseCosts = {
            [digitalTwin_js_1.AssetType.BUILDING]: 50000,
            [digitalTwin_js_1.AssetType.BRIDGE]: 200000,
            [digitalTwin_js_1.AssetType.ROAD]: 30000,
            [digitalTwin_js_1.AssetType.UTILITY]: 25000,
            [digitalTwin_js_1.AssetType.WATER_SYSTEM]: 75000,
            [digitalTwin_js_1.AssetType.POWER_GRID]: 100000,
            [digitalTwin_js_1.AssetType.TELECOMMUNICATIONS]: 40000,
            [digitalTwin_js_1.AssetType.TRANSIT]: 60000,
            [digitalTwin_js_1.AssetType.GREEN_SPACE]: 10000,
            [digitalTwin_js_1.AssetType.WASTE_MANAGEMENT]: 20000,
        };
        const base = baseCosts[asset.type] || 30000;
        const urgencyMultiplier = recommendation.includes('Emergency') ? 1.5 : 1;
        const healthMultiplier = asset.healthScore < 50 ? 1.3 : 1;
        return Math.round(base * urgencyMultiplier * healthMultiplier);
    }
    calculateConfidenceInterval(predictedDate, confidence) {
        const spreadDays = Math.round((1 - confidence) * 30);
        return {
            lower: new Date(predictedDate.getTime() - spreadDays * 24 * 60 * 60 * 1000),
            upper: new Date(predictedDate.getTime() + spreadDays * 24 * 60 * 60 * 1000),
        };
    }
    findOptimalDate(prediction, dailyJobs, dailyCosts, constraints) {
        const startDate = new Date();
        const maxDate = prediction.confidenceInterval.upper;
        const blackoutSet = new Set((constraints.blackoutDates || []).map((d) => d.toISOString().split('T')[0]));
        for (let d = startDate; d <= maxDate; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            if (blackoutSet.has(dateKey))
                continue;
            if ((dailyJobs.get(dateKey) || 0) >= constraints.maxDailyJobs)
                continue;
            if ((dailyCosts.get(dateKey) || 0) + prediction.estimatedCost >
                constraints.maxDailyCost)
                continue;
            return new Date(d);
        }
        return null;
    }
    estimateDuration(prediction) {
        const baseDuration = { CRITICAL: 8, HIGH: 6, MEDIUM: 4, LOW: 2 };
        return baseDuration[prediction.priority] || 4;
    }
    assessOperatingConditions(readings) {
        if (readings.length === 0)
            return 12.5;
        const qualityScores = { HIGH: 25, MEDIUM: 18, LOW: 10, UNKNOWN: 5 };
        const avgScore = readings.reduce((sum, r) => sum + qualityScores[r.quality], 0) / readings.length;
        return avgScore;
    }
    getReplacementCost(asset) {
        const baseCosts = {
            [digitalTwin_js_1.AssetType.BUILDING]: 500000,
            [digitalTwin_js_1.AssetType.BRIDGE]: 2000000,
            [digitalTwin_js_1.AssetType.ROAD]: 150000,
            [digitalTwin_js_1.AssetType.POWER_GRID]: 800000,
            [digitalTwin_js_1.AssetType.WATER_SYSTEM]: 600000,
        };
        return baseCosts[asset.type] || 200000;
    }
    calculateDowntimeCost(asset, prediction) {
        const hourlyImpact = {
            [digitalTwin_js_1.AssetType.POWER_GRID]: 10000,
            [digitalTwin_js_1.AssetType.WATER_SYSTEM]: 8000,
            [digitalTwin_js_1.AssetType.BRIDGE]: 5000,
            [digitalTwin_js_1.AssetType.ROAD]: 2000,
        };
        const hours = prediction.priority === 'CRITICAL' ? 48 : 24;
        return (hourlyImpact[asset.type] || 1000) * hours;
    }
    calculateRiskCost(asset, prediction) {
        const riskMultipliers = {
            [digitalTwin_js_1.AssetType.BRIDGE]: 5,
            [digitalTwin_js_1.AssetType.POWER_GRID]: 4,
            [digitalTwin_js_1.AssetType.WATER_SYSTEM]: 3,
        };
        const multiplier = riskMultipliers[asset.type] || 1;
        return prediction.estimatedCost * multiplier * prediction.failureProbability;
    }
    predictFutureScore(history) {
        if (history.length < 2)
            return history[0]?.score || 50;
        const scores = history.map((h) => h.score);
        const trend = (scores[scores.length - 1] - scores[0]) / scores.length;
        return Math.max(0, Math.min(100, scores[scores.length - 1] + trend));
    }
}
exports.PredictiveMaintenanceService = PredictiveMaintenanceService;
exports.predictiveMaintenanceService = new PredictiveMaintenanceService();
