export enum AnalyticsType {
  DESCRIPTIVE = 'DESCRIPTIVE',
  PREDICTIVE = 'PREDICTIVE'
}

export interface DescriptiveAnalyticsResult<T> {
  type: AnalyticsType.DESCRIPTIVE;
  data: T;
  meta: {
    timestamp: Date;
    source: string;
  };
}

export interface PredictiveExplanation {
  method: string;
  assumptions: string[];
  inputSummary: string;
  confidenceBasis: string;
}

export interface PredictiveResult<T> {
  type: AnalyticsType.PREDICTIVE;
  value: T;
  confidence: number; // 0.0 - 1.0 (clamped)
  status: 'SUCCESS' | 'INSUFFICIENT_DATA' | 'UNKNOWN';
  explanation: PredictiveExplanation;
  traceability: {
    sourceIds: string[];
    provenanceHash?: string;
  };
}
