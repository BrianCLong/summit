/**
 * Tests for MetricsCollector
 */

import { MetricsCollector } from '../src/metrics/MetricsCollector';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('Session Management', () => {
    it('should start a new session', () => {
      collector.startSession('test-session-1', 'fraud-ring');

      expect(() => {
        collector.recordStepCompletion('test-session-1', 'CREATE_INVESTIGATION', 100);
      }).not.toThrow();
    });

    it('should throw error for non-existent session', () => {
      expect(() => {
        collector.recordStepCompletion('non-existent', 'CREATE_INVESTIGATION', 100);
      }).toThrow();
    });

    it('should end session and return metrics', () => {
      collector.startSession('test-session-1', 'fraud-ring');
      collector.recordStepCompletion('test-session-1', 'CREATE_INVESTIGATION', 100);
      collector.recordStepCompletion('test-session-1', 'ADD_ENTITY', 50);

      const metrics = collector.endSession('test-session-1');

      expect(metrics.sessionId).toBe('test-session-1');
      expect(metrics.scenarioType).toBe('fraud-ring');
      expect(metrics.tasksCompleted).toBe(2);
      expect(metrics.totalQueries).toBe(2);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.endTime).toBeDefined();
    });
  });

  describe('Step Recording', () => {
    it('should record successful steps', () => {
      collector.startSession('test-session', 'fraud-ring');
      collector.recordStepCompletion('test-session', 'CREATE_INVESTIGATION', 100);
      collector.recordStepCompletion('test-session', 'ADD_ENTITY', 50);
      collector.recordStepCompletion('test-session', 'ADD_RELATIONSHIP', 75);

      const metrics = collector.endSession('test-session');

      expect(metrics.tasksCompleted).toBe(3);
      expect(metrics.tasksFailed).toBe(0);
      expect(metrics.successRate).toBe(1.0);
    });

    it('should record failed steps', () => {
      collector.startSession('test-session', 'fraud-ring');
      collector.recordStepCompletion('test-session', 'CREATE_INVESTIGATION', 100);
      collector.recordStepFailure(
        'test-session',
        'ADD_ENTITY',
        50,
        new Error('Test error')
      );

      const metrics = collector.endSession('test-session');

      expect(metrics.tasksCompleted).toBe(1);
      expect(metrics.tasksFailed).toBe(1);
      expect(metrics.successRate).toBe(0.5);
      expect(metrics.errors.length).toBe(1);
    });

    it('should calculate average query time', () => {
      collector.startSession('test-session', 'fraud-ring');
      collector.recordStepCompletion('test-session', 'STEP1', 100);
      collector.recordStepCompletion('test-session', 'STEP2', 200);
      collector.recordStepCompletion('test-session', 'STEP3', 300);

      const metrics = collector.endSession('test-session');

      expect(metrics.averageQueryTime).toBe(200);
    });
  });

  describe('Metrics Aggregation', () => {
    it('should aggregate metrics across multiple sessions', () => {
      // Session 1
      collector.startSession('session1', 'fraud-ring');
      collector.recordStepCompletion('session1', 'STEP1', 100);
      collector.recordStepCompletion('session1', 'STEP2', 100);
      const metrics1 = collector.endSession('session1');

      // Session 2
      collector.startSession('session2', 'fraud-ring');
      collector.recordStepCompletion('session2', 'STEP1', 200);
      collector.recordStepFailure('session2', 'STEP2', 100, new Error('Fail'));
      const metrics2 = collector.endSession('session2');

      const aggregated = collector.getAggregatedMetrics();

      expect(aggregated.totalSessions).toBe(2);
      expect(aggregated.averageSuccessRate).toBeGreaterThan(0);
      expect(aggregated.errorRate).toBeGreaterThan(0);
    });

    it('should filter metrics by scenario type', () => {
      collector.startSession('session1', 'fraud-ring');
      const metrics1 = collector.endSession('session1');

      collector.startSession('session2', 'terror-cell');
      const metrics2 = collector.endSession('session2');

      const fraudMetrics = collector.getMetricsByScenario('fraud-ring');
      const terrorMetrics = collector.getMetricsByScenario('terror-cell');

      expect(fraudMetrics.length).toBe(1);
      expect(terrorMetrics.length).toBe(1);
      expect(fraudMetrics[0].scenarioType).toBe('fraud-ring');
      expect(terrorMetrics[0].scenarioType).toBe('terror-cell');
    });
  });

  describe('Export Functionality', () => {
    it('should export to JSON', () => {
      collector.startSession('session1', 'fraud-ring');
      collector.recordStepCompletion('session1', 'STEP1', 100);
      collector.endSession('session1');

      const json = collector.exportToJSON();
      const data = JSON.parse(json);

      expect(data).toHaveProperty('completedSessions');
      expect(data).toHaveProperty('aggregated');
      expect(data).toHaveProperty('exportedAt');
      expect(data.completedSessions).toHaveLength(1);
    });

    it('should export to CSV', () => {
      collector.startSession('session1', 'fraud-ring');
      collector.recordStepCompletion('session1', 'STEP1', 100);
      collector.endSession('session1');

      const csv = collector.exportToCSV();
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0]).toContain('sessionId');
      expect(lines[0]).toContain('scenarioType');
      expect(lines[0]).toContain('successRate');
    });

    it('should handle empty metrics export', () => {
      const csv = collector.exportToCSV();
      expect(csv).toBe('No sessions to export');
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all metrics', () => {
      collector.startSession('session1', 'fraud-ring');
      collector.endSession('session1');

      collector.clear();

      const metrics = collector.getAllMetrics();
      expect(metrics.length).toBe(0);
    });
  });
});
