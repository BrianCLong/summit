/**
 * Cognitive Security Evaluation Service
 *
 * Implements the evaluation moat - measuring impact, not just model accuracy:
 * - Time-to-detect campaign start (p50/p95)
 * - Claim-level precision/recall + citation correctness
 * - False attribution rate (critical)
 * - Narrative containment metrics (growth-rate reduction, cross-channel spread)
 * - Operator efficiency (analyst minutes per resolved incident)
 *
 * Aligned with NIST AI Risk Management Framework.
 */

import { randomUUID } from 'crypto';
import pino from 'pino';
import type { Driver, Session } from 'neo4j-driver';

import type {
  CogSecMetrics,
  DetectionMetrics,
  VerificationMetrics,
  ResponseMetrics,
  OperatorMetrics,
  Campaign,
  Claim,
  CogSecIncident,
} from './types.js';

const logger = (pino as any)({ name: 'cogsec-evaluation-service' });

// ============================================================================
// Configuration
// ============================================================================

export interface EvaluationServiceConfig {
  /** Neo4j driver */
  neo4jDriver: Driver;
  /** TimescaleDB connection for time-series metrics */
  timescalePool?: any;
  /** Enable real-time metric updates */
  realTimeMetrics?: boolean;
  /** Metric aggregation interval (ms) */
  aggregationIntervalMs?: number;
}

// ============================================================================
// Benchmark Targets
// ============================================================================

export const BENCHMARK_TARGETS = {
  detection: {
    timeToDetectP50: 3600000, // 1 hour target
    timeToDetectP95: 14400000, // 4 hours target
    falsePositiveRate: 0.05, // 5% target
  },
  verification: {
    claimPrecision: 0.9, // 90% target
    claimRecall: 0.85, // 85% target
    citationCorrectness: 0.95, // 95% target
    falseAttributionRate: 0.02, // 2% target (critical)
  },
  response: {
    narrativeContainmentRate: 0.7, // 70% target
    avgGrowthRateReduction: 50, // 50% reduction target
    takedownSuccessRate: 0.8, // 80% target
  },
  operator: {
    minutesPerIncident: 120, // 2 hours target
    claimsPerAnalystHour: 20, // 20 claims/hour target
  },
};

// ============================================================================
// Evaluation Service
// ============================================================================

export class EvaluationService {
  private readonly config: EvaluationServiceConfig;
  private metricsCache = new Map<string, CogSecMetrics>();

  constructor(config: EvaluationServiceConfig) {
    this.config = {
      realTimeMetrics: true,
      aggregationIntervalMs: 300000, // 5 minutes
      ...config,
    };

    logger.info('Evaluation service initialized');
  }

  private getSession(): Session {
    return this.config.neo4jDriver.session();
  }

  // ==========================================================================
  // Detection Metrics
  // ==========================================================================

