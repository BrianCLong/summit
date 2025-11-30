
export interface PlaybookStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'trigger' | 'end';
  integrationId?: string; // If type is action
  actionId?: string; // "splunk.search", "jira.create_ticket"
  params: Record<string, any>;
  nextStepId?: string; // Simple linear flow
  branches?: { condition: string; nextStepId: string }[]; // Branching logic
}

export interface PlaybookTrigger {
  type: 'manual' | 'incident_created' | 'schedule' | 'webhook';
  config?: Record<string, any>;
}

export interface Playbook {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  workflow: {
    steps: PlaybookStep[];
    startStepId: string;
  };
  triggers: PlaybookTrigger[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  metadata: Record<string, any>;
}

export interface PlaybookRun {
  id: string;
  tenantId: string;
  playbookId: string;
  caseId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  context: Record<string, any>;
  stepsState: StepExecutionState[];
  result?: any;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  triggeredBy?: string;
}

export interface StepExecutionState {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: any;
  error?: string;
}

export interface Integration {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  paramsSchema: Record<string, any>; // JSON Schema
  execute: (params: any, context: any) => Promise<any>;
}
