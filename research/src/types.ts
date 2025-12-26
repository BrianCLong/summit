export enum ExperimentStatus {
  PROPOSED = 'PROPOSED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PROMOTED = 'PROMOTED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED'
}

export interface MetricDefinition {
  name: string;
  type: 'latency' | 'accuracy' | 'resource' | 'custom';
  unit?: string;
  description: string;
}

export interface ExperimentManifest {
  id: string;
  owner: string;
  hypothesis: string;
  startDate: string; // ISO date
  durationDays: number;
  status: ExperimentStatus;
  metrics: MetricDefinition[];
  exitCriteria: {
    success: string;
    failure: string;
  };
  risks: string[];
}

export const RESEARCH_TRACK_PREFIX = 'research-';

export function validateManifest(manifest: ExperimentManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id.startsWith(RESEARCH_TRACK_PREFIX)) {
    errors.push(`ID must start with ${RESEARCH_TRACK_PREFIX}`);
  }
  if (!manifest.hypothesis) {
    errors.push('Hypothesis is required');
  }
  if (!manifest.metrics || manifest.metrics.length === 0) {
    errors.push('At least one metric is required');
  }
  return errors;
}
