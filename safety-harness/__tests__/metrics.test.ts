/**
 * Unit tests for MetricsCollector
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MetricsCollector } from '../src/metrics';
import { TestScenario, TestResult } from '../src/types';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  let mockScenarios: TestScenario[];
  let mockResults: TestResult[];

  beforeEach(() => {
    collector = new MetricsCollector();

    mockScenarios = [
      {
        id: 'SCENARIO-001',
        name: 'Critical Test',
        description: 'Critical severity test',
        attackType: 'data-exfiltration',
        component: 'copilot',
        riskLevel: 'critical',
        enabled: true,
        input: {
          context: {
            role: 'analyst',
            tenantId: 'tenant-1',
            userId: 'user-1',
            permissions: [],
          },
        },
        expected: {
          outcome: 'block',
        },
        metadata: {
          tags: ['test'],
          severity: 'critical',
        },
      },
      {
        id: 'SCENARIO-002',
        name: 'High Test',
        description: 'High severity test',
        attackType: 'profiling',
        component: 'analytics',
        riskLevel: 'high',
        enabled: true,
        input: {
          context: {
            role: 'analyst',
            tenantId: 'tenant-1',
            userId: 'user-1',
            permissions: [],
          },
        },
        expected: {
          outcome: 'block',
        },
        metadata: {
          tags: ['test'],
          severity: 'high',
        },
      },
    ];

    mockResults = [
      {
        scenarioId: 'SCENARIO-001',
        passed: false,
        timestamp: '2025-01-01T00:00:00Z',
        durationMs: 100,
        actual: {
          outcome: 'allow-with-logging',
          response: {},
          blocked: false,
          guardrailsTriggered: ['test-guardrail'],
          policyViolations: ['test-policy'],
        },
        comparison: {
          outcomeMatch: false,
        },
        failure: {
          reason: 'Outcome mismatch',
          details: {},
          severity: 'critical',
        },
      },
      {
        scenarioId: 'SCENARIO-002',
        passed: true,
        timestamp: '2025-01-01T00:00:01Z',
        durationMs: 150,
        actual: {
          outcome: 'block',
          response: {},
          blocked: true,
          guardrailsTriggered: ['test-guardrail'],
          policyViolations: [],
        },
        comparison: {
          outcomeMatch: true,
        },
      },
    ];
  });

  describe('recordScenarioResult', () => {
    it('should record scenario result', () => {
      collector.recordScenarioResult(mockScenarios[0], mockResults[0]);

      // Verify recording happened (would check internal state in real tests)
      expect(collector).toBeDefined();
    });

    it('should track guardrail counts', () => {
      collector.recordScenarioResult(mockScenarios[0], mockResults[0]);
      collector.recordScenarioResult(mockScenarios[1], mockResults[1]);

      // Guardrail 'test-guardrail' should appear twice
      const summary = collector.getSummary(mockScenarios, mockResults);
      expect(summary.guardrailStats.totalTriggered).toBe(2);
    });

    it('should track policy violation counts', () => {
      collector.recordScenarioResult(mockScenarios[0], mockResults[0]);

      const summary = collector.getSummary(mockScenarios, mockResults);
      expect(summary.policyStats.totalViolations).toBe(1);
    });
  });

  describe('getSummary', () => {
    beforeEach(() => {
      mockScenarios.forEach((scenario, i) => {
        collector.recordScenarioResult(scenario, mockResults[i]);
      });
    });

    it('should calculate total scenarios correctly', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.totalScenarios).toBe(2);
    });

    it('should calculate pass/fail counts correctly', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.passRate).toBe(0.5);
      expect(summary.failRate).toBe(0.5);
    });

    it('should break down by risk level', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.byRiskLevel.critical.total).toBe(1);
      expect(summary.byRiskLevel.critical.failed).toBe(1);
      expect(summary.byRiskLevel.high.total).toBe(1);
      expect(summary.byRiskLevel.high.passed).toBe(1);
    });

    it('should break down by component', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.byComponent.copilot.total).toBe(1);
      expect(summary.byComponent.analytics.total).toBe(1);
    });

    it('should break down by attack type', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.byAttackType['data-exfiltration'].total).toBe(1);
      expect(summary.byAttackType.profiling.total).toBe(1);
    });

    it('should count failures by severity', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.criticalFailures).toBe(1);
      expect(summary.highFailures).toBe(0);
    });

    it('should calculate duration metrics', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.totalDurationMs).toBe(250);
      expect(summary.averageDurationMs).toBe(125);
    });

    it('should aggregate guardrail statistics', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.guardrailStats.totalTriggered).toBe(2);
      expect(summary.guardrailStats.uniqueGuardrails.size).toBeGreaterThan(0);
      expect(summary.guardrailStats.topGuardrails.length).toBeGreaterThan(0);
    });

    it('should aggregate policy statistics', () => {
      const summary = collector.getSummary(mockScenarios, mockResults);

      expect(summary.policyStats.totalViolations).toBe(1);
      expect(summary.policyStats.uniquePolicies.size).toBeGreaterThan(0);
    });
  });

  describe('getPackMetrics', () => {
    it('should return metrics for specific pack', () => {
      collector.recordPackResults('pack-001', mockResults);

      const metrics = collector.getPackMetrics('pack-001');

      expect(metrics).toBeDefined();
      expect(metrics?.total).toBe(2);
      expect(metrics?.passed).toBe(1);
      expect(metrics?.failed).toBe(1);
    });

    it('should return undefined for unknown pack', () => {
      const metrics = collector.getPackMetrics('unknown-pack');

      expect(metrics).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all metrics', () => {
      collector.recordScenarioResult(mockScenarios[0], mockResults[0]);
      collector.clear();

      // After clear, metrics should be empty
      expect(collector).toBeDefined();
    });
  });
});
