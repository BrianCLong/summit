/**
 * Policy Impact Analyzer
 *
 * Analyzes the impact of policies on system operations, security posture,
 * and compliance status. Provides metrics and visualizations.
 *
 * SOC 2 Controls: CC5.2 (Policy Management), CC4.1 (Monitoring)
 *
 * @module analytics/policy/PolicyImpactAnalyzer
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../../types/data-envelope.ts';
import logger from '../../utils/logger.ts';

// ============================================================================
// Types
// ============================================================================

export interface PolicyDecision {
  policyId: string;
  ruleId: string;
  decision: 'allow' | 'deny' | 'flag' | 'review';
  subject: string;
  resource: string;
  action: string;
  timestamp: Date;
  evaluationTimeMs: number;
  context?: Record<string, unknown>;
}

export interface PolicyMetrics {
  policyId: string;
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  decisions: {
    total: number;
    allowed: number;
    denied: number;
    flagged: number;
    reviewRequired: number;
  };
  performance: {
    averageEvaluationMs: number;
    p95EvaluationMs: number;
    p99EvaluationMs: number;
    maxEvaluationMs: number;
  };
  coverage: {
    uniqueSubjects: number;
    uniqueResources: number;
    ruleHitDistribution: Map<string, number>;
  };
  trends: {
    decisionTrend: TrendData[];
    performanceTrend: TrendData[];
  };
}

export interface TrendData {
  timestamp: Date;
  value: number;
  label: string;
}

export interface ImpactReport {
  id: string;
  tenantId: string;
  generatedAt: string;
  period: {
    start: string;
    end: string;
  };
  summary: ImpactSummary;
  policyMetrics: PolicyMetrics[];
  securityPosture: SecurityPostureAssessment;
  complianceStatus: ComplianceStatusSummary;
  operationalImpact: OperationalImpact;
  recommendations: string[];
  governanceVerdict: GovernanceVerdict;
}

export interface ImpactSummary {
  totalDecisions: number;
  denialRate: number;
  flagRate: number;
  averageEvaluationTimeMs: number;
  policiesActive: number;
  rulesActive: number;
  overallHealthScore: number;
}

export interface SecurityPostureAssessment {
  overallScore: number;
  previousScore: number;
  trend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  weaknesses: string[];
  riskFactors: Array<{
    category: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    mitigationStatus: 'mitigated' | 'partial' | 'unmitigated';
  }>;
}

export interface ComplianceStatusSummary {
  overallScore: number;
  frameworkScores: Map<string, number>;
  controlsEvaluated: number;
  controlsPassing: number;
  controlsFailing: number;
  gaps: Array<{
    controlId: string;
    framework: string;
    gap: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

export interface OperationalImpact {
  requestsBlocked: number;
  requestsFlagged: number;
  falsePositiveEstimate: number;
  userFrictionScore: number;
  performanceOverhead: {
    totalMs: number;
    percentageOfRequestTime: number;
  };
  topBlockedResources: Array<{
    resource: string;
    count: number;
    percentage: number;
  }>;
  topBlockedSubjects: Array<{
    subject: string;
    count: number;
    percentage: number;
  }>;
}

export interface ImpactAnalyzerConfig {
  /** Period for metrics aggregation in hours */
  aggregationPeriodHours: number;
  /** Number of trend data points to retain */
  trendDataPoints: number;
  /** P95 threshold for performance alerts (ms) */
  p95ThresholdMs: number;
  /** Denial rate threshold for alerts */
  denialRateThreshold: number;
  /** Enable security posture assessment */
  assessSecurityPosture: boolean;
  /** Enable compliance status tracking */
  trackCompliance: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'policy-impact-analyzer-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'PolicyImpactAnalyzer',
  };
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function calculateHealthScore(metrics: PolicyMetrics): number {
  let score = 100;

  // Penalize high denial rates (some denial is normal)
  const denialRate = metrics.decisions.denied / metrics.decisions.total;
  if (denialRate > 0.3) score -= 20;
  else if (denialRate > 0.2) score -= 10;

  // Penalize slow performance
  if (metrics.performance.p95EvaluationMs > 100) score -= 15;
  else if (metrics.performance.p95EvaluationMs > 50) score -= 5;

  // Reward good coverage
  if (metrics.coverage.uniqueSubjects > 100) score += 5;

  // Check rule hit distribution (some rules should be matching)
  const totalHits = Array.from(metrics.coverage.ruleHitDistribution.values())
    .reduce((sum, hits) => sum + hits, 0);
  if (totalHits === 0) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: ImpactAnalyzerConfig = {
  aggregationPeriodHours: 24,
  trendDataPoints: 30,
  p95ThresholdMs: 100,
  denialRateThreshold: 0.25,
  assessSecurityPosture: true,
  trackCompliance: true,
};

// ============================================================================
// Metrics Aggregator
// ============================================================================

class MetricsAggregator {
  private decisions: Map<string, PolicyDecision[]> = new Map();
  private maxDecisions = 100000;

  /**
   * Record a policy decision
   */
  recordDecision(tenantId: string, decision: PolicyDecision): void {
    const key = `${tenantId}:${decision.policyId}`;
    const existing = this.decisions.get(key) || [];
    existing.push(decision);

    // Trim old decisions
    if (existing.length > this.maxDecisions) {
      existing.splice(0, existing.length - this.maxDecisions);
    }

    this.decisions.set(key, existing);
  }

  /**
   * Get aggregated metrics for a policy
   */
  getMetrics(
    tenantId: string,
    policyId: string,
    startTime: Date,
    endTime: Date
  ): PolicyMetrics {
    const key = `${tenantId}:${policyId}`;
    const allDecisions = this.decisions.get(key) || [];

    // Filter by time range
    const decisions = allDecisions.filter(
      d => d.timestamp >= startTime && d.timestamp <= endTime
    );

    // Calculate decision counts
    const decisionCounts = {
      total: decisions.length,
      allowed: decisions.filter(d => d.decision === 'allow').length,
      denied: decisions.filter(d => d.decision === 'deny').length,
      flagged: decisions.filter(d => d.decision === 'flag').length,
      reviewRequired: decisions.filter(d => d.decision === 'review').length,
    };

    // Calculate performance metrics
    const evalTimes = decisions.map(d => d.evaluationTimeMs);
    const performance = {
      averageEvaluationMs: evalTimes.length > 0
        ? evalTimes.reduce((a, b) => a + b, 0) / evalTimes.length
        : 0,
      p95EvaluationMs: calculatePercentile(evalTimes, 95),
      p99EvaluationMs: calculatePercentile(evalTimes, 99),
      maxEvaluationMs: evalTimes.length > 0 ? Math.max(...evalTimes) : 0,
    };

    // Calculate coverage
    const uniqueSubjects = new Set(decisions.map(d => d.subject));
    const uniqueResources = new Set(decisions.map(d => d.resource));
    const ruleHitDistribution = new Map<string, number>();
    for (const decision of decisions) {
      const current = ruleHitDistribution.get(decision.ruleId) || 0;
      ruleHitDistribution.set(decision.ruleId, current + 1);
    }

    // Calculate trends (hourly buckets)
    const trends = this.calculateTrends(decisions);

    return {
      policyId,
      tenantId,
      period: { start: startTime, end: endTime },
      decisions: decisionCounts,
      performance,
      coverage: {
        uniqueSubjects: uniqueSubjects.size,
        uniqueResources: uniqueResources.size,
        ruleHitDistribution,
      },
      trends,
    };
  }

  /**
   * Get all policy IDs for a tenant
   */
  getPolicyIds(tenantId: string): string[] {
    const policyIds = new Set<string>();
    for (const key of this.decisions.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        policyIds.add(key.split(':')[1]);
      }
    }
    return Array.from(policyIds);
  }

  /**
   * Clear old data
   */
  clearOldData(olderThan: Date): void {
    for (const [key, decisions] of this.decisions) {
      const filtered = decisions.filter(d => d.timestamp >= olderThan);
      if (filtered.length === 0) {
        this.decisions.delete(key);
      } else {
        this.decisions.set(key, filtered);
      }
    }
  }

  private calculateTrends(decisions: PolicyDecision[]): {
    decisionTrend: TrendData[];
    performanceTrend: TrendData[];
  } {
    if (decisions.length === 0) {
      return { decisionTrend: [], performanceTrend: [] };
    }

    // Group by hour
    const hourlyBuckets = new Map<number, PolicyDecision[]>();
    for (const decision of decisions) {
      const hourKey = Math.floor(decision.timestamp.getTime() / (1000 * 60 * 60));
      const bucket = hourlyBuckets.get(hourKey) || [];
      bucket.push(decision);
      hourlyBuckets.set(hourKey, bucket);
    }

    const decisionTrend: TrendData[] = [];
    const performanceTrend: TrendData[] = [];

    for (const [hourKey, bucket] of hourlyBuckets) {
      const timestamp = new Date(hourKey * 1000 * 60 * 60);

      decisionTrend.push({
        timestamp,
        value: bucket.length,
        label: 'Total Decisions',
      });

      const avgTime = bucket.reduce((sum, d) => sum + d.evaluationTimeMs, 0) / bucket.length;
      performanceTrend.push({
        timestamp,
        value: avgTime,
        label: 'Avg Evaluation Time (ms)',
      });
    }

    return { decisionTrend, performanceTrend };
  }
}

