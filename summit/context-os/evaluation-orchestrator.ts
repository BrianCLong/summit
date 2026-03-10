export interface EvaluationMetrics {
  task: string;
  successRate: number;
  tokenUsage: number;
  stepCount: number;
  fileReads: number;
}

export class EvaluationOrchestrator {
  private metrics: EvaluationMetrics[] = [];

  recordMetrics(metrics: EvaluationMetrics) {
    this.metrics.push(metrics);
  }

  getMetrics(): EvaluationMetrics[] {
    return this.metrics;
  }
}
