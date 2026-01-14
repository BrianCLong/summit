export interface RngState {
  seed: number;
  calls: number;
}

export class SeededRng {
  private state: RngState;

  constructor(seed: number, calls = 0) {
    this.state = { seed: seed >>> 0, calls };
  }

  next(): number {
    this.state.calls += 1;
    // Mulberry32
    let t = (this.state.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: T[]): T {
    return items[this.int(items.length)];
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = this.int(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  stateSnapshot(): RngState {
    return { ...this.state };
  }
}
