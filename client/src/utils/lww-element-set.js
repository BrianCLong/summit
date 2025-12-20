export class LWWElementSet {
  constructor() {
    this.addSet = new Map();
    this.removeSet = new Map();
  }

  add(element, timestamp = Date.now()) {
    this.addSet.set(element.id, { element, timestamp });
  }

  remove(id, timestamp = Date.now()) {
    this.removeSet.set(id, timestamp);
  }

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

  serialize() {
    return JSON.stringify({
      adds: Array.from(this.addSet.entries()),
      removes: Array.from(this.removeSet.entries()),
    });
  }

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
