/**
 * Implements a Last-Writer-Wins (LWW) Element Set CRDT.
 * Used for conflict-free replicated data types in distributed systems.
 */
export class LWWElementSet {
  constructor() {
    this.addSet = new Map();
    this.removeSet = new Map();
  }

  /**
   * Adds an element to the set.
   *
   * @param element - The element to add. Must have an `id` property.
   * @param timestamp - The timestamp of the operation (default: Date.now()).
   */
  add(element, timestamp = Date.now()) {
    this.addSet.set(element.id, { element, timestamp });
  }

  /**
   * Removes an element from the set.
   *
   * @param id - The ID of the element to remove.
   * @param timestamp - The timestamp of the operation (default: Date.now()).
   */
  remove(id, timestamp = Date.now()) {
    this.removeSet.set(id, timestamp);
  }

  /**
   * Returns the current values in the set.
   * Elements are included if they are in the add set and not in the remove set (or added after removal).
   *
   * @returns An array of elements sorted by timestamp.
   */
  values() {
    const items = [];
    for (const [id, { element, timestamp }] of this.addSet.entries()) {
      const removed = this.removeSet.get(id);
      if (!removed || timestamp > removed) {
        items.push(element);
      }
    }
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Merges another LWWElementSet into this one.
   *
   * @param other - The other LWWElementSet to merge.
   */
  merge(other) {
    for (const [id, record] of other.addSet.entries()) {
      const existing = this.addSet.get(id);
      if (!existing || record.timestamp > existing.timestamp) {
        this.addSet.set(id, record);
      }
    }
    for (const [id, timestamp] of other.removeSet.entries()) {
      const existing = this.removeSet.get(id);
      if (!existing || timestamp > existing) {
        this.removeSet.set(id, timestamp);
      }
    }
  }

  /**
   * Serializes the set to a JSON string.
   *
   * @returns The serialized JSON string.
   */
  serialize() {
    return JSON.stringify({
      adds: Array.from(this.addSet.entries()),
      removes: Array.from(this.removeSet.entries()),
    });
  }

  /**
   * Deserializes a JSON string into an LWWElementSet.
   *
   * @param str - The JSON string to deserialize.
   * @returns A new LWWElementSet instance.
   */
  static deserialize(str) {
    try {
      const data = JSON.parse(str);
      const set = new LWWElementSet();
      for (const [id, record] of data.adds || []) {
        set.addSet.set(id, record);
      }
      for (const [id, ts] of data.removes || []) {
        set.removeSet.set(id, ts);
      }
      return set;
    } catch {
      return new LWWElementSet();
    }
  }
}
