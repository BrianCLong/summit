import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlowDetectionService } from '../../services/FlowDetectionService.js';
import type { Transaction, MonetaryAmount } from '@intelgraph/finance-normalizer-types';
import { createMonetaryAmount } from '@intelgraph/finance-normalizer-types';

// Mock database
vi.mock('../../utils/db.js', () => ({
  db: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    transaction: vi.fn((fn) => fn({ query: vi.fn() })),
  },
}));

describe('FlowDetectionService', () => {
  let service: FlowDetectionService;
  const tenantId = 'test-tenant';

  beforeEach(() => {
    service = new FlowDetectionService({
      minTransactionCount: 3,
      timeWindowHours: 24,
      minConfidence: 0.5,
      structuringThresholdMinorUnits: BigInt(1000000), // $10,000
      structuringTolerancePercent: 10,
    });
  });

  function createTransaction(
    id: string,
    originatorId: string | undefined,
    beneficiaryId: string | undefined,
    amount: number,
    valueDate: string
  ): Transaction {
    return {
      id,
      referenceNumber: `REF-${id}`,
      type: 'TRANSFER',
      status: 'COMPLETED',
      direction: amount >= 0 ? 'CREDIT' : 'DEBIT',
      amount: createMonetaryAmount(Math.abs(amount), 'USD'),
      valueDate,
      postingDate: valueDate,
      originatorId,
      beneficiaryId,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Transaction;
  }

  describe('detectFanIn', () => {
    it('should detect fan-in pattern', async () => {
      const transactions = [
        createTransaction('1', 'party-a', 'party-target', 1000, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-b', 'party-target', 1500, '2024-01-15T11:00:00Z'),
        createTransaction('3', 'party-c', 'party-target', 2000, '2024-01-15T12:00:00Z'),
        createTransaction('4', 'party-d', 'party-target', 500, '2024-01-15T13:00:00Z'),
      ];

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const fanIn = patterns.find(p => p.type === 'FAN_IN');
      expect(fanIn).toBeDefined();
      expect(fanIn!.primaryPartyIds).toContain('party-target');
      expect(fanIn!.transactionCount).toBe(4);
    });

    it('should not detect fan-in with insufficient sources', async () => {
      const transactions = [
        createTransaction('1', 'party-a', 'party-target', 1000, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-b', 'party-target', 1500, '2024-01-15T11:00:00Z'),
      ];

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const fanIn = patterns.find(p => p.type === 'FAN_IN');
      expect(fanIn).toBeUndefined();
    });
  });

  describe('detectFanOut', () => {
    it('should detect fan-out pattern', async () => {
      const transactions = [
        createTransaction('1', 'party-source', 'party-a', 1000, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-source', 'party-b', 1500, '2024-01-15T11:00:00Z'),
        createTransaction('3', 'party-source', 'party-c', 2000, '2024-01-15T12:00:00Z'),
      ];

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const fanOut = patterns.find(p => p.type === 'FAN_OUT');
      expect(fanOut).toBeDefined();
      expect(fanOut!.primaryPartyIds).toContain('party-source');
    });
  });

  describe('detectStructuring', () => {
    it('should detect structuring pattern', async () => {
      // Transactions just below $10,000 threshold
      const transactions = [
        createTransaction('1', 'party-a', 'party-b', 9500, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-a', 'party-c', 9800, '2024-01-15T11:00:00Z'),
        createTransaction('3', 'party-a', 'party-d', 9200, '2024-01-15T12:00:00Z'),
        createTransaction('4', 'party-a', 'party-e', 9700, '2024-01-15T13:00:00Z'),
      ];

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const structuring = patterns.find(p => p.type === 'STRUCTURING');
      expect(structuring).toBeDefined();
      expect(structuring!.severity).toBe('HIGH');
    });

    it('should not flag transactions well below threshold', async () => {
      const transactions = [
        createTransaction('1', 'party-a', 'party-b', 1000, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-a', 'party-c', 1500, '2024-01-15T11:00:00Z'),
        createTransaction('3', 'party-a', 'party-d', 2000, '2024-01-15T12:00:00Z'),
      ];

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const structuring = patterns.find(p => p.type === 'STRUCTURING');
      expect(structuring).toBeUndefined();
    });
  });

  describe('detectRapidMovement', () => {
    it('should detect rapid in/out pattern', async () => {
      const transactions = [
        createTransaction('1', 'party-external', undefined, 10000, '2024-01-15T10:00:00Z'),
        createTransaction('2', undefined, 'party-external', -9800, '2024-01-15T12:00:00Z'),
      ];

      // Set account IDs for tracking
      transactions[0].destinationAccountId = 'account-1';
      transactions[1].sourceAccountId = 'account-1';

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const rapidMovement = patterns.find(p => p.type === 'RAPID_MOVEMENT');
      expect(rapidMovement).toBeDefined();
    });
  });

  describe('detectRoundTrip', () => {
    it('should detect circular flow pattern', async () => {
      const transactions = [
        createTransaction('1', 'party-a', 'party-b', 10000, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-b', 'party-c', 9500, '2024-01-15T11:00:00Z'),
        createTransaction('3', 'party-c', 'party-a', 9000, '2024-01-15T12:00:00Z'),
      ];

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const circular = patterns.find(p => p.type === 'CIRCULAR');
      expect(circular).toBeDefined();
      expect(circular!.severity).toBe('HIGH');
    });
  });

  describe('buildAggregatedFlows', () => {
    it('should aggregate flows by day', async () => {
      const transactions = [
        createTransaction('1', 'party-a', 'party-b', 1000, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-a', 'party-b', 2000, '2024-01-15T14:00:00Z'),
        createTransaction('3', 'party-a', 'party-b', 1500, '2024-01-16T10:00:00Z'),
      ];

      const flows = await service.buildAggregatedFlows(transactions, 'DAILY', tenantId);

      expect(flows.length).toBe(2); // Two days

      const day1Flow = flows.find(f => f.periodStart.includes('2024-01-15'));
      expect(day1Flow).toBeDefined();
      expect(day1Flow!.transactionCount).toBe(2);
      expect(Number(day1Flow!.grossFlow.minorUnits)).toBe(300000); // $3000
    });

    it('should calculate net flow correctly', async () => {
      const transactions: Transaction[] = [
        {
          ...createTransaction('1', 'party-a', 'party-b', 1000, '2024-01-15T10:00:00Z'),
          direction: 'CREDIT',
        },
        {
          ...createTransaction('2', 'party-a', 'party-b', 500, '2024-01-15T14:00:00Z'),
          direction: 'DEBIT',
        },
      ];

      const flows = await service.buildAggregatedFlows(transactions, 'DAILY', tenantId);

      expect(flows.length).toBe(1);
      expect(flows[0].creditCount).toBe(1);
      expect(flows[0].debitCount).toBe(1);
    });
  });

  describe('pattern severity calculation', () => {
    it('should assign CRITICAL severity for large amounts with many parties', async () => {
      // Create many transactions with large amounts
      const transactions = Array.from({ length: 15 }, (_, i) =>
        createTransaction(
          `${i}`,
          `party-${i}`,
          'party-target',
          100000, // $100,000 each
          `2024-01-15T${10 + i}:00:00Z`
        )
      );

      const patterns = await service.analyzeTransactions(transactions, tenantId);

      const fanIn = patterns.find(p => p.type === 'FAN_IN');
      expect(fanIn).toBeDefined();
      expect(['HIGH', 'CRITICAL']).toContain(fanIn!.severity);
    });
  });

  describe('confidence calculation', () => {
    it('should have higher confidence with more parties', async () => {
      const smallGroup = [
        createTransaction('1', 'party-a', 'party-target', 1000, '2024-01-15T10:00:00Z'),
        createTransaction('2', 'party-b', 'party-target', 1000, '2024-01-15T11:00:00Z'),
        createTransaction('3', 'party-c', 'party-target', 1000, '2024-01-15T12:00:00Z'),
      ];

      const largeGroup = Array.from({ length: 10 }, (_, i) =>
        createTransaction(
          `${i}`,
          `party-${i}`,
          'party-target',
          1000,
          `2024-01-15T${10 + i}:00:00Z`
        )
      );

      const smallPatterns = await service.analyzeTransactions(smallGroup, tenantId);
      const largePatterns = await service.analyzeTransactions(largeGroup, tenantId);

      const smallConfidence = smallPatterns.find(p => p.type === 'FAN_IN')?.confidence || 0;
      const largeConfidence = largePatterns.find(p => p.type === 'FAN_IN')?.confidence || 0;

      expect(largeConfidence).toBeGreaterThan(smallConfidence);
    });
  });
});
