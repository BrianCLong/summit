export type ModelStage = 'base' | 'derived';

export interface PredictionOutput {
  entityId: string;
  modelVersion: string;
  score: number;
  riskLabel: 'low' | 'medium' | 'high';
  featureSummary: FeatureSummary;
}

export interface FeatureSummary {
  numericFeatureCount: number;
  numericFeatureSum: number;
  stringFeatureCount: number;
  featureFingerprint: string;
}

export interface AgentReport {
  schemaVersion: 'mlops-control-plane-v1';
  entityId: string;
  modelVersion: string;
  prediction: PredictionOutput;
  sections: {
    summary: string;
    rationale: string;
    critique: string;
  };
}

export interface TrainRequestBase {
  entityId: string;
  baseModelVersion: string;
  features?: Record<string, unknown>;
}

export interface TrainRequestDerived {
  entityId: string;
  baseModelVersion: string;
  derivedModelVersion: string;
  features?: Record<string, unknown>;
}

export interface InferRequest {
  entityId: string;
  modelVersion: string;
  features?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface TrainResponse {
  status: 'queued' | 'accepted';
  modelVersion: string;
  stage: ModelStage;
}
