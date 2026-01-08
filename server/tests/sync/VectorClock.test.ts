
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VectorClockUtils } from '../../src/sync/VectorClock.js';

describe('VectorClockUtils', () => {
  it('should compare clocks correctly', () => {
    assert.strictEqual(VectorClockUtils.compare({ a: 1 }, { a: 1 }), 'equal');
    assert.strictEqual(VectorClockUtils.compare({ a: 1 }, { a: 2 }), 'before');
    assert.strictEqual(VectorClockUtils.compare({ a: 2 }, { a: 1 }), 'after');
    assert.strictEqual(VectorClockUtils.compare({ a: 1, b: 1 }, { a: 2, b: 1 }), 'before');
    assert.strictEqual(VectorClockUtils.compare({ a: 1, b: 2 }, { a: 1, b: 1 }), 'after');
    assert.strictEqual(VectorClockUtils.compare({ a: 1, b: 2 }, { a: 2, b: 1 }), 'concurrent');
  });

  it('should merge clocks correctly', () => {
    const merged = VectorClockUtils.merge({ a: 1, b: 2 }, { a: 2, b: 1, c: 1 });
    assert.deepStrictEqual(merged, { a: 2, b: 2, c: 1 });
  });

  it('should increment clock correctly', () => {
    const next = VectorClockUtils.increment({ a: 1 }, 'a');
    assert.deepStrictEqual(next, { a: 2 });

    const next2 = VectorClockUtils.increment({ a: 1 }, 'b');
    assert.deepStrictEqual(next2, { a: 1, b: 1 });
  });
});
