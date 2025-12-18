import { SelfHealing } from '../../../lib/deployment/self-healing';

// Mock dependencies
jest.mock('../../../lib/deployment/self-healing', () => {
  const originalModule = jest.requireActual('../../../lib/deployment/self-healing');
  return {
    ...originalModule,
    mockProcessMonitor: {
      getMemoryUsage: jest.fn(),
      isResponsive: jest.fn(),
    },
    mockOrchestrator: {
      restartService: jest.fn(),
      scaleUp: jest.fn(),
    },
  };
});

const { mockProcessMonitor, mockOrchestrator } = jest.requireMock('../../../lib/deployment/self-healing');

describe('SelfHealing', () => {
  const config = {
    serviceName: 'critical-worker',
    pid: 1234,
    memoryLeakThreshold: 800, // 800MB
    unresponsiveTimeout: 30, // 30 seconds
    autoScalingThreshold: 90,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should trigger a restart if memory usage exceeds the threshold', async () => {
    mockProcessMonitor.getMemoryUsage.mockResolvedValue(950); // Exceeds 800MB
    mockProcessMonitor.isResponsive.mockResolvedValue(true);

    const selfHealing = new SelfHealing(config);
    await selfHealing.monitor();

    expect(mockOrchestrator.restartService).toHaveBeenCalledWith(config.serviceName);
  });

  it('should trigger a restart if the process is unresponsive for the timeout period', async () => {
    mockProcessMonitor.getMemoryUsage.mockResolvedValue(500);
    mockProcessMonitor.isResponsive.mockResolvedValue(false); // Consistently unresponsive

    const selfHealing = new SelfHealing(config);

    // First check, streak becomes 1
    await selfHealing.monitor();
    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();

    // Second check, streak becomes 2
    await selfHealing.monitor();
    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();

    // Third check, streak is now 3 * 15s interval > 30s timeout
    await selfHealing.monitor();
    expect(mockOrchestrator.restartService).toHaveBeenCalledWith(config.serviceName);
  });

  it('should not take action if the service is healthy', async () => {
    mockProcessMonitor.getMemoryUsage.mockResolvedValue(500);
    mockProcessMonitor.isResponsive.mockResolvedValue(true);

    const selfHealing = new SelfHealing(config);
    await selfHealing.monitor();

    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();
  });

  it('should reset the unresponsive streak if the service becomes responsive again', async () => {
    mockProcessMonitor.getMemoryUsage.mockResolvedValue(500);
    mockProcessMonitor.isResponsive.mockResolvedValueOnce(false) // Unresponsive once
                                 .mockResolvedValueOnce(true);  // Then responsive

    const selfHealing = new SelfHealing(config);

    await selfHealing.monitor(); // Unresponsive, streak = 1
    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();

    await selfHealing.monitor(); // Responsive, streak = 0
    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();
  });
});
