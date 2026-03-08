"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const FlowDetectionService_js_1 = require("../../services/FlowDetectionService.js");
const finance_normalizer_types_1 = require("@intelgraph/finance-normalizer-types");
// Mock database
vitest_1.vi.mock('../../utils/db.js', () => ({
    db: {
        query: vitest_1.vi.fn().mockResolvedValue({ rows: [] }),
        transaction: vitest_1.vi.fn((fn) => fn({ query: vitest_1.vi.fn() })),
    },
}));
(0, vitest_1.describe)('FlowDetectionService', () => {
    let service;
    const tenantId = 'test-tenant';
    (0, vitest_1.beforeEach)(() => {
        service = new FlowDetectionService_js_1.FlowDetectionService({
            minTransactionCount: 3,
            timeWindowHours: 24,
            minConfidence: 0.5,
            structuringThresholdMinorUnits: BigInt(1000000), // $10,000
            structuringTolerancePercent: 10,
        });
    });
    function createTransaction(id, originatorId, beneficiaryId, amount, valueDate) {
        return {
            id,
            referenceNumber: `REF-${id}`,
            type: 'TRANSFER',
            status: 'COMPLETED',
            direction: amount >= 0 ? 'CREDIT' : 'DEBIT',
            amount: (0, finance_normalizer_types_1.createMonetaryAmount)(Math.abs(amount), 'USD'),
            valueDate,
            postingDate: valueDate,
            originatorId,
            beneficiaryId,
            tenantId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    (0, vitest_1.describe)('detectFanIn', () => {
        (0, vitest_1.it)('should detect fan-in pattern', async () => {
            const transactions = [
                createTransaction('1', 'party-a', 'party-target', 1000, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-b', 'party-target', 1500, '2024-01-15T11:00:00Z'),
                createTransaction('3', 'party-c', 'party-target', 2000, '2024-01-15T12:00:00Z'),
                createTransaction('4', 'party-d', 'party-target', 500, '2024-01-15T13:00:00Z'),
            ];
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const fanIn = patterns.find(p => p.type === 'FAN_IN');
            (0, vitest_1.expect)(fanIn).toBeDefined();
            (0, vitest_1.expect)(fanIn.primaryPartyIds).toContain('party-target');
            (0, vitest_1.expect)(fanIn.transactionCount).toBe(4);
        });
        (0, vitest_1.it)('should not detect fan-in with insufficient sources', async () => {
            const transactions = [
                createTransaction('1', 'party-a', 'party-target', 1000, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-b', 'party-target', 1500, '2024-01-15T11:00:00Z'),
            ];
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const fanIn = patterns.find(p => p.type === 'FAN_IN');
            (0, vitest_1.expect)(fanIn).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('detectFanOut', () => {
        (0, vitest_1.it)('should detect fan-out pattern', async () => {
            const transactions = [
                createTransaction('1', 'party-source', 'party-a', 1000, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-source', 'party-b', 1500, '2024-01-15T11:00:00Z'),
                createTransaction('3', 'party-source', 'party-c', 2000, '2024-01-15T12:00:00Z'),
            ];
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const fanOut = patterns.find(p => p.type === 'FAN_OUT');
            (0, vitest_1.expect)(fanOut).toBeDefined();
            (0, vitest_1.expect)(fanOut.primaryPartyIds).toContain('party-source');
        });
    });
    (0, vitest_1.describe)('detectStructuring', () => {
        (0, vitest_1.it)('should detect structuring pattern', async () => {
            // Transactions just below $10,000 threshold
            const transactions = [
                createTransaction('1', 'party-a', 'party-b', 9500, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-a', 'party-c', 9800, '2024-01-15T11:00:00Z'),
                createTransaction('3', 'party-a', 'party-d', 9200, '2024-01-15T12:00:00Z'),
                createTransaction('4', 'party-a', 'party-e', 9700, '2024-01-15T13:00:00Z'),
            ];
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const structuring = patterns.find(p => p.type === 'STRUCTURING');
            (0, vitest_1.expect)(structuring).toBeDefined();
            (0, vitest_1.expect)(structuring.severity).toBe('HIGH');
        });
        (0, vitest_1.it)('should not flag transactions well below threshold', async () => {
            const transactions = [
                createTransaction('1', 'party-a', 'party-b', 1000, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-a', 'party-c', 1500, '2024-01-15T11:00:00Z'),
                createTransaction('3', 'party-a', 'party-d', 2000, '2024-01-15T12:00:00Z'),
            ];
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const structuring = patterns.find(p => p.type === 'STRUCTURING');
            (0, vitest_1.expect)(structuring).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('detectRapidMovement', () => {
        (0, vitest_1.it)('should detect rapid in/out pattern', async () => {
            const transactions = [
                createTransaction('1', 'party-external', undefined, 10000, '2024-01-15T10:00:00Z'),
                createTransaction('2', undefined, 'party-external', -9800, '2024-01-15T12:00:00Z'),
            ];
            // Set account IDs for tracking
            transactions[0].destinationAccountId = 'account-1';
            transactions[1].sourceAccountId = 'account-1';
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const rapidMovement = patterns.find(p => p.type === 'RAPID_MOVEMENT');
            (0, vitest_1.expect)(rapidMovement).toBeDefined();
        });
    });
    (0, vitest_1.describe)('detectRoundTrip', () => {
        (0, vitest_1.it)('should detect circular flow pattern', async () => {
            const transactions = [
                createTransaction('1', 'party-a', 'party-b', 10000, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-b', 'party-c', 9500, '2024-01-15T11:00:00Z'),
                createTransaction('3', 'party-c', 'party-a', 9000, '2024-01-15T12:00:00Z'),
            ];
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const circular = patterns.find(p => p.type === 'CIRCULAR');
            (0, vitest_1.expect)(circular).toBeDefined();
            (0, vitest_1.expect)(circular.severity).toBe('HIGH');
        });
    });
    (0, vitest_1.describe)('buildAggregatedFlows', () => {
        (0, vitest_1.it)('should aggregate flows by day', async () => {
            const transactions = [
                createTransaction('1', 'party-a', 'party-b', 1000, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-a', 'party-b', 2000, '2024-01-15T14:00:00Z'),
                createTransaction('3', 'party-a', 'party-b', 1500, '2024-01-16T10:00:00Z'),
            ];
            const flows = await service.buildAggregatedFlows(transactions, 'DAILY', tenantId);
            (0, vitest_1.expect)(flows.length).toBe(2); // Two days
            const day1Flow = flows.find(f => f.periodStart.includes('2024-01-15'));
            (0, vitest_1.expect)(day1Flow).toBeDefined();
            (0, vitest_1.expect)(day1Flow.transactionCount).toBe(2);
            (0, vitest_1.expect)(Number(day1Flow.grossFlow.minorUnits)).toBe(300000); // $3000
        });
        (0, vitest_1.it)('should calculate net flow correctly', async () => {
            const transactions = [
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
            (0, vitest_1.expect)(flows.length).toBe(1);
            (0, vitest_1.expect)(flows[0].creditCount).toBe(1);
            (0, vitest_1.expect)(flows[0].debitCount).toBe(1);
        });
    });
    (0, vitest_1.describe)('pattern severity calculation', () => {
        (0, vitest_1.it)('should assign CRITICAL severity for large amounts with many parties', async () => {
            // Create many transactions with large amounts
            const transactions = Array.from({ length: 15 }, (_, i) => createTransaction(`${i}`, `party-${i}`, 'party-target', 100000, // $100,000 each
            `2024-01-15T${10 + i}:00:00Z`));
            const patterns = await service.analyzeTransactions(transactions, tenantId);
            const fanIn = patterns.find(p => p.type === 'FAN_IN');
            (0, vitest_1.expect)(fanIn).toBeDefined();
            (0, vitest_1.expect)(['HIGH', 'CRITICAL']).toContain(fanIn.severity);
        });
    });
    (0, vitest_1.describe)('confidence calculation', () => {
        (0, vitest_1.it)('should have higher confidence with more parties', async () => {
            const smallGroup = [
                createTransaction('1', 'party-a', 'party-target', 1000, '2024-01-15T10:00:00Z'),
                createTransaction('2', 'party-b', 'party-target', 1000, '2024-01-15T11:00:00Z'),
                createTransaction('3', 'party-c', 'party-target', 1000, '2024-01-15T12:00:00Z'),
            ];
            const largeGroup = Array.from({ length: 10 }, (_, i) => createTransaction(`${i}`, `party-${i}`, 'party-target', 1000, `2024-01-15T${10 + i}:00:00Z`));
            const smallPatterns = await service.analyzeTransactions(smallGroup, tenantId);
            const largePatterns = await service.analyzeTransactions(largeGroup, tenantId);
            const smallConfidence = smallPatterns.find(p => p.type === 'FAN_IN')?.confidence || 0;
            const largeConfidence = largePatterns.find(p => p.type === 'FAN_IN')?.confidence || 0;
            (0, vitest_1.expect)(largeConfidence).toBeGreaterThan(smallConfidence);
        });
    });
});
