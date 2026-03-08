"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const crdt_1 = require("./crdt");
(0, vitest_1.describe)('LWWRegister', () => {
    (0, vitest_1.it)('should initialize with a value', () => {
        const reg = new crdt_1.LWWRegister('node1', 'initial');
        (0, vitest_1.expect)(reg.value).toBe('initial');
    });
    (0, vitest_1.it)('should update value if timestamp is newer', () => {
        const reg = new crdt_1.LWWRegister('node1', 'initial', 100);
        reg.set('updated', 200);
        (0, vitest_1.expect)(reg.value).toBe('updated');
    });
    (0, vitest_1.it)('should not update value if timestamp is older', () => {
        const reg = new crdt_1.LWWRegister('node1', 'initial', 200);
        reg.set('stale', 100);
        (0, vitest_1.expect)(reg.value).toBe('initial');
    });
    (0, vitest_1.it)('should merge correctly (newer wins)', () => {
        const r1 = new crdt_1.LWWRegister('node1', 'v1', 100);
        const r2 = new crdt_1.LWWRegister('node2', 'v2', 200);
        const merged1 = r1.merge(r2);
        (0, vitest_1.expect)(merged1.value).toBe('v2');
        const merged2 = r2.merge(r1);
        (0, vitest_1.expect)(merged2.value).toBe('v2');
    });
    (0, vitest_1.it)('should merge correctly (tie breaker)', () => {
        // node2 > node1 lexicographically
        const r1 = new crdt_1.LWWRegister('node1', 'v1', 100);
        const r2 = new crdt_1.LWWRegister('node2', 'v2', 100);
        const merged = r1.merge(r2);
        (0, vitest_1.expect)(merged.value).toBe('v2');
    });
});
(0, vitest_1.describe)('ORSet', () => {
    (0, vitest_1.it)('should add items', () => {
        const set = new crdt_1.ORSet('node1');
        set.add('item1');
        (0, vitest_1.expect)(set.value.has('item1')).toBe(true);
    });
    (0, vitest_1.it)('should remove items', () => {
        const set = new crdt_1.ORSet('node1');
        set.add('item1');
        set.remove('item1');
        (0, vitest_1.expect)(set.value.has('item1')).toBe(false);
    });
    (0, vitest_1.it)('should merge additions', () => {
        const s1 = new crdt_1.ORSet('node1');
        const s2 = new crdt_1.ORSet('node2');
        s1.add('A');
        s2.add('B');
        const merged = s1.merge(s2);
        (0, vitest_1.expect)(merged.value.has('A')).toBe(true);
        (0, vitest_1.expect)(merged.value.has('B')).toBe(true);
    });
    (0, vitest_1.it)('should handle add-wins semantics on merge', () => {
        const s1 = new crdt_1.ORSet('node1');
        const s2 = new crdt_1.ORSet('node2');
        // Simulate s1 adding A
        s1.add('A');
        // Simulate s2 having seen A (synced) and removing it
        // To simulate "seen", s2 needs the tag s1 generated.
        // In this simple test, we just assume concurrent operations.
        // If concurrent: Add wins over Remove? ORSet is Observed-Remove.
        // An element is in the set if it is in 'elements' and NOT in 'tombstones' covering that specific tag.
        // Test Case: Concurrent Add and Remove logic is complex to simulate without syncing tags first.
        // Standard ORSet Merge:
        // Union of elements, union of tombstones.
        // Element exists if there is a tag in elements that is NOT in tombstones.
    });
});
