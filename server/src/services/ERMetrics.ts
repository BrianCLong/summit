import { PrometheusMetrics } from '../utils/metrics.js';

export class ERMetrics {
  private static instance: ERMetrics;
  private metrics: PrometheusMetrics;

  private constructor() {
    this.metrics = new PrometheusMetrics('entity_resolution');
    this.metrics.createCounter('matches_total', 'Total matches found', ['confidence']);
    this.metrics.createCounter('merges_total', 'Total entities merged', []);
    this.metrics.createGauge('precision', 'ER Precision on Golden Set', ['dataset']);
    this.metrics.createGauge('recall', 'ER Recall on Golden Set', ['dataset']);
  }

  public static getInstance(): ERMetrics {
    if (!ERMetrics.instance) {
      ERMetrics.instance = new ERMetrics();
    }
    return ERMetrics.instance;
  }

  public recordMatch(confidence: string) {
    this.metrics.incrementCounter('matches_total', { confidence });
  }

  public recordMerge() {
    this.metrics.incrementCounter('merges_total');
  }

  public updateGoldenMetrics(dataset: string, precision: number, recall: number) {
    this.metrics.setGauge('precision', precision, { dataset });
    this.metrics.setGauge('recall', recall, { dataset });
  }
}

export const erMetrics = ERMetrics.getInstance();
