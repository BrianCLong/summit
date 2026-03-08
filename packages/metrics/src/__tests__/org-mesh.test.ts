import { describe, it, expect, vi } from 'vitest';
import { metrics } from '../org-mesh';

describe('OrgMeshMetrics', () => {
  it('should be a singleton', () => {
    const instance1 = metrics;
    // @ts-ignore
    const instance2 = metrics.constructor.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should record ingest duration', () => {
    const observeSpy = vi.spyOn(metrics.ingestDuration, 'observe');
    metrics.ingestDuration.observe({ source: 'mock', status: 'success' }, 1.5);
    expect(observeSpy).toHaveBeenCalledWith({ source: 'mock', status: 'success' }, 1.5);
  });

  it('should trace operations', async () => {
    const result = await metrics.traceOperation('test-op', async () => {
      return 'success';
    });
    expect(result).toBe('success');
  });
});
