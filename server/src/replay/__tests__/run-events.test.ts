import { jest } from '@jest/globals';
import path from 'path';

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
  register: { getSingleMetric: () => null },
}));

// Mock DB wrapper
const mockPg = {
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

jest.mock('../../db/pg.js', () => mockPg);
jest.mock('../../db/pg', () => mockPg);
jest.mock('../../db/pg.ts', () => mockPg);

jest.mock('../../security/crypto/index.js', () => ({
  createDefaultCryptoPipeline: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../provenance/witness.js', () => ({
  mutationWitness: {
    witnessMutation: jest.fn().mockResolvedValue({ witnessId: 'mock-witness' }),
  },
}));

// Now import the subject
import { replayEvents } from '../run-events.js';

describe('Event Replay Runner', () => {
  const fixturePath = path.join(process.cwd(), 'server/fixtures/replay/o2c_happy_path.jsonl');

  it('should replay o2c_happy_path.jsonl deterministically', async () => {
    const result = await replayEvents(fixturePath, { seed: 42, startTime: 1672567200000 });

    expect(result.errors).toHaveLength(0);
    expect(result.processedCount).toBe(3);
    expect(result.rows).toHaveLength(3);

    // Verify Order
    const [row1, row2, row3] = result.rows;

    // Row 1: ORDER_CREATED
    expect(row1.action_type).toBe('CREATE');
    expect(row1.resource_type).toBe('Order');
    expect(row1.resource_id).toBe('ord_1');
    expect(row1.sequence_number).toBe(1n);

    // Row 2: PAYMENT_RECEIVED -> UPDATE
    expect(row2.action_type).toBe('UPDATE');
    expect(row2.resource_id).toBe('ord_1');
    expect(row2.sequence_number).toBe(2n);
    expect(row2.previous_hash).toBe(row1.current_hash);

    // Row 3: ORDER_FULFILLED -> UPDATE
    expect(row3.action_type).toBe('UPDATE');
    expect(row3.resource_id).toBe('ord_1');
    expect(row3.sequence_number).toBe(3n);
    expect(row3.previous_hash).toBe(row2.current_hash);
  });

  it('should be deterministic (same seed -> same hashes)', async () => {
    const run1 = await replayEvents(fixturePath, { seed: 999 });
    const run2 = await replayEvents(fixturePath, { seed: 999 });

    expect(run1.rows[0].id).toBe(run2.rows[0].id);
    expect(run1.rows[0].current_hash).toBe(run2.rows[0].current_hash);
    expect(run1.rows[2].current_hash).toBe(run2.rows[2].current_hash);
  });

  it('should produce different results with different seeds', async () => {
    const run1 = await replayEvents(fixturePath, { seed: 111 });
    const run2 = await replayEvents(fixturePath, { seed: 222 });

    expect(run1.rows[0].id).not.toBe(run2.rows[0].id);
  });
});
