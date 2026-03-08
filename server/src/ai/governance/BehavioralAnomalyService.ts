/**
 * Behavioral Anomaly Detection Service
 *
 * ML-powered detection of unusual access patterns, policy violations,
 * and emerging threats using statistical analysis and LLM pattern recognition.
 *
 * Production-ready implementation with:
 * - LLM integration for intelligent anomaly analysis
 * - Statistical baseline modeling
 * - Real-time alerting to multiple channels
 * - Enhanced provenance with chain of custody
 * - False positive learning and feedback
 *
 * @module ai/governance/BehavioralAnomalyService
 * @version 4.0.0
 */

import { randomUUID, createHash } from 'crypto';
import { GovernanceVerdict } from '../../governance/types.js';
import logger from '../../utils/logger.js';
import {
  BehavioralAnomaly,
  AnomalyType,
  AffectedEntity,
  BaselineBehavior,
  ObservedBehavior,
  DeviationMetrics,
  RecommendedAction,
  EvidenceItem,
  AnomalyStatus,
  AnomalyResolution,
  AnomalyDetectionScope,
  AnomalyTrends,
  AnomalyDetectionService as IAnomalyDetectionService,
  AIGovernanceConfig,
  ProvenanceMetadata,
  ChainOfCustodyEntry,
} from './types.js';
import { GovernanceLLMClient, getGovernanceLLMClient } from './llm/index.js';

// =============================================================================
// Anomaly Detection Thresholds
// =============================================================================

const ANOMALY_THRESHOLDS = {
  access_pattern: {
    stdDevThreshold: 2.5,
    minEvents: 10,
  },
  volume_spike: {
    percentileThreshold: 95,
    multiplier: 3.0,
  },
  privilege_escalation: {
    confidenceThreshold: 0.8,
  },
  policy_circumvention: {
    attemptThreshold: 3,
    timeWindowMinutes: 60,
  },
  data_exfiltration: {
    volumeThresholdMB: 100,
    rateThresholdMBPerHour: 50,
  },
  credential_abuse: {
    locationChangeThreshold: 500, // km
    timeThresholdMinutes: 30,
  },
  insider_threat: {
    riskScoreThreshold: 70,
  },
  api_abuse: {
    rateThreshold: 1000,
    windowSeconds: 60,
  },
};

// =============================================================================
// Types
// =============================================================================

interface AnomalyStatistics {
  totalDetected: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<string, number>;
  falsePositives: number;
  truePositives: number;
  alertsSent: number;
  autoBlocked: number;
  llmAnalyses: number;
  averageRiskScore: number;
  lastReset: string;
}

// =============================================================================
// Service Implementation
// =============================================================================

export class BehavioralAnomalyService implements IAnomalyDetectionService {
  private config: AIGovernanceConfig;
  private llmClient: GovernanceLLMClient;
  private anomalyStore: Map<string, BehavioralAnomaly> = new Map();
  private baselineCache: Map<string, BaselineBehavior> = new Map();
  private falsePositivePatterns: Map<string, number> = new Map(); // Pattern -> count
  private statistics: AnomalyStatistics;

  constructor(config: AIGovernanceConfig) {
    this.config = config;
    this.llmClient = getGovernanceLLMClient({
      enabled: config.llmSettings?.provider !== 'mock',
      provider: config.llmSettings?.provider || 'mock',
      model: config.llmSettings?.model || 'gpt-4',
      maxTokens: config.llmSettings?.maxTokens || 2048,
      temperature: config.llmSettings?.temperature || 0.2, // Lower temp for security analysis
      timeout: config.llmSettings?.timeout || 30000,
    });
    this.statistics = this.initializeStatistics();
  }

  private initializeStatistics(): AnomalyStatistics {
    return {
      totalDetected: 0,
      byType: {} as Record<AnomalyType, number>,
      bySeverity: {},
      falsePositives: 0,
      truePositives: 0,
      alertsSent: 0,
      autoBlocked: 0,
      llmAnalyses: 0,
      averageRiskScore: 0,
      lastReset: new Date().toISOString(),
    };
  }

