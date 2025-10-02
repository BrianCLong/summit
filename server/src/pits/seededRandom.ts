/**
 * Deterministic linear congruential generator so that drills are replayable
 * when the same seed is supplied.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    if (!Number.isFinite(seed)) {
      throw new Error('Seed must be a finite number');
    }

    // Prevent zero which would break the generator.
    this.state = Math.abs(Math.floor(seed)) || 1;
  }

  next(): number {
    // Constants from Numerical Recipes.
    const a = 48271;
    const m = 0x7fffffff; // 2^31 - 1
    this.state = (a * this.state) % m;
    return (this.state - 1) / (m - 1);
  }

  nextInRange(min: number, max: number): number {
    if (max < min) {
      throw new Error('Invalid range for random number generation');
    }
    const value = this.next();
    return min + (max - min) * value;
  }
}
