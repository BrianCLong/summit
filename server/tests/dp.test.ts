import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { LaplaceMechanism, PrivacyBudgetLedger } from '../src/services/dp-runtime/mechanisms';

// Mock ioredis
jest.mock('ioredis', () => {
  return {
    Redis: class RedisMock {
      private store = new Map();
      get(key: string) { return Promise.resolve(this.store.get(key)); }
      incrbyfloat(key: string, val: number) {
        const curr = this.store.get(key) || 0;
        this.store.set(key, curr + val);
        return Promise.resolve(curr + val);
      }
      expire() {}
      eval(script: string, numKeys: number, key: string, cost: string, limit: string) {
         // Mock logic for the Lua script
         const current = this.store.get(key) || 0;
         const c = parseFloat(cost);
         const l = parseFloat(limit);

         if (current + c > l) {
           return Promise.resolve(0);
         } else {
           this.store.set(key, current + c);
           return Promise.resolve(1);
         }
      }
    }
  };
});

describe('Differential Privacy Mechanisms', () => {
  test('Laplace Mechanism adds noise', () => {
    const mech = new LaplaceMechanism();
    const val = 100;
    const sensitivity = 1;
    const epsilon = 0.1;

    const noisy1 = mech.addNoise(val, sensitivity, epsilon);
    const noisy2 = mech.addNoise(val, sensitivity, epsilon);

    expect(noisy1).not.toBe(val);
    expect(noisy1).not.toBe(noisy2);
  });
});

describe('Privacy Budget Ledger', () => {
  let ledger: PrivacyBudgetLedger;

  beforeEach(() => {
    ledger = new PrivacyBudgetLedger();
  });

  test('consumeBudgetIfAvailable returns true when budget available', async () => {
    const allowed = await ledger.consumeBudgetIfAvailable('user_test_1', 1.0);
    expect(allowed).toBe(true);
  });

  test('consumeBudgetIfAvailable updates usage', async () => {
    await ledger.consumeBudgetIfAvailable('user_test_2', 5.0);
    const remaining = await ledger.getRemainingBudget('user_test_2');
    expect(remaining).toBe(5.0);
  });

  test('consumeBudgetIfAvailable returns false when exhausted', async () => {
    await ledger.consumeBudgetIfAvailable('user_test_3', 9.5);
    const allowed = await ledger.consumeBudgetIfAvailable('user_test_3', 1.0);
    expect(allowed).toBe(false);
  });
});
