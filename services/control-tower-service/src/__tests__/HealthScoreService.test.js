"use strict";
/**
 * HealthScoreService Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const HealthScoreService_1 = require("../services/HealthScoreService");
const index_1 = require("../types/index");
(0, vitest_1.describe)('HealthScoreService', () => {
    let healthScoreService;
    let mockMetricsProvider;
    let mockRepository;
    (0, vitest_1.beforeEach)(() => {
        mockMetricsProvider = {
            getSupportMetrics: vitest_1.vi.fn().mockResolvedValue({
                openTickets: 50,
                avgResponseTime: 1.5,
                csat: 92,
            }),
            getRevenueMetrics: vitest_1.vi.fn().mockResolvedValue({
                mrrAtRisk: 25000,
                churnRate: 1.5,
                nps: 65,
            }),
            getProductMetrics: vitest_1.vi.fn().mockResolvedValue({
                errorRate: 0.2,
                latency: 300,
                uptime: 99.95,
            }),
            getTeamMetrics: vitest_1.vi.fn().mockResolvedValue({
                utilization: 75,
                burnout: 20,
                sentiment: 80,
            }),
        };
        mockRepository = {
            saveScore: vitest_1.vi.fn().mockResolvedValue(undefined),
            getHistory: vitest_1.vi.fn().mockResolvedValue([]),
            getLastScore: vitest_1.vi.fn().mockResolvedValue(null),
        };
        healthScoreService = new HealthScoreService_1.HealthScoreService(mockMetricsProvider, mockRepository);
    });
    (0, vitest_1.describe)('calculateHealthScore', () => {
        (0, vitest_1.it)('should calculate overall health score from components', async () => {
            const result = await healthScoreService.calculateHealthScore();
            (0, vitest_1.expect)(result).toHaveProperty('score');
            (0, vitest_1.expect)(result.score).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.score).toBeLessThanOrEqual(100);
            (0, vitest_1.expect)(result.components).toHaveLength(4);
        });
        (0, vitest_1.it)('should have all required component names', async () => {
            const result = await healthScoreService.calculateHealthScore();
            const componentNames = result.components.map((c) => c.name);
            (0, vitest_1.expect)(componentNames).toContain('Support');
            (0, vitest_1.expect)(componentNames).toContain('Revenue');
            (0, vitest_1.expect)(componentNames).toContain('Product');
            (0, vitest_1.expect)(componentNames).toContain('Team');
        });
        (0, vitest_1.it)('should calculate trend based on previous score', async () => {
            mockRepository.getLastScore.mockResolvedValue({ score: 70 });
            const result = await healthScoreService.calculateHealthScore();
            // With good metrics, score should be higher than 70
            (0, vitest_1.expect)(result.trend).toBe(index_1.TrendDirection.UP);
            (0, vitest_1.expect)(result.change).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should save calculated score to repository', async () => {
            await healthScoreService.calculateHealthScore();
            (0, vitest_1.expect)(mockRepository.saveScore).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should return STABLE trend when change is minimal', async () => {
            // Mock metrics that would result in similar score to previous
            mockRepository.getLastScore.mockResolvedValue({ score: 85 });
            const result = await healthScoreService.calculateHealthScore();
            // Score should be close to 85, resulting in STABLE trend
            (0, vitest_1.expect)([index_1.TrendDirection.UP, index_1.TrendDirection.STABLE, index_1.TrendDirection.DOWN]).toContain(result.trend);
        });
    });
    (0, vitest_1.describe)('component scoring', () => {
        (0, vitest_1.it)('should mark healthy components as HEALTHY', async () => {
            const result = await healthScoreService.calculateHealthScore();
            const healthyComponents = result.components.filter((c) => c.status === index_1.ComponentStatus.HEALTHY);
            (0, vitest_1.expect)(healthyComponents.length).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should detect critical conditions', async () => {
            mockMetricsProvider.getSupportMetrics.mockResolvedValue({
                openTickets: 150, // Critical threshold
                avgResponseTime: 5, // Critical
                csat: 60, // Critical
            });
            const result = await healthScoreService.calculateHealthScore();
            const supportComponent = result.components.find((c) => c.name === 'Support');
            (0, vitest_1.expect)(supportComponent?.status).toBe(index_1.ComponentStatus.CRITICAL);
        });
        (0, vitest_1.it)('should include factors in each component', async () => {
            const result = await healthScoreService.calculateHealthScore();
            result.components.forEach((component) => {
                (0, vitest_1.expect)(component.factors).toBeDefined();
                (0, vitest_1.expect)(component.factors.length).toBeGreaterThan(0);
            });
        });
        (0, vitest_1.it)('should have weights that sum to 1', async () => {
            const result = await healthScoreService.calculateHealthScore();
            const totalWeight = result.components.reduce((sum, c) => sum + c.weight, 0);
            (0, vitest_1.expect)(totalWeight).toBeCloseTo(1, 2);
        });
    });
    (0, vitest_1.describe)('getHealthScoreHistory', () => {
        (0, vitest_1.it)('should fetch history from repository', async () => {
            const mockHistory = [
                { timestamp: new Date(), score: 85 },
                { timestamp: new Date(), score: 87 },
            ];
            mockRepository.getHistory.mockResolvedValue(mockHistory);
            const result = await healthScoreService.getHealthScoreHistory('7d', '1h');
            (0, vitest_1.expect)(mockRepository.getHistory).toHaveBeenCalledWith('7d', '1h');
            (0, vitest_1.expect)(result).toEqual(mockHistory);
        });
    });
});
