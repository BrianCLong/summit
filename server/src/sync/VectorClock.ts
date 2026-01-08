
export interface VectorClock {
  [nodeId: string]: number;
}

export class VectorClockUtils {
  static compare(a: VectorClock, b: VectorClock): 'equal' | 'before' | 'after' | 'concurrent' {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let isBefore = false;
    let isAfter = false;

    for (const key of keys) {
      const valA = a[key] || 0;
      const valB = b[key] || 0;

      if (valA < valB) isBefore = true;
      if (valA > valB) isAfter = true;
    }

    if (!isBefore && !isAfter) return 'equal';
    if (isBefore && !isAfter) return 'before';
    if (!isBefore && isAfter) return 'after';
    return 'concurrent';
  }

  static merge(a: VectorClock, b: VectorClock): VectorClock {
    const merged: VectorClock = { ...a };
    for (const [key, val] of Object.entries(b)) {
      merged[key] = Math.max(merged[key] || 0, val);
    }
    return merged;
  }

  static increment(clock: VectorClock, nodeId: string): VectorClock {
    const next = { ...clock };
    next[nodeId] = (next[nodeId] || 0) + 1;
    return next;
  }
}
