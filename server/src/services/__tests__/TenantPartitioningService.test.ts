
import { TenantPartitioningService } from '../TenantPartitioningService';
import { DatabaseService } from '../DatabaseService';
import { TenantCostService } from '../TenantCostService';
import { PrometheusMetrics } from '../../utils/metrics';

// Mock dependencies
jest.mock('../../utils/metrics', () => ({
  PrometheusMetrics: jest.fn().mockImplementation(() => ({
    createGauge: jest.fn(),
    createCounter: jest.fn(),
    createHistogram: jest.fn(),
    setGauge: jest.fn(),
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
  })),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../utils/tracing', () => ({
  tracer: {
    startActiveSpan: jest.fn((name, cb) => cb({
      setAttributes: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    })),
  },
}));

describe('TenantPartitioningService', () => {
  let service: TenantPartitioningService;
  let mockDb: any;
  let mockCostService: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    mockCostService = {
      calculateTenantCosts: jest.fn().mockResolvedValue({ costs: { total: 50 } }),
    };

    service = new TenantPartitioningService(
      { enabled: true, autoMigrationEnabled: true },
      mockDb as unknown as DatabaseService,
      mockCostService as unknown as TenantCostService
    );
  });

  describe('evaluateTenant', () => {
    it('should recommend migration if score is high', async () => {
      // Mock partition config
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Init check

      // Mock metrics query - High usage
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          avg_cpu_percent: 95,
          avg_memory_percent: 90,
          avg_queries_per_hour: 2000,
          avg_storage_gb: 500,
          avg_network_mbps: 200
        }]
      });

      // Mock save
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.evaluateTenant('tenant-123');

      expect(result.recommendedPartition).toBe('dedicated_instance');
      expect(result.riskLevel).toBe('high');
    });

    it('should not recommend migration if usage is low', async () => {
      // Mock partition config
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock metrics query - Low usage
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          avg_cpu_percent: 10,
          avg_memory_percent: 20,
          avg_queries_per_hour: 100,
          avg_storage_gb: 10,
          avg_network_mbps: 10
        }]
      });

      // Mock save
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.evaluateTenant('tenant-low');

      expect(result.recommendedPartition).toBeNull();
    });
  });

  describe('executeStep', () => {
     // Access private method via any cast
     const executeStep = (service as any).executeStep.bind(service);

     it('should execute allocate_partition command', async () => {
        const step = {
            name: 'allocate',
            command: 'allocate_partition --tenant t1 --type shared',
            estimatedDuration: 100
        };

        mockDb.query.mockResolvedValue({});

        await executeStep(step);

        expect(mockDb.query).toHaveBeenCalledWith('CREATE SCHEMA IF NOT EXISTS "t1"');
     });
  });
});
