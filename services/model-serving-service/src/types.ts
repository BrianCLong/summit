import type { DeploymentConfig, InferenceRequest } from '@intelgraph/deep-learning-core';

export type RuntimeType = 'tensorflow' | 'onnx' | 'mock';

export interface RuntimeConfig {
  type: RuntimeType;
  endpoint?: string;
  modelSignature?: string;
  timeoutMs?: number;
}

export interface OptimizationProfile {
  targetLatencyMs?: number;
  preferBatching?: boolean;
  quantization?: string;
  cacheTtlSeconds?: number;
  warmTargets?: number;
  hardwareProfile?: string;
}

export interface VersionedDeployment {
  modelId: string;
  version: string;
  status: 'active' | 'shadow' | 'retired';
  config: DeploymentConfig;
  runtime: RuntimeConfig;
  optimization?: OptimizationProfile;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AbTestVariant {
  version: string;
  weight: number;
  isShadow?: boolean;
}

export interface AbTest {
  id: string;
  modelId: string;
  name: string;
  variants: AbTestVariant[];
  startedAt: string;
  targetMetric?: string;
}

export interface BatchableRequest {
  modelId: string;
  version: string;
  payload: InferenceRequest;
  resolve: (response: any) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  abTestId?: string;
}
