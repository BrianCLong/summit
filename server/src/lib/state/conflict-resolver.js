"use strict";
// server/src/lib/state/conflict-resolver.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictResolver = exports.ORSet = exports.LWWRegister = exports.PNCounter = exports.GCounter = void 0;
// --- CRDT Implementations ---
/**
 * G-Counter (Grow-Only Counter)
 * A counter that only increments. Can be merged with other G-Counters.
 */
class GCounter {
    static type = 'GCounter';
    type = GCounter.type;
    counts = new Map();
    nodeId;
    constructor(nodeId) {
        this.nodeId = nodeId;
        this.counts.set(this.nodeId, 0);
    }
    get value() {
        return Array.from(this.counts.values()).reduce((sum, count) => sum + count, 0);
    }
    increment(amount = 1) {
        if (amount < 0) {
            throw new Error('G-Counter can only be incremented.');
        }
        const currentCount = this.counts.get(this.nodeId) || 0;
        this.counts.set(this.nodeId, currentCount + amount);
    }
    getNodeId() {
        return this.nodeId;
    }
    merge(other) {
        const merged = new GCounter(this.nodeId);
        const allKeys = new Set([...this.counts.keys(), ...other.counts.keys()]);
        allKeys.forEach(key => {
            const thisCount = this.counts.get(key) || 0;
            const otherCount = other.counts.get(key) || 0;
            merged.counts.set(key, Math.max(thisCount, otherCount));
        });
        return merged;
    }
    toJSON() {
        return {
            nodeId: this.nodeId,
            counts: Array.from(this.counts.entries())
        };
    }
    static fromJSON(json) {
        const counter = new GCounter(json.nodeId);
        counter.counts = new Map(json.counts);
        return counter;
    }
}
exports.GCounter = GCounter;
/**
 * PN-Counter (Positive-Negative Counter)
 * A counter that can be incremented and decremented, composed of two G-Counters.
 */
class PNCounter {
    static type = 'PNCounter';
    type = PNCounter.type;
    increments;
    decrements;
    nodeId;
    constructor(nodeId) {
        this.nodeId = nodeId;
        this.increments = new GCounter(nodeId);
        this.decrements = new GCounter(nodeId);
    }
    get value() {
        return this.increments.value - this.decrements.value;
    }
    increment(amount = 1) {
        this.increments.increment(amount);
    }
    decrement(amount = 1) {
        this.decrements.increment(amount);
    }
    merge(other) {
        const merged = new PNCounter(this.nodeId);
        merged.increments = this.increments.merge(other.increments);
        merged.decrements = this.decrements.merge(other.decrements);
        return merged;
    }
    toJSON() {
        return {
            nodeId: this.nodeId,
            increments: this.increments.toJSON(),
            decrements: this.decrements.toJSON()
        };
    }
    static fromJSON(json) {
        const counter = new PNCounter(json.nodeId);
        counter.increments = GCounter.fromJSON(json.increments);
        counter.decrements = GCounter.fromJSON(json.decrements);
        return counter;
    }
}
exports.PNCounter = PNCounter;
/**
 * LWW-Register (Last-Writer-Wins Register)
 * A register where the value with the highest timestamp wins.
 */
class LWWRegister {
    static type = 'LWWRegister';
    type = LWWRegister.type;
    _value;
    timestamp;
    nodeId;
    constructor(nodeId, value, timestamp = Date.now()) {
        this.nodeId = nodeId;
        this._value = value;
        this.timestamp = timestamp;
    }
    get value() {
        return this._value;
    }
    set(value, timestamp = Date.now()) {
        if (timestamp >= this.timestamp) {
            this._value = value;
            this.timestamp = timestamp;
        }
    }
    merge(other) {
        if (this.timestamp > other.timestamp) {
            return this;
        }
        else if (other.timestamp > this.timestamp) {
            return other;
        }
        else {
            // Timestamps are equal, use nodeId as a tie-breaker
            return this.nodeId > other.nodeId ? this : other;
        }
    }
    toJSON() {
        return {
            nodeId: this.nodeId,
            value: this._value,
            timestamp: this.timestamp
        };
    }
    static fromJSON(json) {
        return new LWWRegister(json.nodeId, json.value, json.timestamp);
    }
}
exports.LWWRegister = LWWRegister;
/**
 * OR-Set (Observed-Remove Set)
 * A set that allows additions and removals.
 */
class ORSet {
    static type = 'ORSet';
    type = ORSet.type;
    elements = new Map(); // element -> unique tag
    tombstones = new Map(); // element -> unique tag
    nodeId;
    constructor(nodeId) {
        this.nodeId = nodeId;
    }
    get value() {
        return new Set(this.elements.keys());
    }
    add(element) {
        const tag = `${this.nodeId}:${Date.now()}`;
        this.elements.set(element, tag);
    }
    remove(element) {
        if (this.elements.has(element)) {
            this.tombstones.set(element, this.elements.get(element));
            this.elements.delete(element);
        }
    }
    merge(other) {
        const merged = new ORSet(this.nodeId);
        const allElements = new Map([...this.elements, ...other.elements]);
        const allTombstones = new Map([...this.tombstones, ...other.tombstones]);
        allElements.forEach((tag, element) => {
            const existingTag = merged.elements.get(element);
            if (!existingTag || tag > existingTag) {
                if (!allTombstones.has(element) || allTombstones.get(element) < tag) {
                    merged.elements.set(element, tag);
                }
            }
        });
        merged.tombstones = allTombstones;
        return merged;
    }
    toJSON() {
        return {
            nodeId: this.nodeId,
            elements: Array.from(this.elements.entries()),
            tombstones: Array.from(this.tombstones.entries())
        };
    }
    static fromJSON(json) {
        const set = new ORSet(json.nodeId);
        set.elements = new Map(json.elements);
        set.tombstones = new Map(json.tombstones);
        return set;
    }
}
exports.ORSet = ORSet;
class ConflictResolver {
    customMergeFunctions = new Map();
    conflictHistory = [];
    registerMergeFunction(key, func) {
        this.customMergeFunctions.set(key, func);
    }
    resolve(key, a, b, factory) {
        if (this.customMergeFunctions.has(key)) {
            const mergeFunc = this.customMergeFunctions.get(key);
            const resolvedValue = mergeFunc(a.value, b.value);
            this.logConflict(key, 'custom', resolvedValue);
            return factory.create(resolvedValue);
        }
        const resolved = a.merge(b);
        this.logConflict(key, 'crdt-merge', resolved.value);
        return resolved;
    }
    logConflict(key, conflictType, resolvedValue) {
        this.conflictHistory.push({
            key,
            conflictType,
            resolvedValue,
            timestamp: new Date(),
        });
    }
    manualOverride(key, value) {
        // In a real system, this would involve a secure, audited process.
        console.log(`Manual override for key '${key}': new value is`, value);
        this.logConflict(key, 'manual-override', value);
    }
}
exports.ConflictResolver = ConflictResolver;
