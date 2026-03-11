
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { MultiRegionProber, RegionConfig } from '../../../src/lib/deployment/multi-region-prober.js';
import { RegionSkewDetector } from '../../../src/lib/deployment/region-skew-detector.js';

// Mock the metrics module to avoid actual Prometheus calls
jest.mock('../../../src/monitoring/metrics.js', () => ({
  regionProbeLatencyMs: { set: jest.fn() },
  regionHealthStatus: { set: jest.fn() },
  rollbackEventsTotal: { inc: jest.fn() }
}));

describe('MultiRegionProber', () => {
  let regions: RegionConfig[];

  beforeEach(() => {
    regions = [
      { id: 'r1', name: 'Region 1', endpoint: 'http://test1' },
      { id: 'r2', name: 'Region 2', endpoint: 'http://test2' }
    ];
  });

  test('probes all regions', async () => {
    // Cast to any to bypass strict type checking for mock implementation
    const mockClient: any = {
      get: jest.fn()
    };
    (mockClient.get as jest.Mock).mockResolvedValue({ status: 200 } as never);

    const prober = new MultiRegionProber(regions, mockClient);

    const results = await prober.probeAll();

    expect(results).toHaveLength(2);
    expect(results[0].regionId).toBe('r1');
    expect(results[0].isHealthy).toBe(true);
    expect(mockClient.get).toHaveBeenCalledTimes(2);
  });

  test('handles probe failures', async () => {
    const mockClient: any = {
      get: jest.fn()
    };
    (mockClient.get as jest.Mock).mockImplementation(((url: string) => {
      if (url === 'http://test2') return Promise.reject(new Error('Failed'));
      return Promise.resolve({ status: 200 });
    }) as never);

    const prober = new MultiRegionProber(regions, mockClient);

    const results = await prober.probeAll();

    expect(results[0].isHealthy).toBe(true);
    expect(results[1].isHealthy).toBe(false);
    expect(results[1].error).toBe('Failed');
  });
});

describe('RegionSkewDetector', () => {
  test('detects skew above threshold', () => {
    const detector = new RegionSkewDetector(100);
    const statuses = [
      { regionId: 'r1', regionName: 'R1', isHealthy: true, latencyMs: 50, lastChecked: new Date() },
      { regionId: 'r2', regionName: 'R2', isHealthy: true, latencyMs: 200, lastChecked: new Date() }
    ];

    const result = detector.detectLatencySkew(statuses);

    expect(result.detected).toBe(true);
    expect(result.maxSkewMs).toBe(150);
  });

  test('ignores skew below threshold', () => {
    const detector = new RegionSkewDetector(200);
    const statuses = [
      { regionId: 'r1', regionName: 'R1', isHealthy: true, latencyMs: 50, lastChecked: new Date() },
      { regionId: 'r2', regionName: 'R2', isHealthy: true, latencyMs: 100, lastChecked: new Date() }
    ];

    const result = detector.detectLatencySkew(statuses);

    expect(result.detected).toBe(false);
  });
});
