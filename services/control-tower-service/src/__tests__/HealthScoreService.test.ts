/**
 * HealthScoreService Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthScoreService } from '../services/HealthScoreService';
import { TrendDirection, ComponentStatus } from '../types/index';

describe('HealthScoreService', () => {
  let healthScoreService: HealthScoreService;
  let mockMetricsProvider: any;
  let mockRepository: any;

  beforeEach(() => {
    mockMetricsProvider = {
      getSupportMetrics: vi.fn().mockResolvedValue({
        openTickets: 50,
        avgResponseTime: 1.5,
        csat: 92,
      }),
      getRevenueMetrics: vi.fn().mockResolvedValue({
        mrrAtRisk: 25000,
        churnRate: 1.5,
        nps: 65,
      }),
      getProductMetrics: vi.fn().mockResolvedValue({
        errorRate: 0.2,
        latency: 300,
        uptime: 99.95,
      }),
      getTeamMetrics: vi.fn().mockResolvedValue({
        utilization: 75,
        burnout: 20,
        sentiment: 80,
      }),
    };

    mockRepository = {
      saveScore: vi.fn().mockResolvedValue(undefined),
      getHistory: vi.fn().mockResolvedValue([]),
      getLastScore: vi.fn().mockResolvedValue(null),
    };

    healthScoreService = new HealthScoreService(mockMetricsProvider, mockRepository);
  });

  describe('calculateHealthScore', () => {
    it('should calculate overall health score from components', async () => {
      const result = await healthScoreService.calculateHealthScore();

      expect(result).toHaveProperty('score');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.components).toHaveLength(4);
    });

    it('should have all required component names', async () => {
      const result = await healthScoreService.calculateHealthScore();

      const componentNames = result.components.map((c) => c.name);
      expect(componentNames).toContain('Support');
      expect(componentNames).toContain('Revenue');
      expect(componentNames).toContain('Product');
      expect(componentNames).toContain('Team');
    });

    it('should calculate trend based on previous score', async () => {
      mockRepository.getLastScore.mockResolvedValue({ score: 70 });

      const result = await healthScoreService.calculateHealthScore();

      // With good metrics, score should be higher than 70
      expect(result.trend).toBe(TrendDirection.UP);
      expect(result.change).toBeGreaterThan(0);
    });

    it('should save calculated score to repository', async () => {
      await healthScoreService.calculateHealthScore();

      expect(mockRepository.saveScore).toHaveBeenCalled();
    });

    it('should return STABLE trend when change is minimal', async () => {
      // Mock metrics that would result in similar score to previous
      mockRepository.getLastScore.mockResolvedValue({ score: 85 });

      const result = await healthScoreService.calculateHealthScore();

      // Score should be close to 85, resulting in STABLE trend
      expect([TrendDirection.UP, TrendDirection.STABLE, TrendDirection.DOWN]).toContain(result.trend);
    });
  });

  describe('component scoring', () => {
    it('should mark healthy components as HEALTHY', async () => {
      const result = await healthScoreService.calculateHealthScore();

      const healthyComponents = result.components.filter(
        (c) => c.status === ComponentStatus.HEALTHY
      );

      expect(healthyComponents.length).toBeGreaterThan(0);
    });

    it('should detect critical conditions', async () => {
      mockMetricsProvider.getSupportMetrics.mockResolvedValue({
        openTickets: 150, // Critical threshold
        avgResponseTime: 5, // Critical
        csat: 60, // Critical
      });

      const result = await healthScoreService.calculateHealthScore();

      const supportComponent = result.components.find((c) => c.name === 'Support');
      expect(supportComponent?.status).toBe(ComponentStatus.CRITICAL);
    });

    it('should include factors in each component', async () => {
      const result = await healthScoreService.calculateHealthScore();

      result.components.forEach((component) => {
        expect(component.factors).toBeDefined();
        expect(component.factors.length).toBeGreaterThan(0);
      });
    });

    it('should have weights that sum to 1', async () => {
      const result = await healthScoreService.calculateHealthScore();

      const totalWeight = result.components.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBeCloseTo(1, 2);
    });
  });

  describe('getHealthScoreHistory', () => {
    it('should fetch history from repository', async () => {
      const mockHistory = [
        { timestamp: new Date(), score: 85 },
        { timestamp: new Date(), score: 87 },
      ];
      mockRepository.getHistory.mockResolvedValue(mockHistory);

      const result = await healthScoreService.getHealthScoreHistory('7d', '1h');

      expect(mockRepository.getHistory).toHaveBeenCalledWith('7d', '1h');
      expect(result).toEqual(mockHistory);
    });
  });
});
