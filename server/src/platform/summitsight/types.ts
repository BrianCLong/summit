export interface SLODefinition {
  service: string;
  metric: string;
  target: number; // e.g. 99.9 or 300 (ms)
  type: 'AVAILABILITY' | 'LATENCY_P95' | 'SUCCESS_RATE';
  period: '1h' | '24h' | '30d';
}

export interface SLOEvent {
  service: string;
  inCompliance: boolean;
  currentValue: number;
  errorBudgetRemaining?: number;
  timestamp: Date;
}
