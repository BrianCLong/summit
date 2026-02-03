
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { MeteringPipeline } from '../pipeline.js';
import { postgresMeterRepository } from '../postgres-repository.js';
import { MeterEvent, MeterEventKind } from '../schema.js';

// Mock dependencies
jest.mock('../../utils/logger.js', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../postgres-repository.js', () => ({
  postgresMeterRepository: {
    recordEvent: jest.fn(),
  },
}));

describe('MeteringPipeline', () => {
  let pipeline: MeteringPipeline;
  const mockRecordEvent = postgresMeterRepository.recordEvent as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = new MeteringPipeline();
  });

  it('should process a valid event and persist it', async () => {
    const event: MeterEvent = {
      tenantId: 't1',
      kind: MeterEventKind.INGEST_UNITS,
      units: 10,
      source: 'test',
    };

    mockRecordEvent.mockResolvedValue(true); // Successfully inserted

    await pipeline.enqueue(event);

    expect(mockRecordEvent).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 't1',
        kind: 'ingest.units',
        units: 10
    }));

    const rollups = pipeline.getDailyRollups();
    expect(rollups).toHaveLength(1);
    expect(rollups[0].ingestUnits).toBe(10);
  });

  it('should not rollup if db says duplicate', async () => {
    const event: MeterEvent = {
        tenantId: 't1',
        kind: MeterEventKind.INGEST_UNITS,
        units: 10,
        source: 'test',
        idempotencyKey: 'dup-key'
      };

      mockRecordEvent.mockResolvedValue(false); // Duplicate

      await pipeline.enqueue(event);

      expect(mockRecordEvent).toHaveBeenCalled();
      const rollups = pipeline.getDailyRollups();
      expect(rollups).toHaveLength(0); // Should be empty
  });

  it('should log db error and continue processing rollups', async () => {
    const event: MeterEvent = {
        tenantId: 't1',
        kind: MeterEventKind.INGEST_UNITS,
        units: 10,
        source: 'test',
      };

      mockRecordEvent.mockRejectedValue(new Error('DB connection failed'));

      await pipeline.enqueue(event);

      expect(mockRecordEvent).toHaveBeenCalled();
      const rollups = pipeline.getDailyRollups();
      expect(rollups).toHaveLength(1);

      const dlq = pipeline.getDeadLetters();
      expect(dlq).toHaveLength(0);
  });
});
