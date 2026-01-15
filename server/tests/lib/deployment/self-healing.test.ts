import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import {
  SelfHealing,
  mockProcessMonitor,
  mockOrchestrator,
} from '../../../lib/deployment/self-healing';

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
    jest.spyOn(mockOrchestrator, 'restartService').mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should trigger a restart if memory usage exceeds the threshold', async () => {
    jest
      .spyOn(mockProcessMonitor, 'getMemoryUsage')
      .mockResolvedValue(950); // Exceeds 800MB
    jest
      .spyOn(mockProcessMonitor, 'isResponsive')
      .mockResolvedValue(true);

    const selfHealing = new SelfHealing(config);
    await selfHealing.monitor();

    expect(mockOrchestrator.restartService).toHaveBeenCalledWith(config.serviceName);
  });

  it('should trigger a restart if the process is unresponsive for the timeout period', async () => {
    jest.spyOn(mockProcessMonitor, 'getMemoryUsage').mockResolvedValue(500);
    jest
      .spyOn(mockProcessMonitor, 'isResponsive')
      .mockResolvedValue(false); // Consistently unresponsive

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
    jest.spyOn(mockProcessMonitor, 'getMemoryUsage').mockResolvedValue(500);
    jest
      .spyOn(mockProcessMonitor, 'isResponsive')
      .mockResolvedValue(true);

    const selfHealing = new SelfHealing(config);
    await selfHealing.monitor();

    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();
  });

  it('should reset the unresponsive streak if the service becomes responsive again', async () => {
    jest.spyOn(mockProcessMonitor, 'getMemoryUsage').mockResolvedValue(500);
    jest
      .spyOn(mockProcessMonitor, 'isResponsive')
      .mockResolvedValueOnce(false) // Unresponsive once
      .mockResolvedValueOnce(true); // Then responsive

    const selfHealing = new SelfHealing(config);

    await selfHealing.monitor(); // Unresponsive, streak = 1
    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();

    await selfHealing.monitor(); // Responsive, streak = 0
    expect(mockOrchestrator.restartService).not.toHaveBeenCalled();
  });
});
