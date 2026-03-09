import { describe, it, expect, vi } from 'vitest';
import { ControlPlane } from '../index.js';
import { Subsystem, SubsystemStatus } from '../types.js';

describe('ControlPlane', () => {
  it('should start and track uptime', async () => {
    const cp = new ControlPlane([]);
    await cp.start();
    const status = cp.getStatus();
    expect(status.running).toBe(true);
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should stop and set running to false', async () => {
    const cp = new ControlPlane([]);
    await cp.start();
    await cp.stop();
    const status = cp.getStatus();
    expect(status.running).toBe(false);
  });

  it('should report subsystem health', async () => {
    const subsystem: Subsystem = {
      name: 'test-subsystem',
      healthCheck: async () => 'healthy' as SubsystemStatus,
    };
    const cp = new ControlPlane([subsystem]);
    const status = await cp.healthCheck();
    expect(status.subsystems['test-subsystem']).toBe('healthy');
  });

  it('should report down if health check fails', async () => {
    const subsystem: Subsystem = {
      name: 'fail-subsystem',
      healthCheck: async () => { throw new Error('fail'); },
    };
    const cp = new ControlPlane([subsystem]);
    const status = await cp.healthCheck();
    expect(status.subsystems['fail-subsystem']).toBe('down');
  });

  it('should wait for in-flight checks on stop', async () => {
    let checkFinished = false;
    const subsystem: Subsystem = {
      name: 'slow-subsystem',
      healthCheck: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        checkFinished = true;
        return 'healthy';
      },
    };
    const cp = new ControlPlane([subsystem]);
    const healthPromise = cp.healthCheck();
    await cp.stop();
    expect(checkFinished).toBe(true);
    await healthPromise;
  });
});
