import { describe, it, expect, beforeEach } from '@jest/globals';
import AdaptiveRouter from '../adaptive-router';
import { Backend } from '../types';

describe('AdaptiveRouter (Write-Aware Sharding Pilot)', () => {
  const backends: Backend[] = [
    { id: 'us-east-primary', address: '10.0.0.1', weight: 1, connections: 0, latency: 10, status: 'UP', role: 'PRIMARY', region: 'us-east' },
    { id: 'us-east-replica', address: '10.0.0.2', weight: 1, connections: 0, latency: 10, status: 'UP', role: 'REPLICA', region: 'us-east' },
    { id: 'eu-west-replica', address: '10.0.0.3', weight: 1, connections: 0, latency: 50, status: 'UP', role: 'REPLICA', region: 'eu-west' },
  ] as any; // Cast to any because we haven't updated the interface yet

  beforeEach(() => {
    AdaptiveRouter.updateBackends(backends);
  });

  it('should route writes to PRIMARY', () => {
    const backend = (AdaptiveRouter as any).getWriteBackend('tenant-1');
    expect(backend).toBeDefined();
    expect(backend.role).toBe('PRIMARY');
  });

  it('should route reads to local REPLICA if available', () => {
    const backend = (AdaptiveRouter as any).getReadBackend('tenant-1', 'us-east');
    expect(backend).toBeDefined();
    expect(backend.id).toBe('us-east-replica');
  });

  it('should fallback read to PRIMARY if local replica is down', () => {
    const downBackends = [
        { ...backends[0] }, // Primary UP
        { ...backends[1], status: 'DOWN' }, // Local Replica DOWN
        { ...backends[2] } // Remote Replica UP
    ] as any;
    AdaptiveRouter.updateBackends(downBackends);

    const backend = (AdaptiveRouter as any).getReadBackend('tenant-1', 'us-east');
    expect(backend).toBeDefined();
    expect(backend.id).toBe('us-east-primary');
  });
});
