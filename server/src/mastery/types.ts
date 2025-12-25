export interface LabValidation {
  type: 'provenance_event' | 'custom_check' | 'manual';
  config: Record<string, any>;
}

export interface LabStep {
  id: string;
  title: string;
  instructions: string; // Markdown supported
  validation: LabValidation;
}

export interface LabDefinition {
  id: string;
  title: string;
  description: string;
  steps: LabStep[];
  version: string;
  tags: string[]; // e.g. ['Analyst I', 'Ingest']
}

export interface LabRunStep {
  stepId: string;
  status: 'pending' | 'completed' | 'failed';
  completedAt?: Date;
  artifacts?: any;
}

export interface LabRun {
  runId: string;
  labId: string;
  userId: string;
  tenantId: string;
  status: 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  steps: Record<string, LabRunStep>;
  currentStepId: string;
}

export interface Certificate {
  id: string;
  userId: string;
  tenantId: string;
  name: string; // "Analyst I"
  grantedAt: Date;
  version: string;
  issuer: string; // "System"
}
