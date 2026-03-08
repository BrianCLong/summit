"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const canary_orchestrator_1 = require("../../../lib/deployment/canary-orchestrator");
// Mock the external services
globals_1.jest.mock('../../../lib/deployment/canary-orchestrator', () => {
    const originalModule = globals_1.jest.requireActual('../../../lib/deployment/canary-orchestrator');
    return {
        ...originalModule,
        mockLoadBalancer: {
            setTrafficPercentage: globals_1.jest.fn(),
        },
        mockMonitoringService: {
            getMetrics: globals_1.jest.fn(),
        },
    };
});
const { mockLoadBalancer, mockMonitoringService } = globals_1.jest.requireMock('../../../lib/deployment/canary-orchestrator');
(0, globals_1.describe)('CanaryOrchestrator', () => {
    const config = {
        serviceName: 'test-service',
        stableVersion: 'v1.0.0',
        canaryVersion: 'v1.1.0',
        trafficSteps: [10, 50, 100],
        healthCheckEndpoint: '/health',
        errorRateThreshold: 0.01,
        latencyThreshold: 500,
        tenantId: 'tenant-1',
        actorId: 'user-1',
    };
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should complete a successful canary deployment', async () => {
        mockMonitoringService.getMetrics.mockResolvedValue({ errorRate: 0.005, latency: 250 });
        const orchestrator = new canary_orchestrator_1.CanaryOrchestrator(config);
        orchestrator._loadBalancer = mockLoadBalancer;
        orchestrator._monitoringService = mockMonitoringService;
        const result = await orchestrator.start();
        (0, globals_1.expect)(result).toBe(true);
        (0, globals_1.expect)(mockLoadBalancer.setTrafficPercentage).toHaveBeenCalledTimes(8); // 2 per step + promote
        (0, globals_1.expect)(mockMonitoringService.getMetrics).toHaveBeenCalledTimes(3);
    });
    (0, globals_1.it)('should rollback if health checks fail', async () => {
        mockMonitoringService.getMetrics
            .mockResolvedValueOnce({ errorRate: 0.005, latency: 250 }) // Step 1: success
            .mockResolvedValueOnce({ errorRate: 0.05, latency: 600 }); // Step 2: failure
        const orchestrator = new canary_orchestrator_1.CanaryOrchestrator(config);
        orchestrator._loadBalancer = mockLoadBalancer;
        orchestrator._monitoringService = mockMonitoringService;
        const result = await orchestrator.start();
        (0, globals_1.expect)(result).toBe(false);
        (0, globals_1.expect)(mockMonitoringService.getMetrics).toHaveBeenCalledTimes(2);
        // Check if rollback traffic shifting was called
        (0, globals_1.expect)(mockLoadBalancer.setTrafficPercentage).toHaveBeenCalledWith(config.serviceName, config.canaryVersion, 0);
        (0, globals_1.expect)(mockLoadBalancer.setTrafficPercentage).toHaveBeenCalledWith(config.serviceName, config.stableVersion, 100);
    });
});