// ============================================================================
// Security Posture Assessor
// ============================================================================

class SecurityPostureAssessor {
  private previousScore: number = 80; // Baseline

  /**
   * Assess security posture based on policy metrics
   */
  assess(metrics: PolicyMetrics[]): SecurityPostureAssessment {
    let score = 100;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const riskFactors: SecurityPostureAssessment['riskFactors'] = [];

    // Analyze each policy
    for (const policy of metrics) {
      // Good: High coverage
      if (policy.coverage.uniqueSubjects > 50) {
        strengths.push(`Policy ${policy.policyId} has broad subject coverage`);
      }

      // Bad: Too many denials might indicate misconfiguration
      const denialRate = policy.decisions.denied / policy.decisions.total;
      if (denialRate > 0.5) {
        weaknesses.push(`Policy ${policy.policyId} has high denial rate (${(denialRate * 100).toFixed(1)}%)`);
        score -= 10;
        riskFactors.push({
          category: 'Configuration',
          description: 'High denial rate may indicate overly restrictive policies',
          severity: 'medium',
          mitigationStatus: 'unmitigated',
        });
      }

      // Good: Using review/flag for sensitive operations
      if (policy.decisions.flagged > 0 || policy.decisions.reviewRequired > 0) {
        strengths.push('Multi-step approval workflow in use');
      }

      // Bad: No denials might indicate too permissive
      if (policy.decisions.denied === 0 && policy.decisions.total > 100) {
        weaknesses.push(`Policy ${policy.policyId} has zero denials - may be too permissive`);
        score -= 5;
        riskFactors.push({
          category: 'Access Control',
          description: 'No access denials may indicate overly permissive policies',
          severity: 'low',
          mitigationStatus: 'unmitigated',
        });
      }
    }

    // Determine trend
    const trend: 'improving' | 'stable' | 'declining' =
      score > this.previousScore + 5 ? 'improving' :
      score < this.previousScore - 5 ? 'declining' : 'stable';

    const result: SecurityPostureAssessment = {
      overallScore: Math.max(0, Math.min(100, score)),
      previousScore: this.previousScore,
      trend,
      strengths,
      weaknesses,
      riskFactors,
    };

    this.previousScore = result.overallScore;

    return result;
  }
}

