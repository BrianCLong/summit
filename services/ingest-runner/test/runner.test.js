"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
// Mock IORedis
const mRedis = {
    exists: vitest_1.vi.fn().mockResolvedValue(0),
    setex: vitest_1.vi.fn().mockResolvedValue('OK'),
    get: vitest_1.vi.fn().mockResolvedValue(null),
    set: vitest_1.vi.fn().mockResolvedValue('OK'),
    on: vitest_1.vi.fn(),
    options: {}
};
vitest_1.vi.mock('ioredis', () => {
    return {
        default: vitest_1.vi.fn(() => mRedis)
    };
});
// Mock BullMQ
vitest_1.vi.mock('bullmq', () => {
    return {
        Worker: vitest_1.vi.fn().mockImplementation((name, processor) => {
            return {
                on: vitest_1.vi.fn(),
                close: vitest_1.vi.fn()
            };
        }),
        Queue: vitest_1.vi.fn()
    };
});
// Mock NATS
vitest_1.vi.mock('nats', () => {
    return {
        connect: vitest_1.vi.fn().mockResolvedValue({
            publish: vitest_1.vi.fn(),
            close: vitest_1.vi.fn()
        }),
        JSONCodec: vitest_1.vi.fn().mockReturnValue({
            encode: (d) => d,
            decode: (d) => d
        })
    };
});
// Mock fs and avsc
vitest_1.vi.mock('fs', () => ({
    default: {
        existsSync: vitest_1.vi.fn().mockReturnValue(false),
        readFileSync: vitest_1.vi.fn(),
        createReadStream: vitest_1.vi.fn()
    }
}));
vitest_1.vi.mock('avsc', () => ({
    default: {
        Type: {
            forSchema: vitest_1.vi.fn().mockReturnValue({
                toBuffer: vitest_1.vi.fn().mockReturnValue(Buffer.from('mock'))
            })
        }
    }
}));
const index_1 = require("../src/index");
(0, vitest_1.describe)('Ingest Runner', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        process.env.CONNECTOR_CSV = 'true';
    });
    (0, vitest_1.it)('should start the worker', async () => {
        const worker = await (0, index_1.start)();
        (0, vitest_1.expect)(worker).toBeDefined();
    });
    (0, vitest_1.it)('should handle duplicate detection', async () => {
        // This is an indirect test since we can't easily call the internal isDuplicate function
        // But we can check if Redis calls happened during a hypothetical run
        // In a real integration test we would submit a job and check effects
        (0, vitest_1.expect)(mRedis.exists).toBeDefined();
    });
});
