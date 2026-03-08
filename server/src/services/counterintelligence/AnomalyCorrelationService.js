"use strict";
/**
 * Anomaly Correlation Service
 *
 * Multi-source anomaly detection and correlation engine that connects the dots
 * across disparate data streams to identify threat patterns and insider risks.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anomalyCorrelationService = exports.AnomalyCorrelationService = void 0;
const crypto_1 = require("crypto");
// @ts-ignore
const pino_1 = __importDefault(require("pino"));
// @ts-ignore
const logger = pino_1.default({ name: 'AnomalyCorrelationService' });
class AnomalyCorrelationService {
    anomalies = new Map();
    clusters = new Map();
    riskScores = new Map();
    threatPatterns = [];
    alerts = new Map();
    constructor() {
        this.initializeThreatPatterns();
        logger.info('Anomaly Correlation Service initialized');
    }
    initializeThreatPatterns() {
        this.threatPatterns = [
            {
                type: 'INSIDER_THREAT',
                name: 'Data Exfiltration Pattern',
                description: 'Pattern indicating potential unauthorized data removal',
                stages: [
                    {
                        name: 'Reconnaissance',
                        order: 1,
                        requiredAnomalies: ['ACCESS_ANOMALY'],
                        optionalAnomalies: ['BEHAVIORAL_DEVIATION'],
                        timeWindow: 168, // 1 week
                    },
                    {
                        name: 'Collection',
                        order: 2,
                        requiredAnomalies: ['DATA_EXFILTRATION'],
                        optionalAnomalies: ['ACCESS_ANOMALY', 'TEMPORAL_ANOMALY'],
                        timeWindow: 72,
                    },
                    {
                        name: 'Exfiltration',
                        order: 3,
                        requiredAnomalies: ['DATA_EXFILTRATION', 'NETWORK_ANOMALY'],
                        optionalAnomalies: ['TEMPORAL_ANOMALY'],
                        timeWindow: 24,
                    },
                ],
                indicators: [
                    'Unusual data access volume',
                    'After-hours activity',
                    'USB device usage',
                    'Cloud upload activity',
                    'Email to personal accounts',
                ],
                mitreMapping: ['T1020', 'T1041', 'T1048', 'T1567'],
            },
            {
                type: 'ESPIONAGE',
                name: 'Foreign Recruitment Pattern',
                description: 'Pattern indicating potential foreign intelligence recruitment',
                stages: [
                    {
                        name: 'Spotting',
                        order: 1,
                        requiredAnomalies: ['FOREIGN_CONTACT'],
                        optionalAnomalies: ['TRAVEL_ANOMALY'],
                        timeWindow: 720, // 30 days
                    },
                    {
                        name: 'Assessment',
                        order: 2,
                        requiredAnomalies: ['COMMUNICATION_PATTERN', 'FOREIGN_CONTACT'],
                        optionalAnomalies: ['FINANCIAL_ANOMALY'],
                        timeWindow: 336, // 14 days
                    },
                    {
                        name: 'Development',
                        order: 3,
                        requiredAnomalies: ['BEHAVIORAL_DEVIATION'],
                        optionalAnomalies: ['FINANCIAL_ANOMALY', 'TRAVEL_ANOMALY'],
                        timeWindow: 168,
                    },
                ],
                indicators: [
                    'Undisclosed foreign contacts',
                    'Unusual travel patterns',
                    'Financial stress indicators',
                    'Access to sensitive information',
                    'Ideological indicators',
                ],
                mitreMapping: [],
            },
            {
                type: 'APT_CAMPAIGN',
                name: 'Advanced Persistent Threat',
                description: 'Pattern indicating sophisticated external intrusion',
                stages: [
                    {
                        name: 'Initial Access',
                        order: 1,
                        requiredAnomalies: ['AUTHENTICATION_ANOMALY'],
                        optionalAnomalies: ['SOCIAL_ENGINEERING'],
                        timeWindow: 24,
                    },
                    {
                        name: 'Persistence',
                        order: 2,
                        requiredAnomalies: ['PRIVILEGE_ESCALATION'],
                        optionalAnomalies: ['NETWORK_ANOMALY'],
                        timeWindow: 72,
                    },
                    {
                        name: 'Lateral Movement',
                        order: 3,
                        requiredAnomalies: ['ACCESS_ANOMALY', 'NETWORK_ANOMALY'],
                        optionalAnomalies: ['AUTHENTICATION_ANOMALY'],
                        timeWindow: 168,
                    },
                    {
                        name: 'Collection & Exfiltration',
                        order: 4,
                        requiredAnomalies: ['DATA_EXFILTRATION'],
                        optionalAnomalies: ['NETWORK_ANOMALY'],
                        timeWindow: 48,
                    },
                ],
                indicators: [
                    'Unusual authentication patterns',
                    'Lateral movement indicators',
                    'C2 traffic patterns',
                    'Living-off-the-land techniques',
                    'Data staging behavior',
                ],
                mitreMapping: ['T1078', 'T1068', 'T1021', 'T1074', 'T1041'],
            },
        ];
    }
    /**
     * Ingest and process a new anomaly
     */
    async ingestAnomaly(input) {
        const anomaly = {
            id: (0, crypto_1.randomUUID)(),
            type: input.type,
            severity: this.calculateSeverity(input),
            confidence: input.confidence || 0.7,
            source: input.source,
            timestamp: input.timestamp || new Date(),
            entityId: input.entityId,
            description: input.description,
            indicators: input.indicators || [],
            context: await this.buildContext(input),
            status: 'NEW',
            correlations: [],
        };
        this.anomalies.set(anomaly.id, anomaly);
        // Update entity risk score
        if (anomaly.entityId) {
            await this.updateRiskScore(anomaly.entityId, anomaly);
        }
        // Attempt correlation
        await this.correlateAnomaly(anomaly);
        logger.info(`Ingested anomaly: ${anomaly.type} (${anomaly.id}) - Severity: ${anomaly.severity}`);
        return anomaly;
    }
    /**
     * Correlate anomalies across multiple dimensions
     */
    async correlateAnomalies() {
        const newClusters = [];
        const uncorrelated = Array.from(this.anomalies.values())
            .filter(a => a.status === 'NEW' || a.status === 'INVESTIGATING');
        // Temporal correlation
        const temporalGroups = this.groupByTimeWindow(uncorrelated, 24 * 60 * 60 * 1000); // 24 hours
        for (const group of temporalGroups) {
            if (group.length < 2)
                continue;
            // Entity correlation
            const entityGroups = this.groupByEntity(group);
            for (const [entityId, entityAnomalies] of Object.entries(entityGroups)) {
                if (entityAnomalies.length < 2)
                    continue;
                // Pattern matching
                const matchedPattern = this.matchThreatPattern(entityAnomalies);
                if (matchedPattern) {
                    const cluster = await this.createCluster(entityAnomalies, matchedPattern);
                    newClusters.push(cluster);
                    // Update anomaly statuses
                    for (const anomaly of entityAnomalies) {
                        anomaly.status = 'CORRELATED';
                        anomaly.correlations.push(cluster.id);
                    }
                    // Generate alert if severity warrants
                    if (cluster.severity === 'HIGH' || cluster.severity === 'CRITICAL') {
                        await this.generateAlert(cluster);
                    }
                }
            }
        }
        // Cross-entity correlation for coordinated threats
        const crossEntityClusters = await this.detectCrossEntityPatterns(uncorrelated);
        newClusters.push(...crossEntityClusters);
        return newClusters;
    }
    /**
     * Calculate composite risk score for an entity
     */
    async calculateRiskScore(entityId) {
        const entityAnomalies = Array.from(this.anomalies.values())
            .filter(a => a.entityId === entityId);
        const components = [
            this.calculateBehavioralRisk(entityAnomalies),
            this.calculateAccessRisk(entityAnomalies),
            this.calculateTechnicalRisk(entityAnomalies),
            this.calculatePersonalRisk(entityAnomalies),
            this.calculateFinancialRisk(entityAnomalies),
            this.calculateForeignNexusRisk(entityAnomalies),
        ];
        const overallScore = components.reduce((sum, c) => sum + c.score * c.weight, 0) /
            components.reduce((sum, c) => sum + c.weight, 0);
        const previousScore = this.riskScores.get(entityId);
        const trend = previousScore
            ? overallScore > previousScore.overallScore + 5 ? 'INCREASING'
                : overallScore < previousScore.overallScore - 5 ? 'DECREASING'
                    : 'STABLE'
            : 'STABLE';
        const riskScore = {
            entityId,
            overallScore,
            components,
            trend,
            percentileRank: this.calculatePercentileRank(overallScore),
            lastUpdated: new Date(),
            contributingAnomalies: entityAnomalies.map(a => a.id),
        };
        this.riskScores.set(entityId, riskScore);
        return riskScore;
    }
    /**
     * Query anomalies with complex filters
     */
    queryAnomalies(query) {
        let results = Array.from(this.anomalies.values());
        if (query.types) {
            results = results.filter(a => query.types.includes(a.type));
        }
        if (query.severities) {
            results = results.filter(a => query.severities.includes(a.severity));
        }
        if (query.entityIds) {
            results = results.filter(a => a.entityId && query.entityIds.includes(a.entityId));
        }
        if (query.sources) {
            results = results.filter(a => query.sources.includes(a.source.type));
        }
        if (query.startDate) {
            results = results.filter(a => a.timestamp >= query.startDate);
        }
        if (query.endDate) {
            results = results.filter(a => a.timestamp <= query.endDate);
        }
        if (query.minConfidence) {
            results = results.filter(a => a.confidence >= query.minConfidence);
        }
        if (query.statuses) {
            results = results.filter(a => query.statuses.includes(a.status));
        }
        // Sort by timestamp descending
        results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        // Apply pagination
        if (query.offset) {
            results = results.slice(query.offset);
        }
        if (query.limit) {
            results = results.slice(0, query.limit);
        }
        return results;
    }
    /**
     * Get high-risk entities requiring attention
     */
    getHighRiskEntities(threshold = 70) {
        return Array.from(this.riskScores.values())
            .filter(r => r.overallScore >= threshold)
            .sort((a, b) => b.overallScore - a.overallScore);
    }
    /**
     * Generate threat intelligence from correlation data
     */
    async generateThreatIntelligence() {
        const activeClusters = Array.from(this.clusters.values())
            .filter(c => c.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const topThreats = activeClusters
            .filter(c => c.severity === 'HIGH' || c.severity === 'CRITICAL')
            .slice(0, 10);
        const trendAnalysis = this.analyzeTrends();
        const emergingPatterns = this.detectEmergingPatterns();
        return {
            generatedAt: new Date(),
            period: {
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                end: new Date(),
            },
            summary: {
                totalAnomalies: this.anomalies.size,
                criticalClusters: activeClusters.filter(c => c.severity === 'CRITICAL').length,
                highRiskEntities: this.getHighRiskEntities(80).length,
                activeInvestigations: Array.from(this.alerts.values()).filter(a => a.status === 'INVESTIGATING').length,
            },
            topThreats: topThreats.map(c => ({
                clusterId: c.id,
                name: c.name,
                pattern: c.pattern.type,
                severity: c.severity,
                confidence: c.confidence,
                entities: c.entities,
                recommendation: c.recommendations[0],
            })),
            trendAnalysis,
            emergingPatterns,
            recommendations: this.generateStrategicRecommendations(activeClusters, trendAnalysis),
        };
    }
    // Private helper methods
    calculateSeverity(input) {
        const weights = {
            BEHAVIORAL_DEVIATION: 40,
            ACCESS_ANOMALY: 50,
            COMMUNICATION_PATTERN: 30,
            TEMPORAL_ANOMALY: 20,
            GEOSPATIAL_ANOMALY: 30,
            NETWORK_ANOMALY: 50,
            DATA_EXFILTRATION: 80,
            PRIVILEGE_ESCALATION: 70,
            AUTHENTICATION_ANOMALY: 60,
            SOCIAL_ENGINEERING: 50,
            INSIDER_THREAT_INDICATOR: 90,
            FOREIGN_CONTACT: 70,
            FINANCIAL_ANOMALY: 40,
            TRAVEL_ANOMALY: 30,
        };
        const baseScore = weights[input.type] || 50;
        const confidenceAdjusted = baseScore * (input.confidence || 0.7);
        if (confidenceAdjusted >= 80)
            return 'CRITICAL';
        if (confidenceAdjusted >= 60)
            return 'HIGH';
        if (confidenceAdjusted >= 40)
            return 'MEDIUM';
        if (confidenceAdjusted >= 20)
            return 'LOW';
        return 'INFO';
    }
    async buildContext(input) {
        const context = {};
        if (input.entityId) {
            context.entityProfile = await this.getEntityProfile(input.entityId);
            context.historicalBaseline = await this.getHistoricalBaseline(input.entityId, input.type);
            context.peerComparison = await this.getPeerComparison(input.entityId, input.type);
        }
        context.environmentalFactors = this.getEnvironmentalFactors();
        context.relatedEvents = await this.findRelatedEvents(input);
        return context;
    }
    async getEntityProfile(entityId) {
        // Would integrate with entity management system
        return undefined;
    }
    async getHistoricalBaseline(entityId, type) {
        return undefined;
    }
    async getPeerComparison(entityId, type) {
        return undefined;
    }
    getEnvironmentalFactors() {
        return [];
    }
    async findRelatedEvents(input) {
        return [];
    }
    async correlateAnomaly(anomaly) {
        // Find recent anomalies for same entity
        if (!anomaly.entityId)
            return;
        const relatedAnomalies = Array.from(this.anomalies.values())
            .filter(a => a.id !== anomaly.id &&
            a.entityId === anomaly.entityId &&
            a.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        if (relatedAnomalies.length === 0)
            return;
        const allAnomalies = [anomaly, ...relatedAnomalies];
        const matchedPattern = this.matchThreatPattern(allAnomalies);
        if (matchedPattern) {
            const existingCluster = Array.from(this.clusters.values())
                .find(c => c.entities.includes(anomaly.entityId) && c.pattern.type === matchedPattern.type);
            if (existingCluster) {
                this.updateCluster(existingCluster, anomaly);
            }
            else {
                const cluster = await this.createCluster(allAnomalies, matchedPattern);
                if (cluster.severity === 'HIGH' || cluster.severity === 'CRITICAL') {
                    await this.generateAlert(cluster);
                }
            }
        }
    }
    groupByTimeWindow(anomalies, windowMs) {
        const sorted = [...anomalies].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const groups = [];
        let currentGroup = [];
        for (const anomaly of sorted) {
            if (currentGroup.length === 0) {
                currentGroup.push(anomaly);
            }
            else {
                const lastTimestamp = currentGroup[currentGroup.length - 1].timestamp.getTime();
                if (anomaly.timestamp.getTime() - lastTimestamp <= windowMs) {
                    currentGroup.push(anomaly);
                }
                else {
                    groups.push(currentGroup);
                    currentGroup = [anomaly];
                }
            }
        }
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        return groups;
    }
    groupByEntity(anomalies) {
        const groups = {};
        for (const anomaly of anomalies) {
            if (anomaly.entityId) {
                if (!groups[anomaly.entityId]) {
                    groups[anomaly.entityId] = [];
                }
                groups[anomaly.entityId].push(anomaly);
            }
        }
        return groups;
    }
    matchThreatPattern(anomalies) {
        const anomalyTypes = new Set(anomalies.map(a => a.type));
        for (const pattern of this.threatPatterns) {
            let stagesMatched = 0;
            for (const stage of pattern.stages) {
                const requiredMatched = stage.requiredAnomalies.every(t => anomalyTypes.has(t));
                const optionalMatched = stage.optionalAnomalies.some(t => anomalyTypes.has(t));
                if (requiredMatched || (stage.optionalAnomalies.length > 0 && optionalMatched)) {
                    stagesMatched++;
                }
            }
            // Require at least 2 stages to match
            if (stagesMatched >= 2) {
                return pattern;
            }
        }
        return null;
    }
    async createCluster(anomalies, pattern) {
        const entities = Array.from(new Set(anomalies.filter(a => a.entityId).map(a => a.entityId)));
        const timestamps = anomalies.map(a => a.timestamp.getTime());
        const cluster = {
            id: (0, crypto_1.randomUUID)(),
            name: `${pattern.name} - ${entities.join(', ').substring(0, 50)}`,
            anomalies,
            pattern,
            confidence: this.calculateClusterConfidence(anomalies, pattern),
            severity: this.calculateClusterSeverity(anomalies),
            timeline: {
                start: new Date(Math.min(...timestamps)),
                end: new Date(Math.max(...timestamps)),
                events: anomalies.map(a => ({
                    timestamp: a.timestamp,
                    anomalyId: a.id,
                    type: a.type,
                    description: a.description,
                })),
                velocity: anomalies.length / ((Math.max(...timestamps) - Math.min(...timestamps)) / 3600000 || 1),
                acceleration: 0,
            },
            entities,
            hypothesis: this.generateHypothesis(anomalies, pattern),
            recommendations: this.generateClusterRecommendations(pattern, anomalies),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.clusters.set(cluster.id, cluster);
        logger.info(`Created correlation cluster: ${cluster.name} (${cluster.id})`);
        return cluster;
    }
    updateCluster(cluster, anomaly) {
        cluster.anomalies.push(anomaly);
        cluster.timeline.events.push({
            timestamp: anomaly.timestamp,
            anomalyId: anomaly.id,
            type: anomaly.type,
            description: anomaly.description,
        });
        cluster.timeline.end = anomaly.timestamp;
        cluster.updatedAt = new Date();
        // Recalculate confidence and severity
        cluster.confidence = this.calculateClusterConfidence(cluster.anomalies, cluster.pattern);
        cluster.severity = this.calculateClusterSeverity(cluster.anomalies);
        anomaly.status = 'CORRELATED';
        anomaly.correlations.push(cluster.id);
    }
    calculateClusterConfidence(anomalies, pattern) {
        const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length;
        const stagesCovered = this.countStagesCovered(anomalies, pattern);
        const stageCoverage = stagesCovered / pattern.stages.length;
        return avgConfidence * 0.6 + stageCoverage * 0.4;
    }
    countStagesCovered(anomalies, pattern) {
        const types = new Set(anomalies.map(a => a.type));
        return pattern.stages.filter(s => s.requiredAnomalies.some(t => types.has(t))).length;
    }
    calculateClusterSeverity(anomalies) {
        const severityOrder = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const maxSeverity = anomalies.reduce((max, a) => {
            const current = severityOrder.indexOf(a.severity);
            const maxIdx = severityOrder.indexOf(max);
            return current > maxIdx ? a.severity : max;
        }, 'INFO');
        // Escalate if multiple high-severity anomalies
        const highSeverityCount = anomalies.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length;
        if (highSeverityCount >= 3 && maxSeverity === 'HIGH') {
            return 'CRITICAL';
        }
        return maxSeverity;
    }
    generateHypothesis(anomalies, pattern) {
        return {
            primary: `Potential ${pattern.type.toLowerCase().replace(/_/g, ' ')} activity detected`,
            confidence: 0.7,
            alternatives: [
                {
                    hypothesis: 'Legitimate business activity',
                    probability: 0.2,
                    requiredEvidence: ['Business justification', 'Management approval'],
                },
                {
                    hypothesis: 'Technical misconfiguration',
                    probability: 0.1,
                    requiredEvidence: ['System logs', 'Configuration audit'],
                },
            ],
            evidenceFor: anomalies.map(a => a.description),
            evidenceAgainst: [],
            gaps: ['User interview', 'Full timeline reconstruction', 'Data classification review'],
        };
    }
    generateClusterRecommendations(pattern, anomalies) {
        const recommendations = [];
        switch (pattern.type) {
            case 'INSIDER_THREAT':
                recommendations.push('Initiate insider threat investigation protocol');
                recommendations.push('Review subject access logs for past 90 days');
                recommendations.push('Coordinate with HR for personnel review');
                recommendations.push('Consider enhanced monitoring');
                break;
            case 'ESPIONAGE':
                recommendations.push('Engage counterintelligence team');
                recommendations.push('Review foreign contact disclosures');
                recommendations.push('Assess access to classified information');
                recommendations.push('Coordinate with security officer');
                break;
            case 'APT_CAMPAIGN':
                recommendations.push('Isolate affected systems');
                recommendations.push('Engage incident response team');
                recommendations.push('Preserve forensic evidence');
                recommendations.push('Assess lateral movement scope');
                break;
            default:
                recommendations.push('Review anomaly details');
                recommendations.push('Assess business context');
                recommendations.push('Determine if escalation needed');
        }
        return recommendations;
    }
    async detectCrossEntityPatterns(anomalies) {
        // Detect coordinated activity across multiple entities
        return [];
    }
    async generateAlert(cluster) {
        const alert = {
            id: (0, crypto_1.randomUUID)(),
            type: 'PATTERN_MATCH',
            severity: cluster.severity,
            cluster,
            title: `${cluster.severity} - ${cluster.pattern.name}`,
            summary: `Detected ${cluster.pattern.type} pattern involving ${cluster.entities.length} entities with ${cluster.anomalies.length} correlated anomalies`,
            actionRequired: cluster.severity === 'HIGH' || cluster.severity === 'CRITICAL',
            status: 'NEW',
            createdAt: new Date(),
        };
        this.alerts.set(alert.id, alert);
        logger.warn(`Generated alert: ${alert.title} (${alert.id})`);
    }
    async updateRiskScore(entityId, anomaly) {
        await this.calculateRiskScore(entityId);
    }
    calculateBehavioralRisk(anomalies) {
        const relevant = anomalies.filter(a => a.type === 'BEHAVIORAL_DEVIATION' || a.type === 'TEMPORAL_ANOMALY');
        return {
            category: 'BEHAVIORAL',
            score: Math.min(100, relevant.length * 15),
            weight: 0.2,
            indicators: relevant.map(a => a.description),
        };
    }
    calculateAccessRisk(anomalies) {
        const relevant = anomalies.filter(a => a.type === 'ACCESS_ANOMALY' || a.type === 'PRIVILEGE_ESCALATION');
        return {
            category: 'ACCESS',
            score: Math.min(100, relevant.length * 20),
            weight: 0.25,
            indicators: relevant.map(a => a.description),
        };
    }
    calculateTechnicalRisk(anomalies) {
        const relevant = anomalies.filter(a => a.type === 'NETWORK_ANOMALY' || a.type === 'DATA_EXFILTRATION' || a.type === 'AUTHENTICATION_ANOMALY');
        return {
            category: 'TECHNICAL',
            score: Math.min(100, relevant.length * 25),
            weight: 0.25,
            indicators: relevant.map(a => a.description),
        };
    }
    calculatePersonalRisk(anomalies) {
        const relevant = anomalies.filter(a => a.type === 'INSIDER_THREAT_INDICATOR');
        return {
            category: 'PERSONAL',
            score: Math.min(100, relevant.length * 30),
            weight: 0.1,
            indicators: relevant.map(a => a.description),
        };
    }
    calculateFinancialRisk(anomalies) {
        const relevant = anomalies.filter(a => a.type === 'FINANCIAL_ANOMALY');
        return {
            category: 'FINANCIAL',
            score: Math.min(100, relevant.length * 20),
            weight: 0.1,
            indicators: relevant.map(a => a.description),
        };
    }
    calculateForeignNexusRisk(anomalies) {
        const relevant = anomalies.filter(a => a.type === 'FOREIGN_CONTACT' || a.type === 'TRAVEL_ANOMALY');
        return {
            category: 'FOREIGN_NEXUS',
            score: Math.min(100, relevant.length * 25),
            weight: 0.1,
            indicators: relevant.map(a => a.description),
        };
    }
    calculatePercentileRank(score) {
        const allScores = Array.from(this.riskScores.values()).map(r => r.overallScore);
        if (allScores.length === 0)
            return 50;
        const belowCount = allScores.filter(s => s < score).length;
        return (belowCount / allScores.length) * 100;
    }
    analyzeTrends() {
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        const recentAnomalies = Array.from(this.anomalies.values())
            .filter(a => a.timestamp.getTime() > weekAgo);
        const typeDistribution = {};
        for (const anomaly of recentAnomalies) {
            typeDistribution[anomaly.type] = (typeDistribution[anomaly.type] || 0) + 1;
        }
        return {
            anomalyVolume: {
                current: recentAnomalies.length,
                previous: 0, // Would compare to previous period
                change: 0,
            },
            typeDistribution,
            severityDistribution: this.calculateSeverityDistribution(recentAnomalies),
            topEntities: this.getTopEntitiesByRisk(5),
        };
    }
    calculateSeverityDistribution(anomalies) {
        const distribution = {
            INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0,
        };
        for (const anomaly of anomalies) {
            distribution[anomaly.severity]++;
        }
        return distribution;
    }
    getTopEntitiesByRisk(count) {
        return Array.from(this.riskScores.entries())
            .sort((a, b) => b[1].overallScore - a[1].overallScore)
            .slice(0, count)
            .map(([entityId]) => entityId);
    }
    detectEmergingPatterns() {
        return [];
    }
    generateStrategicRecommendations(clusters, trends) {
        const recommendations = [];
        if (clusters.filter(c => c.severity === 'CRITICAL').length > 2) {
            recommendations.push('Consider elevated threat posture');
        }
        if (trends.anomalyVolume.change > 50) {
            recommendations.push('Review detection coverage for potential gaps');
        }
        return recommendations;
    }
}
exports.AnomalyCorrelationService = AnomalyCorrelationService;
// Export singleton
exports.anomalyCorrelationService = new AnomalyCorrelationService();