// ============================================================================
// Compliance Status Tracker
// ============================================================================

class ComplianceStatusTracker {
  /**
   * Calculate compliance status based on policy metrics
   */
  calculateStatus(
    tenantId: string,
    metrics: PolicyMetrics[]
  ): ComplianceStatusSummary {
    // Simplified compliance calculation
    // In production, this would integrate with the compliance engine

    const frameworkScores = new Map<string, number>();

    // SOC 2 - looks for proper access controls
    let soc2Score = 80;
    for (const policy of metrics) {
      if (policy.decisions.denied > 0) soc2Score += 5;
      if (policy.decisions.reviewRequired > 0) soc2Score += 5;
    }
    frameworkScores.set('SOC2', Math.min(100, soc2Score));

    // ISO 27001 - similar evaluation
    let isoScore = 75;
    const totalDecisions = metrics.reduce((sum, m) => sum + m.decisions.total, 0);
    const totalDenied = metrics.reduce((sum, m) => sum + m.decisions.denied, 0);
    if (totalDecisions > 0 && totalDenied / totalDecisions > 0.05) {
      isoScore += 10; // Access controls are working
    }
    frameworkScores.set('ISO27001', Math.min(100, isoScore));

    // Calculate gaps
    const gaps: ComplianceStatusSummary['gaps'] = [];

    // Check for audit logging (CC7.2)
    const hasAuditCoverage = metrics.some(m =>
      Array.from(m.coverage.ruleHitDistribution.keys()).some(r =>
        r.toLowerCase().includes('audit')
      )
    );
    if (!hasAuditCoverage) {
      gaps.push({
        controlId: 'CC7.2',
        framework: 'SOC2',
        gap: 'Audit trail coverage may be incomplete',
        severity: 'medium',
      });
    }

    // Calculate overall score
    const scores = Array.from(frameworkScores.values());
    const overallScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Estimate controls
    const controlsEvaluated = metrics.length * 5; // Rough estimate
    const controlsPassing = Math.floor(controlsEvaluated * (overallScore / 100));

    return {
      overallScore,
      frameworkScores,
      controlsEvaluated,
      controlsPassing,
      controlsFailing: controlsEvaluated - controlsPassing,
      gaps,
    };
  }
}

