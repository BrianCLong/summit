import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { ChaosHarness } from '../../src/lib/chaos/harness.js';
import { ChaosHttpClient } from '../../src/lib/chaos/ChaosHttpClient.js';
import { ChaosGraphDriver } from '../../src/lib/chaos/ChaosGraphDriver.js';
import { ChaosJobMiddleware } from '../../src/lib/chaos/ChaosJobMiddleware.js';
import type { Driver, Session } from 'neo4j-driver';

// Mock Neo4j driver/session
const mockRun = jest.fn();
const mockClose = jest.fn();

const mockSession = {
    run: mockRun,
    close: mockClose,
    beginTransaction: jest.fn(),
    readTransaction: jest.fn(),
    writeTransaction: jest.fn(),
    lastBookmark: jest.fn(() => []),
    lastBookmarks: jest.fn(() => []),
    executeRead: jest.fn(),
    executeWrite: jest.fn(),
} as unknown as Session;

const mockDriver = {
    session: () => mockSession,
    close: jest.fn(),
    verifyConnectivity: jest.fn(),
    supportsMultiDb: jest.fn(),
    supportsTransactionConfig: jest.fn(),
    executableQuery: jest.fn(),
    executeQuery: jest.fn(),
} as unknown as Driver;

// Plain function adapter
const plainAxiosAdapter = (config: any) => {
    return Promise.resolve({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config,
        request: {}
    });
};

describe('Chaos Harness Integration Tests', () => {

    beforeEach(() => {
        ChaosHarness.getInstance().reset();
        jest.clearAllMocks();
    });

    describe('Scenario 1: HTTP 429 Burst', () => {
        it('should inject 429 errors and allow retry logic to handle it', async () => {
            const axiosInstance = axios.create({ adapter: plainAxiosAdapter as any });
            const chaosClient = new ChaosHttpClient(axiosInstance, 'external-api');

            // Enable Chaos: 100% error rate, type 429
            ChaosHarness.getInstance().setConfig('external-api', {
                mode: 'error',
                errorRate: 1.0,
                errorType: '429'
            });

            let attempts = 0;

            try {
                // Initial request - should fail with 429
                attempts++;
                await chaosClient.getClient().get('/test');
            } catch (err: any) {
                // Expect 429
                if (err.response) {
                    expect(err.response.status).toBe(429);
                } else {
                    throw err;
                }

                // Disable chaos to simulate "burst over" or "retry success"
                ChaosHarness.getInstance().setConfig('external-api', { mode: 'none' });

                // Retry
                attempts++;
                const res = await chaosClient.getClient().get('/test');
                expect(res.status).toBe(200);
            }

            expect(attempts).toBe(2);
        });
    });

    describe('Scenario 2: Graph Latency Spike', () => {
        it('should inject latency into graph queries', async () => {
            const chaosDriver = new ChaosGraphDriver(mockDriver, 'graph-db');

            // Enable Chaos: 100ms latency
            ChaosHarness.getInstance().setConfig('graph-db', {
                mode: 'latency',
                latencyMs: 100
            });

            // Use any to avoid TS2345 strict mocking issues in test
            (mockRun as any).mockResolvedValue({ records: [], summary: {} });

            const start = Date.now();
            const session = chaosDriver.session();
            await session.run('MATCH (n) RETURN n');
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(100);
            expect(mockRun).toHaveBeenCalled();
        });

        it('should inject errors into graph queries', async () => {
            const chaosDriver = new ChaosGraphDriver(mockDriver, 'graph-db');

             // Enable Chaos: Error
            ChaosHarness.getInstance().setConfig('graph-db', {
                mode: 'error',
                errorRate: 1.0,
                errorType: 'TransientError'
            });

            const session = chaosDriver.session();
            await expect(session.run('MATCH (n) RETURN n')).rejects.toThrow('Chaos injected Neo4j error: TransientError');
        });
    });

    describe('Scenario 3: Job Worker Failure', () => {
        it('should inject failure into job processing', async () => {
            const middleware = new ChaosJobMiddleware('job-worker-1');

            // Enable Chaos
            ChaosHarness.getInstance().setConfig('job-worker-1', {
                mode: 'error',
                errorRate: 1.0
            });

            await expect(middleware.checkChaos()).rejects.toThrow('Chaos injected Job failure');

            // Disable Chaos
            ChaosHarness.getInstance().setConfig('job-worker-1', { mode: 'none' });
            await expect(middleware.checkChaos()).resolves.not.toThrow();
        });
    });
});
