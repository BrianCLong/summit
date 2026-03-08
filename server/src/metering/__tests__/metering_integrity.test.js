"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pipeline_js_1 = require("../pipeline.js");
const schema_js_1 = require("../schema.js");
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
// Mock dependencies
globals_1.jest.mock('../../utils/logger');
globals_1.jest.mock('../postgres-repository', () => ({
    postgresMeterRepository: {
        recordEvent: globals_1.jest.fn().mockResolvedValue(true)
    }
}));
globals_1.jest.mock('../repository', () => ({
    TenantUsageDailyRepository: class {
        store = new Map();
        saveAll(rows) { }
        list() { return []; }
        get() { return undefined; }
    },
    tenantUsageDailyRepository: {
        saveAll: globals_1.jest.fn(),
        list: globals_1.jest.fn().mockResolvedValue([]),
        get: globals_1.jest.fn()
    }
}));
// Mock meterStore completely to avoid file I/O and timeout issues in unit tests
// We use unstable_mockModule or just mock and cast for Typescript if needed.
// However, jest.mock is hoisted.
globals_1.jest.mock('../persistence', () => {
    const actual = globals_1.jest.requireActual('../persistence');
    return {
        ...actual,
        meterStore: {
            append: globals_1.jest.fn().mockResolvedValue(undefined)
        },
        // We preserve the class so we can test it if instantiated
        FileMeterStore: actual.FileMeterStore
    };
});
// Re-import after mock
const persistence_js_1 = require("../persistence.js");
const TEST_DATA_DIR = path_1.default.join(process.cwd(), 'data', 'metering_test');
(0, globals_1.describe)('Metering Integrity', () => {
    (0, globals_1.beforeEach)(() => {
        // Reset pipeline state
        pipeline_js_1.meteringPipeline.reset();
        persistence_js_1.meterStore.append.mockClear();
    });
    (0, globals_1.it)('should calculate hash chain correctly', async () => {
        const testLogPath = path_1.default.join(process.cwd(), 'metering_integrity_test.jsonl');
        // We need to instantiate the real class, but we mocked the module.
        // We can get the real class from requireActual (which we did in the mock factory).
        // Since we spread actual, FileMeterStore should be available.
        const { FileMeterStore: RealFileMeterStore } = globals_1.jest.requireActual('../persistence');
        const store = new RealFileMeterStore();
        store.logPath = testLogPath;
        store.lastHash = '';
        // Clean up
        if (fs_1.default.existsSync(testLogPath))
            fs_1.default.unlinkSync(testLogPath);
        // 1. Append first event
        await store.append({
            kind: schema_js_1.MeterEventKind.API_REQUEST,
            tenantId: 't1',
            source: 'test',
            metadata: { n: 1 }
        });
        // 2. Append second event
        await store.append({
            kind: schema_js_1.MeterEventKind.API_REQUEST,
            tenantId: 't1',
            source: 'test',
            metadata: { n: 2 }
        });
        // Verify
        const result = await store.verifyLogIntegrity();
        (0, globals_1.expect)(result.valid).toBe(true);
        // Tamper with file
        const content = fs_1.default.readFileSync(testLogPath, 'utf8');
        const lines = content.trim().split('\n');
        // Modify the first record's data but keep the hash
        const record1 = JSON.parse(lines[0]);
        // Use stringify from fast-json-stable-stringify for consistency
        record1.data.metadata.n = 999;
        lines[0] = (0, fast_json_stable_stringify_1.default)(record1);
        fs_1.default.writeFileSync(testLogPath, lines.join('\n'));
        const tamperedResult = await store.verifyLogIntegrity();
        (0, globals_1.expect)(tamperedResult.valid).toBe(false);
        (0, globals_1.expect)(tamperedResult.brokenAtLine).toBe(1); // Line 1 hash mismatch
        // Cleanup
        if (fs_1.default.existsSync(testLogPath))
            fs_1.default.unlinkSync(testLogPath);
    });
});
(0, globals_1.describe)('Metering Emitter & Pipeline', () => {
    (0, globals_1.it)('should emit and rollup API requests', async () => {
        const tenantId = 'tenant-123';
        await pipeline_js_1.meteringPipeline.enqueue({
            kind: schema_js_1.MeterEventKind.API_REQUEST,
            tenantId,
            source: 'test',
            method: 'GET',
            endpoint: '/api/v1/resource',
            statusCode: 200
        });
        // Wait for next tick/processing since enqueue is async
        await new Promise(resolve => setTimeout(resolve, 50));
        const rollups = pipeline_js_1.meteringPipeline.getDailyRollups();
        const tenantRollup = rollups.find(r => r.tenantId === tenantId);
        (0, globals_1.expect)(tenantRollup).toBeDefined();
        (0, globals_1.expect)(tenantRollup?.apiRequests).toBe(1);
    });
    (0, globals_1.it)('should emit and rollup LLM tokens', async () => {
        const tenantId = 'tenant-456';
        await pipeline_js_1.meteringPipeline.enqueue({
            kind: schema_js_1.MeterEventKind.LLM_TOKENS,
            tenantId,
            source: 'test',
            tokens: 150,
            model: 'gpt-4',
            provider: 'openai'
        });
        await pipeline_js_1.meteringPipeline.enqueue({
            kind: schema_js_1.MeterEventKind.LLM_TOKENS,
            tenantId,
            source: 'test',
            tokens: 50,
            model: 'gpt-4',
            provider: 'openai'
        });
        // Wait for next tick/processing
        await new Promise(resolve => setTimeout(resolve, 50));
        const rollups = pipeline_js_1.meteringPipeline.getDailyRollups();
        const tenantRollup = rollups.find(r => r.tenantId === tenantId);
        (0, globals_1.expect)(tenantRollup).toBeDefined();
        (0, globals_1.expect)(tenantRollup?.llmTokens).toBe(200);
    });
});
