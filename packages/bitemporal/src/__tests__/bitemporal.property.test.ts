import * as fc from 'fast-check';
import { BitemporalStore } from '../BitemporalStore';
import type { UpsertOptions } from '../types';

/**
 * Property-based tests for bitemporal storage
 * These tests verify invariants that should always hold
 */

describe('Bitemporal Property Tests', () => {
  let store: BitemporalStore;
  const testTable = 'test_bitemporal_entities';

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL ||
      'postgresql://summit:password@localhost:5432/summit_test';
    store = new BitemporalStore(connectionString, testTable);
    await store.initialize();
  });

  afterAll(async () => {
    await store.close();
  });

  describe('Temporal interval invariants', () => {
    it('valid_from should always be before valid_to', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({ value: fc.integer() }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          fc.date({ min: new Date('2030-01-02'), max: new Date('2040-01-01') }),
          async (entityKey, data, validFrom, validTo) => {
            const options: UpsertOptions = {
              validFrom,
              validTo,
              userId: 'test-user',
            };

            const id = await store.upsert(entityKey, data, options);
            expect(id).toBeTruthy();

            const record = await store.getCurrent(entityKey);
            if (record) {
              expect(record.validFrom.getTime()).toBeLessThan(record.validTo.getTime());
            }
          }
        ),
        { numRuns: 20 } // Reduced for CI performance
      );
    });

    it('tx_from should always be before tx_to', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({ value: fc.integer() }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          async (entityKey, data, validFrom) => {
            const options: UpsertOptions = {
              validFrom,
              userId: 'test-user',
            };

            const id = await store.upsert(entityKey, data, options);
            expect(id).toBeTruthy();

            const versions = await store.getAllVersions(entityKey);
            for (const version of versions) {
              expect(version.txFrom.getTime()).toBeLessThan(version.txTo.getTime());
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('no overlapping intervals for same entity key at same transaction time', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(
            fc.record({
              data: fc.record({ value: fc.integer() }),
              validFrom: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
              validTo: fc.date({ min: new Date('2025-01-02'), max: new Date('2030-01-01') }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (entityKey, updates) => {
            // Apply all updates
            for (const update of updates) {
              await store.upsert(entityKey, update.data, {
                validFrom: update.validFrom,
                validTo: update.validTo,
                userId: 'test-user',
              });
            }

            // Get current state (all active records at current tx time)
            const now = new Date();
            const snapshot = await store.query({
              asOfTxTime: now,
            });

            // Group by entity key
            const byEntity = new Map<string, typeof snapshot.records>();
            for (const record of snapshot.records) {
              if (!byEntity.has(record.entityKey)) {
                byEntity.set(record.entityKey, []);
              }
              byEntity.get(record.entityKey)!.push(record);
            }

            // Check no overlapping valid time intervals
            for (const records of byEntity.values()) {
              for (let i = 0; i < records.length; i++) {
                for (let j = i + 1; j < records.length; j++) {
                  const r1 = records[i];
                  const r2 = records[j];

                  // Check that intervals don't overlap
                  const overlap = !(
                    r1.validTo <= r2.validFrom ||
                    r2.validTo <= r1.validFrom
                  );

                  expect(overlap).toBe(false);
                }
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Temporal query properties', () => {
    it('querying at any point in time returns consistent results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({ value: fc.integer() }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          async (entityKey, data, validFrom) => {
            const options: UpsertOptions = {
              validFrom,
              userId: 'test-user',
            };

            await store.upsert(entityKey, data, options);

            // Query at different times should return same data
            const result1 = await store.getAsOf(entityKey, validFrom, new Date());
            const result2 = await store.getAsOf(entityKey, validFrom, new Date());

            if (result1 && result2) {
              expect(result1.data).toEqual(result2.data);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('diff between same snapshot should be empty', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          async (validTime, txTime) => {
            const diff = await store.diff(validTime, txTime, validTime, txTime);

            expect(diff.added).toHaveLength(0);
            expect(diff.removed).toHaveLength(0);
            expect(diff.modified).toHaveLength(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Upsert properties', () => {
    it('upserting same data multiple times is idempotent for same valid time', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({ value: fc.integer() }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          async (entityKey, data, validFrom) => {
            const options: UpsertOptions = {
              validFrom,
              userId: 'test-user',
            };

            // Upsert twice
            await store.upsert(entityKey, data, options);
            await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different tx time
            await store.upsert(entityKey, data, options);

            const current = await store.getCurrent(entityKey);
            expect(current?.data).toEqual(data);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('upsert creates audit trail entry', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({ value: fc.integer() }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          async (entityKey, data, validFrom) => {
            const options: UpsertOptions = {
              validFrom,
              userId: 'test-user',
            };

            await store.upsert(entityKey, data, options);

            const audit = await store.exportAudit(entityKey);
            expect(audit.length).toBeGreaterThan(0);
            expect(audit[audit.length - 1].data).toEqual(data);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Version history properties', () => {
    it('all versions should be ordered by valid_from DESC, tx_from DESC', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(
            fc.record({
              data: fc.record({ value: fc.integer() }),
              validFrom: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (entityKey, updates) => {
            // Apply updates
            for (const update of updates) {
              await store.upsert(entityKey, update.data, {
                validFrom: update.validFrom,
                userId: 'test-user',
              });
            }

            const versions = await store.getAllVersions(entityKey);

            // Check ordering
            for (let i = 0; i < versions.length - 1; i++) {
              const current = versions[i];
              const next = versions[i + 1];

              // Should be ordered by valid_from DESC, then tx_from DESC
              if (current.validFrom.getTime() === next.validFrom.getTime()) {
                expect(current.txFrom.getTime()).toBeGreaterThanOrEqual(next.txFrom.getTime());
              } else {
                expect(current.validFrom.getTime()).toBeGreaterThanOrEqual(next.validFrom.getTime());
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
