// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { MeteringEmitter } from '../emitter.js';
import { meteringPipeline } from '../pipeline.js';
import { FileMeterStore, meterStore } from '../persistence.js';
import { MeterEventKind } from '../schema.js';
import stringify from 'fast-json-stable-stringify';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../postgres-repository', () => ({
    postgresMeterRepository: {
        recordEvent: jest.fn().mockResolvedValue(true)
    }
}));
jest.mock('../repository', () => ({
    TenantUsageDailyRepository: class {
        store = new Map();
        saveAll(rows: any[]) {}
        list() { return []; }
        get() { return undefined; }
    },
    tenantUsageDailyRepository: {
        saveAll: jest.fn(),
        list: jest.fn().mockResolvedValue([]),
        get: jest.fn()
    }
}));

// Mock meterStore completely to avoid file I/O and timeout issues in unit tests
// We use unstable_mockModule or just mock and cast for Typescript if needed.
// However, jest.mock is hoisted.
jest.mock('../persistence', () => {
    const actual = jest.requireActual('../persistence');
    return {
        ...actual,
        meterStore: {
            append: jest.fn().mockResolvedValue(undefined)
        },
        // We preserve the class so we can test it if instantiated
        FileMeterStore: actual.FileMeterStore
    };
});

// Re-import after mock
import { meterStore as mockMeterStore } from '../persistence.js';

const TEST_DATA_DIR = path.join(process.cwd(), 'data', 'metering_test');

describe('Metering Integrity', () => {

    beforeEach(() => {
        // Reset pipeline state
        meteringPipeline.reset();
        (mockMeterStore.append as jest.Mock).mockClear();
    });

    it('should calculate hash chain correctly', async () => {
        const testLogPath = path.join(process.cwd(), 'metering_integrity_test.jsonl');

        // We need to instantiate the real class, but we mocked the module.
        // We can get the real class from requireActual (which we did in the mock factory).
        // Since we spread actual, FileMeterStore should be available.
        const { FileMeterStore: RealFileMeterStore } = jest.requireActual('../persistence');

        const store = new RealFileMeterStore();
        (store as any).logPath = testLogPath;
        (store as any).lastHash = '';

        // Clean up
        if (fs.existsSync(testLogPath)) fs.unlinkSync(testLogPath);

        // 1. Append first event
        await store.append({
            kind: MeterEventKind.API_REQUEST,
            tenantId: 't1',
            source: 'test',
            metadata: { n: 1 }
        });

        // 2. Append second event
        await store.append({
            kind: MeterEventKind.API_REQUEST,
            tenantId: 't1',
            source: 'test',
            metadata: { n: 2 }
        });

        // Verify
        const result = await store.verifyLogIntegrity();
        expect(result.valid).toBe(true);

        // Tamper with file
        const content = fs.readFileSync(testLogPath, 'utf8');
        const lines = content.trim().split('\n');

        // Modify the first record's data but keep the hash
        const record1 = JSON.parse(lines[0]);
        // Use stringify from fast-json-stable-stringify for consistency
        record1.data.metadata.n = 999;
        lines[0] = stringify(record1);

        fs.writeFileSync(testLogPath, lines.join('\n'));

        const tamperedResult = await store.verifyLogIntegrity();
        expect(tamperedResult.valid).toBe(false);
        expect(tamperedResult.brokenAtLine).toBe(1); // Line 1 hash mismatch

        // Cleanup
        if (fs.existsSync(testLogPath)) fs.unlinkSync(testLogPath);
    });

});

describe('Metering Emitter & Pipeline', () => {
    it('should emit and rollup API requests', async () => {
        const tenantId = 'tenant-123';

        await meteringPipeline.enqueue({
            kind: MeterEventKind.API_REQUEST,
            tenantId,
            source: 'test',
            method: 'GET',
            endpoint: '/api/v1/resource',
            statusCode: 200
        });

        // Wait for next tick/processing since enqueue is async
        await new Promise(resolve => setTimeout(resolve, 50));

        const rollups = meteringPipeline.getDailyRollups();
        const tenantRollup = rollups.find(r => r.tenantId === tenantId);

        expect(tenantRollup).toBeDefined();
        expect(tenantRollup?.apiRequests).toBe(1);
    });

    it('should emit and rollup LLM tokens', async () => {
        const tenantId = 'tenant-456';

        await meteringPipeline.enqueue({
            kind: MeterEventKind.LLM_TOKENS,
            tenantId,
            source: 'test',
            tokens: 150,
            model: 'gpt-4',
            provider: 'openai'
        });

        await meteringPipeline.enqueue({
            kind: MeterEventKind.LLM_TOKENS,
            tenantId,
            source: 'test',
            tokens: 50,
            model: 'gpt-4',
            provider: 'openai'
        });

        // Wait for next tick/processing
        await new Promise(resolve => setTimeout(resolve, 50));

        const rollups = meteringPipeline.getDailyRollups();
        const tenantRollup = rollups.find(r => r.tenantId === tenantId);

        expect(tenantRollup).toBeDefined();
        expect(tenantRollup?.llmTokens).toBe(200);
    });
});
