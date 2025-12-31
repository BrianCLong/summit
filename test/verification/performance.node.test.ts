
import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { BackpressureController, PriorityClass } from '../../server/src/runtime/backpressure/BackpressureController.js';

describe('Performance & Scale Controls', () => {
  let controller: BackpressureController;

  before(() => {
    controller = BackpressureController.getInstance();
  });

  it('should accept critical requests immediately', async () => {
    const result = await controller.requestAdmission({
      id: 'crit-1',
      tenantId: 't1',
      priority: PriorityClass.CRITICAL
    });

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.status, 'ACCEPTED');

    // Idempotent release
    controller.release('crit-1');
    controller.release('crit-1'); // Should not cause issues
  });

  it('should enforce tenant limits', async () => {
      // Flood tenant
      const promises = [];
      const tenantId = 'spam-tenant';

      // Simulate filling up tenant concurrency
      // We need to bypass the fact that we can't easily reach 50 active requests in a single-threaded test without holding them open
      // We can manually inject into the map for testing purposes if we exposed it, or just run 50 requests.

      const activeIds: string[] = [];

      // Fill 50 slots
      for(let i=0; i<50; i++) {
          const id = `req-${i}`;
          activeIds.push(id);
          await controller.requestAdmission({ id, tenantId, priority: PriorityClass.NORMAL });
      }

      // 51st should be rejected
      const result = await controller.requestAdmission({ id: 'req-51', tenantId, priority: PriorityClass.NORMAL });
      assert.strictEqual(result.allowed, false, 'Should reject due to tenant limit');

      // Cleanup
      activeIds.forEach(id => controller.release(id));
  });

  it('should have metrics', async () => {
     const metrics = controller.getMetrics();
     assert.ok(metrics.queueDepth >= 0);
  });
});
