import { checkThrottle } from './throttle.js';
import { strict as assert } from 'assert';

console.log('Testing Throttle...');

const ctx = {
  tenant: {
    throttles: {
      EXPORT: 2
    }
  },
  metrics: {
    inFlight: {
      EXPORT: 1,
      ANALYTICS: 10
    }
  }
};

// 1 below limit
assert.deepEqual(checkThrottle(ctx as any, 'EXPORT'), { allowed: true });

// At limit (mock update)
ctx.metrics.inFlight.EXPORT = 2;
assert.deepEqual(checkThrottle(ctx as any, 'EXPORT'), { allowed: false, reason: 'EXPORT_THROTTLED' });

// No limit set
assert.deepEqual(checkThrottle(ctx as any, 'ANALYTICS'), { allowed: true });

console.log('Throttle tests passed!');
