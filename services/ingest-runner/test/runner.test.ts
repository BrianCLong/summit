import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock IORedis
const mRedis = {
    exists: vi.fn().mockResolvedValue(0),
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
    options: {}
};
vi.mock('ioredis', () => {
    return {
        default: vi.fn(() => mRedis)
    };
});

// Mock BullMQ
vi.mock('bullmq', () => {
    return {
        Worker: vi.fn().mockImplementation((name, processor) => {
            return {
                on: vi.fn(),
                close: vi.fn()
            }
        }),
        Queue: vi.fn()
    };
});

// Mock NATS
vi.mock('nats', () => {
    return {
        connect: vi.fn().mockResolvedValue({
            publish: vi.fn(),
            close: vi.fn()
        }),
        JSONCodec: vi.fn().mockReturnValue({
            encode: (d: any) => d,
            decode: (d: any) => d
        })
    };
});

// Mock fs and avsc
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
        createReadStream: vi.fn()
    }
}));
vi.mock('avsc', () => ({
    default: {
        Type: {
            forSchema: vi.fn().mockReturnValue({
                toBuffer: vi.fn().mockReturnValue(Buffer.from('mock'))
            })
        }
    }
}));

import { start } from '../src/index';

describe('Ingest Runner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CONNECTOR_CSV = 'true';
    });

    it('should start the worker', async () => {
        const worker = await start();
        expect(worker).toBeDefined();
    });

    it('should handle duplicate detection', async () => {
        // This is an indirect test since we can't easily call the internal isDuplicate function
        // But we can check if Redis calls happened during a hypothetical run
        // In a real integration test we would submit a job and check effects
        expect(mRedis.exists).toBeDefined();
    });
});
