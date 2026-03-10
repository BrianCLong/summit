import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MonitorLoop } from '../monitor.js';
import { ControlPlane } from '../index.js';

describe('MonitorLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should poll health checks periodically', async () => {
    const cp = {
      healthCheck: vi.fn().mockResolvedValue({
        running: true,
        subsystems: { 'test': 'healthy' },
        uptime: 10
      })
    } as unknown as ControlPlane;

    const monitor = new MonitorLoop(cp);
    const consoleSpy = vi.spyOn(console, 'log');

    monitor.start();
    // Immediate execution
    expect(cp.healthCheck).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30000);
    expect(cp.healthCheck).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('subsystem_health'));

    monitor.stop();
  });

  it('should respect MONITOR_INTERVAL_MS', async () => {
    process.env.MONITOR_INTERVAL_MS = '1000';
    const cp = {
      healthCheck: vi.fn().mockResolvedValue({
        running: true,
        subsystems: { 'test': 'healthy' },
        uptime: 10
      })
    } as unknown as ControlPlane;

    const monitor = new MonitorLoop(cp);
    monitor.start();
    expect(cp.healthCheck).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(cp.healthCheck).toHaveBeenCalledTimes(2);
    monitor.stop();
    delete process.env.MONITOR_INTERVAL_MS;
  });
});
