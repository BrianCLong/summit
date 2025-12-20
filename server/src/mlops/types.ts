export interface ModelArtifact {
  path: string;
  format: 'tensorflow' | 'pytorch' | 'onnx' | 'sklearn';
  size: number;
  checksum: string;
}

export interface ModelVersion {
  version: string;
  description: string;
  tags: string[];
  metrics: Record<string, number>;
  parameters: Record<string, any>;
  artifacts: ModelArtifact;
  status: 'staging' | 'production' | 'archived';
  createdAt: Date;
  createdBy: string;
}

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  domain: string; // e.g., 'nlp', 'vision', 'graph'
  owner: string;
  framework: string;
  versions: ModelVersion[];
}

export interface FeatureSet {
  id: string;
  name: string;
  entityName: string; // e.g., 'user', 'organization'
  features: FeatureDefinition[];
  ttl?: number;
}

export interface FeatureDefinition {
  name: string;
  type: 'string' | 'int' | 'float' | 'boolean' | 'timestamp';
  description?: string;
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  metrics: Record<string, number>;
  parameters: Record<string, any>;
  artifacts: string[];
  startTime: Date;
  endTime?: Date;
}

export interface InferenceRequest {
  modelName: string;
  version?: string;
  inputs: Record<string, any>;
  options?: {
    explain?: boolean;
    debug?: boolean;
  };
}

export interface InferenceResponse {
  modelName: string;
  version: string;
  predictions: any;
  metadata?: {
    latencyMs: number;
    explanation?: any;
  };
}
