import { StorageTierRecommenderService, WorkloadSpecs } from '../StorageTierRecommenderService.js';

describe('StorageTierRecommenderService', () => {
  let service: StorageTierRecommenderService;

  beforeEach(() => {
    service = new StorageTierRecommenderService();
  });

  test('recommends NVMe for critical latency sensitivity', () => {
    const specs: WorkloadSpecs = {
      iops: 5000,
      throughputMBps: 200,
      latencySensitivity: 'critical',
      accessPattern: 'random',
      dataSizeGB: 100,
    };

    const recommendation = service.recommendStorageTier(specs);
    expect(recommendation.tier).toBe('NVMe');
    expect(recommendation.reasoning).toContain('Critical latency sensitivity requires NVMe performance.');
  });

  test('recommends NVMe for high IOPS', () => {
    const specs: WorkloadSpecs = {
      iops: 15000,
      throughputMBps: 200,
      latencySensitivity: 'medium',
      accessPattern: 'random',
      dataSizeGB: 100,
    };

    const recommendation = service.recommendStorageTier(specs);
    expect(recommendation.tier).toBe('NVMe');
    expect(recommendation.reasoning).toContain('High IOPS (15000) is best served by NVMe.');
  });

  test('recommends SSD for high latency sensitivity', () => {
    const specs: WorkloadSpecs = {
      iops: 5000,
      throughputMBps: 200,
      latencySensitivity: 'high',
      accessPattern: 'random',
      dataSizeGB: 100,
    };

    const recommendation = service.recommendStorageTier(specs);
    expect(recommendation.tier).toBe('SSD');
    expect(recommendation.reasoning).toContain('High latency sensitivity requires at least SSD.');
  });

  test('recommends SSD for random access', () => {
    const specs: WorkloadSpecs = {
      iops: 500,
      throughputMBps: 50,
      latencySensitivity: 'low',
      accessPattern: 'random',
      dataSizeGB: 100,
    };

    const recommendation = service.recommendStorageTier(specs);
    expect(recommendation.tier).toBe('SSD');
    expect(recommendation.reasoning).toContain('Random access patterns perform poorly on HDD.');
  });

  test('recommends NVMe for high throughput sequential access', () => {
    const specs: WorkloadSpecs = {
      iops: 500,
      throughputMBps: 1500, // 1500 MB/s
      latencySensitivity: 'low',
      accessPattern: 'sequential',
      dataSizeGB: 100,
    };

    const recommendation = service.recommendStorageTier(specs);
    expect(recommendation.tier).toBe('NVMe');
    expect(recommendation.reasoning).toContain('High throughput (1500 MB/s) requires NVMe bandwidth.');
  });

  test('recommends Object storage for large archival data', () => {
    const specs: WorkloadSpecs = {
      iops: 100,
      throughputMBps: 50,
      latencySensitivity: 'low',
      accessPattern: 'sequential',
      dataSizeGB: 15000, // 15 TB
      writeRatio: 0.05,
    };

    const recommendation = service.recommendStorageTier(specs);
    expect(recommendation.tier).toBe('Object');
    expect(recommendation.reasoning).toContain('Large dataset (>10TB) with low write ratio is cost-effective on Object Storage.');
  });

  test('recommends HDD for sequential low IOPS workloads', () => {
    const specs: WorkloadSpecs = {
      iops: 500,
      throughputMBps: 50,
      latencySensitivity: 'low',
      accessPattern: 'sequential',
      dataSizeGB: 500,
    };

    const recommendation = service.recommendStorageTier(specs);
    expect(recommendation.tier).toBe('HDD');
    expect(recommendation.reasoning).toContain('Workload fits HDD characteristics: Low IOPS, Low Latency Sensitivity, or Sequential Access.');
  });

  test('calculates estimated cost correctly', () => {
    const specs: WorkloadSpecs = {
      iops: 100,
      throughputMBps: 50,
      latencySensitivity: 'low',
      accessPattern: 'sequential',
      dataSizeGB: 1000,
    };

    const recommendation = service.recommendStorageTier(specs);
    // HDD cost is 0.04 per GB
    expect(recommendation.estimatedCostPerMonth).toBe(40.00);
  });
});