  /**
   * Calculate time-to-detect metrics for campaigns
   */
  async calculateDetectionMetrics(
    startDate: string,
    endDate: string,
  ): Promise<DetectionMetrics> {
    const session = this.getSession();
    try {
      // Get campaigns and their detection times
      const result = await session.run(
        `
        MATCH (camp:CogSecCampaign)
        WHERE camp.firstDetectedAt >= datetime($startDate)
          AND camp.firstDetectedAt <= datetime($endDate)
        WITH camp
        OPTIONAL MATCH (c:CogSecClaim)-[:PART_OF]->(n:CogSecNarrative)
        WHERE n.id IN camp.narrativeIds
        WITH camp, min(c.firstObservedAt) AS firstClaimAt
        WITH camp,
             duration.between(firstClaimAt, camp.firstDetectedAt).milliseconds AS detectionTimeMs
        WHERE detectionTimeMs IS NOT NULL
        RETURN
          collect(detectionTimeMs) AS detectionTimes,
          count(camp) AS campaignCount
        `,
        { startDate, endDate },
      );

      const record = result.records[0];
      const detectionTimes = (record?.get('detectionTimes') as number[]) || [];
      const campaignCount = record?.get('campaignCount')?.toNumber() || 0;

      // Calculate percentiles
      const sorted = [...detectionTimes].sort((a, b) => a - b);
      const p50Index = Math.floor(sorted.length * 0.5);
      const p95Index = Math.floor(sorted.length * 0.95);

      // Get signal count and false positives
      const signalResult = await session.run(
        `
        MATCH (s:CogSecCoordinationSignal)
        WHERE s.detectedAt >= datetime($startDate)
          AND s.detectedAt <= datetime($endDate)
        RETURN
          count(s) AS totalSignals,
          count(CASE WHEN s.campaignId IS NULL THEN 1 END) AS unattributedSignals
        `,
        { startDate, endDate },
      );

      const signalRecord = signalResult.records[0];
      const totalSignals = signalRecord?.get('totalSignals')?.toNumber() || 0;
      const unattributedSignals =
        signalRecord?.get('unattributedSignals')?.toNumber() || 0;

      return {
        timeToDetectP50: sorted[p50Index] || 0,
        timeToDetectP95: sorted[p95Index] || 0,
        campaignsDetected: campaignCount,
        signalsDetected: totalSignals,
        falsePositiveRate:
          totalSignals > 0 ? unattributedSignals / totalSignals : 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Track individual campaign detection event
   */
  async trackCampaignDetection(
    campaignId: string,
    detectedAt: string,
    firstClaimAt: string,
  ): Promise<{ timeToDetectMs: number; meetsBenchmark: boolean }> {
    const detectedDate = new Date(detectedAt);
    const firstClaimDate = new Date(firstClaimAt);
    const timeToDetectMs = detectedDate.getTime() - firstClaimDate.getTime();

    const meetsBenchmark =
      timeToDetectMs <= BENCHMARK_TARGETS.detection.timeToDetectP50;

    // Store metric event
    await this.storeMetricEvent('detection', {
      campaignId,
      timeToDetectMs,
      meetsBenchmark,
      timestamp: detectedAt,
    });

    logger.info(
      { campaignId, timeToDetectMs, meetsBenchmark },
      'Tracked campaign detection',
    );

    return { timeToDetectMs, meetsBenchmark };
  }

  // ==========================================================================
  // Verification Metrics
  // ==========================================================================

  /**
   * Calculate claim verification metrics
   */
  async calculateVerificationMetrics(
    startDate: string,
    endDate: string,
    groundTruth?: Map<string, { verdict: string; citations: string[] }>,
  ): Promise<VerificationMetrics> {
    const session = this.getSession();
    try {
      // Get claims with verdicts
      const result = await session.run(
        `
        MATCH (c:CogSecClaim)
        WHERE c.updatedAt >= datetime($startDate)
          AND c.updatedAt <= datetime($endDate)
          AND c.verdict <> 'UNVERIFIED'
        RETURN c
        `,
        { startDate, endDate },
      );

      const claims = result.records.map((r: any) => r.get('c').properties);

      // Calculate precision/recall if ground truth provided
      let precision = 0;
      let recall = 0;
      let citationCorrectness = 0;
      let falseAttributionCount = 0;

      if (groundTruth && groundTruth.size > 0) {
        let truePositives = 0;
        let falsePositives = 0;
        let falseNegatives = 0;
        let correctCitations = 0;
        let totalCitations = 0;

        for (const claim of claims) {
          const truth = groundTruth.get(claim.id);

          if (truth) {
            if (claim.verdict === truth.verdict) {
              truePositives++;

              // Check citation correctness
              const claimCitations = claim.evidenceIds || [];
              for (const cit of claimCitations) {
                totalCitations++;
                if (truth.citations.includes(cit)) {
                  correctCitations++;
                }
              }
            } else {
              falsePositives++;

              // Track false attribution (claim attributed to wrong actor)
              if (
                claim.verdict === 'VERIFIED' &&
                truth.verdict === 'REFUTED'
              ) {
                falseAttributionCount++;
              }
            }
          } else {
            // No ground truth - can't evaluate
          }
        }

        // Calculate claims in ground truth not in our results
        for (const [claimId] of groundTruth) {
          if (!claims.find((c: any) => c.id === claimId)) {
            falseNegatives++;
          }
        }

        precision =
          truePositives + falsePositives > 0
            ? truePositives / (truePositives + falsePositives)
            : 0;

        recall =
          truePositives + falseNegatives > 0
            ? truePositives / (truePositives + falseNegatives)
            : 0;

        citationCorrectness =
          totalCitations > 0 ? correctCitations / totalCitations : 0;
      } else {
        // Estimate based on confidence scores
        const avgConfidence =
          claims.reduce((sum: number, c: any) => sum + (c.verdictConfidence || 0), 0) /
          Math.max(1, claims.length);
        precision = avgConfidence;
        recall = avgConfidence * 0.9; // Estimate
        citationCorrectness = avgConfidence;
      }

      // Get verification time stats
      const timeResult = await session.run(
        `
        MATCH (c:CogSecClaim)
        WHERE c.updatedAt >= datetime($startDate)
          AND c.updatedAt <= datetime($endDate)
          AND c.verdict <> 'UNVERIFIED'
        WITH c,
             duration.between(c.createdAt, c.updatedAt).milliseconds AS verificationTimeMs
        RETURN avg(verificationTimeMs) AS avgTime, count(c) AS count
        `,
        { startDate, endDate },
      );

      const timeRecord = timeResult.records[0];

      return {
        claimPrecision: precision,
        claimRecall: recall,
        citationCorrectness,
        falseAttributionRate:
          claims.length > 0 ? falseAttributionCount / claims.length : 0,
        avgVerificationTimeMs: timeRecord?.get('avgTime') || 0,
        claimsVerified: timeRecord?.get('count')?.toNumber() || 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Track individual claim verification
   */
  async trackClaimVerification(
    claimId: string,
    verdict: string,
    confidence: number,
    verificationTimeMs: number,
    citationCount: number,
  ): Promise<void> {
    await this.storeMetricEvent('verification', {
      claimId,
      verdict,
      confidence,
      verificationTimeMs,
      citationCount,
      timestamp: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // Response Metrics
  // ==========================================================================

  /**
   * Calculate response and containment metrics
   */
  async calculateResponseMetrics(
    startDate: string,
    endDate: string,
  ): Promise<ResponseMetrics> {
    const session = this.getSession();
    try {
      // Get narrative containment data
      const narrativeResult = await session.run(
        `
        MATCH (n:CogSecNarrative)
        WHERE n.createdAt >= datetime($startDate)
          AND n.createdAt <= datetime($endDate)
        WITH n
        OPTIONAL MATCH (n)<-[:PART_OF]-(c:CogSecClaim)
        WITH n,
             n.velocity AS initialVelocity,
             count(c) AS claimCount,
             collect(c.channelIds) AS channelSets
        RETURN
          count(n) AS narrativeCount,
          avg(CASE WHEN n.status = 'DECLINING' OR n.status = 'DORMANT'
              THEN 1.0 ELSE 0.0 END) AS containmentRate,
          avg(size(apoc.coll.flatten(channelSets))) AS avgChannelSpread
        `,
        { startDate, endDate },
      );

      // Get playbook execution data
      const playbookResult = await session.run(
        `
        MATCH (p:CogSecPlaybook)
        WHERE p.createdAt >= datetime($startDate)
          AND p.createdAt <= datetime($endDate)
        RETURN
          count(p) AS totalPlaybooks,
          count(CASE WHEN p.status = 'COMPLETED' THEN 1 END) AS completedPlaybooks
        `,
        { startDate, endDate },
      );

      // Get takedown data
      const takedownResult = await session.run(
        `
        MATCH (a:CogSecArtifact {type: 'TAKEDOWN_PACKET'})
        WHERE a.generatedAt >= datetime($startDate)
          AND a.generatedAt <= datetime($endDate)
        RETURN
          count(a) AS totalTakedowns,
          count(CASE WHEN a.approvedAt IS NOT NULL THEN 1 END) AS approvedTakedowns
        `,
        { startDate, endDate },
      );

      const narrativeRecord = narrativeResult.records[0];
      const playbookRecord = playbookResult.records[0];
      const takedownRecord = takedownResult.records[0];

      const totalPlaybooks = playbookRecord?.get('totalPlaybooks')?.toNumber() || 0;
      const completedPlaybooks = playbookRecord?.get('completedPlaybooks')?.toNumber() || 0;

      const totalTakedowns = takedownRecord?.get('totalTakedowns')?.toNumber() || 0;
      const approvedTakedowns = takedownRecord?.get('approvedTakedowns')?.toNumber() || 0;

      return {
        narrativeContainmentRate: narrativeRecord?.get('containmentRate') || 0,
        avgGrowthRateReduction: 0, // Would need time-series data
        crossChannelSpreadReduction: 0, // Would need before/after comparison
        playbooksExecuted: completedPlaybooks,
        takedownsSubmitted: totalTakedowns,
        takedownSuccessRate:
          totalTakedowns > 0 ? approvedTakedowns / totalTakedowns : 0,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Track narrative containment
   */
  async trackNarrativeContainment(
    narrativeId: string,
    initialSpreadRate: number,
    finalSpreadRate: number,
    channelsBefore: number,
    channelsAfter: number,
  ): Promise<{
    spreadRateReduction: number;
    channelReduction: number;
    contained: boolean;
  }> {
    const spreadRateReduction =
      initialSpreadRate > 0
        ? ((initialSpreadRate - finalSpreadRate) / initialSpreadRate) * 100
        : 0;

    const channelReduction =
      channelsBefore > 0
        ? ((channelsBefore - channelsAfter) / channelsBefore) * 100
        : 0;

    const contained = finalSpreadRate < initialSpreadRate * 0.5;

    await this.storeMetricEvent('containment', {
      narrativeId,
      spreadRateReduction,
      channelReduction,
      contained,
      timestamp: new Date().toISOString(),
    });

    return { spreadRateReduction, channelReduction, contained };
  }

  // ==========================================================================
  // Operator Efficiency Metrics
  // ==========================================================================

  /**
   * Calculate operator efficiency metrics
   */
  async calculateOperatorMetrics(
    startDate: string,
    endDate: string,
  ): Promise<OperatorMetrics> {
    const session = this.getSession();
    try {
      // Get incident resolution times
      const incidentResult = await session.run(
        `
        MATCH (i:CogSecIncident)
        WHERE i.createdAt >= datetime($startDate)
          AND i.createdAt <= datetime($endDate)
          AND i.resolvedAt IS NOT NULL
        WITH i,
             duration.between(i.createdAt, i.resolvedAt).minutes AS resolutionMinutes
        RETURN
          avg(resolutionMinutes) AS avgResolutionTime,
          count(i) AS resolvedIncidents
        `,
        { startDate, endDate },
      );

      // Get claims reviewed per analyst
      const claimResult = await session.run(
        `
        MATCH (a:CogSecAuditLog)
        WHERE a.action = 'UPDATE_VERDICT'
          AND a.timestamp >= datetime($startDate)
          AND a.timestamp <= datetime($endDate)
        WITH a.userId AS analyst, count(a) AS claimsReviewed
        RETURN
          avg(claimsReviewed) AS avgClaimsPerAnalyst,
          count(DISTINCT analyst) AS analystCount,
          sum(claimsReviewed) AS totalClaims
        `,
        { startDate, endDate },
      );

      // Get playbooks per incident
      const playbookResult = await session.run(
        `
        MATCH (i:CogSecIncident)
        WHERE i.createdAt >= datetime($startDate)
          AND i.createdAt <= datetime($endDate)
        WITH i, size(i.playbookIds) AS playbookCount
        RETURN avg(playbookCount) AS avgPlaybooksPerIncident
        `,
        { startDate, endDate },
      );

      const incidentRecord = incidentResult.records[0];
      const claimRecord = claimResult.records[0];
      const playbookRecord = playbookResult.records[0];

      // Calculate hours in period
      const periodHours =
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60);

      const totalClaims = claimRecord?.get('totalClaims')?.toNumber() || 0;
      const analystCount = claimRecord?.get('analystCount')?.toNumber() || 1;
      const analystHours = analystCount * Math.min(periodHours, 40 * 4); // Cap at 4 weeks

      return {
        minutesPerIncident: incidentRecord?.get('avgResolutionTime') || 0,
        claimsPerAnalystHour:
          analystHours > 0 ? totalClaims / analystHours : 0,
        playbooksPerIncident:
          playbookRecord?.get('avgPlaybooksPerIncident') || 0,
        avgResolutionTimeMs:
          (incidentRecord?.get('avgResolutionTime') || 0) * 60 * 1000,
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Track analyst activity
   */
  async trackAnalystActivity(
    analystId: string,
    activityType: 'CLAIM_REVIEW' | 'INCIDENT_RESPONSE' | 'PLAYBOOK_EXECUTION',
    durationMinutes: number,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.storeMetricEvent('analyst_activity', {
      analystId,
      activityType,
      durationMinutes,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // ==========================================================================
  // Aggregate Metrics
  // ==========================================================================

  /**
   * Calculate all metrics for a period
   */
  async calculateAllMetrics(
    startDate: string,
    endDate: string,
    groundTruth?: Map<string, { verdict: string; citations: string[] }>,
  ): Promise<CogSecMetrics> {
    const [detection, verification, response, operatorEfficiency] =
      await Promise.all([
        this.calculateDetectionMetrics(startDate, endDate),
        this.calculateVerificationMetrics(startDate, endDate, groundTruth),
        this.calculateResponseMetrics(startDate, endDate),
        this.calculateOperatorMetrics(startDate, endDate),
      ]);

    const metrics: CogSecMetrics = {
      id: randomUUID(),
      periodStart: startDate,
      periodEnd: endDate,
      detection,
      verification,
      response,
      operatorEfficiency,
      generatedAt: new Date().toISOString(),
    };

    // Cache metrics
    const cacheKey = `${startDate}-${endDate}`;
    this.metricsCache.set(cacheKey, metrics);

    // Persist metrics
    await this.persistMetrics(metrics);

    logger.info(
      {
        metricsId: metrics.id,
        detection: {
          p50: detection.timeToDetectP50,
          campaigns: detection.campaignsDetected,
        },
        verification: {
          precision: verification.claimPrecision,
          claims: verification.claimsVerified,
        },
      },
      'Calculated all metrics',
    );

    return metrics;
  }

  /**
   * Compare metrics against benchmarks
   */
  compareToBenchmarks(metrics: CogSecMetrics): {
    detection: Record<string, { value: number; target: number; met: boolean }>;
    verification: Record<string, { value: number; target: number; met: boolean }>;
    response: Record<string, { value: number; target: number; met: boolean }>;
    operator: Record<string, { value: number; target: number; met: boolean }>;
    overallScore: number;
  } {
    const compareMetric = (
      value: number,
      target: number,
      lowerIsBetter = false,
    ) => ({
      value,
      target,
      met: lowerIsBetter ? value <= target : value >= target,
    });

    const detection = {
      timeToDetectP50: compareMetric(
        metrics.detection.timeToDetectP50,
        BENCHMARK_TARGETS.detection.timeToDetectP50,
        true,
      ),
      timeToDetectP95: compareMetric(
        metrics.detection.timeToDetectP95,
        BENCHMARK_TARGETS.detection.timeToDetectP95,
        true,
      ),
      falsePositiveRate: compareMetric(
        metrics.detection.falsePositiveRate,
        BENCHMARK_TARGETS.detection.falsePositiveRate,
        true,
      ),
    };

    const verification = {
      claimPrecision: compareMetric(
        metrics.verification.claimPrecision,
        BENCHMARK_TARGETS.verification.claimPrecision,
      ),
      claimRecall: compareMetric(
        metrics.verification.claimRecall,
        BENCHMARK_TARGETS.verification.claimRecall,
      ),
      citationCorrectness: compareMetric(
        metrics.verification.citationCorrectness,
        BENCHMARK_TARGETS.verification.citationCorrectness,
      ),
      falseAttributionRate: compareMetric(
        metrics.verification.falseAttributionRate,
        BENCHMARK_TARGETS.verification.falseAttributionRate,
        true,
      ),
    };

    const response = {
      narrativeContainmentRate: compareMetric(
        metrics.response.narrativeContainmentRate,
        BENCHMARK_TARGETS.response.narrativeContainmentRate,
      ),
      avgGrowthRateReduction: compareMetric(
        metrics.response.avgGrowthRateReduction,
        BENCHMARK_TARGETS.response.avgGrowthRateReduction,
      ),
      takedownSuccessRate: compareMetric(
        metrics.response.takedownSuccessRate,
        BENCHMARK_TARGETS.response.takedownSuccessRate,
      ),
    };

    const operator = {
      minutesPerIncident: compareMetric(
        metrics.operatorEfficiency.minutesPerIncident,
        BENCHMARK_TARGETS.operator.minutesPerIncident,
        true,
      ),
      claimsPerAnalystHour: compareMetric(
        metrics.operatorEfficiency.claimsPerAnalystHour,
        BENCHMARK_TARGETS.operator.claimsPerAnalystHour,
      ),
    };

    // Calculate overall score (percentage of benchmarks met)
    const allComparisons = [
      ...Object.values(detection),
      ...Object.values(verification),
      ...Object.values(response),
      ...Object.values(operator),
    ];

    const metCount = allComparisons.filter((c) => c.met).length;
    const overallScore = metCount / allComparisons.length;

    return {
      detection,
      verification,
      response,
      operator,
      overallScore,
    };
  }

  /**
   * Get metrics trends over time
   */
  async getMetricsTrends(
    metricName: string,
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day',
  ): Promise<Array<{ date: string; value: number }>> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (m:CogSecMetricsSnapshot)
        WHERE m.generatedAt >= datetime($startDate)
          AND m.generatedAt <= datetime($endDate)
        WITH m, date(m.generatedAt) AS metricDate
        ORDER BY metricDate
        RETURN metricDate, m[$metricName] AS value
        `,
        { startDate, endDate, metricName },
      );

      return result.records.map((r: any) => ({
        date: r.get('metricDate').toString(),
        value: r.get('value') || 0,
      }));
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // NIST AI RMF Alignment
  // ==========================================================================

  /**
   * Generate NIST AI RMF aligned risk assessment
   */
  async generateRiskAssessment(): Promise<{
    governanceRisks: string[];
    mapRisks: string[];
    measureRisks: string[];
    manageRisks: string[];
    overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    // Get recent metrics
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const metrics = await this.calculateAllMetrics(startDate, endDate);
    const comparison = this.compareToBenchmarks(metrics);

    const risks: {
      governanceRisks: string[];
      mapRisks: string[];
      measureRisks: string[];
      manageRisks: string[];
    } = {
      governanceRisks: [],
      mapRisks: [],
      measureRisks: [],
      manageRisks: [],
    };

    // GOVERN: Organizational governance risks
    if (comparison.operator.minutesPerIncident.met === false) {
      risks.governanceRisks.push(
        'Incident resolution exceeds target SLA, indicating potential staffing or process issues',
      );
    }

    // MAP: Context and risk mapping
    if (comparison.detection.falsePositiveRate.met === false) {
      risks.mapRisks.push(
        'High false positive rate may lead to alert fatigue and missed real threats',
      );
    }

    if (comparison.verification.falseAttributionRate.met === false) {
      risks.mapRisks.push(
        'CRITICAL: False attribution rate exceeds threshold - risk of incorrectly attributing content',
      );
    }

    // MEASURE: Performance measurement
    if (comparison.verification.claimPrecision.met === false) {
      risks.measureRisks.push(
        'Claim verification precision below target - review verification criteria',
      );
    }

    if (comparison.detection.timeToDetectP95.met === false) {
      risks.measureRisks.push(
        'Detection time (p95) exceeds target - consider improving detection algorithms',
      );
    }

    // MANAGE: Risk management
    if (comparison.response.narrativeContainmentRate.met === false) {
      risks.manageRisks.push(
        'Narrative containment below target - review response strategies',
      );
    }

    // Calculate overall risk level
    const criticalRisks = risks.mapRisks.filter((r) =>
      r.includes('CRITICAL'),
    ).length;
    const highRisks = Object.values(risks).flat().length;

    let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (criticalRisks > 0) {
      overallRiskLevel = 'CRITICAL';
    } else if (highRisks > 5) {
      overallRiskLevel = 'HIGH';
    } else if (highRisks > 2) {
      overallRiskLevel = 'MEDIUM';
    } else {
      overallRiskLevel = 'LOW';
    }

    return {
      ...risks,
      overallRiskLevel,
    };
  }

  // ==========================================================================
  // Storage
  // ==========================================================================

  private async storeMetricEvent(
    category: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (e:CogSecMetricEvent {
          id: $id,
          category: $category,
          data: $data,
          timestamp: datetime()
        })
        `,
        {
          id: randomUUID(),
          category,
          data: JSON.stringify(data),
        },
      );
    } finally {
      await session.close();
    }
  }

  private async persistMetrics(metrics: CogSecMetrics): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (m:CogSecMetricsSnapshot {
          id: $id,
          periodStart: datetime($periodStart),
          periodEnd: datetime($periodEnd),
          detection: $detection,
          verification: $verification,
          response: $response,
          operatorEfficiency: $operatorEfficiency,
          generatedAt: datetime($generatedAt)
        })
        `,
        {
          ...metrics,
          detection: JSON.stringify(metrics.detection),
          verification: JSON.stringify(metrics.verification),
          response: JSON.stringify(metrics.response),
          operatorEfficiency: JSON.stringify(metrics.operatorEfficiency),
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const session = this.getSession();
    try {
      await session.run('RETURN 1');
      return {
        healthy: true,
        details: {
          neo4jConnected: true,
          realTimeMetrics: this.config.realTimeMetrics,
          cacheSize: this.metricsCache.size,
          benchmarkTargets: BENCHMARK_TARGETS,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          neo4jConnected: false,
          error: error instanceof Error ? error.message : 'Unknown',
        },
      };
    } finally {
      await session.close();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let serviceInstance: EvaluationService | null = null;

export function createEvaluationService(
  config: EvaluationServiceConfig,
): EvaluationService {
  return new EvaluationService(config);
}

export function initializeEvaluationService(
  config: EvaluationServiceConfig,
): EvaluationService {
  serviceInstance = new EvaluationService(config);
  return serviceInstance;
}

export function getEvaluationService(): EvaluationService {
  if (!serviceInstance) {
    throw new Error('Evaluation service not initialized');
  }
  return serviceInstance;
}
