import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrialManager } from '../src/trial-manager';
import { StructuredEventEmitter } from '@ga-graphai/common-types';

describe('TrialManager', () => {
  let events: StructuredEventEmitter;
  let manager: TrialManager;

  beforeEach(() => {
    events = new StructuredEventEmitter();
    vi.spyOn(events, 'emitEvent');
    manager = new TrialManager(events);
  });

  it('should register a new trial', () => {
    const info = manager.registerTrial('tenant-1', 'org-1');
    expect(info.id).toBe('tenant-1');
    expect(info.orgId).toBe('org-1');
    expect(info.status).toBe('active');
    expect(events.emitEvent).toHaveBeenCalledWith('summit.trial.registered', expect.any(Object));
  });

  it('should record scans and emit upsell signals', () => {
    manager.registerTrial('tenant-1', 'org-1');

    // Record 4 scans
    for (let i = 0; i < 4; i++) {
      manager.recordScan('tenant-1');
    }
    expect(events.emitEvent).not.toHaveBeenCalledWith('summit.trial.upsell_signal', expect.any(Object));

    // 5th scan should trigger upsell
    manager.recordScan('tenant-1');
    expect(events.emitEvent).toHaveBeenCalledWith('summit.trial.upsell_signal', expect.objectContaining({
      reason: 'high_usage'
    }));
  });

  it('should auto-expire trials', () => {
    const info = manager.registerTrial('tenant-1', 'org-1');

    // Mock date to 8 days in future
    const future = new Date();
    future.setDate(future.getDate() + 8);
    vi.useFakeTimers();
    vi.setSystemTime(future);

    const expired = manager.autoExpire();
    expect(expired).toContain('tenant-1');
    expect(events.emitEvent).toHaveBeenCalledWith('summit.trial.expired', expect.any(Object));

    vi.useRealTimers();
  });
});
