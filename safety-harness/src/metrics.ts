/**
 * Metrics Collector for Safety Harness
 *
 * Tracks and aggregates test execution metrics.
 */

import { TestScenario, TestResult, RiskLevel, Component, AttackType } from './types.js';

export interface MetricsSummary {
  totalScenarios: number;
  passed: number;
  failed: number;
  passRate: number;
  failRate: number;

  byRiskLevel: Record<RiskLevel, MetricBreakdown>;
  byComponent: Record<Component, MetricBreakdown>;
  byAttackType: Record<AttackType, MetricBreakdown>;

  criticalFailures: number;
  highFailures: number;
  mediumFailures: number;
  lowFailures: number;

  averageDurationMs: number;
  totalDurationMs: number;

  guardrailStats: {
    totalTriggered: number;
    uniqueGuardrails: Set<string>;
    topGuardrails: Array<{ name: string; count: number }>;
  };

  policyStats: {
    totalViolations: number;
    uniquePolicies: Set<string>;
    topViolations: Array<{ name: string; count: number }>;
  };
}

export interface MetricBreakdown {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

export class MetricsCollector {
  private scenarioMetrics: Map<string, TestResult> = new Map();
  private packMetrics: Map<string, TestResult[]> = new Map();
  private guardrailCounts: Map<string, number> = new Map();
  private policyViolationCounts: Map<string, number> = new Map();

  /**
   * Record scenario result
   */
  recordScenarioResult(scenario: TestScenario, result: TestResult): void {
    this.scenarioMetrics.set(scenario.id, result);

    // Track guardrails
    for (const guardrail of result.actual.guardrailsTriggered) {
      this.guardrailCounts.set(
        guardrail,
        (this.guardrailCounts.get(guardrail) || 0) + 1
      );
    }

    // Track policy violations
    for (const policy of result.actual.policyViolations) {
      this.policyViolationCounts.set(
        policy,
        (this.policyViolationCounts.get(policy) || 0) + 1
      );
    }
  }

  /**
   * Record pack results
   */
  recordPackResults(packId: string, results: TestResult[]): void {
    this.packMetrics.set(packId, results);
  }

