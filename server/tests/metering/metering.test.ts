import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Define mocks before jest.mock calls (Jest hoists these automatically)
const mockGet = jest.fn();
const mockSaveAll = jest.fn().mockResolvedValue(undefined);
const mockList = jest.fn().mockResolvedValue([]);
const mockAppend = jest.fn().mockResolvedValue(undefined);

// Mock logger to avoid clutter
jest.mock('../../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock persistence
jest.mock('../../src/metering/persistence.js', () => {
  return {
    persistentUsageRepository: {
      get: mockGet,
      saveAll: mockSaveAll,
      list: mockList
    },
    meterStore: {
      append: mockAppend
    },
    FileTenantUsageRepository: jest.fn(),
    FileMeterStore: jest.fn()
  };
});

import { MeteringPipeline } from '../../src/metering/pipeline.js';
import { MeterEventKind, MeterEvent } from '../../src/metering/schema.js';
import { QuotaManager } from '../../src/metering/quotas.js';

describe('Metering Subsystem', () => {

  describe('MeteringPipeline', () => {
    let pipeline: MeteringPipeline;

    beforeEach(() => {
      pipeline = new MeteringPipeline();
      jest.clearAllMocks();
    });

    it('should aggregate events correctly into daily rollups', async () => {
      const tenantId = 'tenant-1';
      const event1: MeterEvent = {
        kind: MeterEventKind.QUERY_EXECUTED,
        tenantId,
        source: 'test',
        count: 5,
        occurredAt: new Date('2023-10-27T10:00:00Z'),
        idempotencyKey: 'evt-1'
      };
      const event2: MeterEvent = {
        kind: MeterEventKind.QUERY_EXECUTED,
        tenantId,
        source: 'test',
        count: 3,
        occurredAt: new Date('2023-10-27T11:00:00Z'),
        idempotencyKey: 'evt-2'
      };

      await pipeline.enqueue(event1);
      await pipeline.enqueue(event2);

      const rollups = pipeline.getDailyRollups();
      expect(rollups).toHaveLength(1);
      expect(rollups[0]).toMatchObject({
        tenantId,
        date: '2023-10-27',
        queryExecuted: 8,
      });
      // Verify persistence was called
      expect(mockAppend).toHaveBeenCalledTimes(2);
    });

    it('should handle idempotency (ignore duplicate keys)', async () => {
      const event: MeterEvent = {
        kind: MeterEventKind.INGEST_ITEM,
        tenantId: 'tenant-1',
        source: 'test',
        count: 1,
        idempotencyKey: 'same-key'
      };

      await pipeline.enqueue(event);
      await pipeline.enqueue(event);

      const rollups = pipeline.getDailyRollups();
      expect(rollups).toHaveLength(1);
      expect(rollups[0].ingestItem).toBe(1);
    });

    it('should separate tenants and dates', async () => {
        const t1d1: MeterEvent = { kind: MeterEventKind.EXPORT_BUILT, tenantId: 't1', source: 'test', occurredAt: new Date('2023-10-01') };
        const t1d2: MeterEvent = { kind: MeterEventKind.EXPORT_BUILT, tenantId: 't1', source: 'test', occurredAt: new Date('2023-10-02') };
        const t2d1: MeterEvent = { kind: MeterEventKind.EXPORT_BUILT, tenantId: 't2', source: 'test', occurredAt: new Date('2023-10-01') };

        await pipeline.enqueue(t1d1);
        await pipeline.enqueue(t1d2);
        await pipeline.enqueue(t2d1);

        const rollups = pipeline.getDailyRollups();
        expect(rollups).toHaveLength(3);
    });
  });

  describe('QuotaManager', () => {
    let quotaManager: QuotaManager;

    beforeEach(() => {
      quotaManager = new QuotaManager();
      jest.clearAllMocks();
    });

    it('should allow request if no quota set', async () => {
      const result = await quotaManager.checkQuota('unknown-tenant', 'queryExecuted', 1);
      expect(result.allowed).toBe(true);
      expect(result.softExceeded).toBe(false);
    });

    it('should detect soft limit breach', async () => {
      const tenantId = 't-soft';
      quotaManager.setQuota(tenantId, {
        queryExecuted: { soft: 10, hard: 20 }
      });

      // Mock current usage from PERSISTENT repo
      mockGet.mockResolvedValue({
        tenantId,
        date: new Date().toISOString().slice(0, 10),
        queryExecuted: 15,
      } as any);

      const result = await quotaManager.checkQuota(tenantId, 'queryExecuted', 1);
      expect(result.allowed).toBe(true);
      expect(result.softExceeded).toBe(true);
      expect(result.message).toContain('Soft quota exceeded');
    });

    it('should detect hard limit breach', async () => {
      const tenantId = 't-hard';
      quotaManager.setQuota(tenantId, {
        queryExecuted: { soft: 10, hard: 20 }
      });

      mockGet.mockResolvedValue({
        tenantId,
        date: new Date().toISOString().slice(0, 10),
        queryExecuted: 20,
      } as any);

      const result = await quotaManager.checkQuota(tenantId, 'queryExecuted', 1);
      expect(result.allowed).toBe(false);
      expect(result.softExceeded).toBe(true);
      expect(result.message).toContain('Hard quota exceeded');
    });
  });
});
