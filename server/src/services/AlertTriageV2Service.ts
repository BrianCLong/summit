import { PrismaClient } from '@prisma/client';
import winston, { Logger } from 'winston';
import { Redis } from 'ioredis';

export interface TriageScore {
  score: number; // 0-1 scale
  confidence: number; // 0-1 scale
  reasoning: string;
  factors: ScoringFactor[];
  recommendations: TriageRecommendation[];
  model_version: string;
  computed_at: Date;
}

export interface ScoringFactor {
  name: string;
  weight: number; // 0-1 weight in final score
  value: any; // raw value
  contribution: number; // normalized contribution to final score
  explanation: string;
}

export interface TriageRecommendation {
  action: 'contain' | 'escalate' | 'investigate' | 'dismiss';
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  confidence: number;
}

export interface AlertTriage {
  alert_id: string;
  current_priority: number; // 1-5 scale
  analyst_assigned?: string;
  triage_status:
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'escalated'
    | 'dismissed';
  created_at: Date;
  updated_at: Date;
  mttt_seconds?: number;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: string; // JSON logic expression
  action: string;
  priority_adjustment: number; // -2 to +2
  enabled: boolean;
  weight: number; // 0-1
}

export class AlertTriageV2Service {
  private prisma: PrismaClient;
  private redis: Redis;
  private logger: winston.Logger;
  private modelEndpoint: string;
  private fallbackEnabled: boolean;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly LATENCY_SLO_MS = 200;

