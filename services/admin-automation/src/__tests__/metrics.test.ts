import { describe, it, expect, beforeEach } from 'vitest';
import { AutomationMetrics } from '../metrics.js';

describe('AutomationMetrics', () => {
  let metrics: AutomationMetrics;

  beforeEach(() => {
    metrics = new AutomationMetrics();
  });

  describe('recordSubmission', () => {
    it('should record submission stats', () => {
      metrics.recordSubmission({
        autoCompletedFields: 8,
        totalFields: 10,
        reusedDataPoints: 5,
        manualOverrides: 2,
      });

      const today = new Date().toISOString().split('T')[0];
      const dayMetrics = metrics.getMetrics(today);

      expect(dayMetrics?.totalRequests).toBe(1);
      expect(dayMetrics?.autoCompletedFields).toBe(8);
      expect(dayMetrics?.reusedDataPoints).toBe(5);
      expect(dayMetrics?.manualInterventions).toBe(2);
    });

    it('should accumulate multiple submissions', () => {
      metrics.recordSubmission({
        autoCompletedFields: 5,
        totalFields: 10,
        reusedDataPoints: 3,
        manualOverrides: 1,
      });

      metrics.recordSubmission({
        autoCompletedFields: 7,
        totalFields: 8,
        reusedDataPoints: 4,
        manualOverrides: 0,
      });

      const today = new Date().toISOString().split('T')[0];
      const dayMetrics = metrics.getMetrics(today);

      expect(dayMetrics?.totalRequests).toBe(2);
      expect(dayMetrics?.autoCompletedFields).toBe(12);
      expect(dayMetrics?.reusedDataPoints).toBe(7);
      expect(dayMetrics?.manualInterventions).toBe(1);
    });

    it('should calculate time saved', () => {
      metrics.recordSubmission({
        autoCompletedFields: 10,
        totalFields: 10,
        reusedDataPoints: 0,
        manualOverrides: 0,
      });

      const today = new Date().toISOString().split('T')[0];
      const dayMetrics = metrics.getMetrics(today);

      // 10 fields * 30 seconds / 60 = 5 minutes
      expect(dayMetrics?.timeSavedMinutes).toBe(5);
    });
  });

  describe('recordProactiveResolution', () => {
    it('should record proactive resolution', () => {
      metrics.recordProactiveResolution(true);

      const today = new Date().toISOString().split('T')[0];
      const dayMetrics = metrics.getMetrics(today);

      expect(dayMetrics?.proactiveResolutions).toBe(1);
      expect(dayMetrics?.timeSavedMinutes).toBe(15);
    });

    it('should accumulate multiple resolutions', () => {
      metrics.recordProactiveResolution(true);
      metrics.recordProactiveResolution(true);
      metrics.recordProactiveResolution(false);

      const today = new Date().toISOString().split('T')[0];
      const dayMetrics = metrics.getMetrics(today);

      expect(dayMetrics?.proactiveResolutions).toBe(3);
      expect(dayMetrics?.timeSavedMinutes).toBe(30); // Only 2 auto-resolved
    });
  });

  describe('workload reduction calculation', () => {
    it('should calculate workload reduction percentage', () => {
      // 8 auto + 5 reused + 2 proactive = 15 automated
      // 3 manual
      // Total = 18, reduction = 15/18 = 83%
      metrics.recordSubmission({
        autoCompletedFields: 8,
        totalFields: 10,
        reusedDataPoints: 5,
        manualOverrides: 3,
      });
      metrics.recordProactiveResolution(true);
      metrics.recordProactiveResolution(true);

      const today = new Date().toISOString().split('T')[0];
      const dayMetrics = metrics.getMetrics(today);

      expect(dayMetrics?.workloadReductionPercent).toBeGreaterThan(70);
    });
  });

  describe('isTargetMet', () => {
    it('should return met=true when reduction >= 70%', () => {
      metrics.recordSubmission({
        autoCompletedFields: 70,
        totalFields: 100,
        reusedDataPoints: 10,
        manualOverrides: 10,
      });

      const result = metrics.isTargetMet();

      expect(result.met).toBe(true);
      expect(result.currentReduction).toBeGreaterThanOrEqual(70);
      expect(result.target).toBe(70);
    });

    it('should return met=false when reduction < 70%', () => {
      metrics.recordSubmission({
        autoCompletedFields: 30,
        totalFields: 100,
        reusedDataPoints: 10,
        manualOverrides: 60,
      });

      const result = metrics.isTargetMet();

      expect(result.met).toBe(false);
      expect(result.currentReduction).toBeLessThan(70);
    });
  });

  describe('getAggregatedMetrics', () => {
    it('should aggregate metrics across date range', () => {
      const today = new Date().toISOString().split('T')[0];

      metrics.recordSubmission({
        autoCompletedFields: 5,
        totalFields: 10,
        reusedDataPoints: 2,
        manualOverrides: 1,
      });

      metrics.recordProactiveResolution(true);

      const aggregate = metrics.getAggregatedMetrics(today, today);

      expect(aggregate.totalRequests).toBe(1);
      expect(aggregate.autoCompletedFields).toBe(5);
      expect(aggregate.proactiveResolutions).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return null for non-existent period', () => {
      const result = metrics.getMetrics('2020-01-01');
      expect(result).toBeNull();
    });
  });
});