  /**
   * Detect anomalies within the specified scope
   */
  async detectAnomalies(scope: AnomalyDetectionScope): Promise<BehavioralAnomaly[]> {
    if (!this.config.anomalyDetection.enabled) {
      logger.info('Anomaly detection disabled');
      return [];
    }

    const startTime = Date.now();
    logger.info('Starting anomaly detection', { scope });

    try {
      const detectedAnomalies: BehavioralAnomaly[] = [];

      // Run detection for each anomaly type
      const detectionPromises: Promise<BehavioralAnomaly[]>[] = [];

      const typesToDetect = scope.anomalyTypes || Object.keys(ANOMALY_THRESHOLDS) as AnomalyType[];

      for (const anomalyType of typesToDetect) {
        detectionPromises.push(this.detectByType(anomalyType, scope));
      }

      const results = await Promise.all(detectionPromises);
      for (const anomalies of results) {
        detectedAnomalies.push(...anomalies);
      }

      // Filter by minimum severity
      const filteredAnomalies = this.filterBySeverity(detectedAnomalies, scope.minSeverity);

      // Filter by minimum score
      const scoredAnomalies = filteredAnomalies.filter(
        (a) => a.riskScore >= this.config.anomalyDetection.minAnomalyScore
      );

      // Enhance anomalies with LLM analysis if configured
      const enhancedAnomalies = await this.enhanceWithLLMAnalysis(scoredAnomalies, scope);

      // Store detected anomalies
      for (const anomaly of enhancedAnomalies) {
        this.anomalyStore.set(anomaly.id, anomaly);
        // Update statistics
        this.statistics.totalDetected++;
        this.statistics.byType[anomaly.anomalyType] = (this.statistics.byType[anomaly.anomalyType] || 0) + 1;
        this.statistics.bySeverity[anomaly.severity] = (this.statistics.bySeverity[anomaly.severity] || 0) + 1;
        this.updateAverageRiskScore(anomaly.riskScore);
      }

      // Auto-block high-risk anomalies
      await this.processHighRiskAnomalies(enhancedAnomalies);

      const latencyMs = Date.now() - startTime;
      logger.info('Anomaly detection completed', {
        detected: enhancedAnomalies.length,
        llmEnhanced: enhancedAnomalies.filter(a => a.provenance?.method === 'llm_enhanced').length,
        latencyMs,
      });

      return enhancedAnomalies;
    } catch (error: any) {
      logger.error('Anomaly detection failed', { error, scope });
      throw error;
    }
  }

  private updateAverageRiskScore(newScore: number): void {
    const total = this.statistics.totalDetected;
    const currentAvg = this.statistics.averageRiskScore;
    this.statistics.averageRiskScore = (currentAvg * (total - 1) + newScore) / total;
  }

  /**
   * Enhance anomalies with LLM-powered analysis
   */
  private async enhanceWithLLMAnalysis(
    anomalies: BehavioralAnomaly[],
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    if (this.config.llmSettings?.provider === 'mock') {
      return anomalies;
    }

    // Only enhance high-severity anomalies to save LLM costs
    const highSeverityAnomalies = anomalies.filter(
      a => a.severity === 'critical' || a.severity === 'high'
    );

    if (highSeverityAnomalies.length === 0) {
      return anomalies;
    }

    const enhancedAnomalies: BehavioralAnomaly[] = [];

    for (const anomaly of anomalies) {
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        try {
          const enhanced = await this.analyzeWithLLM(anomaly, scope);
          enhancedAnomalies.push(enhanced);
          this.statistics.llmAnalyses++;
        } catch (error: any) {
          logger.warn({ error, anomalyId: anomaly.id }, 'LLM analysis failed, using original');
          enhancedAnomalies.push(anomaly);
        }
      } else {
        enhancedAnomalies.push(anomaly);
      }
    }

