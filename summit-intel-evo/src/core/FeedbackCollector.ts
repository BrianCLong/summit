
/**
 * FeedbackCollector - Aggregates multi-source feedback for the evolution engine.
 * Sources: Human simulation, Environment (CI/CD), Meta-metrics.
 */
export class FeedbackCollector {
  private metrics: Map<string, number[]>;

  constructor() {
    this.metrics = new Map();
  }

  public recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)?.push(value);
  }

  public getAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  public getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const key of this.metrics.keys()) {
      summary[key] = this.getAverage(key);
    }
    return summary;
  }
}
