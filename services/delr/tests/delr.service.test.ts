import { DatasetEndOfLifeRegistrar, type EolPlan } from '../src';

describe('DatasetEndOfLifeRegistrar', () => {
  const fixedNow = '2035-04-01T10:45:00.000Z';

  class FixedClock {
    now(): Date {
      return new Date(fixedNow);
    }
  }

  const basePlan: EolPlan = {
    datasetId: 'dataset-212',
    lastUse: '2035-03-31',
    successorDatasets: ['dataset-212-v2'],
    purgeScope: {
      caches: ['cache-primary', 'cache-dr'],
      indexes: ['search-index'],
      features: ['feature-vector-a'],
      exports: ['export-bucket-1', 'export-bucket-archive']
    },
    partnerNotifications: [
      { partnerId: 'analytics-hub', contact: 'ops@analytics.test', message: 'Dataset retiring' },
      { partnerId: 'ml-platform', contact: 'ops@ml.test', message: 'Dataset retiring' }
    ]
  };

  it('propagates and reconciles with zero residuals', () => {
    const service = new DatasetEndOfLifeRegistrar({ clock: new FixedClock() });

    const receipt = service.registerPlan(basePlan);

    expect(receipt.completedAt).toBe(fixedNow);
    expect(receipt.verification.isClean).toBe(true);
    expect(receipt.verification.residuals).toEqual([]);

    const planId = receipt.planId;
    const actions = service.actionRecords(planId);

    expect(actions).toHaveLength(6);
    expect(actions.filter((action) => action.domain === 'caches')).toHaveLength(2);
    expect(actions.filter((action) => action.domain === 'indexes')).toHaveLength(1);
    expect(actions.filter((action) => action.domain === 'features')).toHaveLength(1);
    expect(actions.filter((action) => action.domain === 'exports')).toHaveLength(2);

    const notifications = service.notificationEntries(planId);
    expect(notifications).toHaveLength(2);
    expect(notifications.map((entry) => entry.partnerId)).toEqual(['analytics-hub', 'ml-platform']);
    for (const entry of notifications) {
      expect(entry.notifiedAt).toBe(fixedNow);
    }

    expect(receipt.propagation).toEqual({ caches: 2, indexes: 1, features: 1, exports: 2 });
  });

  it('produces deterministic receipt fingerprint', () => {
    const clock = new FixedClock();
    const firstService = new DatasetEndOfLifeRegistrar({ clock });
    const secondService = new DatasetEndOfLifeRegistrar({ clock });

    const plan: EolPlan = JSON.parse(JSON.stringify(basePlan));
    const receiptA = firstService.registerPlan(plan);
    const receiptB = secondService.registerPlan(plan);

    expect(receiptA.checksum).toBe(receiptB.checksum);
    expect(receiptA.completedAt).toBe(receiptB.completedAt);
  });
});
