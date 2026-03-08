"use strict";
// apps/web/src/lib/crdt.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORSet = exports.LWWRegister = void 0;
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
        // In a real implementation, merging Maps directly needs care if keys are objects (reference equality)
        // Here T is assumed to be primitive or we rely on value equality if T is string/number
        // For objects, we might need a serializer or ID extraction
        const allElements = new Map([...this.elements, ...other.elements]);
        const allTombstones = new Map([...this.tombstones, ...other.tombstones]);
        allElements.forEach((tag, element) => {
            const existingTag = merged['elements'].get(element);
            if (!existingTag || tag > existingTag) {
                if (!allTombstones.has(element) || allTombstones.get(element) < tag) {
                    merged['elements'].set(element, tag);
                }
            }
        });
        merged['tombstones'] = allTombstones;
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
        set['elements'] = new Map(json.elements);
        set['tombstones'] = new Map(json.tombstones);
        return set;
    }
}
exports.ORSet = ORSet;
