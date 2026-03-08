"use strict";
// Use type imports for interfaces from external libs to avoid runtime errors if they don't export values
// In this specific environment, explicit imports of named exports that might be types only can cause issues with ts-jest in ESM mode.
// We'll define local interfaces or use 'any' to bypass the build errors for the purpose of the test suite repair.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertTriageV2Service = void 0;
class AlertTriageV2Service {
    prisma;
    redis;
    logger;
    modelEndpoint;
    fallbackEnabled;
    CACHE_TTL = 300; // 5 minutes
    LATENCY_SLO_MS = 200;
    constructor(prisma, redis, logger, modelEndpoint) {
        this.prisma = prisma;
        this.redis = redis;
        this.logger = logger;
        this.modelEndpoint =
            modelEndpoint || process.env.TRIAGE_MODEL_ENDPOINT || '';
        this.fallbackEnabled = process.env.TRIAGE_FALLBACK_ENABLED !== 'false';
    }
    /**
     * Core triage scoring with ML model and policy engine integration
     * A1 - Scoring service: policy + model integration
     * AC: deterministic fallback if model unavailable; latency <= 200ms P95; feature flag toggle
     */
    async scoreAlert(alertId, alertData, bypassCache = false) {
        const startTime = Date.now();
        try {
            // Check cache first unless bypassed
            if (!bypassCache) {
                const cached = await this.getCachedScore(alertId);
                if (cached) {
                    this.logger.debug('Triage score retrieved from cache', { alertId });
                    return cached;
                }
            }
            // Feature flag check
            if (!(await this.isTriageV2Enabled(alertData.tenant_id))) {
                return this.getFallbackScore(alertId, alertData, 'feature_disabled');
            }
            // Initialize scoring factors
            const factors = [];
            let baseScore = 0.5; // neutral starting point
            // Apply policy-based scoring first (deterministic)
            const policyScore = await this.applyPolicyRules(alertData);
            factors.push(...policyScore.factors);
            baseScore = Math.max(0, Math.min(1, baseScore + policyScore.adjustment));
            // Attempt ML model scoring with timeout
            let mlScore = null;
            let modelVersion = 'fallback-v1.0';
            if (this.modelEndpoint && alertData) {
                try {
                    const modelResult = await this.invokeMLModel(alertData, this.LATENCY_SLO_MS - 50);
                    mlScore = modelResult.score;
                    modelVersion = modelResult.version;
                    factors.push(...modelResult.factors);
                }
                catch (error) {
                    this.logger.warn('ML model invocation failed, using deterministic fallback', {
                        alertId,
                        error: error.message,
                        latency: Date.now() - startTime,
                    });
                }
            }
            // Combine scores: 60% ML (if available) + 40% policy-based
            let finalScore = baseScore;
            if (mlScore !== null) {
                finalScore = mlScore * 0.6 + baseScore * 0.4;
            }
            // Apply business logic constraints
            finalScore = this.applyBusinessConstraints(finalScore, alertData);
            // Calculate confidence based on data quality and model availability
            const confidence = this.calculateConfidence(alertData, mlScore !== null, factors);
            // Generate recommendations based on score and context
            const recommendations = this.generateRecommendations(finalScore, alertData, factors);
            const triageScore = {
                score: Math.round(finalScore * 1000) / 1000, // 3 decimal precision
                confidence: Math.round(confidence * 1000) / 1000,
                reasoning: this.generateReasoning(finalScore, factors, recommendations),
                factors,
                recommendations,
                model_version: modelVersion,
                computed_at: new Date(),
            };
            // Cache result
            await this.cacheScore(alertId, triageScore);
            // Record metrics
            const latency = Date.now() - startTime;
            await this.recordScoringMetrics(alertId, latency, mlScore !== null, triageScore.score);
            this.logger.info('Alert triage score computed', {
                alertId,
                score: triageScore.score,
                confidence: triageScore.confidence,
                latency,
                model_used: mlScore !== null,
            });
            return triageScore;
        }
        catch (error) {
            this.logger.error('Alert triage scoring failed, using fallback', {
                alertId,
                error: error.message,
                latency: Date.now() - startTime,
            });
            // Deterministic fallback
            return this.getFallbackScore(alertId, alertData, 'error_fallback');
        }
    }
    /**
     * Apply policy rules for deterministic scoring adjustments
     */
    async applyPolicyRules(alertData) {
        const rules = await this.getActivePolicyRules(alertData.tenant_id);
        const factors = [];
        let totalAdjustment = 0;
        for (const rule of rules) {
            try {
                const ruleApplies = await this.evaluateRuleCondition(rule.condition, alertData);
                if (ruleApplies) {
                    const adjustment = rule.priority_adjustment * rule.weight;
                    totalAdjustment += adjustment;
                    factors.push({
                        name: `policy_${rule.name}`,
                        weight: rule.weight,
                        value: ruleApplies,
                        contribution: adjustment,
                        explanation: `Policy rule "${rule.name}" triggered: ${rule.action}`,
                    });
                    this.logger.debug('Policy rule applied', {
                        rule: rule.name,
                        adjustment,
                        alertData: { id: alertData.id, type: alertData.type },
                    });
                }
            }
            catch (error) {
                this.logger.warn('Policy rule evaluation failed', {
                    rule: rule.name,
                    error: error.message,
                });
            }
        }
        return {
            adjustment: Math.max(-0.5, Math.min(0.5, totalAdjustment)), // clamp to reasonable bounds
            factors,
        };
    }
    /**
     * Invoke ML model with timeout and error handling
     */
    async invokeMLModel(alertData, timeoutMs) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(this.modelEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.TRIAGE_MODEL_API_KEY}`,
                },
                body: JSON.stringify({
                    features: this.extractModelFeatures(alertData),
                    version: '2.0',
                }),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`Model API error: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            return {
                score: result.prediction,
                version: result.model_version || 'ml-v2.0',
                factors: result.feature_importance?.map((fi) => ({
                    name: `ml_${fi.feature}`,
                    weight: fi.importance,
                    value: fi.value,
                    contribution: fi.importance * fi.value,
                    explanation: `ML feature: ${fi.feature} (importance: ${fi.importance.toFixed(3)})`,
                })) || [],
            };
        }
        finally {
            clearTimeout(timeout);
        }
    }
    /**
     * Extract features for ML model input
     */
    extractModelFeatures(alertData) {
        return {
            alert_type: alertData.type,
            severity: alertData.severity,
            source_count: alertData.sources?.length || 0,
            entity_count: alertData.entities?.length || 0,
            time_of_day: new Date(alertData.created_at).getHours(),
            day_of_week: new Date(alertData.created_at).getDay(),
            has_attachment: Boolean(alertData.attachments?.length),
            external_ip_count: this.countExternalIPs(alertData.entities),
            previous_alerts_24h: alertData.context?.previous_alerts_24h || 0,
            confidence_score: alertData.confidence || 0.5,
            // Add more sophisticated features based on your data
        };
    }
    /**
     * Apply business logic constraints to final score
     */
    applyBusinessConstraints(score, alertData) {
        let constrainedScore = score;
        // High severity alerts get minimum floor
        if (alertData.severity === 'critical') {
            constrainedScore = Math.max(0.7, constrainedScore);
        }
        else if (alertData.severity === 'high') {
            constrainedScore = Math.max(0.6, constrainedScore);
        }
        // Known false positive patterns get ceiling
        if (this.isKnownFalsePositivePattern(alertData)) {
            constrainedScore = Math.min(0.3, constrainedScore);
        }
        // VIP user alerts get boost
        if (this.isVIPUser(alertData.entities)) {
            constrainedScore = Math.min(1.0, constrainedScore + 0.1);
        }
        return constrainedScore;
    }
    /**
     * Calculate confidence based on data quality and model availability
     */
    calculateConfidence(alertData, modelUsed, factors) {
        let confidence = 0.5; // base confidence
        // Higher confidence if ML model was used
        if (modelUsed) {
            confidence += 0.3;
        }
        // Adjust based on data completeness
        const dataCompleteness = this.assessDataCompleteness(alertData);
        confidence += dataCompleteness * 0.2;
        // Adjust based on number of contributing factors
        if (factors.length >= 5) {
            confidence += 0.1;
        }
        // Adjust based on historical accuracy for this alert type
        const historicalAccuracy = this.getHistoricalAccuracy(alertData.type);
        confidence = confidence * 0.8 + historicalAccuracy * 0.2;
        return Math.max(0.1, Math.min(1.0, confidence));
    }
    /**
     * Generate actionable recommendations based on score and context
     */
    generateRecommendations(score, alertData, factors) {
        const recommendations = [];
        if (score >= 0.8) {
            recommendations.push({
                action: 'contain',
                priority: 'high',
                rationale: 'High risk score indicates immediate containment needed',
                confidence: 0.9,
            });
            recommendations.push({
                action: 'escalate',
                priority: 'high',
                rationale: 'Score warrants senior analyst review',
                confidence: 0.8,
            });
        }
        else if (score >= 0.6) {
            recommendations.push({
                action: 'investigate',
                priority: 'medium',
                rationale: 'Moderate risk requires investigation to confirm threat',
                confidence: 0.7,
            });
        }
        else if (score <= 0.3) {
            recommendations.push({
                action: 'dismiss',
                priority: 'low',
                rationale: 'Low score indicates likely false positive',
                confidence: 0.6,
            });
        }
        // Add context-specific recommendations
        if (this.hasKnownIOCs(alertData)) {
            recommendations.unshift({
                action: 'contain',
                priority: 'high',
                rationale: 'Known IOCs detected in alert data',
                confidence: 0.95,
            });
        }
        return recommendations;
    }
    /**
     * Generate human-readable reasoning for the score
     */
    generateReasoning(score, factors, recommendations) {
        const scoreCategory = score >= 0.8 ? 'HIGH' : score >= 0.6 ? 'MEDIUM' : 'LOW';
        const topFactors = factors
            .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
            .slice(0, 3);
        let reasoning = `${scoreCategory} risk alert (${(score * 100).toFixed(0)}%). `;
        if (topFactors.length > 0) {
            reasoning += 'Key factors: ';
            reasoning += topFactors
                .map((f) => `${f.name.replace(/^(ml_|policy_)/, '')} (${f.contribution >= 0 ? '+' : ''}${(f.contribution * 100).toFixed(0)}%)`)
                .join(', ');
        }
        if (recommendations.length > 0) {
            reasoning += `. Recommended: ${recommendations[0].action}.`;
        }
        return reasoning;
    }
    /**
     * Deterministic fallback scoring when ML model unavailable
     */
    getFallbackScore(alertId, alertData, reason) {
        // Simple heuristic-based scoring
        let score = 0.5;
        const factors = [];
        // Severity-based scoring
        switch (alertData.severity?.toLowerCase()) {
            case 'critical':
                score = 0.9;
                factors.push({
                    name: 'severity_critical',
                    weight: 1.0,
                    value: true,
                    contribution: 0.4,
                    explanation: 'Critical severity alert',
                });
                break;
            case 'high':
                score = 0.7;
                factors.push({
                    name: 'severity_high',
                    weight: 0.8,
                    value: true,
                    contribution: 0.2,
                    explanation: 'High severity alert',
                });
                break;
            case 'medium':
                score = 0.5;
                break;
            case 'low':
                score = 0.3;
                break;
        }
        // Basic pattern recognition
        if (this.hasKnownIOCs(alertData)) {
            score = Math.min(1.0, score + 0.3);
            factors.push({
                name: 'known_iocs',
                weight: 1.0,
                value: true,
                contribution: 0.3,
                explanation: 'Contains known indicators of compromise',
            });
        }
        return {
            score,
            confidence: 0.6, // Lower confidence for fallback
            reasoning: `Fallback scoring used (${reason}). Based on severity and basic heuristics.`,
            factors,
            recommendations: this.generateRecommendations(score, alertData, factors),
            model_version: 'fallback-v1.0',
            computed_at: new Date(),
        };
    }
    // Helper methods
    async getCachedScore(alertId) {
        try {
            const cached = await this.redis.get(`triage:score:${alertId}`);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            this.logger.warn('Cache retrieval failed', {
                alertId,
                error: error.message,
            });
            return null;
        }
    }
    async cacheScore(alertId, score) {
        try {
            await this.redis.setex(`triage:score:${alertId}`, this.CACHE_TTL, JSON.stringify(score));
        }
        catch (error) {
            this.logger.warn('Cache storage failed', {
                alertId,
                error: error.message,
            });
        }
    }
    async isTriageV2Enabled(tenantId) {
        // Feature flag check - would integrate with your feature flag service
        const flagKey = tenantId ? `triage_v2:${tenantId}` : 'triage_v2:global';
        try {
            const enabled = await this.redis.get(flagKey);
            return enabled === 'true' || process.env.TRIAGE_V2_ENABLED === 'true';
        }
        catch {
            return false;
        }
    }
    async getActivePolicyRules(tenantId) {
        // This would load from database in practice
        return [
            {
                id: 'high_severity_boost',
                name: 'High Severity Alert Boost',
                condition: JSON.stringify({ '==': [{ var: 'severity' }, 'high'] }),
                action: 'boost_priority',
                priority_adjustment: 0.2,
                enabled: true,
                weight: 1.0,
            },
            {
                id: 'known_fp_pattern',
                name: 'Known False Positive Pattern',
                condition: JSON.stringify({
                    in: [{ var: 'type' }, ['dns_lookup_failure', 'cert_expiry_warning']],
                }),
                action: 'reduce_priority',
                priority_adjustment: -0.3,
                enabled: true,
                weight: 0.8,
            },
        ];
    }
    async evaluateRuleCondition(condition, alertData) {
        // Would use a proper JSON logic library like jsonlogic-js
        try {
            const logic = JSON.parse(condition);
            // Simplified evaluation - in practice use jsonlogic.apply(logic, alertData)
            return true; // placeholder
        }
        catch {
            return false;
        }
    }
    countExternalIPs(entities) {
        if (!entities)
            return 0;
        return entities.filter((e) => e.type === 'ip' && this.isExternalIP(e.value))
            .length;
    }
    isExternalIP(ip) {
        // Simple check - would use proper IP range validation
        return (!ip.startsWith('10.') &&
            !ip.startsWith('192.168.') &&
            !ip.startsWith('172.'));
    }
    isKnownFalsePositivePattern(alertData) {
        const fpPatterns = [
            'dns_lookup_failure',
            'cert_expiry_warning',
            'normal_admin_activity',
        ];
        return fpPatterns.includes(alertData.type);
    }
    isVIPUser(entities) {
        if (!entities)
            return false;
        const vipEmails = ['ceo@', 'cfo@', 'admin@']; // would load from config
        return entities.some((e) => e.type === 'email' && vipEmails.some((vip) => e.value.includes(vip)));
    }
    assessDataCompleteness(alertData) {
        let completeness = 0;
        const fields = ['title', 'severity', 'entities', 'sources', 'created_at'];
        fields.forEach((field) => {
            if (alertData[field] !== undefined && alertData[field] !== null) {
                completeness += 1 / fields.length;
            }
        });
        return completeness;
    }
    getHistoricalAccuracy(alertType) {
        // Would query historical data - returning mock value
        const accuracyMap = {
            phishing: 0.85,
            malware: 0.78,
            insider_threat: 0.92,
            default: 0.75,
        };
        return accuracyMap[alertType] || accuracyMap.default;
    }
    hasKnownIOCs(alertData) {
        // Would check against threat intel feeds
        return Boolean(alertData.iocs?.length > 0);
    }
    async recordScoringMetrics(alertId, latency, modelUsed, score) {
        try {
            // Record to metrics system (Prometheus/StatsD)
            const metrics = {
                alert_id: alertId,
                latency_ms: latency,
                model_used: modelUsed,
                score,
                timestamp: new Date(),
            };
            // Would send to metrics backend
            this.logger.debug('Triage scoring metrics', metrics);
        }
        catch (error) {
            this.logger.warn('Failed to record metrics', { error: error.message });
        }
    }
}
exports.AlertTriageV2Service = AlertTriageV2Service;
