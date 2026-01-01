import { jest } from '@jest/globals';
import { BillingJobService } from '../../src/billing/BillingJobService.js';

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const sharedLockState = { locked: false };

class FakeClient {
  private lockState: { locked: boolean };

  constructor(lockState: { locked: boolean }) {
    this.lockState = lockState;
  }

  async query(text: string) {
    if (text.includes('pg_try_advisory_lock')) {
      if (!this.lockState.locked) {
        this.lockState.locked = true;
        return { rows: [{ acquired: true }] };
      }
      return { rows: [{ acquired: false }] };
    }

    if (text.includes('pg_advisory_unlock')) {
      this.lockState.locked = false;
      return { rows: [{ released: true }] };
    }

    if (text.includes('SELECT tenant_id FROM tenant_plans')) {
      return { rows: [{ tenant_id: 'tenant-1' }] };
    }

    return { rows: [] };
  }

  release() {
    return true;
  }
}

const mockPool = {
  connect: jest.fn(async () => new FakeClient(sharedLockState)),
};

const billingService = {
  generateAndExportReport: jest.fn(),
};

describe('BillingJobService distributed locking', () => {
  beforeEach(() => {
    sharedLockState.locked = false;
    jest.clearAllMocks();
  });

  it('runs in dry-run mode without invoking billing generation', async () => {
    const service = new BillingJobService({
      pool: mockPool as any,
      billing: billingService as any,
      logger: logger as any,
      enableSchedule: false,
    });

    await service.processBillingClose({ dryRun: true, lockTimeoutMs: 250 });

    expect(billingService.generateAndExportReport).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', dryRun: true }),
      'Processing billing for tenant',
    );
  });

  it('enforces mutual exclusion when the lock is held elsewhere', async () => {
    const serviceA = new BillingJobService({
      pool: mockPool as any,
      billing: billingService as any,
      logger: logger as any,
      enableSchedule: false,
    });
    const serviceB = new BillingJobService({
      pool: mockPool as any,
      billing: billingService as any,
      logger: logger as any,
      enableSchedule: false,
    });

    const unblock = defer<void>();
    billingService.generateAndExportReport.mockImplementation(async () => unblock.promise);

    const firstRun = serviceA.processBillingClose({ lockTimeoutMs: 500 });
    const secondRun = serviceB.processBillingClose({ lockTimeoutMs: 100 });

    await new Promise(resolve => setTimeout(resolve, 150));
    unblock.resolve();

    await Promise.all([firstRun, secondRun]);

    expect(billingService.generateAndExportReport).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ lockTimeoutMs: 100 }),
      'Billing close lock not acquired within timeout; skipping run',
    );
  });
});

function defer<T>() {
  let resolve!: (value?: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(res => {
    resolve = res as (value?: T | PromiseLike<T>) => void;
  });
  return { promise, resolve };
}
