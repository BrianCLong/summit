"use strict";
/**
 * Anomaly Detection Service
 *
 * AI-powered anomaly detection for security, compliance, and operational insights.
 * Supports multiple detection algorithms and real-time monitoring.
 *
 * SOC 2 Controls: CC7.2 (Incident Detection), CC4.1 (Monitoring)
 *
 * @module analytics/AnomalyDetectionService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyDetectionService = void 0;
exports.getAnomalyDetectionService = getAnomalyDetectionService;
const uuid_1 = require("uuid");
const events_1 = require("events");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'anomaly-detection-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'AnomalyDetectionService',
    };
}
function calculateSeverity(anomalyScore) {
    if (anomalyScore >= 0.9)
        return 'critical';
    if (anomalyScore >= 0.7)
        return 'high';
    if (anomalyScore >= 0.5)
        return 'medium';
    if (anomalyScore >= 0.3)
        return 'low';
    return 'info';
}
function calculateSuggestedAction(severity, anomalyType) {
    if (severity === 'critical')
        return 'block';
    if (severity === 'high')
        return 'investigate';
    if (severity === 'medium')
        return 'review';
    if (anomalyType === 'behavioral')
        return 'review';
    return 'monitor';
}
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    sensitivity: 0.7,
    minAnomalyScore: 0.3,
    windowSize: 100,
    realTimeEnabled: true,
    batchSize: 1000,
};
// ============================================================================
// Statistical Anomaly Detector
// ============================================================================
class StatisticalAnomalyDetector {
    windowData = new Map();
    windowSize;
    constructor(windowSize) {
        this.windowSize = windowSize;
    }
    /**
     * Detect statistical anomalies using z-score
     */
    detect(dataPoint, sensitivity) {
        const key = `${dataPoint.tenantId}:${dataPoint.feature}`;
        let window = this.windowData.get(key) || [];
        // Add to window
        window.push(dataPoint.value);
        if (window.length > this.windowSize) {
            window = window.slice(-this.windowSize);
        }
        this.windowData.set(key, window);
        // Need minimum data for statistics
        if (window.length < 10) {
            return { score: 0, deviation: 0, expected: dataPoint.value };
        }
        // Calculate statistics
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0) {
            return { score: 0, deviation: 0, expected: mean };
        }
        // Calculate z-score
        const zScore = Math.abs((dataPoint.value - mean) / stdDev);
        // Convert to anomaly score (0-1) with sensitivity adjustment
        const baseThreshold = 3 - (2 * sensitivity); // 1-3 based on sensitivity
        const score = Math.min(1, Math.max(0, (zScore - baseThreshold) / 2));
        return {
            score,
            deviation: zScore,
            expected: mean,
        };
    }
    /**
     * Clear window data for a tenant
     */
    clearTenant(tenantId) {
        for (const key of this.windowData.keys()) {
            if (key.startsWith(`${tenantId}:`)) {
                this.windowData.delete(key);
            }
        }
    }
}
// ============================================================================
// Isolation Forest (Simplified)
// ============================================================================
class IsolationForestDetector {
    trees = 100;
    sampleSize = 256;
    /**
     * Detect anomalies using isolation forest principles
     * (Simplified implementation - in production use ML library)
     */
    detect(features, baseline) {
        if (baseline.length < this.sampleSize) {
            return 0;
        }
        // Calculate average path length for the data point
        let totalPathLength = 0;
        for (let t = 0; t < this.trees; t++) {
            // Sample baseline
            const sample = this.randomSample(baseline, this.sampleSize);
            totalPathLength += this.calculatePathLength(features, sample, 0);
        }
        const avgPathLength = totalPathLength / this.trees;
        // Normalize score (shorter path = more anomalous)
        const c = this.averagePathLength(this.sampleSize);
        const score = Math.pow(2, -avgPathLength / c);
        return score;
    }
    calculatePathLength(point, data, depth) {
        if (data.length <= 1 || depth >= 10) {
            return depth + this.averagePathLength(data.length);
        }
        // Random feature and split point
        const featureIdx = Math.floor(Math.random() * point.length);
        const values = data.map(d => d[featureIdx]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        if (min === max) {
            return depth + this.averagePathLength(data.length);
        }
        const splitValue = min + Math.random() * (max - min);
        // Split data
        const left = data.filter(d => d[featureIdx] < splitValue);
        const right = data.filter(d => d[featureIdx] >= splitValue);
        // Follow path
        if (point[featureIdx] < splitValue) {
            return this.calculatePathLength(point, left, depth + 1);
        }
        else {
            return this.calculatePathLength(point, right, depth + 1);
        }
    }
    averagePathLength(n) {
        if (n <= 1)
            return 0;
        return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
    }
    randomSample(array, size) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, size);
    }
}
class UserBehaviorAnalyzer {
    profiles = new Map();
    decayFactor = 0.95;
    /**
     * Update user profile with new activity
     */
    updateProfile(userId, tenantId, action, metadata) {
        const key = `${tenantId}:${userId}`;
        let profile = this.profiles.get(key);
        if (!profile) {
            profile = {
                userId,
                tenantId,
                actionCounts: new Map(),
                timePatterns: new Map(),
                locationHistory: new Set(),
                averageSessionDuration: 0,
                lastActivity: Date.now(),
            };
            this.profiles.set(key, profile);
        }
        // Update action counts
        const currentCount = profile.actionCounts.get(action) || 0;
        profile.actionCounts.set(action, currentCount + 1);
        // Update time pattern
        const hour = new Date().getHours();
        const hourCount = profile.timePatterns.get(hour) || 0;
        profile.timePatterns.set(hour, hourCount + 1);
        // Update location if available
        if (metadata.location) {
            profile.locationHistory.add(metadata.location);
        }
        profile.lastActivity = Date.now();
    }
    /**
     * Analyze if current activity is anomalous for user
     */
    analyzeActivity(userId, tenantId, action, metadata) {
        const key = `${tenantId}:${userId}`;
        const profile = this.profiles.get(key);
        if (!profile) {
            // New user, can't determine anomaly
            return { score: 0, reasons: ['New user profile'] };
        }
        const reasons = [];
        let totalScore = 0;
        let factors = 0;
        // Check action frequency
        const actionCount = profile.actionCounts.get(action) || 0;
        const totalActions = Array.from(profile.actionCounts.values())
            .reduce((a, b) => a + b, 0);
        if (totalActions > 10) {
            const expectedFrequency = actionCount / totalActions;
            if (expectedFrequency < 0.01) {
                totalScore += 0.5;
                reasons.push('Rare action for this user');
            }
            factors++;
        }
        // Check time pattern
        const hour = new Date().getHours();
        const hourCount = profile.timePatterns.get(hour) || 0;
        const totalHourCounts = Array.from(profile.timePatterns.values())
            .reduce((a, b) => a + b, 0);
        if (totalHourCounts > 20) {
            const expectedHourFrequency = hourCount / totalHourCounts;
            if (expectedHourFrequency < 0.02) {
                totalScore += 0.4;
                reasons.push('Unusual time of activity');
            }
            factors++;
        }
        // Check location
        if (metadata.location && profile.locationHistory.size > 0) {
            if (!profile.locationHistory.has(metadata.location)) {
                totalScore += 0.6;
                reasons.push('New location detected');
            }
            factors++;
        }
        // Check activity gap
        const hoursSinceLastActivity = (Date.now() - profile.lastActivity) / (1000 * 60 * 60);
        if (hoursSinceLastActivity > 720) { // 30 days
            totalScore += 0.3;
            reasons.push('Long inactivity period');
            factors++;
        }
        const score = factors > 0 ? totalScore / factors : 0;
        return { score: Math.min(1, score), reasons };
    }
}
// ============================================================================
// Anomaly Detection Service
// ============================================================================
class AnomalyDetectionService extends events_1.EventEmitter {
    config;
    statisticalDetector;
    isolationForest;
    behaviorAnalyzer;
    baselineData = new Map();
    stats;
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.statisticalDetector = new StatisticalAnomalyDetector(this.config.windowSize);
        this.isolationForest = new IsolationForestDetector();
        this.behaviorAnalyzer = new UserBehaviorAnalyzer();
        this.stats = {
            totalAnalyzed: 0,
            anomaliesDetected: 0,
            byType: {
                statistical: 0,
                behavioral: 0,
                sequence: 0,
                volume: 0,
                pattern: 0,
            },
            bySeverity: {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0,
            },
            averageConfidence: 0,
            lastDetectionAt: null,
        };
        logger_js_1.default.info({ config: this.config }, 'AnomalyDetectionService initialized');
    }
    /**
     * Analyze a single data point for anomalies
     */
    async analyzeDataPoint(dataPoint) {
        this.stats.totalAnalyzed++;
        // Statistical anomaly detection
        const statResult = this.statisticalDetector.detect(dataPoint, this.config.sensitivity);
        if (statResult.score < this.config.minAnomalyScore) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'AnomalyDetectionService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'No anomaly detected'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        const severity = calculateSeverity(statResult.score);
        const action = calculateSuggestedAction(severity, 'statistical');
        const result = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            tenantId: dataPoint.tenantId,
            anomalyScore: statResult.score,
            confidence: Math.min(0.95, 0.5 + (statResult.deviation / 10)),
            anomalyType: 'statistical',
            severity,
            suggestedAction: action,
            details: {
                feature: dataPoint.feature,
                observedValue: dataPoint.value,
                expectedValue: statResult.expected,
                threshold: this.config.minAnomalyScore,
                deviation: statResult.deviation,
                context: dataPoint.metadata || {},
                relatedEntities: [],
            },
            governanceVerdict: createVerdict(severity === 'critical' || severity === 'high' ? data_envelope_js_1.GovernanceResult.FLAG : data_envelope_js_1.GovernanceResult.ALLOW, `Statistical anomaly detected: ${severity} severity`),
        };
        this.recordAnomaly(result);
        this.emit('anomaly:detected', result);
        logger_js_1.default.info({
            anomalyId: result.id,
            tenantId: result.tenantId,
            anomalyType: result.anomalyType,
            severity: result.severity,
            score: result.anomalyScore,
        }, 'Anomaly detected');
        return (0, data_envelope_js_1.createDataEnvelope)(result, {
            source: 'AnomalyDetectionService',
            governanceVerdict: result.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Analyze user behavior for anomalies
     */
    async analyzeUserBehavior(userId, tenantId, action, metadata) {
        this.stats.totalAnalyzed++;
        // Update profile
        this.behaviorAnalyzer.updateProfile(userId, tenantId, action, metadata);
        // Analyze activity
        const analysis = this.behaviorAnalyzer.analyzeActivity(userId, tenantId, action, metadata);
        if (analysis.score < this.config.minAnomalyScore) {
            return (0, data_envelope_js_1.createDataEnvelope)(null, {
                source: 'AnomalyDetectionService',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Normal behavior'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        const severity = calculateSeverity(analysis.score);
        const suggestedAction = calculateSuggestedAction(severity, 'behavioral');
        const result = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date().toISOString(),
            tenantId,
            anomalyScore: analysis.score,
            confidence: 0.7, // Behavioral analysis has moderate confidence
            anomalyType: 'behavioral',
            severity,
            suggestedAction,
            details: {
                feature: 'user_behavior',
                observedValue: analysis.score,
                expectedValue: 0,
                threshold: this.config.minAnomalyScore,
                deviation: analysis.score,
                context: {
                    userId,
                    action,
                    reasons: analysis.reasons,
                    ...metadata,
                },
                relatedEntities: [userId],
            },
            governanceVerdict: createVerdict(severity === 'critical' ? data_envelope_js_1.GovernanceResult.DENY :
                severity === 'high' ? data_envelope_js_1.GovernanceResult.FLAG :
                    data_envelope_js_1.GovernanceResult.ALLOW, `Behavioral anomaly: ${analysis.reasons.join(', ')}`),
        };
        this.recordAnomaly(result);
        this.emit('anomaly:detected', result);
        return (0, data_envelope_js_1.createDataEnvelope)(result, {
            source: 'AnomalyDetectionService',
            governanceVerdict: result.governanceVerdict,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Batch analyze multiple data points
     */
    async analyzeBatch(dataPoints) {
        const results = [];
        for (const point of dataPoints) {
            const result = await this.analyzeDataPoint(point);
            if (result.data) {
                results.push(result.data);
            }
        }
        return (0, data_envelope_js_1.createDataEnvelope)(results, {
            source: 'AnomalyDetectionService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Batch analysis complete: ${results.length} anomalies in ${dataPoints.length} points`),
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        });
    }
    /**
     * Add baseline data for isolation forest
     */
    addBaseline(tenantId, features) {
        const existing = this.baselineData.get(tenantId) || [];
        this.baselineData.set(tenantId, [...existing, ...features].slice(-10000));
    }
    /**
     * Get detection statistics
     */
    getStats() {
        return (0, data_envelope_js_1.createDataEnvelope)({ ...this.stats }, {
            source: 'AnomalyDetectionService',
            governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Stats retrieved'),
            classification: data_envelope_js_1.DataClassification.INTERNAL,
        });
    }
    /**
     * Clear tenant data
     */
    clearTenant(tenantId) {
        this.statisticalDetector.clearTenant(tenantId);
        this.baselineData.delete(tenantId);
        logger_js_1.default.info({ tenantId }, 'Tenant data cleared from anomaly detector');
    }
    // --------------------------------------------------------------------------
    // Private Methods
    // --------------------------------------------------------------------------
    recordAnomaly(result) {
        this.stats.anomaliesDetected++;
        this.stats.byType[result.anomalyType]++;
        this.stats.bySeverity[result.severity]++;
        this.stats.lastDetectionAt = result.timestamp;
        // Update average confidence
        const n = this.stats.anomaliesDetected;
        this.stats.averageConfidence =
            ((this.stats.averageConfidence * (n - 1)) + result.confidence) / n;
    }
}
exports.AnomalyDetectionService = AnomalyDetectionService;
// ============================================================================
// Singleton Factory
// ============================================================================
let instance = null;
function getAnomalyDetectionService(config) {
    if (!instance) {
        instance = new AnomalyDetectionService(config);
    }
    return instance;
}
exports.default = AnomalyDetectionService;
