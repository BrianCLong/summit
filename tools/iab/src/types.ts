export type ArtifactType =
  | 'log'
  | 'policy'
  | 'dp-budget'
  | 'consent-proof'
  | 'error-trace';

export interface ArtifactConfig {
  id: string;
  type: ArtifactType;
  path: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentConfig {
  id: string;
  occurredAt: string;
  reportedAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  artifacts: ArtifactConfig[];
  redaction?: RedactionConfig;
}

export interface RedactionConfig {
  fields?: string[];
  patterns?: Array<{ pattern: string; replacement?: string }>;
}

export interface ValidationResult {
  status: 'passed' | 'failed';
  details: string[];
  validator: string;
  metadata?: Record<string, unknown>;
}

export interface RedactionRecord {
  strategy: 'tombstone';
  target: string;
  occurrences: number;
}

export interface ProcessedArtifact {
  id: string;
  type: ArtifactType;
  sourcePath: string;
  bundledPath: string;
  checksum: string;
  validation: ValidationResult;
  redactions: RedactionRecord[];
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ManifestDocument {
  version: string;
  incident: {
    id: string;
    occurredAt: string;
    reportedAt: string;
    severity: string;
    description: string;
  };
  createdAt: string;
  tool: {
    name: string;
    version: string;
  };
  artifacts: ProcessedArtifact[];
}
