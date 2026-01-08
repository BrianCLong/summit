
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MergeEngine } from '../../src/sync/MergeEngine.js';

describe('MergeEngine', () => {
  it('should apply new object if no existing state', () => {
    const result = MergeEngine.merge(null, {
        payload: { foo: 'bar' },
        vectorClock: { a: 1 },
        isTombstone: false
    });
    assert.strictEqual(result.status, 'applied');
    if (result.status === 'applied') {
        assert.deepStrictEqual(result.payload, { foo: 'bar' });
    }
  });

  it('should apply descendant update (dominance)', () => {
    const existing = { payload: { v: 1 }, vectorClock: { a: 1 }, isTombstone: false };
    const incoming = { payload: { v: 2 }, vectorClock: { a: 2 }, isTombstone: false };
    const result = MergeEngine.merge(existing, incoming);
    assert.strictEqual(result.status, 'applied');
    if (result.status === 'applied') {
        assert.deepStrictEqual(result.vectorClock, { a: 2 });
    }
  });

  it('should ignore stale update', () => {
    const existing = { payload: { v: 2 }, vectorClock: { a: 2 }, isTombstone: false };
    const incoming = { payload: { v: 1 }, vectorClock: { a: 1 }, isTombstone: false };
    const result = MergeEngine.merge(existing, incoming);
    assert.strictEqual(result.status, 'ignored');
  });

  it('should handle concurrent updates (conflict)', () => {
    const existing = { payload: { v: 'A' }, vectorClock: { a: 1, b: 0 }, isTombstone: false };
    const incoming = { payload: { v: 'B' }, vectorClock: { a: 0, b: 1 }, isTombstone: false };

    const result = MergeEngine.merge(existing, incoming);
    assert.strictEqual(result.status, 'conflict');
    if (result.status === 'conflict') {
        assert.strictEqual(result.conflictReason, 'CONCURRENT_UPDATE');
        // Deterministic winner check: JSON string compare
        // {"v":"A"} < {"v":"B"} -> B wins
        assert.deepStrictEqual(result.payload, { v: 'B' });
        assert.deepStrictEqual(result.vectorClock, { a: 1, b: 1 });
    }
  });

  it('should prioritize tombstone in concurrent delete vs update', () => {
    const existing = { payload: { v: 'A' }, vectorClock: { a: 1, b: 0 }, isTombstone: false };
    const incoming = { payload: null, vectorClock: { a: 0, b: 1 }, isTombstone: true };

    const result = MergeEngine.merge(existing, incoming);
    assert.strictEqual(result.status, 'conflict');
    if (result.status === 'conflict') {
        assert.strictEqual(result.conflictReason, 'DELETE_VS_UPDATE');
        assert.strictEqual(result.isTombstone, true);
    }
  });
});
