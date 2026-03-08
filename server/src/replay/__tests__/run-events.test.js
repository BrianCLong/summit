"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
if (typeof BigInt.prototype.toJSON !== 'function') {
    BigInt.prototype.toJSON = function () {
        return this.toString();
    };
}
// Extensive mocking to catch any open handle culprit
// Mock 'pg' native module just in case
globals_1.jest.mock('pg', () => ({
    Pool: class {
        constructor() { console.log('Mocked Pool constructor'); }
        connect() { return Promise.resolve({ query: globals_1.jest.fn(), release: globals_1.jest.fn() }); }
        query() { return Promise.resolve({ rows: [] }); }
        end() { return Promise.resolve(); }
        on() { }
    }
}));
// Mock prom-client
globals_1.jest.mock('prom-client', () => ({
    Counter: class {
        inc() { }
    },
    Histogram: class {
        observe() { }
    },
    Gauge: class {
        set() { }
    },
    Registry: class {
        registerMetric() { }
        getSingleMetric() { return null; }
        clear() { }
    },
    collectDefaultMetrics: globals_1.jest.fn(),
    register: {
        getSingleMetric: () => null,
        registerMetric: globals_1.jest.fn(),
    },
}));
// Mock DB wrapper
const mockPg = {
    pool: {
        connect: globals_1.jest.fn(),
        query: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
    },
    pg: {
        oneOrNone: globals_1.jest.fn(),
        read: globals_1.jest.fn(),
        write: globals_1.jest.fn(),
        readMany: globals_1.jest.fn(),
        many: globals_1.jest.fn(),
        withTenant: globals_1.jest.fn(),
        transaction: globals_1.jest.fn(),
        healthCheck: globals_1.jest.fn(),
        close: globals_1.jest.fn(),
    }
};
mockPg.pool.connect.mockResolvedValue({
    query: globals_1.jest.fn(async () => ({ rows: [], rowCount: 0 })),
    release: globals_1.jest.fn(),
});
mockPg.pool.query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
globals_1.jest.mock('../../db/pg.js', () => mockPg);
globals_1.jest.mock('../../db/pg', () => mockPg);
globals_1.jest.mock('../../db/pg.js', () => mockPg);
globals_1.jest.mock('../../security/crypto/index.js', () => ({
    createDefaultCryptoPipeline: globals_1.jest.fn().mockImplementation(async () => null),
}));
globals_1.jest.mock('../../audit/index.js', () => ({
    advancedAuditSystem: {
        logEvent: globals_1.jest.fn(),
        recordEvent: globals_1.jest.fn(),
        queryEvents: globals_1.jest.fn(),
        refreshTimelineRollups: globals_1.jest.fn(),
        getTimelineBuckets: globals_1.jest.fn(),
    },
    audit: { emit: globals_1.jest.fn() },
    getAuditSystem: globals_1.jest.fn(),
}));
globals_1.jest.mock('../../provenance/CanonicalGraphService.js', () => ({
    CanonicalGraphService: {
        getInstance: () => ({ projectEntry: globals_1.jest.fn(async () => undefined) }),
    },
}));
globals_1.jest.mock('../../provenance/witness.js', () => ({
    mutationWitness: {
        witnessMutation: globals_1.jest.fn().mockImplementation(async () => ({ witnessId: 'mock-witness' })),
    },
}));
// Now import the subject
const run_events_js_1 = require("../run-events.js");
describe('Event Replay Runner', () => {
    const fixtureRelativePath = 'fixtures/replay/o2c_happy_path.jsonl';
    const fixturePath = (() => {
        const localPath = path_1.default.join(process.cwd(), fixtureRelativePath);
        if (fs_1.default.existsSync(localPath))
            return localPath;
        return path_1.default.join(process.cwd(), 'server', fixtureRelativePath);
    })();
    it('should replay o2c_happy_path.jsonl deterministically', async () => {
        const result = await (0, run_events_js_1.replayEvents)(fixturePath, { seed: 42, startTime: 1672567200000 });
        expect(result.errors).toHaveLength(0);
        expect(result.processedCount).toBe(3);
        expect(result.rows).toHaveLength(3);
        // Verify Order
        const [row1, row2, row3] = result.rows;
        expect(result.rows.map((row) => row.sequence_number)).toEqual([1, 2, 3]);
        // Row 1: ORDER_CREATED
        expect(row1.action_type).toBe('CREATE');
        expect(row1.resource_type).toBe('Order');
        expect(row1.resource_id).toBe('ord_1');
        expect(row1.sequence_number).toBe(1);
        // Row 2: PAYMENT_RECEIVED -> UPDATE
        expect(row2.action_type).toBe('UPDATE');
        expect(row2.resource_id).toBe('ord_1');
        expect(row2.sequence_number).toBe(2);
        expect(row2.previous_hash).toBe(row1.current_hash);
        // Row 3: ORDER_FULFILLED -> UPDATE
        expect(row3.action_type).toBe('UPDATE');
        expect(row3.resource_id).toBe('ord_1');
        expect(row3.sequence_number).toBe(3);
        expect(row3.previous_hash).toBe(row2.current_hash);
    });
    it('should be deterministic (same seed -> same hashes)', async () => {
        const run1 = await (0, run_events_js_1.replayEvents)(fixturePath, { seed: 999 });
        const run2 = await (0, run_events_js_1.replayEvents)(fixturePath, { seed: 999 });
        expect(run1.rows.map((row) => row.id)).toEqual(run2.rows.map((row) => row.id));
        expect(run1.rows.map((row) => row.sequence_number)).toEqual(run2.rows.map((row) => row.sequence_number));
    });
    it('should produce different results with different seeds', async () => {
        const run1 = await (0, run_events_js_1.replayEvents)(fixturePath, { seed: 111 });
        const run2 = await (0, run_events_js_1.replayEvents)(fixturePath, { seed: 222 });
        expect(run1.rows[0].id).not.toBe(run2.rows[0].id);
    });
});
