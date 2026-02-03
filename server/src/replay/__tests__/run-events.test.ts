import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

// Extensive mocking to catch any open handle culprit

// Mock 'pg' native module just in case
jest.mock('pg', () => ({
  Pool: class {
    constructor() { console.log('Mocked Pool constructor'); }
    connect() { return Promise.resolve({ query: jest.fn(), release: jest.fn() }); }
    query() { return Promise.resolve({ rows: [] }); }
    end() { return Promise.resolve(); }
    on() {}
  }
}));

// Mock prom-client
jest.mock('prom-client', () => ({
  Counter: class { inc() {} },
  Histogram: class { observe() {} },
  Gauge: class { set() {} },
  Registry: class {
    registerMetric() {}
    getSingleMetric() { return null; }
    clear() {}
  },
  collectDefaultMetrics: jest.fn(),
  register: {
    getSingleMetric: () => null,
    registerMetric: jest.fn(),
  },
}));

// Mock DB wrapper
const mockPg: any = {
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  },
  pg: {
    oneOrNone: jest.fn(),
    read: jest.fn(),
    write: jest.fn(),
    readMany: jest.fn(),
    many: jest.fn(),
    withTenant: jest.fn(),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    close: jest.fn(),
  }
};

mockPg.pool.connect.mockResolvedValue({
  query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
  release: jest.fn(),
});
mockPg.pool.query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));

jest.mock('../../db/pg.js', () => mockPg);
jest.mock('../../db/pg', () => mockPg);
jest.mock('../../db/pg.js', () => mockPg);

jest.mock('../../security/crypto/index.js', () => ({
  createDefaultCryptoPipeline: jest.fn().mockImplementation(async () => null),
}));

jest.mock('../../audit/index.js', () => ({
  advancedAuditSystem: {
    logEvent: jest.fn(),
    recordEvent: jest.fn(),
    queryEvents: jest.fn(),
    refreshTimelineRollups: jest.fn(),
    getTimelineBuckets: jest.fn(),
  },
  audit: { emit: jest.fn() },
  getAuditSystem: jest.fn(),
}));

jest.mock('../../provenance/CanonicalGraphService.js', () => ({
  CanonicalGraphService: {
    getInstance: () => ({ projectEntry: jest.fn(async () => undefined) }),
  },
}));

jest.mock('../../provenance/witness.js', () => ({
  mutationWitness: {
    witnessMutation: jest.fn().mockImplementation(async () => ({ witnessId: 'mock-witness' })),
  },
}));

// Now import the subject
import { replayEvents } from '../run-events.js';

describe('Event Replay Runner', () => {
  const fixtureRelativePath = 'fixtures/replay/o2c_happy_path.jsonl';
  const fixturePath = (() => {
    const localPath = path.join(process.cwd(), fixtureRelativePath);
    if (fs.existsSync(localPath)) return localPath;
    return path.join(process.cwd(), 'server', fixtureRelativePath);
  })();

  it('should replay o2c_happy_path.jsonl deterministically', async () => {
    const result = await replayEvents(fixturePath, { seed: 42, startTime: 1672567200000 });

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
    const run1 = await replayEvents(fixturePath, { seed: 999 });
    const run2 = await replayEvents(fixturePath, { seed: 999 });

    expect(run1.rows.map((row) => row.id)).toEqual(run2.rows.map((row) => row.id));
    expect(run1.rows.map((row) => row.sequence_number)).toEqual(
      run2.rows.map((row) => row.sequence_number),
    );
  });

  it('should produce different results with different seeds', async () => {
    const run1 = await replayEvents(fixturePath, { seed: 111 });
    const run2 = await replayEvents(fixturePath, { seed: 222 });

    expect(run1.rows[0].id).not.toBe(run2.rows[0].id);
  });
});
