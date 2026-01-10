
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { CrossRegionSyncService, MockMessageBroker } from '../cross-region-sync.js';
import { GCounter, CRDTFactory } from '../conflict-resolver.js';

describe('CrossRegionSyncService', () => {
  let broker: MockMessageBroker;
  let serviceA: CrossRegionSyncService;
  let serviceB: CrossRegionSyncService;
  let serviceC: CrossRegionSyncService;

  beforeEach(() => {
    broker = new MockMessageBroker();
    serviceA = new CrossRegionSyncService('us-east-1', broker);
    serviceB = new CrossRegionSyncService('us-west-2', broker);
    serviceC = new CrossRegionSyncService('eu-west-1', broker);
  });

  const gCounterFactory: CRDTFactory<GCounter> = {
      create: () => new GCounter('temp'),
      fromJSON: (json) => GCounter.fromJSON(json)
  };

  test('should sync GCounter between two regions', async () => {
    const key = 'active-users';

    // Initialize CRDTs
    const counterA = new GCounter('us-east-1');
    const counterB = new GCounter('us-west-2');

    serviceA.registerCRDT(key, counterA, gCounterFactory);
    serviceB.registerCRDT(key, counterB, gCounterFactory);

    // Initial state
    expect(counterA.value).toBe(0);
    expect(counterB.value).toBe(0);

    // Modify A and sync
    counterA.increment(10);
    await serviceA.sync(key);

    // Wait for async processing (since mock broker is technically sync, but we use async functions)
    await new Promise(resolve => setTimeout(resolve, 10));

    // Check B updated
    const updatedB = serviceB.getCRDT(key) as GCounter;
    expect(updatedB.value).toBe(10);

    // Modify B and sync
    counterB.increment(5);
    await serviceB.sync(key);

    await new Promise(resolve => setTimeout(resolve, 10));

    // Check A updated (10 + 5)
    const updatedA = serviceA.getCRDT(key) as GCounter;
    expect(updatedA.value).toBe(15);
  });

  test('should handle concurrent updates via merge', async () => {
      const key = 'concurrent-test';

      const counterA = new GCounter('us-east-1');
      const counterB = new GCounter('us-west-2');

      serviceA.registerCRDT(key, counterA, gCounterFactory);
      serviceB.registerCRDT(key, counterB, gCounterFactory);

      // Concurrent increments
      counterA.increment(10);
      counterB.increment(20);

      // Sync both ways
      await serviceA.sync(key);
      await serviceB.sync(key);

      await new Promise(resolve => setTimeout(resolve, 10));

      const finalA = serviceA.getCRDT(key) as GCounter;
      const finalB = serviceB.getCRDT(key) as GCounter;

      expect(finalA.value).toBe(30);
      expect(finalB.value).toBe(30);
  });
});
