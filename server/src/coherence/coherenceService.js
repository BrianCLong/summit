"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoherenceService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const signalIngest_js_1 = require("./signalIngest.js");
const resolvers_js_1 = require("./graphql/resolvers.js");
const subscriptions_js_1 = require("./graphql/subscriptions.js");
const activityFingerprintIndex_js_1 = require("./intelligence/activityFingerprintIndex.js");
const narrativeImpactModel_js_1 = require("./intelligence/narrativeImpactModel.js");
const missionVault_js_1 = require("./intelligence/missionVault.js");
class CoherenceService {
    neo4j;
    redis;
    signalIngest;
    graphqlResolvers;
    subscriptionManager;
    activityIndex;
    narrativeModel;
    missionVault;
    analysisTimers = new Map();
    defaultConfig = {
        analysisInterval: 15, // 15 minutes
        signalRetention: 365, // 1 year
        confidenceThreshold: 0.3,
        anomalyThreshold: 2.0, // 2 standard deviations
        enableRealTimeAnalysis: true,
        enablePredictiveAnalysis: true,
        notificationSettings: {
            scoreThreshold: 0.8,
            riskThreshold: 0.7,
            enableSlack: false,
            enableEmail: false,
        },
    };
    constructor(neo4j, redis) {
        this.neo4j = neo4j;
        this.redis = redis;
        // Initialize all components
        this.signalIngest = new signalIngest_js_1.CoherenceSignalIngest(neo4j, redis);
        this.subscriptionManager = new subscriptions_js_1.CoherenceSubscriptionManager(redis);
        this.activityIndex = new activityFingerprintIndex_js_1.ActivityFingerprintIndex(neo4j, redis);
        this.narrativeModel = new narrativeImpactModel_js_1.NarrativeImpactModel(neo4j, redis);
        this.missionVault = new missionVault_js_1.MissionVault(neo4j, redis);
        this.graphqlResolvers = new resolvers_js_1.CoherenceGraphQLResolvers(neo4j, redis, this.activityIndex, this.narrativeModel, this.missionVault);
        // Initialize periodic analysis
        this.initializePeriodicAnalysis();
        logger_js_1.default.info('Coherence service initialized', {
            components: [
                'signalIngest',
                'graphqlResolvers',
                'subscriptionManager',
                'activityIndex',
                'narrativeModel',
                'missionVault',
            ],
        });
    }
    async analyzeCoherence(tenantId, options = {}) {
        const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        try {
            logger_js_1.default.info('Starting coherence analysis', {
                tenantId,
                analysisId,
                options,
            });
            // Get configuration for this tenant
            const config = await this.getTenantConfiguration(tenantId);
            // Step 1: Gather signals for analysis
            const signals = await this.gatherSignalsForAnalysis(tenantId, options.timeRange);
            if (signals.length === 0) {
                return this.createEmptyAnalysisResult(tenantId, analysisId);
            }
            // Step 2: Run parallel intelligence analysis
            const [activityFingerprints, narrativeImpacts, missionContext] = await Promise.all([
                this.activityIndex.indexActivity(tenantId, signals),
                this.narrativeModel.analyzeNarrativeImpact(tenantId, signals),
                this.missionVault.getMissionContext(tenantId),
            ]);
            // Step 3: Calculate coherence score
            const coherenceScore = await this.calculateCoherenceScore(tenantId, {
                signals,
                activityFingerprints,
                narrativeImpacts,
                missionContext,
            });
            // Step 4: Generate insights
            const insights = await this.generateInsights(tenantId, {
                coherenceScore,
                activityFingerprints,
                narrativeImpacts,
                signals,
                config,
            });
            // Step 5: Assess data quality
            const dataQuality = await this.assessDataQuality(tenantId, signals);
            // Step 6: Real-time analysis if enabled
            if (options.includeRealTimeAnalysis && config.enableRealTimeAnalysis) {
                await this.triggerRealTimeUpdates(tenantId, {
                    coherenceScore,
                    activityFingerprints,
                    narrativeImpacts,
                });
            }
            const result = {
                tenantId,
                analysisId,
                coherenceScore: coherenceScore.score,
                coherenceStatus: coherenceScore.status,
                intelligence: {
                    activityFingerprints: activityFingerprints.slice(0, 20), // Top 20
                    narrativeImpacts: narrativeImpacts.slice(0, 10), // Top 10
                    missionContext,
                },
                insights,
                metadata: {
                    analysisTime: new Date().toISOString(),
                    signalCount: signals.length,
                    confidenceLevel: this.calculateOverallConfidence(activityFingerprints, narrativeImpacts, coherenceScore),
                    dataQuality,
                },
            };
            // Store analysis result
            await this.storeAnalysisResult(tenantId, result);
            const duration = Date.now() - startTime;
            logger_js_1.default.info('Coherence analysis completed', {
                tenantId,
                analysisId,
                duration,
                coherenceScore: result.coherenceScore,
                coherenceStatus: result.coherenceStatus,
                signalCount: signals.length,
                fingerprintCount: activityFingerprints.length,
                narrativeCount: narrativeImpacts.length,
            });
            return result;
        }
        catch (error) {
            logger_js_1.default.error('Coherence analysis failed', {
                error,
                tenantId,
                analysisId,
            });
            throw error;
        }
    }
    async ingestSignal(tenantId, signalData) {
        try {
            // Use the signal ingest service
            const ingestResult = await this.signalIngest.ingestSignalIdempotent({
                ...signalData,
                tenantId,
            });
            // Check if we should trigger real-time analysis
            const config = await this.getTenantConfiguration(tenantId);
            let triggeredAnalysis = false;
            if (config.enableRealTimeAnalysis) {
                // Trigger analysis for high-value signals
                if (signalData.value * signalData.weight >=
                    config.notificationSettings.scoreThreshold) {
                    setImmediate(() => {
                        this.analyzeCoherence(tenantId, {
                            includeRealTimeAnalysis: true,
                        }).catch((error) => logger_js_1.default.error('Real-time analysis failed', { error, tenantId }));
                    });
                    triggeredAnalysis = true;
                }
            }
            return {
                success: true,
                signalId: ingestResult.signalId,
                triggeredAnalysis,
            };
        }
        catch (error) {
            logger_js_1.default.error('Signal ingestion failed', { error, tenantId, signalData });
            throw error;
        }
    }
    async getCoherenceStatus(tenantId) {
        try {
            // Get latest analysis result
            const latestAnalysis = await this.getLatestAnalysisResult(tenantId);
            // Get active missions count
            const activeMissions = await this.missionVault.getActiveMissions(tenantId);
            // Get recent alerts/anomalies
            const recentAlerts = await this.getRecentAlerts(tenantId);
            // Check system health
            const systemHealth = await this.checkSystemHealth(tenantId);
            return {
                currentScore: latestAnalysis?.coherenceScore || 0,
                status: latestAnalysis?.coherenceStatus || 'unknown',
                lastAnalysis: latestAnalysis?.metadata.analysisTime || 'never',
                activeMissions: activeMissions.length,
                recentAlerts,
                systemHealth,
            };
        }
        catch (error) {
            logger_js_1.default.error('Failed to get coherence status', { error, tenantId });
            return {
                currentScore: 0,
                status: 'error',
                lastAnalysis: 'error',
                activeMissions: 0,
                recentAlerts: [],
                systemHealth: {
                    status: 'error',
                    message: 'Unable to determine system health',
                },
            };
        }
    }
    async configureTenant(tenantId, config) {
        const fullConfig = { ...this.defaultConfig, ...config };
        await this.redis.setex(`config:${tenantId}`, 86400, JSON.stringify(fullConfig)); // 24h cache
        // Restart periodic analysis with new interval
        if (config.analysisInterval && this.analysisTimers.has(tenantId)) {
            clearInterval(this.analysisTimers.get(tenantId));
            this.startPeriodicAnalysis(tenantId, fullConfig);
        }
        logger_js_1.default.info('Tenant configuration updated', { tenantId, config });
    }
    // Getters for individual services (for GraphQL integration)
    getSignalIngest() {
        return this.signalIngest;
    }
    getGraphQLResolvers() {
        return this.graphqlResolvers;
    }
    getSubscriptionManager() {
        return this.subscriptionManager;
    }
    getActivityIndex() {
        return this.activityIndex;
    }
    getNarrativeModel() {
        return this.narrativeModel;
    }
    getMissionVault() {
        return this.missionVault;
    }
    async initializePeriodicAnalysis() {
        try {
            // Get list of active tenants
            const tenants = await this.getActiveTenants();
            for (const tenantId of tenants) {
                const config = await this.getTenantConfiguration(tenantId);
                this.startPeriodicAnalysis(tenantId, config);
            }
            logger_js_1.default.info('Periodic analysis initialized', {
                tenantCount: tenants.length,
            });
        }
        catch (error) {
            logger_js_1.default.error('Failed to initialize periodic analysis', { error });
        }
    }
    startPeriodicAnalysis(tenantId, config) {
        if (this.analysisTimers.has(tenantId)) {
            clearInterval(this.analysisTimers.get(tenantId));
        }
        const timer = setInterval(async () => {
            try {
                await this.analyzeCoherence(tenantId, {
                    includeRealTimeAnalysis: true,
                });
            }
            catch (error) {
                logger_js_1.default.error('Periodic analysis failed', { error, tenantId });
            }
        }, config.analysisInterval * 60 * 1000); // Convert minutes to milliseconds
        this.analysisTimers.set(tenantId, timer);
        logger_js_1.default.debug('Started periodic analysis', {
            tenantId,
            intervalMinutes: config.analysisInterval,
        });
    }
    async getTenantConfiguration(tenantId) {
        const cached = await this.redis.get(`config:${tenantId}`);
        if (cached) {
            return JSON.parse(cached);
        }
        return this.defaultConfig;
    }
    async gatherSignalsForAnalysis(tenantId, timeRange) {
        const session = this.neo4j.getSession();
        try {
            const params = { tenantId };
            let whereClause = '';
            if (timeRange) {
                whereClause =
                    'WHERE s.ts >= datetime($startTime) AND s.ts <= datetime($endTime)';
                params.startTime = timeRange.start;
                params.endTime = timeRange.end;
            }
            else {
                // Default to last 24 hours
                whereClause = "WHERE s.ts >= datetime() - duration('P1D')";
            }
            const result = await session.executeRead(async (tx) => {
                return await tx.run(`
          MATCH (t:Tenant {tenant_id: $tenantId})-[:EMITS]->(s:Signal)
          ${whereClause}
          RETURN s {
            .signal_id,
            .type,
            .value,
            .weight,
            .source,
            .ts,
            .provenance_id
          } as signal
          ORDER BY s.ts DESC
        `, params);
            });
            return result.records.map((record) => {
                const signal = record.get('signal');
                return {
                    signalId: signal.signal_id,
                    type: signal.type,
                    value: signal.value,
                    weight: signal.weight || 1.0,
                    source: signal.source,
                    ts: signal.ts,
                    provenanceId: signal.provenance_id,
                };
            });
        }
        finally {
            await session.close();
        }
    }
    async calculateCoherenceScore(tenantId, data) {
        const { signals, activityFingerprints, narrativeImpacts, missionContext } = data;
        if (signals.length < 10) {
            return { score: 0, status: 'insufficient' };
        }
        // Base coherence from signals
        const signalCoherence = this.calculateSignalCoherence(signals);
        // Activity coherence
        const activityCoherence = this.calculateActivityCoherence(activityFingerprints);
        // Narrative coherence
        const narrativeCoherence = this.calculateNarrativeCoherence(narrativeImpacts);
        // Mission alignment (if mission context exists)
        const missionAlignment = missionContext
            ? this.calculateMissionAlignment(missionContext, signals)
            : 0.5;
        // Weighted average
        const weights = {
            signal: 0.4,
            activity: 0.25,
            narrative: 0.25,
            mission: 0.1,
        };
        const overallScore = signalCoherence * weights.signal +
            activityCoherence * weights.activity +
            narrativeCoherence * weights.narrative +
            missionAlignment * weights.mission;
        let status;
        if (overallScore >= 0.8)
            status = 'high';
        else if (overallScore >= 0.6)
            status = 'medium';
        else if (overallScore >= 0.3)
            status = 'low';
        else
            status = 'insufficient';
        return { score: Math.min(1, Math.max(0, overallScore)), status };
    }
    calculateSignalCoherence(signals) {
        if (!signals.length)
            return 0;
        // Weighted average of signal values
        const weightedSum = signals.reduce((sum, signal) => sum + signal.value * signal.weight, 0);
        const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
        return totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0;
    }
    calculateActivityCoherence(fingerprints) {
        if (!fingerprints.length)
            return 0.5; // Neutral if no activity data
        // Average confidence of activity fingerprints
        const avgConfidence = fingerprints.reduce((sum, fp) => sum + fp.confidence, 0) /
            fingerprints.length;
        // Adjust for pattern diversity (more patterns = higher coherence)
        const diversityBonus = Math.min(0.2, fingerprints.length / 50);
        return Math.min(1, avgConfidence + diversityBonus);
    }
    calculateNarrativeCoherence(impacts) {
        if (!impacts.length)
            return 0.5; // Neutral if no narrative data
        // Weight by impact magnitude and confidence
        const weightedSum = impacts.reduce((sum, impact) => sum + impact.magnitude * impact.confidence, 0);
        const totalWeight = impacts.reduce((sum, impact) => sum + impact.confidence, 0);
        return totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0.5;
    }
    calculateMissionAlignment(missionContext, signals) {
        // Simple alignment based on signal relevance to mission objectives
        if (!missionContext || !missionContext.objectives)
            return 0.5;
        // Count signals that relate to mission objectives (simplified heuristic)
        const relevantSignals = signals.filter((signal) => {
            return missionContext.objectives.some((obj) => signal.type.includes(obj.type) || signal.source.includes('mission'));
        });
        return relevantSignals.length / signals.length;
    }
    async generateInsights(tenantId, data) {
        const { coherenceScore, activityFingerprints, narrativeImpacts, signals, config, } = data;
        // Generate trend analysis
        const trends = await this.analyzeTrends(tenantId, signals);
        // Detect anomalies
        const anomalies = this.detectAnomalies(signals, config.anomalyThreshold);
        // Assess risks
        const riskAssessment = this.assessRisks(coherenceScore, activityFingerprints, narrativeImpacts);
        // Generate recommendations
        const recommendations = this.generateRecommendations(coherenceScore, trends, anomalies, riskAssessment);
        return {
            trends,
            anomalies,
            riskAssessment,
            recommendations,
        };
    }
    async analyzeTrends(tenantId, signals) {
        // Simple trend analysis - could be enhanced with ML
        const hourlyGroups = new Map();
        signals.forEach((signal) => {
            const hour = new Date(signal.ts).toISOString().substring(0, 13) + ':00:00.000Z';
            if (!hourlyGroups.has(hour)) {
                hourlyGroups.set(hour, []);
            }
            hourlyGroups.get(hour).push(signal);
        });
        const trends = Array.from(hourlyGroups.entries())
            .map(([hour, hourSignals]) => {
            const avgValue = hourSignals.reduce((sum, s) => sum + s.value * s.weight, 0) /
                hourSignals.length;
            return {
                timestamp: hour,
                value: avgValue,
                count: hourSignals.length,
            };
        })
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        return trends;
    }
    detectAnomalies(signals, threshold) {
        const values = signals.map((s) => s.value * s.weight);
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const stddev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
        return signals
            .filter((signal) => {
            const deviation = Math.abs(signal.value * signal.weight - mean);
            return deviation > threshold * stddev;
        })
            .map((signal) => ({
            signalId: signal.signalId,
            timestamp: signal.ts,
            value: signal.value * signal.weight,
            deviation: Math.abs(signal.value * signal.weight - mean),
            severity: Math.abs(signal.value * signal.weight - mean) > 3 * stddev
                ? 'high'
                : 'medium',
        }));
    }
    assessRisks(coherenceScore, activityFingerprints, narrativeImpacts) {
        let riskLevel = 'low';
        const riskFactors = [];
        if (coherenceScore.score < 0.3) {
            riskLevel = 'high';
            riskFactors.push('Low coherence score');
        }
        const highRiskFingerprints = activityFingerprints.filter((fp) => fp.metadata.riskLevel === 'high');
        if (highRiskFingerprints.length > 0) {
            riskLevel = 'high';
            riskFactors.push(`${highRiskFingerprints.length} high-risk activity patterns detected`);
        }
        const highImpactNarratives = narrativeImpacts.filter((ni) => ni.magnitude > 0.8);
        if (highImpactNarratives.length > 0) {
            if (riskLevel === 'low')
                riskLevel = 'medium';
            riskFactors.push(`${highImpactNarratives.length} high-impact narrative shifts detected`);
        }
        return {
            level: riskLevel,
            factors: riskFactors,
            score: riskLevel === 'high' ? 0.8 : riskLevel === 'medium' ? 0.5 : 0.2,
        };
    }
    generateRecommendations(coherenceScore, trends, anomalies, riskAssessment) {
        const recommendations = [];
        if (coherenceScore.score < 0.5) {
            recommendations.push('Increase signal collection frequency to improve coherence baseline');
        }
        if (anomalies.length > 5) {
            recommendations.push('Investigate detected anomalies for potential security concerns');
        }
        if (riskAssessment.level === 'high') {
            recommendations.push('Escalate high-risk factors to security team');
            recommendations.push('Consider implementing additional monitoring controls');
        }
        if (trends.length > 0) {
            const recentTrend = trends[trends.length - 1];
            const previousTrend = trends[Math.max(0, trends.length - 2)];
            if (recentTrend.value < previousTrend.value * 0.8) {
                recommendations.push('Recent coherence decline detected - review system health');
            }
        }
        return recommendations.length > 0
            ? recommendations
            : ['System operating within normal parameters'];
    }
    calculateOverallConfidence(activityFingerprints, narrativeImpacts, coherenceScore) {
        let confidence = coherenceScore.score * 0.4; // Base confidence from coherence
        if (activityFingerprints.length > 0) {
            const avgActivityConfidence = activityFingerprints.reduce((sum, fp) => sum + fp.confidence, 0) /
                activityFingerprints.length;
            confidence += avgActivityConfidence * 0.3;
        }
        if (narrativeImpacts.length > 0) {
            const avgNarrativeConfidence = narrativeImpacts.reduce((sum, ni) => sum + ni.confidence, 0) /
                narrativeImpacts.length;
            confidence += avgNarrativeConfidence * 0.3;
        }
        return Math.min(1, confidence);
    }
    async assessDataQuality(tenantId, signals) {
        const totalSignals = signals.length;
        const signalsWithProvenance = signals.filter((s) => s.provenanceId).length;
        const recentSignals = signals.filter((s) => {
            const age = Date.now() - new Date(s.ts).getTime();
            return age < 86400000; // Less than 24 hours old
        }).length;
        const provenanceRatio = totalSignals > 0 ? signalsWithProvenance / totalSignals : 0;
        const freshnessRatio = totalSignals > 0 ? recentSignals / totalSignals : 0;
        return {
            score: provenanceRatio * 0.5 + freshnessRatio * 0.5,
            metrics: {
                totalSignals,
                provenanceCompliance: provenanceRatio,
                freshnessRatio,
            },
        };
    }
    createEmptyAnalysisResult(tenantId, analysisId) {
        return {
            tenantId,
            analysisId,
            coherenceScore: 0,
            coherenceStatus: 'insufficient',
            intelligence: {
                activityFingerprints: [],
                narrativeImpacts: [],
                missionContext: null,
            },
            insights: {
                trends: [],
                anomalies: [],
                riskAssessment: {
                    level: 'unknown',
                    factors: ['No data available'],
                    score: 0,
                },
                recommendations: [
                    'Increase signal collection to enable coherence analysis',
                ],
            },
            metadata: {
                analysisTime: new Date().toISOString(),
                signalCount: 0,
                confidenceLevel: 0,
                dataQuality: {
                    score: 0,
                    metrics: {
                        totalSignals: 0,
                        provenanceCompliance: 0,
                        freshnessRatio: 0,
                    },
                },
            },
        };
    }
    async triggerRealTimeUpdates(tenantId, data) {
        // Trigger GraphQL subscriptions
        await this.subscriptionManager.publishCoherenceUpdate({
            tenantId,
            score: data.coherenceScore.score,
            status: data.coherenceScore.status,
            signalCount: 0, // Would be calculated
            timestamp: new Date().toISOString(),
            changeType: 'score_change',
        });
        // Publish activity updates
        for (const fingerprint of data.activityFingerprints.slice(0, 5)) {
            // Top 5
            await this.subscriptionManager.publishActivityUpdate({
                tenantId,
                activityId: fingerprint.id,
                fingerprint,
                timestamp: new Date().toISOString(),
                confidence: fingerprint.confidence,
                changeType: 'new_activity',
            });
        }
        // Publish narrative updates
        for (const impact of data.narrativeImpacts.slice(0, 3)) {
            // Top 3
            await this.subscriptionManager.publishNarrativeUpdate({
                tenantId,
                narrativeId: impact.id,
                impact,
                timestamp: new Date().toISOString(),
                severity: impact.magnitude > 0.7
                    ? 'high'
                    : impact.magnitude > 0.4
                        ? 'medium'
                        : 'low',
                changeType: 'narrative_shift',
            });
        }
    }
    async storeAnalysisResult(tenantId, result) {
        // Store in Redis for fast access
        await this.redis.setex(`analysis:latest:${tenantId}`, 86400, JSON.stringify(result));
        // Store in Neo4j for historical analysis
        const session = this.neo4j.getSession();
        try {
            await session.executeWrite(async (tx) => {
                await tx.run(`
          MATCH (t:Tenant {tenant_id: $tenantId})
          CREATE (a:CoherenceAnalysis {
            analysis_id: $analysisId,
            tenant_id: $tenantId,
            coherence_score: $coherenceScore,
            coherence_status: $coherenceStatus,
            confidence_level: $confidenceLevel,
            signal_count: $signalCount,
            analysis_time: datetime($analysisTime),
            result_data: $resultData
          })
          CREATE (t)-[:HAS_ANALYSIS]->(a)
        `, {
                    tenantId: result.tenantId,
                    analysisId: result.analysisId,
                    coherenceScore: result.coherenceScore,
                    coherenceStatus: result.coherenceStatus,
                    confidenceLevel: result.metadata.confidenceLevel,
                    signalCount: result.metadata.signalCount,
                    analysisTime: result.metadata.analysisTime,
                    resultData: JSON.stringify(result),
                });
            });
        }
        finally {
            await session.close();
        }
    }
    async getLatestAnalysisResult(tenantId) {
        const cached = await this.redis.get(`analysis:latest:${tenantId}`);
        return cached ? JSON.parse(cached) : null;
    }
    async getActiveTenants() {
        const session = this.neo4j.getSession();
        try {
            const result = await session.executeRead(async (tx) => {
                return await tx.run(`
          MATCH (t:Tenant)
          WHERE EXISTS((t)-[:EMITS]->(:Signal))
          RETURN DISTINCT t.tenant_id as tenantId
        `);
            });
            return result.records.map((record) => record.get('tenantId'));
        }
        finally {
            await session.close();
        }
    }
    async getRecentAlerts(tenantId) {
        // Get recent anomalies and high-risk activities
        const latestAnalysis = await this.getLatestAnalysisResult(tenantId);
        if (!latestAnalysis)
            return [];
        const alerts = [];
        // Add anomaly alerts
        alerts.push(...latestAnalysis.insights.anomalies.map((anomaly) => ({
            type: 'anomaly',
            severity: anomaly.severity,
            timestamp: anomaly.timestamp,
            message: `Anomalous signal detected (deviation: ${anomaly.deviation.toFixed(2)})`,
        })));
        // Add risk alerts
        if (latestAnalysis.insights.riskAssessment.level === 'high') {
            alerts.push({
                type: 'risk',
                severity: 'high',
                timestamp: latestAnalysis.metadata.analysisTime,
                message: `High risk level detected: ${latestAnalysis.insights.riskAssessment.factors.join(', ')}`,
            });
        }
        return alerts.slice(0, 10); // Return most recent 10
    }
    async checkSystemHealth(tenantId) {
        try {
            // Check Neo4j connectivity
            const neo4jHealthy = await this.neo4j.verifyConnectivity();
            // Check Redis connectivity
            const redisHealthy = (await this.redis.ping()) === 'PONG';
            // Check signal ingestion rate
            const recentSignals = await this.gatherSignalsForAnalysis(tenantId, {
                start: new Date(Date.now() - 3600000).toISOString(), // Last hour
                end: new Date().toISOString(),
            });
            const ingestionRate = recentSignals.length; // Signals per hour
            const overallHealthy = neo4jHealthy && redisHealthy && ingestionRate > 0;
            return {
                status: overallHealthy ? 'healthy' : 'degraded',
                components: {
                    neo4j: neo4jHealthy ? 'healthy' : 'unhealthy',
                    redis: redisHealthy ? 'healthy' : 'unhealthy',
                    ingestion: ingestionRate > 0 ? 'healthy' : 'low',
                },
                metrics: {
                    ingestionRate,
                    lastCheck: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            return {
                status: 'error',
                message: 'Unable to perform health check',
                error: error.message,
            };
        }
    }
    // Cleanup method
    async shutdown() {
        logger_js_1.default.info('Shutting down coherence service');
        // Clear all analysis timers
        for (const [tenantId, timer] of this.analysisTimers.entries()) {
            clearInterval(timer);
            logger_js_1.default.debug('Stopped periodic analysis', { tenantId });
        }
        this.analysisTimers.clear();
        logger_js_1.default.info('Coherence service shutdown complete');
    }
}
exports.CoherenceService = CoherenceService;
