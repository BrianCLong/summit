import { CanaryOrchestrator } from '../../../lib/deployment/canary-orchestrator';

// Mock the external services
jest.mock('../../../lib/deployment/canary-orchestrator', () => {
  const originalModule = jest.requireActual('../../../lib/deployment/canary-orchestrator');
  return {
    ...originalModule,
    mockLoadBalancer: {
      setTrafficPercentage: jest.fn(),
    },
    mockMonitoringService: {
      getMetrics: jest.fn(),
    },
  };
});

const { mockLoadBalancer, mockMonitoringService } = jest.requireMock('../../../lib/deployment/canary-orchestrator');

describe('CanaryOrchestrator', () => {
  const config = {
    serviceName: 'test-service',
    stableVersion: 'v1.0.0',
    canaryVersion: 'v1.1.0',
    trafficSteps: [10, 50, 100],
    healthCheckEndpoint: '/health',
    errorRateThreshold: 0.01,
    latencyThreshold: 500,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete a successful canary deployment', async () => {
    mockMonitoringService.getMetrics.mockResolvedValue({ errorRate: 0.005, latency: 250 });
    const orchestrator = new CanaryOrchestrator(config);
    const result = await orchestrator.start();
    expect(result).toBe(true);
    expect(mockLoadBalancer.setTrafficPercentage).toHaveBeenCalledTimes(5); // 10, 50, 100, rollback canary, promote stable
    expect(mockMonitoringService.getMetrics).toHaveBeenCalledTimes(3);
  });

  it('should rollback if health checks fail', async () => {
    mockMonitoringService.getMetrics
      .mockResolvedValueOnce({ errorRate: 0.005, latency: 250 }) // Step 1: success
      .mockResolvedValueOnce({ errorRate: 0.05, latency: 600 }); // Step 2: failure

    const orchestrator = new CanaryOrchestrator(config);
    const result = await orchestrator.start();

    expect(result).toBe(false);
    expect(mockMonitoringService.getMetrics).toHaveBeenCalledTimes(2);
    // Check if rollback traffic shifting was called
    expect(mockLoadBalancer.setTrafficPercentage).toHaveBeenCalledWith(config.serviceName, config.canaryVersion, 0);
    expect(mockLoadBalancer.setTrafficPercentage).toHaveBeenCalledWith(config.serviceName, config.stableVersion, 100);
  });
});
