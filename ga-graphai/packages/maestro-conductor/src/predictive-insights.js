"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveInsightEngine = void 0;
class PredictiveInsightEngine {
    knowledgeGraph;
    costGuard;
    riskThresholds;
    health = new Map();
    constructor(options) {
        this.knowledgeGraph = options.knowledgeGraph;
        this.costGuard = options.costGuard;
        this.riskThresholds = {
            high: 0.7,
            medium: 0.4,
            ...options.riskThresholds,
        };
    }
    observeHealthSignal(signal) {
        const existing = this.health.get(signal.assetId) ?? {
            lastSignalAt: signal.timestamp,
        };
        const metric = signal.metric.toLowerCase();
        if (metric.includes('latency')) {
            existing.latencyMs = signal.value;
        }
        if (metric.includes('error')) {
            existing.errorRate = signal.value;
        }
        if (metric.includes('saturation') || metric.includes('utilization')) {
            existing.saturation = signal.value;
        }
        existing.lastSignalAt = signal.timestamp;
        this.health.set(signal.assetId, existing);
    }
    buildInsight(serviceId, environmentId) {
        const context = this.knowledgeGraph.queryService(serviceId);
        if (!context) {
            return undefined;
        }
        const serviceRisk = context.risk ?? this.snapshotRisk(serviceId);
        const readinessScore = this.calculateReadiness(serviceRisk, serviceId);
        const insightLevel = this.calculateInsightLevel(serviceRisk);
        const recommendations = this.buildRecommendations(serviceRisk, serviceId, environmentId);
        return {
            serviceId,
            environmentId,
            riskScore: serviceRisk?.score ?? 0,
            readinessScore,
            insightLevel,
            recommendations,
            lastUpdated: new Date(),
        };
    }
    listHighRiskInsights(limit = 5) {
        const snapshot = this.knowledgeGraph.snapshot();
        return Object.entries(snapshot.serviceRisk)
            .filter(([, profile]) => profile.score >= this.riskThresholds.medium)
            .sort(([, a], [, b]) => b.score - a.score)
            .slice(0, limit)
            .map(([serviceId, profile]) => {
            const environmentId = this.knowledgeGraph.queryService(serviceId)?.environments?.[0]?.id ?? 'unknown';
            return this.buildInsight(serviceId, environmentId) ?? {
                serviceId,
                environmentId,
                riskScore: profile.score,
                readinessScore: this.calculateReadiness(profile, serviceId),
                insightLevel: this.calculateInsightLevel(profile),
                recommendations: [],
                lastUpdated: new Date(),
            };
        });
    }
    snapshotRisk(serviceId) {
        const snapshot = this.knowledgeGraph.snapshot();
        return snapshot.serviceRisk[serviceId];
    }
    calculateInsightLevel(profile) {
        const score = profile?.score ?? 0;
        if (score >= this.riskThresholds.high) {
            return 'high';
        }
        if (score >= this.riskThresholds.medium) {
            return 'medium';
        }
        return 'low';
    }
    calculateReadiness(profile, serviceId) {
        const risk = 1 - (profile?.score ?? 0);
        const health = this.health.get(serviceId);
        const latencyFactor = health?.latencyMs ? Math.max(0, 1 - health.latencyMs / 2000) : 1;
        const errorFactor = health?.errorRate ? Math.max(0, 1 - health.errorRate * 5) : 1;
        const saturationFactor = health?.saturation ? Math.max(0, 1 - health.saturation) : 1;
        const costFactor = this.costGuard ? Math.max(0, 1 - this.costGuard.metrics.budgetsExceeded / 10) : 1;
        return Number(Math.min(1, Math.max(0, (risk * 0.5 + latencyFactor * 0.2 + errorFactor * 0.2 + saturationFactor * 0.05 + costFactor * 0.05))).toFixed(3));
    }
    buildRecommendations(profile, serviceId, environmentId) {
        const recommendations = [];
        if (!profile) {
            recommendations.push('Refresh knowledge graph snapshot before executing high-impact changes.');
            return recommendations;
        }
        if (profile.factors.incidentLoad > 1) {
            recommendations.push('Run rehearsal of self-healing playbooks prior to deployment.');
        }
        if (profile.factors.costPressure > 0.5) {
            recommendations.push('Engage cost guard to validate scaling or provisioning requests.');
        }
        if (profile.score >= this.riskThresholds.high) {
            recommendations.push('Require senior approver sign-off and schedule during low-traffic window.');
        }
        const health = this.health.get(serviceId);
        if (health?.latencyMs && health.latencyMs > 1500) {
            recommendations.push('Latency trending high; consider canary rollout with throttled traffic.');
        }
        if (health?.saturation && health.saturation > 0.85) {
            recommendations.push('Capacity saturation detected; pre-scale infrastructure.');
        }
        recommendations.push(`Capture release readiness survey for ${serviceId} in ${environmentId}.`);
        return recommendations;
    }
}
exports.PredictiveInsightEngine = PredictiveInsightEngine;
