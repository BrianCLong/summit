export class TestClock {
  private current: number;
  constructor(start: number = Date.now()) {
    this.current = start;
  }

  now(): number {
    return this.current;
  }

  freeze(at: number): void {
    this.current = at;
  }

  advanceBy(ms: number): void {
    this.current += ms;
  }

  asDate(): Date {
    return new Date(this.current);
  }
}

export function freezeTime(start: number = Date.now()): TestClock {
  return new TestClock(start);
}