// ============================================================================
// Operational Impact Calculator
// ============================================================================

class OperationalImpactCalculator {
  /**
   * Calculate operational impact of policies
   */
  calculate(metrics: PolicyMetrics[]): OperationalImpact {
    const totalDecisions = metrics.reduce((sum, m) => sum + m.decisions.total, 0);
    const requestsBlocked = metrics.reduce((sum, m) => sum + m.decisions.denied, 0);
    const requestsFlagged = metrics.reduce((sum, m) => sum + m.decisions.flagged, 0);

    // Estimate false positives (simplified - in production use ML)
    const falsePositiveEstimate = Math.max(0, (requestsBlocked * 0.05)); // 5% estimate

    // Calculate user friction score (0-100, lower is better)
    const blockRate = totalDecisions > 0 ? requestsBlocked / totalDecisions : 0;
    const flagRate = totalDecisions > 0 ? requestsFlagged / totalDecisions : 0;
    const userFrictionScore = Math.min(100, (blockRate * 50) + (flagRate * 25));

    // Calculate performance overhead
    const totalEvalTime = metrics.reduce(
      (sum, m) => sum + (m.performance.averageEvaluationMs * m.decisions.total),
      0
    );
    const avgRequestTime = 100; // Assume 100ms average request time
    const percentageOverhead = totalDecisions > 0
      ? (totalEvalTime / (totalDecisions * avgRequestTime)) * 100
      : 0;

    // Calculate top blocked resources
    const resourceBlocks = new Map<string, number>();
    // Note: In a real implementation, we'd track this in MetricsAggregator
    // For now, using placeholder data
    const topBlockedResources = Array.from(resourceBlocks.entries())
      .map(([resource, count]) => ({
        resource,
        count,
        percentage: totalDecisions > 0 ? (count / totalDecisions) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top blocked subjects
    const subjectBlocks = new Map<string, number>();
    const topBlockedSubjects = Array.from(subjectBlocks.entries())
      .map(([subject, count]) => ({
        subject,
        count,
        percentage: totalDecisions > 0 ? (count / totalDecisions) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      requestsBlocked,
      requestsFlagged,
      falsePositiveEstimate,
      userFrictionScore,
      performanceOverhead: {
        totalMs: totalEvalTime,
        percentageOfRequestTime: percentageOverhead,
      },
      topBlockedResources,
      topBlockedSubjects,
    };
  }
}

// ============================================================================
// Policy Impact Analyzer
// ============================================================================

export class PolicyImpactAnalyzer extends EventEmitter {
  private config: ImpactAnalyzerConfig;
  private metricsAggregator: MetricsAggregator;
  private securityAssessor: SecurityPostureAssessor;
  private complianceTracker: ComplianceStatusTracker;
  private operationalCalculator: OperationalImpactCalculator;

  constructor(config?: Partial<ImpactAnalyzerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metricsAggregator = new MetricsAggregator();
    this.securityAssessor = new SecurityPostureAssessor();
    this.complianceTracker = new ComplianceStatusTracker();
    this.operationalCalculator = new OperationalImpactCalculator();

    logger.info({ config: this.config }, 'PolicyImpactAnalyzer initialized');
  }

  /**
   * Record a policy decision for analysis
   */
  recordDecision(tenantId: string, decision: PolicyDecision): void {
    this.metricsAggregator.recordDecision(tenantId, decision);

    // Check for alerts
    if (decision.evaluationTimeMs > this.config.p95ThresholdMs) {
      this.emit('alert:slow-evaluation', {
        tenantId,
        policyId: decision.policyId,
        evaluationTimeMs: decision.evaluationTimeMs,
      });
    }
  }

  /**
   * Generate an impact report for a tenant
   */
  async generateReport(
    tenantId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<DataEnvelope<ImpactReport>> {
    const periodEnd = endTime || new Date();
    const periodStart = startTime || new Date(
      periodEnd.getTime() - (this.config.aggregationPeriodHours * 60 * 60 * 1000)
    );

    // Get all policy IDs for tenant
    const policyIds = this.metricsAggregator.getPolicyIds(tenantId);

    // Collect metrics for each policy
    const policyMetrics: PolicyMetrics[] = policyIds.map(policyId =>
      this.metricsAggregator.getMetrics(tenantId, policyId, periodStart, periodEnd)
    );

    // Calculate summary
    const summary = this.calculateSummary(policyMetrics);

    // Assess security posture
    let securityPosture: SecurityPostureAssessment | undefined;
    if (this.config.assessSecurityPosture) {
      securityPosture = this.securityAssessor.assess(policyMetrics);
    } else {
      securityPosture = {
        overallScore: 0,
        previousScore: 0,
        trend: 'stable',
        strengths: [],
        weaknesses: [],
        riskFactors: [],
      };
    }

    // Calculate compliance status
    let complianceStatus: ComplianceStatusSummary | undefined;
    if (this.config.trackCompliance) {
      complianceStatus = this.complianceTracker.calculateStatus(tenantId, policyMetrics);
    } else {
      complianceStatus = {
        overallScore: 0,
        frameworkScores: new Map(),
        controlsEvaluated: 0,
        controlsPassing: 0,
        controlsFailing: 0,
        gaps: [],
      };
    }

    // Calculate operational impact
    const operationalImpact = this.operationalCalculator.calculate(policyMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      summary,
      securityPosture,
      operationalImpact
    );

    const report: ImpactReport = {
      id: uuidv4(),
      tenantId,
      generatedAt: new Date().toISOString(),
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      summary,
      policyMetrics,
      securityPosture,
      complianceStatus,
      operationalImpact,
      recommendations,
      governanceVerdict: createVerdict(
        summary.overallHealthScore < 50 ? GovernanceResult.FLAG :
        summary.overallHealthScore < 70 ? GovernanceResult.REVIEW_REQUIRED :
        GovernanceResult.ALLOW,
        `Impact report generated: health score ${summary.overallHealthScore}`
      ),
    };

    logger.info(
      {
        reportId: report.id,
        tenantId,
        policiesAnalyzed: policyMetrics.length,
        healthScore: summary.overallHealthScore,
      },
      'Impact report generated'
    );

    return createDataEnvelope(report, {
      source: 'PolicyImpactAnalyzer',
      governanceVerdict: report.governanceVerdict,
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  /**
   * Get real-time metrics for a policy
   */
  getRealtimeMetrics(
    tenantId: string,
    policyId: string,
    lookbackMinutes: number = 60
  ): DataEnvelope<PolicyMetrics> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (lookbackMinutes * 60 * 1000));

    const metrics = this.metricsAggregator.getMetrics(tenantId, policyId, startTime, endTime);

    return createDataEnvelope(metrics, {
      source: 'PolicyImpactAnalyzer',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Real-time metrics retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Clean up old data
   */
  cleanupOldData(retentionDays: number): void {
    const cutoff = new Date(Date.now() - (retentionDays * 24 * 60 * 60 * 1000));
    this.metricsAggregator.clearOldData(cutoff);
    logger.info({ retentionDays, cutoff }, 'Old impact data cleaned up');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private calculateSummary(metrics: PolicyMetrics[]): ImpactSummary {
    const totalDecisions = metrics.reduce((sum, m) => sum + m.decisions.total, 0);
    const totalDenied = metrics.reduce((sum, m) => sum + m.decisions.denied, 0);
    const totalFlagged = metrics.reduce((sum, m) => sum + m.decisions.flagged, 0);

    const avgEvalTime = metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.performance.averageEvaluationMs, 0) / metrics.length
      : 0;

    const healthScores = metrics.map(m => calculateHealthScore(m));
    const overallHealthScore = healthScores.length > 0
      ? healthScores.reduce((a, b) => a + b, 0) / healthScores.length
      : 100;

    // Count unique rules
    const allRules = new Set<string>();
    for (const m of metrics) {
      for (const ruleId of m.coverage.ruleHitDistribution.keys()) {
        allRules.add(ruleId);
      }
    }

    return {
      totalDecisions,
      denialRate: totalDecisions > 0 ? totalDenied / totalDecisions : 0,
      flagRate: totalDecisions > 0 ? totalFlagged / totalDecisions : 0,
      averageEvaluationTimeMs: avgEvalTime,
      policiesActive: metrics.length,
      rulesActive: allRules.size,
      overallHealthScore,
    };
  }

  private generateRecommendations(
    summary: ImpactSummary,
    security: SecurityPostureAssessment,
    operational: OperationalImpact
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (summary.averageEvaluationTimeMs > 50) {
      recommendations.push('Consider optimizing policy rules to reduce evaluation time');
    }

    // Security recommendations
    if (security.overallScore < 70) {
      recommendations.push('Review security posture - score below recommended threshold');
    }
    if (security.trend === 'declining') {
      recommendations.push('Security posture is declining - investigate recent policy changes');
    }

    // Operational recommendations
    if (operational.userFrictionScore > 30) {
      recommendations.push('High user friction detected - review denial patterns for false positives');
    }
    if (operational.falsePositiveEstimate > 10) {
      recommendations.push('Consider reviewing policies for potential false positive reduction');
    }

    // General recommendations
    if (summary.denialRate > this.config.denialRateThreshold) {
      recommendations.push(`Denial rate (${(summary.denialRate * 100).toFixed(1)}%) exceeds threshold - review policy configuration`);
    }

    if (summary.overallHealthScore < 80) {
      recommendations.push('Overall policy health score below optimal - run full policy audit');
    }

    return recommendations;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: PolicyImpactAnalyzer | null = null;

export function getPolicyImpactAnalyzer(
  config?: Partial<ImpactAnalyzerConfig>
): PolicyImpactAnalyzer {
  if (!instance) {
    instance = new PolicyImpactAnalyzer(config);
  }
  return instance;
}

export default PolicyImpactAnalyzer;
