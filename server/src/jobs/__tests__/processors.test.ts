import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock OPA wrapper to bypass policy checks in unit tests
jest.mock('../processors/opa-job-wrapper.js', () => ({
    withOpaPolicy: (_queueName: string, processor: Function) => processor,
    canEnqueueJob: jest.fn().mockResolvedValue(true),
    JobPolicyContext: {},
}));

// Mock database connections
jest.mock('../../db/neo4j.js', () => ({
    getNeo4jDriver: () => ({
        session: () => ({
            run: jest.fn().mockResolvedValue({ records: [] }),
            close: jest.fn(),
        }),
    }),
}));

jest.mock('../../db/postgres.js', () => ({
    getPostgresPool: () => ({
        connect: () => Promise.resolve({
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn(),
        }),
    }),
}));

jest.mock('../../graphql/subscriptionEngine.js', () => ({
    subscriptionEngine: { publish: jest.fn() },
}));

jest.mock('../../services/EmbeddingService.js', () => ({
    default: class MockEmbeddingService {
        generateEmbeddings() { return Promise.resolve([[0.1, 0.2, 0.3]]); }
    },
}));

jest.mock('../../observability/metrics.js', () => ({
    metrics: { jobsProcessed: { inc: jest.fn() } },
}));

import { reportProcessor } from '../processors/report.processor.js';
import { analyticsProcessor } from '../processors/analytics.processor.js';
import { notificationProcessor } from '../processors/notification.processor.js';
import { webhookProcessor } from '../processors/webhook.processor.js';

describe('Job Processors', () => {
    // Note: ingestionProcessor requires too many live dependencies for unit tests
    // Integration tests cover the full flow with OPA policy enforcement
    describe('ingestionProcessor', () => {
        it.skip('should process job successfully (requires integration test)', async () => {
            // This test requires database connections and is covered by integration tests
            expect(true).toBe(true);
        });
    });

    describe('reportProcessor', () => {
        it('should generate report url', async () => {
            const job = { id: '2', data: {} } as any;
            const result = await reportProcessor(job);
            expect(result).toHaveProperty('reportUrl');
            expect(result.reportUrl).toContain('2.pdf');
        });
    });

    describe('analyticsProcessor', () => {
        it('should return metrics', async () => {
            const job = { id: '3', data: {} } as any;
            const result = await analyticsProcessor(job);
            expect(result).toHaveProperty('metrics');
        });
    });

    describe('notificationProcessor', () => {
        it('should send notification', async () => {
            const job = { id: '4', data: { to: 'test@example.com' } } as any;
            const result = await notificationProcessor(job);
            expect(result).toEqual({ sent: true });
        });
    });

    describe('webhookProcessor', () => {
        it('should process webhook', async () => {
            const job = { id: '5', data: { event: 'ping' } } as any;
            const result = await webhookProcessor(job);
            expect(result).toEqual({ status: 'processed' });
        });
    });
});