  constructor(
    prisma: PrismaClient,
    redis: Redis,
    logger: Logger,
    modelEndpoint?: string,
  ) {
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
  async scoreAlert(
    alertId: string,
    alertData: any,
    bypassCache: boolean = false,
  ): Promise<TriageScore> {
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
      const factors: ScoringFactor[] = [];
      let baseScore = 0.5; // neutral starting point

      // Apply policy-based scoring first (deterministic)
      const policyScore = await this.applyPolicyRules(alertData);
      factors.push(...policyScore.factors);
      baseScore = Math.max(0, Math.min(1, baseScore + policyScore.adjustment));

      // Attempt ML model scoring with timeout
      let mlScore: number | null = null;
      let modelVersion = 'fallback-v1.0';

      if (this.modelEndpoint && alertData) {
        try {
          const modelResult = await this.invokeMLModel(
            alertData,
            this.LATENCY_SLO_MS - 50,
          );
          mlScore = modelResult.score;
          modelVersion = modelResult.version;
          factors.push(...modelResult.factors);
        } catch (error) {
          this.logger.warn(
            'ML model invocation failed, using deterministic fallback',
            {
              alertId,
              error: error.message,
              latency: Date.now() - startTime,
            },
          );
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
      const confidence = this.calculateConfidence(
        alertData,
        mlScore !== null,
        factors,
      );

      // Generate recommendations based on score and context
      const recommendations = this.generateRecommendations(
        finalScore,
        alertData,
        factors,
      );

      const triageScore: TriageScore = {
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
      await this.recordScoringMetrics(
        alertId,
        latency,
        mlScore !== null,
        triageScore.score,
      );

      this.logger.info('Alert triage score computed', {
        alertId,
        score: triageScore.score,
        confidence: triageScore.confidence,
        latency,
        model_used: mlScore !== null,
      });

      return triageScore;
    } catch (error) {
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
  private async applyPolicyRules(alertData: any): Promise<{
    adjustment: number;
    factors: ScoringFactor[];
  }> {
    const rules = await this.getActivePolicyRules(alertData.tenant_id);
    const factors: ScoringFactor[] = [];
    let totalAdjustment = 0;

    for (const rule of rules) {
      try {
        const ruleApplies = await this.evaluateRuleCondition(
          rule.condition,
          alertData,
        );

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
      } catch (error) {
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
  private async invokeMLModel(
    alertData: any,
    timeoutMs: number,
  ): Promise<{
    score: number;
    version: string;
    factors: ScoringFactor[];
  }> {
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
        throw new Error(
          `Model API error: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      return {
        score: result.prediction,
        version: result.model_version || 'ml-v2.0',
        factors:
          result.feature_importance?.map((fi: any) => ({
            name: `ml_${fi.feature}`,
            weight: fi.importance,
            value: fi.value,
            contribution: fi.importance * fi.value,
            explanation: `ML feature: ${fi.feature} (importance: ${fi.importance.toFixed(3)})`,
          })) || [],
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Extract features for ML model input
   */
  private extractModelFeatures(alertData: any): any {
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
  private applyBusinessConstraints(score: number, alertData: any): number {
    let constrainedScore = score;

    // High severity alerts get minimum floor
    if (alertData.severity === 'critical') {
      constrainedScore = Math.max(0.7, constrainedScore);
    } else if (alertData.severity === 'high') {
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
  private calculateConfidence(
    alertData: any,
    modelUsed: boolean,
    factors: ScoringFactor[],
  ): number {
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
  private generateRecommendations(
    score: number,
    alertData: any,
    factors: ScoringFactor[],
  ): TriageRecommendation[] {
    const recommendations: TriageRecommendation[] = [];

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
    } else if (score >= 0.6) {
      recommendations.push({
        action: 'investigate',
        priority: 'medium',
        rationale: 'Moderate risk requires investigation to confirm threat',
        confidence: 0.7,
      });
    } else if (score <= 0.3) {
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
  private generateReasoning(
    score: number,
    factors: ScoringFactor[],
    recommendations: TriageRecommendation[],
  ): string {
    const scoreCategory =
      score >= 0.8 ? 'HIGH' : score >= 0.6 ? 'MEDIUM' : 'LOW';
    const topFactors = factors
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 3);

    let reasoning = `${scoreCategory} risk alert (${(score * 100).toFixed(0)}%). `;

    if (topFactors.length > 0) {
      reasoning += 'Key factors: ';
      reasoning += topFactors
        .map(
          (f) =>
            `${f.name.replace(/^(ml_|policy_)/, '')} (${f.contribution >= 0 ? '+' : ''}${(f.contribution * 100).toFixed(0)}%)`,
        )
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
  private getFallbackScore(
    alertId: string,
    alertData: any,
    reason: string,
  ): TriageScore {
    // Simple heuristic-based scoring
    let score = 0.5;
    const factors: ScoringFactor[] = [];

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

  private async getCachedScore(alertId: string): Promise<TriageScore | null> {
    try {
      const cached = await this.redis.get(`triage:score:${alertId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Cache retrieval failed', {
        alertId,
        error: error.message,
      });
      return null;
    }
  }

  private async cacheScore(alertId: string, score: TriageScore): Promise<void> {
    try {
      await this.redis.setex(
        `triage:score:${alertId}`,
        this.CACHE_TTL,
        JSON.stringify(score),
      );
    } catch (error) {
      this.logger.warn('Cache storage failed', {
        alertId,
        error: error.message,
      });
    }
  }

  private async isTriageV2Enabled(tenantId?: string): Promise<boolean> {
    // Feature flag check - would integrate with your feature flag service
    const flagKey = tenantId ? `triage_v2:${tenantId}` : 'triage_v2:global';
    try {
      const enabled = await this.redis.get(flagKey);
      return enabled === 'true' || process.env.TRIAGE_V2_ENABLED === 'true';
    } catch {
      return false;
    }
  }

  private async getActivePolicyRules(tenantId?: string): Promise<PolicyRule[]> {
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

  private async evaluateRuleCondition(
    condition: string,
    alertData: any,
  ): Promise<boolean> {
    // Would use a proper JSON logic library like jsonlogic-js
    try {
      const logic = JSON.parse(condition);
      // Simplified evaluation - in practice use jsonlogic.apply(logic, alertData)
      return true; // placeholder
    } catch {
      return false;
    }
  }

  private countExternalIPs(entities: any[]): number {
    if (!entities) return 0;
    return entities.filter((e) => e.type === 'ip' && this.isExternalIP(e.value))
      .length;
  }

  private isExternalIP(ip: string): boolean {
    // Simple check - would use proper IP range validation
    return (
      !ip.startsWith('10.') &&
      !ip.startsWith('192.168.') &&
      !ip.startsWith('172.')
    );
  }

  private isKnownFalsePositivePattern(alertData: any): boolean {
    const fpPatterns = [
      'dns_lookup_failure',
      'cert_expiry_warning',
      'normal_admin_activity',
    ];
    return fpPatterns.includes(alertData.type);
  }

  private isVIPUser(entities: any[]): boolean {
    if (!entities) return false;
    const vipEmails = ['ceo@', 'cfo@', 'admin@']; // would load from config
    return entities.some(
      (e) =>
        e.type === 'email' && vipEmails.some((vip) => e.value.includes(vip)),
    );
  }

  private assessDataCompleteness(alertData: any): number {
    let completeness = 0;
    const fields = ['title', 'severity', 'entities', 'sources', 'created_at'];

    fields.forEach((field) => {
      if (alertData[field] !== undefined && alertData[field] !== null) {
        completeness += 1 / fields.length;
      }
    });

    return completeness;
  }

  private getHistoricalAccuracy(alertType: string): number {
    // Would query historical data - returning mock value
    const accuracyMap: Record<string, number> = {
      phishing: 0.85,
      malware: 0.78,
      insider_threat: 0.92,
      default: 0.75,
    };

    return accuracyMap[alertType] || accuracyMap.default;
  }

  private hasKnownIOCs(alertData: any): boolean {
    // Would check against threat intel feeds
    return Boolean(alertData.iocs?.length > 0);
  }

  private async recordScoringMetrics(
    alertId: string,
    latency: number,
    modelUsed: boolean,
    score: number,
  ): Promise<void> {
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
    } catch (error) {
      this.logger.warn('Failed to record metrics', { error: error.message });
    }
  }
}