  /**
   * Get comprehensive metrics summary
   */
  getSummary(scenarios: TestScenario[], results: TestResult[]): MetricsSummary {
    const totalScenarios = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = totalScenarios - passed;

    // Calculate breakdowns
    const byRiskLevel = this.calculateBreakdownByRiskLevel(scenarios, results);
    const byComponent = this.calculateBreakdownByComponent(scenarios, results);
    const byAttackType = this.calculateBreakdownByAttackType(scenarios, results);

    // Count failures by severity
    const failedResults = results.filter(r => !r.passed);
    const criticalFailures = failedResults.filter(
      r => r.failure?.severity === 'critical'
    ).length;
    const highFailures = failedResults.filter(
      r => r.failure?.severity === 'high'
    ).length;
    const mediumFailures = failedResults.filter(
      r => r.failure?.severity === 'medium'
    ).length;
    const lowFailures = failedResults.filter(
      r => r.failure?.severity === 'low'
    ).length;

    // Calculate durations
    const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
    const averageDurationMs = totalDurationMs / totalScenarios;

    // Guardrail stats
    const uniqueGuardrails = new Set<string>();
    let totalGuardrailsTriggered = 0;
    for (const result of results) {
      for (const guardrail of result.actual.guardrailsTriggered) {
        uniqueGuardrails.add(guardrail);
        totalGuardrailsTriggered++;
      }
    }

    const topGuardrails = Array.from(this.guardrailCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Policy stats
    const uniquePolicies = new Set<string>();
    let totalPolicyViolations = 0;
    for (const result of results) {
      for (const policy of result.actual.policyViolations) {
        uniquePolicies.add(policy);
        totalPolicyViolations++;
      }
    }

    const topViolations = Array.from(this.policyViolationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      totalScenarios,
      passed,
      failed,
      passRate: passed / totalScenarios,
      failRate: failed / totalScenarios,
      byRiskLevel,
      byComponent,
      byAttackType,
      criticalFailures,
      highFailures,
      mediumFailures,
      lowFailures,
      averageDurationMs,
      totalDurationMs,
      guardrailStats: {
        totalTriggered: totalGuardrailsTriggered,
        uniqueGuardrails,
        topGuardrails,
      },
      policyStats: {
        totalViolations: totalPolicyViolations,
        uniquePolicies,
        topViolations,
      },
    };
  }

  /**
   * Calculate breakdown by risk level
   */
  private calculateBreakdownByRiskLevel(
    scenarios: TestScenario[],
    results: TestResult[]
  ): Record<RiskLevel, MetricBreakdown> {
    const breakdown: Record<string, MetricBreakdown> = {};
    const riskLevels: RiskLevel[] = ['critical', 'high', 'medium', 'low'];

    for (const level of riskLevels) {
      const scenariosAtLevel = scenarios.filter(s => s.riskLevel === level);
      const resultsAtLevel = results.filter(r =>
        scenariosAtLevel.some(s => s.id === r.scenarioId)
      );

      const total = resultsAtLevel.length;
      const passed = resultsAtLevel.filter(r => r.passed).length;
      const failed = total - passed;

      breakdown[level] = {
        total,
        passed,
        failed,
        passRate: total > 0 ? passed / total : 0,
      };
    }

    return breakdown as Record<RiskLevel, MetricBreakdown>;
  }

  /**
   * Calculate breakdown by component
   */
  private calculateBreakdownByComponent(
    scenarios: TestScenario[],
    results: TestResult[]
  ): Record<Component, MetricBreakdown> {
    const breakdown: Record<string, MetricBreakdown> = {};
    const components: Component[] = [
      'copilot',
      'analytics',
      'case',
      'export',
      'graph-query',
      'search',
      'api-gateway',
    ];

    for (const component of components) {
      const scenariosForComponent = scenarios.filter(s => s.component === component);
      const resultsForComponent = results.filter(r =>
        scenariosForComponent.some(s => s.id === r.scenarioId)
      );

      const total = resultsForComponent.length;
      const passed = resultsForComponent.filter(r => r.passed).length;
      const failed = total - passed;

      breakdown[component] = {
        total,
        passed,
        failed,
        passRate: total > 0 ? passed / total : 0,
      };
    }

    return breakdown as Record<Component, MetricBreakdown>;
  }

  /**
   * Calculate breakdown by attack type
   */
  private calculateBreakdownByAttackType(
    scenarios: TestScenario[],
    results: TestResult[]
  ): Record<AttackType, MetricBreakdown> {
    const breakdown: Record<string, MetricBreakdown> = {};
    const attackTypes: AttackType[] = [
      'data-exfiltration',
      'profiling',
      'discrimination',
      'overreach',
      'prompt-injection',
      'jailbreak',
      'pii-leak',
      'toxicity',
      'bias',
      'policy-bypass',
      'unauthorized-access',
      'privilege-escalation',
      'denial-of-service',
    ];

    for (const attackType of attackTypes) {
      const scenariosForType = scenarios.filter(s => s.attackType === attackType);
      const resultsForType = results.filter(r =>
        scenariosForType.some(s => s.id === r.scenarioId)
      );

      const total = resultsForType.length;
      const passed = resultsForType.filter(r => r.passed).length;
      const failed = total - passed;

      breakdown[attackType] = {
        total,
        passed,
        failed,
        passRate: total > 0 ? passed / total : 0,
      };
    }

    return breakdown as Record<AttackType, MetricBreakdown>;
  }

  /**
   * Get pack-specific metrics
   */
  getPackMetrics(packId: string): MetricBreakdown | undefined {
    const results = this.packMetrics.get(packId);
    if (!results) return undefined;

    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;

    return {
      total,
      passed,
      failed,
      passRate: total > 0 ? passed / total : 0,
    };
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.scenarioMetrics.clear();
    this.packMetrics.clear();
    this.guardrailCounts.clear();
    this.policyViolationCounts.clear();
  }
}