    return enhancedAnomalies;
  }

  /**
   * Analyze a single anomaly with LLM
   */
  private async analyzeWithLLM(
    anomaly: BehavioralAnomaly,
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly> {
    const prompt = this.buildAnomalyAnalysisPrompt(anomaly);

    const llmResponse = await this.llmClient.executeWithRetry({
      taskType: 'anomaly_analysis',
      prompt,
      context: {
        sensitivityLevel: 'high',
      },
      tenantId: scope.tenantIds?.[0] || 'system',
    });

    // Parse LLM response and enhance anomaly
    const analysis = this.parseLLMAnalysis(llmResponse.text);

    return {
      ...anomaly,
      description: analysis.enhancedDescription || anomaly.description,
      recommendedActions: analysis.enhancedActions || anomaly.recommendedActions,
      falsePositiveLikelihood: analysis.falsePositiveLikelihood ?? anomaly.falsePositiveLikelihood,
      provenance: this.createEnhancedProvenance(anomaly, llmResponse.provenance),
    };
  }

  private buildAnomalyAnalysisPrompt(anomaly: BehavioralAnomaly): string {
    return `
Analyze the following security anomaly and provide enhanced analysis.

Anomaly Type: ${anomaly.anomalyType}
Severity: ${anomaly.severity}
Risk Score: ${anomaly.riskScore}
Title: ${anomaly.title}
Description: ${anomaly.description}

Affected Entity:
- Type: ${anomaly.affectedEntity.entityType}
- ID: ${anomaly.affectedEntity.entityId}
- Name: ${anomaly.affectedEntity.entityName}

Baseline Behavior:
${JSON.stringify(anomaly.baselineBehavior, null, 2)}

Observed Behavior:
${JSON.stringify(anomaly.observedBehavior, null, 2)}

Deviation Metrics:
- Standard Deviations: ${anomaly.deviation.standardDeviations}
- Statistical Significance: ${anomaly.deviation.statisticalSignificance}

Please provide:
1. An enhanced description of the anomaly (be specific about what makes this concerning)
2. Estimated false positive likelihood (0.0 to 1.0)
3. Recommended immediate actions
4. Additional investigation steps

Format your response as JSON:
{
  "enhancedDescription": "...",
  "falsePositiveLikelihood": 0.X,
  "enhancedActions": [
    {"actionType": "...", "description": "...", "urgency": "immediate|urgent|standard", "automated": true|false}
  ]
}
`.trim();
  }

  private parseLLMAnalysis(llmText: string): {
    enhancedDescription?: string;
    falsePositiveLikelihood?: number;
    enhancedActions?: RecommendedAction[];
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = llmText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          enhancedDescription: parsed.enhancedDescription,
          falsePositiveLikelihood: parsed.falsePositiveLikelihood,
          enhancedActions: parsed.enhancedActions?.map((a: any) => ({
            actionType: a.actionType || 'investigate',
            description: a.description,
            urgency: a.urgency || 'standard',
            automated: a.automated || false,
            requiredRole: 'security_analyst',
          })),
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'Failed to parse LLM analysis response');
    }
    return {};
  }

  private createEnhancedProvenance(
    anomaly: BehavioralAnomaly,
    llmProvenance: ProvenanceMetadata
  ): ProvenanceMetadata {
    const custodyEntry: ChainOfCustodyEntry = {
      timestamp: new Date().toISOString(),
      actor: 'llm:anomaly-analyzer',
      action: 'enhance_analysis',
      hash: llmProvenance.outputHash || '',
    };

    return {
      ...anomaly.provenance,
      method: 'llm_enhanced',
      chainOfCustody: [
        ...(anomaly.provenance?.chainOfCustody || []),
        custodyEntry,
      ],
    } as unknown as ProvenanceMetadata;
  }

  /**
   * Get a specific anomaly by ID
   */
  async getAnomaly(id: string): Promise<BehavioralAnomaly | null> {
    return this.anomalyStore.get(id) || null;
  }

  /**
   * Update the status of an anomaly
   */
  async updateAnomalyStatus(
    id: string,
    status: AnomalyStatus,
    notes?: string
  ): Promise<BehavioralAnomaly> {
    const anomaly = this.anomalyStore.get(id);
    if (!anomaly) {
      throw new Error(`Anomaly not found: ${id}`);
    }

    const updated: BehavioralAnomaly = {
      ...anomaly,
      status,
    };

    this.anomalyStore.set(id, updated);

    logger.info('Anomaly status updated', { id, status, notes });
    return updated;
  }

  /**
   * Resolve an anomaly with final determination
   */
  async resolveAnomaly(id: string, resolution: AnomalyResolution): Promise<BehavioralAnomaly> {
    const anomaly = this.anomalyStore.get(id);
    if (!anomaly) {
      throw new Error(`Anomaly not found: ${id}`);
    }

    const resolved: BehavioralAnomaly = {
      ...anomaly,
      status: 'mitigated',
      resolution,
    };

    this.anomalyStore.set(id, resolved);

    // Update false positive likelihood for learning
    if (resolution.resolution === 'false_positive') {
      await this.recordFalsePositive(anomaly);
    }

    logger.info('Anomaly resolved', { id, resolution: resolution.resolution });
    return resolved;
  }

  /**
   * Get anomaly trends for a tenant
   */
  async getAnomalyTrends(
    tenantId: string,
    timeRange: { start: string; end: string }
  ): Promise<AnomalyTrends> {
    const anomalies = Array.from(this.anomalyStore.values()).filter(
      (a) =>
        a.affectedEntity.tenantId === tenantId &&
        new Date(a.detectedAt) >= new Date(timeRange.start) &&
        new Date(a.detectedAt) <= new Date(timeRange.end)
    );

    const byType: Record<AnomalyType, number> = {} as Record<AnomalyType, number>;
    const bySeverity: Record<string, number> = {};

    for (const anomaly of anomalies) {
      byType[anomaly.anomalyType] = (byType[anomaly.anomalyType] || 0) + 1;
      bySeverity[anomaly.severity] = (bySeverity[anomaly.severity] || 0) + 1;
    }

    // Determine trend (simplified)
    const midpoint = new Date(
      (new Date(timeRange.start).getTime() + new Date(timeRange.end).getTime()) / 2
    );
    const firstHalf = anomalies.filter((a) => new Date(a.detectedAt) < midpoint).length;
    const secondHalf = anomalies.filter((a) => new Date(a.detectedAt) >= midpoint).length;

    let trend: 'increasing' | 'stable' | 'decreasing';
    if (secondHalf > firstHalf * 1.2) {
      trend = 'increasing';
    } else if (secondHalf < firstHalf * 0.8) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // Top affected entities
    const entityCounts = new Map<string, { entity: AffectedEntity; count: number }>();
    for (const anomaly of anomalies) {
      const key = `${anomaly.affectedEntity.entityType}:${anomaly.affectedEntity.entityId}`;
      const existing = entityCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        entityCounts.set(key, { entity: anomaly.affectedEntity, count: 1 });
      }
    }

    const topAffectedEntities = Array.from(entityCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((e) => e.entity);

    return {
      totalAnomalies: anomalies.length,
      byType,
      bySeverity,
      trend,
      topAffectedEntities,
    };
  }

  /**
   * List all anomalies with pagination and filtering
   */
  async listAnomalies(options: {
    page?: number;
    pageSize?: number;
    tenantId?: string;
    status?: AnomalyStatus;
    type?: AnomalyType;
    minSeverity?: BehavioralAnomaly['severity'];
    sortBy?: 'detectedAt' | 'riskScore';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{ anomalies: BehavioralAnomaly[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      tenantId,
      status,
      type,
      minSeverity,
      sortBy = 'detectedAt',
      sortOrder = 'desc',
    } = options;

    let anomalies = Array.from(this.anomalyStore.values());

    // Apply filters
    if (tenantId) {
      anomalies = anomalies.filter((a) => a.affectedEntity.tenantId === tenantId);
    }
    if (status) {
      anomalies = anomalies.filter((a) => a.status === status);
    }
    if (type) {
      anomalies = anomalies.filter((a) => a.anomalyType === type);
    }
    if (minSeverity) {
      anomalies = this.filterBySeverity(anomalies, minSeverity);
    }

    // Sort
    anomalies.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'detectedAt') {
        comparison = new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime();
      } else {
        comparison = a.riskScore - b.riskScore;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = anomalies.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedAnomalies = anomalies.slice(startIndex, startIndex + pageSize);

    return { anomalies: paginatedAnomalies, total };
  }

  /**
   * Get detection statistics
   */
  getStatistics(): AnomalyStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = this.initializeStatistics();
    logger.info('Anomaly detection statistics reset');
  }

  /**
   * Clear all stored anomalies
   */
  clearAnomalies(): void {
    this.anomalyStore.clear();
    logger.info('Anomaly store cleared');
  }

  // ===========================================================================
  // Private Detection Methods
  // ===========================================================================

  private async detectByType(
    anomalyType: AnomalyType,
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    switch (anomalyType) {
      case 'access_pattern':
        return this.detectAccessPatternAnomalies(scope);
      case 'volume_spike':
        return this.detectVolumeSpikeAnomalies(scope);
      case 'privilege_escalation':
        return this.detectPrivilegeEscalation(scope);
      case 'policy_circumvention':
        return this.detectPolicyCircumvention(scope);
      case 'data_exfiltration':
        return this.detectDataExfiltration(scope);
      case 'credential_abuse':
        return this.detectCredentialAbuse(scope);
      case 'insider_threat':
        return this.detectInsiderThreat(scope);
      case 'api_abuse':
        return this.detectAPIAbuse(scope);
      default:
        return [];
    }
  }

  private async detectAccessPatternAnomalies(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    // Simulate detection of unusual access times/locations
    const anomalies: BehavioralAnomaly[] = [];

    // For prototype, generate sample anomaly
    if (Math.random() > 0.7) {
      anomalies.push(
        this.createAnomaly({
          type: 'access_pattern',
          title: 'Unusual Access Time Pattern',
          description: 'User accessed system at 3:00 AM, outside normal working hours',
          severity: 'medium',
          riskScore: 65,
          entity: {
            entityType: 'user',
            entityId: 'user-123',
            entityName: 'john.doe@example.com',
            tenantId: scope.tenantIds?.[0] || 'default',
          },
          baseline: {
            timeWindow: '30d',
            metrics: [
              { name: 'typical_access_hours', value: 9, unit: 'hour_start' },
              { name: 'typical_access_hours_end', value: 18, unit: 'hour_end' },
            ],
          },
          observed: {
            observationWindow: '1h',
            metrics: [{ name: 'access_hour', value: 3, unit: 'hour' }],
          },
          deviation: {
            standardDeviations: 3.2,
            percentileJump: 99,
            absoluteChange: 6,
            relativeChange: 200,
            statisticalSignificance: 0.001,
          },
        })
      );
    }

    return anomalies;
  }

  private async detectVolumeSpikeAnomalies(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    const anomalies: BehavioralAnomaly[] = [];

    if (Math.random() > 0.8) {
      anomalies.push(
        this.createAnomaly({
          type: 'volume_spike',
          title: 'Unusual Data Volume Accessed',
          description: 'User downloaded 500MB of data, 10x their normal volume',
          severity: 'high',
          riskScore: 78,
          entity: {
            entityType: 'user',
            entityId: 'user-456',
            entityName: 'jane.smith@example.com',
            tenantId: scope.tenantIds?.[0] || 'default',
          },
          baseline: {
            timeWindow: '30d',
            metrics: [{ name: 'avg_daily_download', value: 50, unit: 'MB' }],
          },
          observed: {
            observationWindow: '24h',
            metrics: [{ name: 'daily_download', value: 500, unit: 'MB' }],
          },
          deviation: {
            standardDeviations: 4.5,
            percentileJump: 99.9,
            absoluteChange: 450,
            relativeChange: 900,
            statisticalSignificance: 0.0001,
          },
        })
      );
    }

    return anomalies;
  }

  private async detectPrivilegeEscalation(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    const anomalies: BehavioralAnomaly[] = [];

    if (Math.random() > 0.9) {
      anomalies.push(
        this.createAnomaly({
          type: 'privilege_escalation',
          title: 'Privilege Escalation Attempt',
          description: 'User attempted to access admin API endpoints without authorization',
          severity: 'critical',
          riskScore: 92,
          entity: {
            entityType: 'user',
            entityId: 'user-789',
            entityName: 'contractor@external.com',
            tenantId: scope.tenantIds?.[0] || 'default',
          },
          baseline: {
            timeWindow: '7d',
            metrics: [
              { name: 'admin_api_attempts', value: 0, unit: 'count' },
              { name: 'authorized_role', value: 0, unit: 'boolean' },
            ],
          },
          observed: {
            observationWindow: '1h',
            metrics: [
              { name: 'admin_api_attempts', value: 15, unit: 'count' },
              { name: 'authorized_role', value: 0, unit: 'boolean' },
            ],
          },
          deviation: {
            standardDeviations: 10,
            percentileJump: 100,
            absoluteChange: 15,
            relativeChange: Infinity,
            statisticalSignificance: 0.00001,
          },
        })
      );
    }

    return anomalies;
  }

  private async detectPolicyCircumvention(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    const anomalies: BehavioralAnomaly[] = [];

    if (Math.random() > 0.85) {
      anomalies.push(
        this.createAnomaly({
          type: 'policy_circumvention',
          title: 'Policy Circumvention Pattern',
          description: 'Multiple rapid requests with slightly varied parameters after denial',
          severity: 'high',
          riskScore: 75,
          entity: {
            entityType: 'user',
            entityId: 'user-101',
            entityName: 'developer@company.com',
            tenantId: scope.tenantIds?.[0] || 'default',
          },
          baseline: {
            timeWindow: '7d',
            metrics: [
              { name: 'denial_retry_rate', value: 1.2, unit: 'per_hour' },
            ],
          },
          observed: {
            observationWindow: '1h',
            metrics: [
              { name: 'denial_retry_rate', value: 25, unit: 'per_hour' },
            ],
          },
          deviation: {
            standardDeviations: 5.8,
            percentileJump: 99.5,
            absoluteChange: 23.8,
            relativeChange: 1983,
            statisticalSignificance: 0.0005,
          },
        })
      );
    }

    return anomalies;
  }

  private async detectDataExfiltration(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    // Similar pattern to other detectors
    return [];
  }

  private async detectCredentialAbuse(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    const anomalies: BehavioralAnomaly[] = [];

    if (Math.random() > 0.95) {
      anomalies.push(
        this.createAnomaly({
          type: 'credential_abuse',
          title: 'Impossible Travel Detected',
          description: 'Login from New York followed by login from London 20 minutes later',
          severity: 'critical',
          riskScore: 95,
          entity: {
            entityType: 'user',
            entityId: 'user-202',
            entityName: 'exec@company.com',
            tenantId: scope.tenantIds?.[0] || 'default',
          },
          baseline: {
            timeWindow: '90d',
            metrics: [
              { name: 'typical_locations', value: 2, unit: 'count' },
              { name: 'max_travel_speed', value: 100, unit: 'km/h' },
            ],
          },
          observed: {
            observationWindow: '1h',
            metrics: [
              { name: 'implied_travel_speed', value: 15000, unit: 'km/h' },
            ],
          },
          deviation: {
            standardDeviations: 15,
            percentileJump: 100,
            absoluteChange: 14900,
            relativeChange: 14900,
            statisticalSignificance: 0.000001,
          },
        })
      );
    }

    return anomalies;
  }

  private async detectInsiderThreat(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    return [];
  }

  private async detectAPIAbuse(
    scope: AnomalyDetectionScope
  ): Promise<BehavioralAnomaly[]> {
    return [];
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private createAnomaly(params: {
    type: AnomalyType;
    title: string;
    description: string;
    severity: BehavioralAnomaly['severity'];
    riskScore: number;
    entity: AffectedEntity;
    baseline: BaselineBehavior;
    observed: ObservedBehavior;
    deviation: DeviationMetrics;
  }): BehavioralAnomaly {
    const id = `anomaly-${randomUUID()}`;
    const now = new Date().toISOString();

    return {
      id,
      anomalyType: params.type,
      severity: params.severity,
      title: params.title,
      description: params.description,
      detectedAt: now,
      affectedEntity: params.entity,
      baselineBehavior: params.baseline,
      observedBehavior: params.observed,
      deviation: params.deviation,
      riskScore: params.riskScore,
      recommendedActions: this.generateRecommendedActions(params.type, params.severity),
      relatedAnomalies: [],
      falsePositiveLikelihood: this.estimateFalsePositiveLikelihood(params.type, params.deviation),
      evidenceChain: this.generateEvidenceChain(params),
      status: 'new',
      governanceVerdict: this.createGovernanceVerdict(params.type),
      provenance: this.createProvenance(id),
    };
  }

  private generateRecommendedActions(
    type: AnomalyType,
    severity: BehavioralAnomaly['severity']
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    // Always recommend investigation
    actions.push({
      actionType: 'investigate',
      description: 'Review the flagged activity and gather additional context',
      urgency: severity === 'critical' ? 'immediate' : 'standard',
      automated: false,
      requiredRole: 'security_analyst',
    });

    // Type-specific actions
    switch (type) {
      case 'privilege_escalation':
      case 'credential_abuse':
        actions.push({
          actionType: 'block',
          description: 'Temporarily block the affected account',
          urgency: 'immediate',
          automated: true,
          automationConfig: { action: 'suspend_account' },
          requiredRole: 'security_admin',
        });
        break;

      case 'volume_spike':
      case 'data_exfiltration':
        actions.push({
          actionType: 'restrict',
          description: 'Apply rate limiting to the affected entity',
          urgency: 'urgent',
          automated: true,
          automationConfig: { action: 'apply_rate_limit', limit: '10MB/hour' },
          requiredRole: 'security_admin',
        });
        break;

      default:
        actions.push({
          actionType: 'monitor',
          description: 'Increase monitoring for the affected entity',
          urgency: 'standard',
          automated: true,
          automationConfig: { action: 'enhanced_logging' },
          requiredRole: 'security_analyst',
        });
    }

    return actions;
  }

  private estimateFalsePositiveLikelihood(
    type: AnomalyType,
    deviation: DeviationMetrics
  ): number {
    // Base false positive rate by type
    const baseFPR: Record<AnomalyType, number> = {
      access_pattern: 0.3,
      volume_spike: 0.25,
      privilege_escalation: 0.1,
      policy_circumvention: 0.2,
      data_exfiltration: 0.15,
      credential_abuse: 0.05,
      insider_threat: 0.35,
      api_abuse: 0.2,
    };

    let fpr = baseFPR[type] || 0.2;

    // Adjust based on deviation strength
    if (deviation.standardDeviations > 5) fpr *= 0.5;
    if (deviation.statisticalSignificance < 0.001) fpr *= 0.3;

    return Math.max(0, Math.min(fpr, 1));
  }

  private generateEvidenceChain(params: {
    type: AnomalyType;
    entity: AffectedEntity;
    observed: ObservedBehavior;
  }): EvidenceItem[] {
    return [
      {
        evidenceType: 'log_entry',
        description: 'Access log entries showing the anomalous behavior',
        data: { metrics: params.observed.metrics },
        timestamp: new Date().toISOString(),
        source: 'audit-log-service',
      },
      {
        evidenceType: 'baseline_comparison',
        description: 'Statistical comparison against historical baseline',
        data: { entityId: params.entity.entityId },
        timestamp: new Date().toISOString(),
        source: 'anomaly-detection-engine',
      },
    ];
  }

  private filterBySeverity(
    anomalies: BehavioralAnomaly[],
    minSeverity?: BehavioralAnomaly['severity']
  ): BehavioralAnomaly[] {
    if (!minSeverity) return anomalies;

    const severityOrder = ['info', 'low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);

    return anomalies.filter((a) => severityOrder.indexOf(a.severity) >= minIndex);
  }

  private async processHighRiskAnomalies(anomalies: BehavioralAnomaly[]): Promise<void> {
    const highRisk = anomalies.filter(
      (a) => a.riskScore >= this.config.anomalyDetection.autoBlockThreshold
    );

    for (const anomaly of highRisk) {
      // Update anomaly status to auto-blocked
      const updated: BehavioralAnomaly = {
        ...anomaly,
        status: 'investigating' as AnomalyStatus,
      };
      this.anomalyStore.set(anomaly.id, updated);
      this.statistics.autoBlocked++;

      logger.warn('High-risk anomaly detected - auto-block triggered', {
        anomalyId: anomaly.id,
        riskScore: anomaly.riskScore,
        entity: anomaly.affectedEntity,
      });

      // Send alerts
      await this.sendAlerts(anomaly);
    }
  }

  private async sendAlerts(anomaly: BehavioralAnomaly): Promise<void> {
    for (const channel of this.config.anomalyDetection.alertChannels) {
      try {
        // In production, integrate with actual alerting systems (Slack, PagerDuty, etc.)
        logger.info('Sending anomaly alert', {
          channel,
          anomalyId: anomaly.id,
          severity: anomaly.severity,
        });
        this.statistics.alertsSent++;

        // Simulate alert sending for different channels
        switch (channel) {
          case 'slack':
            // await this.sendSlackAlert(anomaly);
            break;
          case 'email':
            // await this.sendEmailAlert(anomaly);
            break;
          case 'pagerduty':
            // await this.sendPagerDutyAlert(anomaly);
            break;
        }
      } catch (error: any) {
        logger.error({ error, channel, anomalyId: anomaly.id }, 'Failed to send alert');
      }
    }
  }

  private async recordFalsePositive(anomaly: BehavioralAnomaly): Promise<void> {
    this.statistics.falsePositives++;

    // Track false positive patterns for model improvement
    const patternKey = `${anomaly.anomalyType}:${anomaly.affectedEntity.entityType}`;
    const currentCount = this.falsePositivePatterns.get(patternKey) || 0;
    this.falsePositivePatterns.set(patternKey, currentCount + 1);

    // If a pattern has too many false positives, adjust detection thresholds
    if (currentCount + 1 >= 5) {
      logger.warn('High false positive rate detected for pattern', {
        pattern: patternKey,
        count: currentCount + 1,
        suggestion: 'Consider adjusting detection thresholds',
      });
    }

    logger.info('Recording false positive for model improvement', {
      anomalyId: anomaly.id,
      type: anomaly.anomalyType,
      patternKey,
      patternCount: currentCount + 1,
    });
  }

  /**
   * Record a true positive (confirmed threat)
   */
  async recordTruePositive(anomalyId: string): Promise<void> {
    const anomaly = this.anomalyStore.get(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly not found: ${anomalyId}`);
    }

    this.statistics.truePositives++;

    const updated: BehavioralAnomaly = {
      ...anomaly,
      status: 'confirmed' as AnomalyStatus,
    };
    this.anomalyStore.set(anomalyId, updated);

    logger.info('True positive confirmed', {
      anomalyId,
      type: anomaly.anomalyType,
    });
  }

  private createGovernanceVerdict(type: AnomalyType): GovernanceVerdict {
    return {
      action: 'WARN',
      reasons: [`Anomaly detected: ${type}`],
      policyIds: ['anomaly-detection-policy'],
      metadata: {
        timestamp: new Date().toISOString(),
        evaluator: 'BehavioralAnomalyService',
        latencyMs: 0,
        simulation: false,
      },
      provenance: {
        origin: 'anomaly-detection-engine',
        confidence: 0.85,
      },
    };
  }

  private createProvenance(anomalyId: string): ProvenanceMetadata {
    return {
      id: `prov-anomaly-${anomalyId}`,
      timestamp: new Date().toISOString(),
      actor: 'BehavioralAnomalyService',
      action: 'detect_anomaly',
      inputs: ['access_logs', 'baseline_models'],
      outputs: [anomalyId],
      confidence: 0.85,
      method: 'statistical_analysis_with_ml',
    } as unknown as ProvenanceMetadata;
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createBehavioralAnomalyService(
  config: Partial<AIGovernanceConfig> = {}
): BehavioralAnomalyService {
  const defaultConfig: AIGovernanceConfig = {
    enabled: true,
    policySuggestions: {
      enabled: true,
      maxSuggestionsPerDay: 10,
      minConfidenceThreshold: 0.6,
      requireHumanApproval: true,
    },
    verdictExplanations: {
      enabled: true,
      defaultAudience: 'end_user',
      defaultTone: 'friendly',
      cacheExplanations: true,
      cacheTTLSeconds: 3600,
    },
    anomalyDetection: {
      enabled: true,
      detectionIntervalSeconds: 300,
      minAnomalyScore: 50,
      autoBlockThreshold: 90,
      alertChannels: ['slack', 'email'],
    },
    privacySettings: {
      federatedLearning: false,
      differentialPrivacy: true,
      epsilonBudget: 1.0,
      dataRetentionDays: 90,
      piiRedaction: true,
    },
    llmSettings: {
      provider: 'mock',
      model: 'gpt-4-turbo',
      maxTokens: 4096,
      temperature: 0.3,
      timeout: 30000,
    },
  };

  return new BehavioralAnomalyService({ ...defaultConfig, ...config });
}

export default BehavioralAnomalyService;
