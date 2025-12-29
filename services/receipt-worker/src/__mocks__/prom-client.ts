export class Counter {
  constructor(private readonly _config?: Record<string, unknown>) {}

  inc(): void {
    // no-op stub for metrics increment
  }
}

export class Gauge {
  private value = 0;

  constructor(private readonly _config?: Record<string, unknown>) {}

  set(v: number): void {
    this.value = v;
  }

  async get(): Promise<{ values?: Array<{ value: number }> }> {
    return { values: [{ value: this.value }] };
  }
}
export class Registry {
  contentType = 'text/plain';

  async metrics(): Promise<string> {
    return '# stub metrics';
  }
}

export function collectDefaultMetrics(_opts?: { register?: Registry }): void {
  // no-op stub for default metric collection
}
