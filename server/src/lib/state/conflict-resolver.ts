
// server/src/lib/state/conflict-resolver.ts

/**
 * Interface for a generic CRDT.
 */
export interface CRDT<T> {
  value: T;
  merge(other: CRDT<T>): CRDT<T>;
}

export interface CRDTFactory<T extends CRDT<any>> {
  create(value: any): T;
}

// --- CRDT Implementations ---

/**
 * G-Counter (Grow-Only Counter)
 * A counter that only increments. Can be merged with other G-Counters.
 */
export class GCounter implements CRDT<number> {
  private counts: Map<string, number> = new Map();
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.counts.set(this.nodeId, 0);
  }

  get value(): number {
    return Array.from(this.counts.values()).reduce((sum, count) => sum + count, 0);
  }

  public increment(amount: number = 1): void {
    if (amount < 0) {
      throw new Error('G-Counter can only be incremented.');
    }
    const currentCount = this.counts.get(this.nodeId) || 0;
    this.counts.set(this.nodeId, currentCount + amount);
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public merge(other: GCounter): GCounter {
    const merged = new GCounter(this.nodeId);
    const allKeys = new Set([...this.counts.keys(), ...other.counts.keys()]);
    allKeys.forEach(key => {
      const thisCount = this.counts.get(key) || 0;
      const otherCount = other.counts.get(key) || 0;
      merged.counts.set(key, Math.max(thisCount, otherCount));
    });
    return merged;
  }
}

/**
 * PN-Counter (Positive-Negative Counter)
 * A counter that can be incremented and decremented, composed of two G-Counters.
 */
export class PNCounter implements CRDT<number> {
  private increments: GCounter;
  private decrements: GCounter;

  constructor(nodeId: string) {
    this.increments = new GCounter(nodeId);
    this.decrements = new GCounter(nodeId);
  }

  get value(): number {
    return this.increments.value - this.decrements.value;
  }

  public increment(amount: number = 1): void {
    this.increments.increment(amount);
  }

  public decrement(amount: number = 1): void {
    this.decrements.increment(amount);
  }

  public merge(other: PNCounter): PNCounter {
    const merged = new PNCounter(this.increments.getNodeId());
    merged.increments = this.increments.merge(other.increments);
    merged.decrements = this.decrements.merge(other.decrements);
    return merged;
  }
}

/**
 * LWW-Register (Last-Writer-Wins Register)
 * A register where the value with the highest timestamp wins.
 */
export class LWWRegister<T> implements CRDT<T> {
  private _value: T;
  private timestamp: number;
  private nodeId: string;

  constructor(nodeId: string, value: T, timestamp: number = Date.now()) {
    this.nodeId = nodeId;
    this._value = value;
    this.timestamp = timestamp;
  }

  get value(): T {
    return this._value;
  }

  public set(value: T, timestamp: number = Date.now()): void {
    if (timestamp >= this.timestamp) {
      this._value = value;
      this.timestamp = timestamp;
    }
  }

  public merge(other: LWWRegister<T>): LWWRegister<T> {
    if (this.timestamp > other.timestamp) {
      return this;
    } else if (other.timestamp > this.timestamp) {
      return other;
    } else {
      // Timestamps are equal, use nodeId as a tie-breaker
      return this.nodeId > other.nodeId ? this : other;
    }
  }
}

/**
 * OR-Set (Observed-Remove Set)
 * A set that allows additions and removals.
 */
export class ORSet<T> implements CRDT<Set<T>> {
  private elements: Map<T, string> = new Map(); // element -> unique tag
  private tombstones: Map<T, string> = new Map(); // element -> unique tag
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  get value(): Set<T> {
    return new Set(this.elements.keys());
  }

  public add(element: T): void {
    const tag = `${this.nodeId}:${Date.now()}`;
    this.elements.set(element, tag);
  }

  public remove(element: T): void {
    if (this.elements.has(element)) {
      this.tombstones.set(element, this.elements.get(element));
      this.elements.delete(element);
    }
  }

  public merge(other: ORSet<T>): ORSet<T> {
    const merged = new ORSet<T>(this.nodeId);
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
}


// --- Conflict Resolution ---

type MergeFunction<T> = (a: T, b: T) => T;

export interface ConflictLog {
  key: string;
  conflictType: string;
  resolvedValue: any;
  timestamp: Date;
}

export class ConflictResolver {
  private customMergeFunctions: Map<string, MergeFunction<any>> = new Map();
  public conflictHistory: ConflictLog[] = [];

  public registerMergeFunction<T>(key: string, func: MergeFunction<T>): void {
    this.customMergeFunctions.set(key, func);
  }

  public resolve<T extends CRDT<any>>(key: string, a: T, b: T, factory: CRDTFactory<T>): T {
    if (this.customMergeFunctions.has(key)) {
      const mergeFunc = this.customMergeFunctions.get(key);
      const resolvedValue = mergeFunc(a.value, b.value);
      this.logConflict(key, 'custom', resolvedValue);
      return factory.create(resolvedValue);
    }

    const resolved = a.merge(b as any);
    this.logConflict(key, 'crdt-merge', resolved.value);
    return resolved as T;
  }

  private logConflict(key: string, conflictType: string, resolvedValue: any): void {
    this.conflictHistory.push({
      key,
      conflictType,
      resolvedValue,
      timestamp: new Date(),
    });
  }

  public manualOverride(key: string, value: any): void {
    // In a real system, this would involve a secure, audited process.
    console.log(`Manual override for key '${key}': new value is`, value);
    this.logConflict(key, 'manual-override', value);
  }
}
