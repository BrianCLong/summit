// apps/web/src/lib/crdt.ts

/**
 * Interface for a generic CRDT.
 */
export interface CRDT<T> {
  value: T
  type: string
  merge(other: CRDT<T>): CRDT<T>
  toJSON(): any
}

/**
 * LWW-Register (Last-Writer-Wins Register)
 * A register where the value with the highest timestamp wins.
 */
export class LWWRegister<T> implements CRDT<T> {
  public static readonly type = 'LWWRegister'
  public readonly type = LWWRegister.type
  private _value: T
  private timestamp: number
  private nodeId: string

  constructor(nodeId: string, value: T, timestamp: number = Date.now()) {
    this.nodeId = nodeId
    this._value = value
    this.timestamp = timestamp
  }

  get value(): T {
    return this._value
  }

  public set(value: T, timestamp: number = Date.now()): void {
    if (timestamp >= this.timestamp) {
      this._value = value
      this.timestamp = timestamp
    }
  }

  public merge(other: LWWRegister<T>): LWWRegister<T> {
    if (this.timestamp > other.timestamp) {
      return this
    } else if (other.timestamp > this.timestamp) {
      return other
    } else {
      // Timestamps are equal, use nodeId as a tie-breaker
      return this.nodeId > other.nodeId ? this : other
    }
  }

  public toJSON(): any {
    return {
      nodeId: this.nodeId,
      value: this._value,
      timestamp: this.timestamp,
    }
  }

  public static fromJSON<T>(json: any): LWWRegister<T> {
    return new LWWRegister<T>(json.nodeId, json.value, json.timestamp)
  }
}

/**
 * OR-Set (Observed-Remove Set)
 * A set that allows additions and removals.
 */
export class ORSet<T> implements CRDT<Set<T>> {
  public static readonly type = 'ORSet'
  public readonly type = ORSet.type
  private elements: Map<T, string> = new Map() // element -> unique tag
  private tombstones: Map<T, string> = new Map() // element -> unique tag
  private nodeId: string

  constructor(nodeId: string) {
    this.nodeId = nodeId
  }

  get value(): Set<T> {
    return new Set(this.elements.keys())
  }

  public add(element: T): void {
    const tag = `${this.nodeId}:${Date.now()}`
    this.elements.set(element, tag)
  }

  public remove(element: T): void {
    if (this.elements.has(element)) {
      this.tombstones.set(element, this.elements.get(element))
      this.elements.delete(element)
    }
  }

  public merge(other: ORSet<T>): ORSet<T> {
    const merged = new ORSet<T>(this.nodeId)

    // In a real implementation, merging Maps directly needs care if keys are objects (reference equality)
    // Here T is assumed to be primitive or we rely on value equality if T is string/number
    // For objects, we might need a serializer or ID extraction

    const allElements = new Map([...this.elements, ...other.elements])
    const allTombstones = new Map([...this.tombstones, ...other.tombstones])

    allElements.forEach((tag, element) => {
      const existingTag = merged['elements'].get(element)
      if (!existingTag || tag > existingTag) {
        if (
          !allTombstones.has(element) ||
          (allTombstones.get(element) as string) < tag
        ) {
          merged['elements'].set(element, tag)
        }
      }
    })

    merged['tombstones'] = allTombstones
    return merged
  }

  public toJSON(): any {
    return {
      nodeId: this.nodeId,
      elements: Array.from(this.elements.entries()),
      tombstones: Array.from(this.tombstones.entries()),
    }
  }

  public static fromJSON<T>(json: any): ORSet<T> {
    const set = new ORSet<T>(json.nodeId)
    set['elements'] = new Map(json.elements)
    set['tombstones'] = new Map(json.tombstones)
    return set
  }
}
